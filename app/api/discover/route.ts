import { NextRequest, NextResponse } from 'next/server';
import { normalizeCountry } from '@/lib/advisoryNormalize';
import { sanitizeUserInput, checkRateLimit, checkContentLength, safeLogError } from '@/lib/security';
import { Destination } from '@/types';

// ─── Advisory cache (module-level, ~6h TTL) ─────────────────────────────────

interface AdvisoryEntry {
  advisoryLevel: number;
  advisoryText: string;
  url?: string;
}

let advisoryCache: { data: Record<string, AdvisoryEntry>; fetchedAt: number } | null = null;
const ADVISORY_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchAdvisories(): Promise<Record<string, AdvisoryEntry>> {
  const now = Date.now();
  if (advisoryCache && now - advisoryCache.fetchedAt < ADVISORY_TTL_MS) {
    return advisoryCache.data;
  }
  try {
    const res = await fetch(
      'https://travel.state.gov/content/dam/travelinformation/traveladvisories/TAsByCountry.json',
      { next: { revalidate: 21600 } }
    );
    if (!res.ok) return advisoryCache?.data ?? {};
    const data = await res.json();
    advisoryCache = { data, fetchedAt: now };
    return data;
  } catch {
    return advisoryCache?.data ?? {};
  }
}

// ─── Climate context (Open-Meteo, free, no key) ──────────────────────────────

async function fetchClimateContext(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=2023-01-01&end_date=2023-12-31&monthly=temperature_2m_mean,precipitation_sum&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return '';
    const data = await res.json();
    const temps: number[] = data.monthly?.temperature_2m_mean ?? [];
    const rain: number[] = data.monthly?.precipitation_sum ?? [];
    if (!temps.length || !rain.length) return '';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sorted = [...rain].sort((a, b) => a - b);
    const medianRain = sorted[Math.floor(sorted.length / 2)];
    const bestMonths = months.filter((_, i) => temps[i] !== null && rain[i] !== null && temps[i] > 18 && rain[i] < medianRain);
    if (!bestMonths.length) return '';
    return `Climate sweet spot: ${bestMonths.join(', ')}.`;
  } catch {
    return '';
  }
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

async function geminiOnce(systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// Retry once on 503 (high demand) with a 1.5s delay
async function gemini(systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  try {
    return await geminiOnce(systemPrompt, userMessage, maxTokens);
  } catch (err) {
    const msg = (err as Error).message || '';
    if (msg.includes('503')) {
      await new Promise(r => setTimeout(r, 1500));
      return await geminiOnce(systemPrompt, userMessage, maxTokens);
    }
    throw err;
  }
}

// ─── Tavily ──────────────────────────────────────────────────────────────────

async function tavilySearch(query: string, topic: 'general' | 'news' = 'general'): Promise<string> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      topic,
      max_results: 5,
      include_answer: true,
      include_domains: topic === 'news'
        ? ['reuters.com', 'bbc.com', 'travel.state.gov', 'smartraveller.gov.au', 'theguardian.com', 'apnews.com']
        : ['reddit.com', 'tripadvisor.com', 'lonelyplanet.com', 'nomadicmatt.com', 'theplanetd.com', 'travelandleisure.com', 'cntraveler.com'],
    }),
  });
  if (!res.ok) return 'Search unavailable';
  const data = await res.json();
  const results = data.results?.slice(0, 4).map((r: { title: string; content: string; url: string }) =>
    `[${r.title}]\n${r.content?.slice(0, 300)}\nSource: ${r.url}`
  ).join('\n\n');
  return data.answer ? `Summary: ${data.answer}\n\nDetails:\n${results}` : results || 'No results';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJson(text: string) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    // Try extracting the outermost JSON object
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    // Recovery: if JSON was truncated mid-response, try to extract whatever
    // complete destination objects exist and build a valid partial response
    try {
      const destMatch = clean.match(/"destinations"\s*:\s*\[[\s\S]*/);
      if (destMatch) {
        const arrayStart = destMatch[0].indexOf('[');
        const partial = destMatch[0].slice(arrayStart);
        // Find all complete destination objects (those with a closing })
        const objects: string[] = [];
        let depth = 0, start = -1;
        for (let i = 0; i < partial.length; i++) {
          if (partial[i] === '{') { if (depth === 0) start = i; depth++; }
          else if (partial[i] === '}') {
            depth--;
            if (depth === 0 && start !== -1) { objects.push(partial.slice(start, i + 1)); start = -1; }
          }
        }
        if (objects.length > 0) {
          const recovered = JSON.parse(`[${objects.join(',')}]`);
          return { destinations: recovered, searchedFor: 'Your vibe destinations' };
        }
      }
    } catch { /* give up */ }
    throw new Error('Failed to parse JSON response');
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const rateLimitRes = checkRateLimit(req, 10, 60_000);
  if (rateLimitRes) return rateLimitRes;

  // Reject oversized payloads (max 8KB)
  const sizeRes = checkContentLength(req, 8_192);
  if (sizeRes) return sizeRes;

  try {
    const { vibe, travelerDna, pastVibes, visitedPlaces, wishlistedPlaces } = await req.json();

    if (!vibe || typeof vibe !== 'string' || vibe.trim().length < 3) {
      return NextResponse.json({ error: 'Please describe your vibe.' }, { status: 400 });
    }

    // Sanitize all user inputs: strip control chars + prompt injection patterns
    const cleanVibe = sanitizeUserInput(vibe, 500);
    const cleanDna = travelerDna && typeof travelerDna === 'string'
      ? sanitizeUserInput(travelerDna, 400)
      : '';
    const cleanPastVibes: string[] = Array.isArray(pastVibes)
      ? pastVibes.filter((v: unknown) => typeof v === 'string').slice(0, 3).map((v: string) => sanitizeUserInput(v, 120))
      : [];

    const cleanVisited: string[] = Array.isArray(visitedPlaces)
      ? visitedPlaces.filter((v: unknown) => typeof v === 'string').slice(0, 20).map((v: string) => sanitizeUserInput(v, 80))
      : [];

    const cleanWishlisted: string[] = Array.isArray(wishlistedPlaces)
      ? wishlistedPlaces.filter((v: unknown) => typeof v === 'string').slice(0, 20).map((v: string) => sanitizeUserInput(v, 80))
      : [];

    // STEP 1: Gemini plans searches
    const pastVibesHint = cleanPastVibes.length > 0
      ? ` The traveler has recently searched for: ${cleanPastVibes.map(v => `"${v}"`).join(', ')}. Vary the recommendations — avoid destinations that would closely match those prior searches.`
      : '';

    const planPrompt = cleanDna
      ? `You are a travel research planner. The traveler has a personal profile: "${cleanDna}".${pastVibesHint} Use this to inform the search queries you choose.`
      : `You are a travel research planner.${pastVibesHint}`;

    const planText = await gemini(
      `${planPrompt} Given a traveler vibe, output ONLY a JSON object with search queries. No explanation, no markdown.

Format exactly:
{"destination_queries":["query1","query2","query3"],"safety_queries":["safety query1","safety query2"]}

Rules:
- destination_queries: 3 specific Reddit/blog style queries to find matching hidden gem destinations
- safety_queries: 2 news queries to check current safety or cost impacts for likely destination regions
- Queries should be specific (e.g. "lesser known coastal towns Europe reddit 2024")`,
      `Traveler vibe: "${cleanVibe}"`,
      400
    );

    let searchPlan: { destination_queries: string[]; safety_queries: string[] };
    try {
      searchPlan = parseJson(planText);
    } catch {
      searchPlan = {
        destination_queries: [`travel destinations ${cleanVibe}`, `hidden gem places ${cleanVibe} reddit`],
        safety_queries: ['international travel safety alerts 2025', 'travel advisories current warnings'],
      };
    }

    // STEP 2: Run Tavily searches in parallel
    const [destResults, safetyResults] = await Promise.all([
      Promise.all((searchPlan.destination_queries || []).slice(0, 3).map(q => tavilySearch(q, 'general'))),
      Promise.all((searchPlan.safety_queries || []).slice(0, 2).map(q => tavilySearch(q, 'news'))),
    ]);

    const destinationContext = destResults.map((r, i) =>
      `=== Destination Search ${i + 1}: "${searchPlan.destination_queries[i]}" ===\n${r}`
    ).join('\n\n');

    const safetyContext = safetyResults.map((r, i) =>
      `=== Safety Search ${i + 1}: "${searchPlan.safety_queries[i]}" ===\n${r}`
    ).join('\n\n');

    const dnaContext = cleanDna
      ? `\n\nTRAVELER DNA (personalize results to this profile):\n${cleanDna}`
      : '';

    const pastVibesContext = cleanPastVibes.length > 0
      ? `\n\nPAST SEARCHES (prioritize variety — avoid recommending the same destinations as these trips):\n${cleanPastVibes.map((v, i) => `${i + 1}. "${v}"`).join('\n')}`
      : '';

    const visitedContext = cleanVisited.length > 0
      ? `\n\nPLACES ALREADY VISITED (do NOT recommend these or their immediate neighbors — user has been there):\n${cleanVisited.map((v, i) => `${i + 1}. ${v}`).join('\n')}`
      : '';

    const wishlistContext = cleanWishlisted.length > 0
      ? `\n\nWISHLISTED PLACES (user is interested in these — bias toward similar vibes and regions, but don't repeat them exactly):\n${cleanWishlisted.map((v, i) => `${i + 1}. ${v}`).join('\n')}`
      : '';

    const synthesisSystemPrompt = `You are Vibe, an honest and surprising travel guide. Synthesize research into exactly 3 destination recommendations.

Return ONLY this JSON structure, nothing else:
{
  "destinations": [
    {
      "name": "City or Region Name",
      "country": "Country",
      "tagline": "One short evocative sentence",
      "whyItFits": "2 sentences on why this fits the vibe",
      "hiddenGemTip": "One specific insider tip from Reddit or blogs",
      "bestTime": "Best months and one reason why",
      "crowdLevel": "low",
      "safetyStatus": "green",
      "safetyNote": "1 sentence on current safety or advisories",
      "costSignal": "budget",
      "vibeEmoji": "2-3 emojis",
      "region": "e.g. Southeast Asia",
      "lat": 48.8566,
      "lng": 2.3522
    }
  ],
  "searchedFor": "Brief description of what angle was searched"
}

crowdLevel must be one of: "low", "medium", "high"
safetyStatus must be one of: "green", "yellow", "red"
costSignal must be one of: "budget", "mid", "splurge"

Rules:
- Return EXACTLY 3 destinations
- If traveler DNA is provided, filter and personalize destinations to match that profile
- Be honest about safety - mark red/yellow if real warnings exist
- Prioritize surprising, non-obvious choices
- costSignal: budget = under $80/day, mid = $80-200/day, splurge = $200+/day
- lat/lng: approximate decimal coordinates of the destination city center (not country capital unless they are the same)`;

    const synthesisUserPrompt = `Traveler vibe: "${cleanVibe}"${dnaContext}${pastVibesContext}${visitedContext}${wishlistContext}

=== DESTINATION RESEARCH ===
${destinationContext}

=== SAFETY AND NEWS CONTEXT ===
${safetyContext}

Return only valid JSON with exactly 3 destinations.`;

    // STEP 3: First synthesis pass
    const synthesisText = await gemini(synthesisSystemPrompt, synthesisUserPrompt, 6000);
    let result = parseJson(synthesisText);

    // STEP 3b: Apply State Dept advisory data + climate context
    if (Array.isArray(result.destinations)) {
      // Advisory overrides
      const advisories = await fetchAdvisories();
      const advisoryKeys = Object.keys(advisories).map(k => normalizeCountry(k));

      result.destinations = result.destinations.map((d: Destination) => {
        const normalized = normalizeCountry(d.country);
        const matchIndex = advisoryKeys.findIndex(k => k === normalized);
        if (matchIndex === -1) return d;

        const matchedKey = Object.keys(advisories)[matchIndex];
        const entry = advisories[matchedKey];
        const level = entry.advisoryLevel as 1 | 2 | 3 | 4;
        const levelLabel =
          level === 1 ? 'Level 1: Exercise Normal Precautions.' :
          level === 2 ? 'Level 2: Exercise Increased Caution.' :
          level === 3 ? 'Level 3: Reconsider Travel.' :
          'Level 4: Do Not Travel.';

        return {
          ...d,
          advisoryLevel: level,
          safetyStatus: level <= 1 ? 'green' : level === 2 ? 'yellow' : 'red',
          safetyNote: level <= 1
            ? `${levelLabel} ${d.safetyNote}`.trim()
            : `${levelLabel} ${d.safetyNote}`.trim(),
        };
      });

      // Sanitize and enrich coordinates
      result.destinations = result.destinations.map((d: Destination) => {
        const lat = typeof d.lat === 'number' && d.lat >= -90 && d.lat <= 90 ? d.lat : undefined;
        const lng = typeof d.lng === 'number' && d.lng >= -180 && d.lng <= 180 ? d.lng : undefined;
        return { ...d, lat, lng };
      });

      // Climate context (parallel, non-blocking)
      const climateResults = await Promise.all(
        result.destinations.map((d: Destination) =>
          d.lat != null && d.lng != null ? fetchClimateContext(d.lat, d.lng) : Promise.resolve('')
        )
      );

      result.destinations = result.destinations.map((d: Destination, i: number) => ({
        ...d,
        bestTime: climateResults[i] ? `${d.bestTime} ${climateResults[i]}` : d.bestTime,
      }));
    }

    // STEP 4: Reflection pass — check quality, retry once if needed
    try {
      const destinationSummary = (result.destinations || [])
        .map((d: { name: string; country: string; tagline: string }, i: number) =>
          `${i + 1}. ${d.name}, ${d.country} - "${d.tagline}"`
        ).join('\n');

      const dnaCheck = cleanDna
        ? `\nTraveler DNA to check against: "${cleanDna}"`
        : '';

      const reflectionText = await gemini(
        `You are a strict travel editor reviewing AI-generated destination recommendations.

Return ONLY this JSON:
{"approved": true}

OR if there are real problems:
{"approved": false, "feedback": "specific criticism here"}

Reject if ANY of these are true:
- A destination is an obvious tourist trap or major overvisited city that does not fit the vibe
- A destination clearly does not match the traveler vibe described
- The destinations are too similar to each other (e.g. all beach towns, all European capitals)
- A destination conflicts with the traveler DNA profile if provided
- The picks feel generic and interchangeable

Approve if the picks are genuinely surprising, specific, and well-matched.`,
        `Traveler vibe: "${cleanVibe}"${dnaCheck}

Proposed destinations:
${destinationSummary}

Are these good picks? Return JSON only.`,
        300
      );

      const reflection = parseJson(reflectionText);

      // If reflection rejects, do one more synthesis pass with feedback
      if (reflection.approved === false && reflection.feedback) {
        const retryText = await gemini(
          synthesisSystemPrompt,
          `${synthesisUserPrompt}

IMPORTANT - A quality review flagged issues with a previous attempt:
"${reflection.feedback}"

Fix these issues in your response. Be more surprising and specific.`,
          6000
        );
        result = parseJson(retryText);
      }
    } catch {
      // Reflection failed silently - return original result
    }

    return NextResponse.json(result);
  } catch (err) {
    safeLogError('discover', err);
    return NextResponse.json(
      { error: 'Something went wrong finding your destinations. Please try again.' },
      { status: 500 }
    );
  }
}

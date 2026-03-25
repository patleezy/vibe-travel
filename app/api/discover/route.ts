import { NextRequest, NextResponse } from 'next/server';

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

function parseJson(text: string) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse JSON response');
  }
}

export async function POST(req: NextRequest) {
  try {
    const { vibe, travelerDna } = await req.json();

    if (!vibe || typeof vibe !== 'string' || vibe.trim().length < 3) {
      return NextResponse.json({ error: 'Please describe your vibe.' }, { status: 400 });
    }

    const cleanVibe = vibe.trim().slice(0, 500);
    const cleanDna = travelerDna && typeof travelerDna === 'string' ? travelerDna.trim().slice(0, 400) : '';

    // STEP 1: Gemini plans searches
    const planPrompt = cleanDna
      ? `You are a travel research planner. The traveler has a personal profile: "${cleanDna}". Use this to inform the search queries you choose.`
      : `You are a travel research planner.`;

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
      "region": "e.g. Southeast Asia"
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
- costSignal: budget = under $80/day, mid = $80-200/day, splurge = $200+/day`;

    const synthesisUserPrompt = `Traveler vibe: "${cleanVibe}"${dnaContext}

=== DESTINATION RESEARCH ===
${destinationContext}

=== SAFETY AND NEWS CONTEXT ===
${safetyContext}

Return only valid JSON with exactly 3 destinations.`;

    // STEP 3: First synthesis pass
    const synthesisText = await gemini(synthesisSystemPrompt, synthesisUserPrompt, 4000);
    let result = parseJson(synthesisText);

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
          4000
        );
        result = parseJson(retryText);
      }
    } catch {
      // Reflection failed silently - return original result
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Vibe API error:', err);
    return NextResponse.json(
      { error: 'Something went wrong finding your destinations. Please try again.' },
      { status: 500 }
    );
  }
}

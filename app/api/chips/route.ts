import { NextRequest, NextResponse } from 'next/server';
import { sanitizeUserInput, checkRateLimit, checkContentLength, safeLogError } from '@/lib/security';

export async function POST(req: NextRequest) {
  // Rate limit: 5 personalizations per minute per IP
  const rateLimitRes = checkRateLimit(req, 5, 60_000);
  if (rateLimitRes) return rateLimitRes;

  // Reject oversized payloads (max 2KB)
  const sizeRes = checkContentLength(req, 2_048);
  if (sizeRes) return sizeRes;

  try {
    const { travelerDna } = await req.json();

    if (!travelerDna || typeof travelerDna !== 'string' || travelerDna.trim().length < 5) {
      return NextResponse.json({ error: 'DNA profile required.' }, { status: 400 });
    }

    const cleanDna = sanitizeUserInput(travelerDna, 400);

    // Gemini call with retry on 503/429
    const delays = [1500, 3000];
    let geminiData: { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] } | null = null;
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{
                  text: `You generate short, evocative travel vibe prompts tailored to a specific traveler profile.

Return ONLY valid JSON, nothing else:
{"chips":[{"emoji":"🏔️","text":"A quiet mountain lodge with good bourbon"},{"emoji":"🌊","text":"Rainy coastal town for writing a novel"},{"emoji":"🍜","text":"Neon city with incredible street food"},{"emoji":"🏛️","text":"Ancient ruins with almost no tourists"}]}

Rules:
- Return EXACTLY 4 chips
- Each chip: one emoji + one evocative sentence (max 10 words)
- Tailor all chips to the traveler profile
- Be specific and surprising, not generic
- Vary settings across the 4 chips`
                }]
              },
              contents: [{ role: 'user', parts: [{ text: `Traveler profile: "${cleanDna}"` }] }],
              generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.8,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const msg = JSON.stringify(errBody);
          if (attempt < delays.length && (res.status === 503 || res.status === 429)) {
            await new Promise(r => setTimeout(r, delays[attempt]));
            continue;
          }
          return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
        }

        geminiData = await res.json();
        break;
      } catch (e) {
        lastErr = e as Error;
        if (attempt < delays.length) {
          await new Promise(r => setTimeout(r, delays[attempt]));
        }
      }
    }

    if (!geminiData) {
      safeLogError('chips', lastErr ?? new Error('Gemini unreachable'));
      return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = text.replace(/```json|```/g, '').trim();

    if (!clean) {
      safeLogError('chips', new Error(`Empty Gemini response. finishReason=${geminiData.candidates?.[0]?.finishReason ?? 'unknown'}`));
      return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      // Try to extract chips array from partial response
      const match = clean.match(/"chips"\s*:\s*\[[\s\S]*?\]/);
      if (match) {
        try {
          parsed = JSON.parse(`{${match[0]}}`);
        } catch {
          safeLogError('chips', new Error(`JSON parse failed: ${clean.slice(0, 200)}`));
          return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
        }
      } else {
        safeLogError('chips', new Error(`JSON parse failed: ${clean.slice(0, 200)}`));
        return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    safeLogError('chips', err);
    return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
  }
}

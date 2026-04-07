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

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You generate short, evocative travel vibe prompts tailored to a specific traveler profile.

Return ONLY this JSON structure, nothing else:
{
  "chips": [
    { "emoji": "🏔️", "text": "A quiet mountain lodge with good bourbon" },
    { "emoji": "🌊", "text": "Rainy coastal town for writing a novel" },
    { "emoji": "🍜", "text": "Neon city with incredible street food" },
    { "emoji": "🏛️", "text": "Ancient ruins with almost no tourists" }
  ]
}

Rules:
- Return EXACTLY 4 chips
- Each chip: one emoji + one evocative sentence (max 10 words) describing a travel feeling or scenario
- Tailor all chips to the traveler's profile — their type, what they seek, what they avoid
- Be specific and surprising, not generic (avoid "beach vacation" or "city trip")
- Vary the settings across the 4 chips
- Do NOT repeat themes across chips`
            }]
          },
          contents: [{ role: 'user', parts: [{ text: `Traveler profile: "${cleanDna}"` }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = text.replace(/```json|```/g, '').trim();

    if (!clean) {
      safeLogError('chips', new Error(`Empty Gemini response. finishReason=${data.candidates?.[0]?.finishReason ?? 'unknown'}`));
      return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
    }

    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (err) {
    safeLogError('chips', err);
    return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { travelerDna } = await req.json();

    if (!travelerDna || typeof travelerDna !== 'string' || travelerDna.trim().length < 5) {
      return NextResponse.json({ error: 'DNA profile required.' }, { status: 400 });
    }

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
    ...
  ]
}

Rules:
- Return EXACTLY 10 chips
- Each chip: one emoji + one evocative sentence (max 10 words) describing a travel feeling or scenario
- Tailor all chips to the traveler's profile — their type, what they seek, what they avoid
- Be specific and surprising, not generic (avoid "beach vacation" or "city trip")
- Vary the settings: mix urban, rural, remote, cultural, culinary, adventure, slow travel
- Do NOT repeat themes across chips`
            }]
          },
          contents: [{ role: 'user', parts: [{ text: `Traveler profile: "${travelerDna.trim().slice(0, 400)}"` }] }],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.9,
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
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Chips API error:', err);
    return NextResponse.json({ error: 'Failed to generate chips.' }, { status: 500 });
  }
}

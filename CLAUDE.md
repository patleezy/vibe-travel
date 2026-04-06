# Vibe Travel

Next.js 14 App Router travel discovery app at vibetravel.space.

## Stack
- **AI**: Google Gemini 2.5 Flash (`GEMINI_API_KEY`)
- **Search**: Tavily API (`TAVILY_API_KEY`)
- **Map**: react-leaflet v4.2.1 (pinned — v5 requires React 19)
- **Styling**: CSS variables in `app/globals.css`, dark/light via `.dark` class on `<html>`
- **Deploy**: Vercel, branch `claude/fix-vercel-deployment-lM1Ok` → merges to `main`

## Key files
- `app/page.tsx` — main page, all client state
- `app/api/discover/route.ts` — Gemini + Tavily pipeline (plan → search → synthesize → reflect)
- `app/api/chips/route.ts` — personalized vibe chip generation
- `components/Drawer.tsx` — hamburger drawer (Saved | Wishlist | Visited | DNA tabs)
- `components/DestinationCard.tsx` — destination result card
- `components/DestinationMap.tsx` — Leaflet map (dynamic import, ssr:false)
- `lib/security.ts` — rate limiting, prompt injection guard, safe logging
- `lib/advisoryNormalize.ts` — US State Dept country name aliases
- `types/index.ts` — shared TypeScript types

## localStorage keys
- `vt-dna` — travel DNA profile object
- `vt-trips` — past vibes (last 3 searches), auto-saved
- `vt-saved` — explicitly saved trips
- `vt-tags` — destination tags (`Record<"name|country", TagEntry>`)

## sessionStorage keys
- `vt-chips-session` — current session's 10 random chips
- `vt-chips-dna` — personalized chips (cleared when DNA profile changes)

## Gemini prompt pipeline (discover route)
1. Plan: Gemini picks 3 Tavily search queries (400 tokens)
2. Search: 3 parallel Tavily calls (general + news topics)
3. Synthesize: Gemini produces JSON with 3 destinations (6000 tokens)
4. Post-process: State Dept advisory overrides + Open-Meteo climate data
5. Reflect: Gemini quality-checks and optionally triggers a retry (300 tokens)

## TypeScript notes
- Strict mode — no implicit `any` in filter/map callbacks
- `filter((t: { vibe: string }) => ...)` pattern required for untyped arrays
- `DestinationTags = Record<string, TagEntry>` (not bare string — stores full destination data)

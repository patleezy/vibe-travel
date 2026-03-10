# 🧭 Vibe Travel

> Don't tell me where. Tell me how you want to feel.

AI-powered vibe-based travel discovery with real-time safety signals.

## How it works (agentic loop)

1. **You describe a vibe** — "misty mountain village with no tourists"
2. **Claude decides what to search** — generates specific Reddit/blog queries
3. **Tavily searches the live web** — hits Reddit, travel blogs, news sites in parallel
4. **Claude synthesizes results** — cross-references safety news, curates 3-5 surprising destinations with honest safety signals

## Tech Stack

- **Next.js 14** (App Router)
- **Anthropic API** — claude-sonnet-4 for agentic reasoning
- **Tavily API** — real-time web search
- **Tailwind CSS** — light/dark mode

## Setup

### 1. Clone & install

```bash
git clone https://github.com/yourusername/vibe-travel
cd vibe-travel
npm install
```

### 2. Add environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your actual API keys
```

Get your keys:
- Anthropic: https://console.anthropic.com/
- Tavily: https://tavily.com/

### 3. Run locally

```bash
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

### Option A: Via Vercel dashboard (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables in Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `TAVILY_API_KEY`
4. Deploy ✓

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel --prod
# Follow prompts, then add env vars in dashboard
```

## Security notes

- API keys live only in Vercel environment variables — never exposed to the browser
- All Anthropic + Tavily calls happen in server-side API routes (`/api/discover`)
- User input is capped at 500 characters and wrapped in a controlled system prompt
- No user data is stored or logged

## Safety signals

Each destination includes a real-time safety assessment:
- 🟢 **All clear** — no current advisories
- 🟡 **Heads up** — minor advisories, elevated costs, or regional instability
- 🔴 **Reconsider** — active State Dept warnings, conflict zones, or serious safety concerns

Safety data is pulled from Reuters, BBC, travel.state.gov, and other news sources via Tavily.

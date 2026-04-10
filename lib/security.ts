import { NextRequest, NextResponse } from 'next/server';

// ─── Prompt injection guard ───────────────────────────────────────────────────
// Strips control characters and removes patterns commonly used to override
// LLM system prompts. Does NOT block normal travel-related text.

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /override\s+(the\s+)?(system|previous)\s+(prompt|instructions?)/gi,
  /forget\s+(everything|all)\s+(above|previous|prior)/gi,
  /you\s+are\s+now\s+(?!a\s+travel)/gi, // "you are now [not travel-related]"
  /act\s+as\s+(?!a?\s*travel)/gi,        // "act as [not travel-related]"
  /new\s+instructions?\s*:/gi,
  /\bsystem\s*prompt\b/gi,
  /\bjailbreak\b/gi,
];

export function sanitizeUserInput(input: string, maxLen: number): string {
  let s = input
    // Remove ASCII control characters (keep tab, newline, carriage return)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLen);

  for (const pattern of INJECTION_PATTERNS) {
    s = s.replace(pattern, '[removed]');
  }

  return s;
}

// ─── In-process rate limiter (best-effort; resets on cold start) ─────────────
// Not a substitute for a real distributed rate limiter, but catches simple
// same-instance abuse without any external dependency.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  });
}, 5 * 60 * 1000);

export function checkRateLimit(
  req: NextRequest,
  limit: number,
  windowMs: number
): NextResponse | null {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return null; // allowed
  }

  if (entry.count >= limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    );
  }

  entry.count++;
  return null; // allowed
}

// ─── Request body size guard ──────────────────────────────────────────────────

export function checkContentLength(req: NextRequest, maxBytes: number): NextResponse | null {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  }
  return null;
}

// ─── Safe error logging ───────────────────────────────────────────────────────
// Logs errors without risk of leaking API keys or user data from error messages.

export function safeLogError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  // Redact API keys that might appear in error messages (e.g. from fetch errors)
  const redacted = message
    .replace(/key=[^&\s"]+/g, 'key=***')
    .replace(/"key"\s*:\s*"[^"]+"/g, '"key":"***"');
  console.error(`[${context}]`, redacted);
}

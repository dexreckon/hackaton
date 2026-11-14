// Gemini first (one or more keys, tried in turn), then Groq, then OpenRouter.
// Retries 429 / 5xx with backoff, honours Retry-After, times out, never throws raw HTTP errors at the UI.
export type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

interface Provider { name: string; url: string; key?: string; model: string; extra?: Record<string, string>; params?: Record<string, unknown> }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// GEMINI_API_KEY may hold several keys separated by commas; when one hits its rate limit the next is used.
const geminiKeys = () => (process.env.GEMINI_API_KEY ?? '').split(',').map((k) => k.trim()).filter(Boolean);

function providers(): Provider[] {
  const gm = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return [
    // Gemini's OpenAI-compatible endpoint, so the request and response shape are the same as the others.
    ...geminiKeys().map((key, i) => ({ name: geminiKeys().length > 1 ? `gemini-${i + 1}` : 'gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key, model: gm,
      // Gemini 2.5 "thinks" by default and those hidden tokens count against max_tokens; this app wants short, direct answers.
      params: { reasoning_effort: process.env.GEMINI_REASONING || 'none' } })),
    { name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' },
    { name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free', extra: { 'X-Title': 'Orbit triage' } },
  ];
}

export const llmConfigured = () => providers().some((p) => !!p.key);

export async function complete(messages: Msg[], opts: { maxTokens?: number; attempts?: number; timeoutMs?: number } = {}): Promise<{ text: string; provider: string }> {
  const attempts = opts.attempts ?? 3;
  const errors: string[] = [];
  for (const p of providers()) {
    if (!p.key) continue;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(p.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}`, ...p.extra },
          body: JSON.stringify({ model: p.model, messages, temperature: 0.1, max_tokens: opts.maxTokens ?? 600, ...p.params }),
          signal: AbortSignal.timeout(opts.timeoutMs ?? 20000),
        });
        if (res.status === 429 || res.status >= 500) {
          errors.push(`${p.name} ${res.status}`);
          const wait = Math.min(Number(res.headers.get('retry-after')) * 1000 || 700 * 2 ** i, 5000);
          if (i < attempts - 1) await sleep(wait);
          continue; // retry, then fall through to the next provider
        }
        if (!res.ok) { errors.push(`${p.name} ${res.status}`); break; } // 4xx other than 429: do not retry, try next provider
        const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = j.choices?.[0]?.message?.content?.trim();
        if (text) return { text, provider: p.name };
        errors.push(`${p.name} empty answer`);
        break;
      } catch (e) {
        errors.push(`${p.name} ${(e as Error).name}`);
        if (i < attempts - 1) await sleep(500 * 2 ** i);
      }
    }
  }
  throw new Error(errors.length ? `LLM unavailable: ${errors.join(', ')}` : 'LLM unavailable: no API key set');
}

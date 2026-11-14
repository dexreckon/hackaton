# Orbit Triage: Security Incident Triage Assistant

Reads the 20 evidence files in `problem_c_data/`, builds a cited incident timeline, scores severity, tells you who to inform, and answers questions about the incident.

## How it works
1. `npm run build:data` parses every log into events (deterministic code, no LLM) and writes `src/generated/evidence.json`.
2. The web app shows Overview, Timeline, Attack chain, Who is who, Report and Ask.
3. The LLM (Groq, then OpenRouter) is only used to answer chat questions and polish the summary. Every sentence must carry a `[file:line]` citation. A verifier drops sentences with bad citations, and unhedged "stolen/leaked" wording (rule 2.4).
4. With no API key, or if the LLM fails, a local keyword search answers instead.

## Run
```
npm install
cp .env.example .env.local   # add GROQ_API_KEY (optional)
npm run build:data
npm run check
npm run dev                  # http://localhost:3000
```
Docker: `docker compose up --build`

## Known failure cases
- Free LLM tiers can rate limit. We retry with backoff, fall back to OpenRouter, then to local search.
- The local search fallback matches keywords, so vague questions can return weak matches.
- Parsing is tuned to the provided log formats. A new format needs a new parser in `src/lib/parsers.ts`.
- The rate limiter is in memory, so it resets on each serverless cold start.

See `tests/redteam.md` for the red-team questions.

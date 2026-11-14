# Developer notes

How the new UI, the colour themes and the AI providers work. For setup, see the README.

## Setup with Gemini

```
npm install
cp .env.example .env.local
npm run build:data
npm run check
npm run dev            # http://localhost:3000
```

In `.env.local`:

```
GEMINI_API_KEY=key-one,key-two      # one or more keys, comma-separated
GEMINI_MODEL=gemini-2.5-flash       # optional
GEMINI_REASONING=none               # optional: none (default), low, medium, high
```

Restart `npm run dev` after editing `.env.local`. `GET /api/health` returns `"llmConfigured": true` once a key is found. `.env.local` is git-ignored; never commit keys.

## AI provider order

`src/lib/llm.ts` tries providers in this order, moving on when one fails or keeps returning 429 / 5xx:

1. **Gemini**: each key in `GEMINI_API_KEY`, in turn (`gemini-1`, `gemini-2`, …). Uses Google's OpenAI-compatible endpoint, so the request and response are the same shape as the others.
2. **Groq**: `GROQ_API_KEY`.
3. **OpenRouter**: `OPENROUTER_API_KEY`.
4. If none answer, `src/lib/ask.ts` falls back to the built-in keyword search over the verified findings.

Every model answer still goes through the citation verifier (`src/lib/verify.ts`): sentences without a real `[file:line]` citation, or with unhedged "stolen/leaked" wording, are removed.

Gemini 2.5 "thinks" by default and those hidden tokens count against `max_tokens`, which can leave the visible answer empty. `reasoning_effort` is therefore sent as `none` unless `GEMINI_REASONING` says otherwise.

## Components

```
Dashboard.tsx          top bar, tabs, page titles, theme, opening scan state
├── Home.tsx           home screen (the default tab)
│   ├── Eye.tsx        3D stage: blob (back) → arcs (middle) → iris (front)
│   │   └── IrisCanvas.tsx   canvas iris, colour easing, scan sweep
│   └── AskPanel.tsx   compact answer panel (compact + initial + onClose props)
├── Overview / Timeline / AttackChain / Matches / ReportView / AskPanel
└── RawPanel.tsx       side drawer with the raw log line
```

### Eye states

`eyeState()` in `Home.tsx` decides the colour from the report:

| Situation | State | Colour |
|---|---|---|
| No open incidents | `safe` | blue |
| Worst open incident P1 or P2 | `alert` | red |
| Otherwise | `warn` | amber |

While the opening scan runs (`scanning = true`) the eye is always blue. The scan plays once per page load (module-level flag in `Dashboard.tsx`), not on every return to Home.

`IrisCanvas` keeps its own palette and eases it toward the target every frame, so the change from blue to red is a smooth fade. With `prefers-reduced-motion`, rotation stops and the loop ends once the colour has settled.

The 3D effect is plain CSS: `.eye-stage` has `perspective`, `.eye-tilt` uses `preserve-3d` and is rotated from the pointer position (`--rx`, `--ry`, `--px`, `--py`), and each `.layer` sits at its own `translateZ`.

Colours that fade with the state (`--blob`, `--glow`, `--eye-line`, `--eye-light`, `--eye-mid`) are registered with `@property` so CSS can animate them.

## Colour themes

Set on `.app` as `data-palette`. Default: **obsidian**.

| Theme | URL |
|---|---|
| Obsidian (default) | `/` |
| Dusk (original grey-lavender) | `/?theme=dusk` |
| Midnight | `/?theme=midnight` |
| Aurora | `/?theme=aurora` |
| Sunset | `/?theme=sunset` |

To change the default, edit `useState('obsidian')` in `Dashboard.tsx` and the `--bg1/--bg2/--bg3` values in `:root` in `globals.css`. Theme overrides are at the end of `globals.css`.

## Screenshot mode

`?still=1` skips the opening scan, jumps the eye straight to its final colour and turns off all animation. It exists so headless browsers can take clean screenshots. The mockups were made with:

```
chrome --headless=new --window-size=1440,900 --virtual-time-budget=9000 \
  --screenshot=mockups/theme-aurora.png "http://localhost:3000/?theme=aurora&still=1"
```

## Saved in the browser

The "What to do" checklist ticks are stored in `localStorage` under `orbit-done`, per browser only. Reads and writes are wrapped in `try/catch`, so the page still works where storage is blocked.

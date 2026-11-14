# Changes

Everything added or changed after the original build of the project, in one place.

## Summary

- A new **home screen** in a dark glass style, built around a 3D "eye" that scans the logs in **blue** and turns **red** when it finds a security problem.
- The whole app is now written for **people without a security background**: plain-English problem cards, a checklist of what to do, who to call, and a glossary.
- **Obsidian** (near-black) is the default colour theme; four others can be previewed.
- **Google Gemini** is now the first AI provider for the Ask box, with support for several keys.

## New files

| File | What it is |
|---|---|
| `src/components/Home.tsx` | The home screen: eye, status, headline, ask box, at-a-glance tiles, problem cards with checklists, "checked and harmless" list, glossary. |
| `src/components/Eye.tsx` | The 3D eye: a dark mass behind, orbit arcs and specks in the middle, the iris in front. Tilts toward the mouse. |
| `src/components/IrisCanvas.tsx` | Draws the iris on a canvas: fibres, rotating ring of ticks, dotted inner ring, breathing pupil, light glint and scanning sweep. Fades smoothly between blue, amber and red. |
| `CHANGES.md` | This file. |
| `docs/USER_GUIDE.md` | How to use the app, for non-technical readers. |
| `docs/DEVELOPER_NOTES.md` | How the new UI, themes and AI providers work, for developers. |
| `mockups/theme-*.png` | Screenshots of the five colour themes (1440×900). |
| `COPILOT_UPDATE.md` | Step-by-step instructions plus the full content of every new and changed file, for applying this update with GitHub Copilot. |
| `.env.local` *(local only, git-ignored)* | Empty placeholder for `GEMINI_API_KEY`. Paste your key here; it is never committed. |

## Changed files

| File | What changed |
|---|---|
| `src/components/Dashboard.tsx` | New glass top bar (Home, Details, Timeline, Story, Who is who, Report, Ask). Plays the opening scan once per page load. A title and one plain sentence on top of every inner page. Colour theme support (`?theme=`) and screenshot mode (`?still=1`). |
| `src/components/AskPanel.tsx` | New compact answer panel for the home screen: shows the question, a typing indicator, the answer and a close button. Fixed the answer appearing twice. |
| `src/app/globals.css` | Rewritten: design tokens, glass components, 3D eye layers, animations, home and inner-page styles, mobile layout, reduced-motion support, and the five colour themes. |
| `src/lib/llm.ts` | Gemini added as the first provider (OpenAI-compatible endpoint). Several comma-separated keys are tried in turn when one is rate-limited. Gemini's hidden "thinking" is off by default so answers are not cut short. |
| `src/lib/ask.ts` | The AI is told to answer in plain, everyday words, start with a one-sentence direct answer and explain any technical term. All citation and wording rules are unchanged. |
| `scripts/check.ts` | New check: Gemini is tried first and a rate-limited key falls over to the next one. Existing checks unchanged. |
| `.env.example` | `GEMINI_API_KEY` and `GEMINI_MODEL` added. |
| `README.md` | Mentions Gemini as the first provider. |

## Verification

- `npm run typecheck`: passes.
- `npm run check`: **All checks passed** (32 checks, including the new Gemini one).
- `npm run build`: passes.
- Checked in the browser at desktop (1366×800) and phone (375×812) width; no sideways scrolling on a phone.
- Not yet tested against the real Gemini API (needs a key in `.env.local`).

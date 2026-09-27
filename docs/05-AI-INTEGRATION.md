# AI integration

There are three separate AI-shaped features in this project. None of them use an AI
SDK/agent framework — all calls go through one thin wrapper: `src/lib/ai/client.ts`.

## 1. The model registry (shared by all three features)

Models are **not** defined in this repo. The source of truth is an external Python
file: `data_science/engine/model_config.py` (a sibling project, path configurable via
`ENGINE_DIR` env var, default `~/OneDrive/data_science/engine`). It defines 6 models
(free + paid, reasoning + coding) with cost-per-token, context window, and a
`default_max_tokens` per model.

`scripts/sync_models.py` reads that file and writes `src/generated/models.json`. This
runs automatically via `predev`/`prebuild` npm scripts (`npm run sync:models`). If the
engine folder is missing (e.g. a deploy server without it), the sync script leaves the
last-committed `models.json` alone rather than failing the build — commit
`models.json` to version control so this fallback works.

`src/lib/ai/models.ts` exposes the parsed registry: `ENGINE_MODELS`, `getModel(key)`,
`findBackup(key)` (each model can declare `backup_for` another model's key), and
`publicModelList()` (a browser-safe subset with no secrets, used to populate every
model-picker dropdown in the admin UI).

## 2. The call wrapper - `src/lib/ai/client.ts#chat()`

Mirrors the rules from the engine's own Python orchestrator:
- Reads the API key from `process.env.OPENROUTER_API_KEY` first, falling back to
  parsing `ENGINE_DIR/.env` directly (so you don't have to duplicate the key).
- **2 attempts** on the requested model, then **1 attempt on its backup model**
  (`findBackup()`), then throws.
- For paid models, estimates cost before calling and refuses if it would exceed the
  `ai.budgetInr` setting (`BudgetError`), checked against the running total in the
  `ai_usage` table (`aiSpendInr()`).
- Every call (success or failure) is logged to `ai_usage` with tokens/cost, feeding
  both the budget check and the Settings page's usage table.
- `extractJson<T>()` is a small helper that pulls a JSON object out of a model's reply
  even if it's wrapped in prose or a ```json fence, used because free models
  sometimes add commentary despite being told to reply with only JSON.
- Known failure mode: some free reasoning models spend their entire token budget on
  internal "reasoning" tokens and return an empty `content` string. The client
  detects this ("Model returned an empty reply") and treats it as a normal failure,
  triggering the retry/backup path, rather than crashing.

`FEATURE_MODEL_MAP` in `src/lib/ai/models.ts` sets the default model when a caller
passes `'auto'` - currently both `insights` and `assistant` default to
`free_reasoning_primary`.

## 3. AI Assistant (`src/server/ai-assistant.ts`, `/dashboard/assistant`)

A chat where the owner can ask questions and tell it to change the live website.

- Builds a context block every turn: current brand/theme/business settings, plus a
  compact snapshot of today's sales, stock, and top dishes, so the model always has
  fresh ground truth instead of hallucinating numbers.
- The system prompt defines a closed set of actions (`actionSchema`, a zod
  discriminated union) the model may request: change theme preset, set custom
  colours, change brand text/hours/contact, set tax %, toggle online
  ordering/reservations, change a dish's price, mark a dish sold out, set today's
  opening stock for an item.
- The model must reply with `{ "reply": "...", "actions": [...] }` as one JSON
  object. Every action is validated against `actionSchema` before being applied - an
  action failing validation is skipped and reported back as "Rejected", never
  silently ignored or executed anyway.
- Colour actions go through `sanitizeBrandColor()` (see `01-ARCHITECTURE.md`'s
  theming section), so the model literally cannot set a neon/cyberpunk colour even if
  asked to; it gets desaturated/darkened automatically and the assistant's reply says
  so.
- The system prompt explicitly instructs the model to refuse garish colour requests
  and explain why, then apply an elegant alternative instead. This was manually
  tested (see `PLAN.md`) by asking for "neon blue" and confirming it substituted a
  preset instead.

## 4. AI Insights (`src/server/ai-insights.ts`, `src/server/forecast.ts`, `/dashboard/insights`)

The forecast numbers are computed with plain statistics in TypeScript, not by the AI.
`forecast.ts#buildForecast()` does, per dish and for total revenue:
- Level: an exponentially-weighted moving average of the last ~21 days.
- Weekday seasonality: per-weekday multipliers, shrunk toward 1.0 when there isn't
  much history yet (avoids overfitting a single busy Saturday).
- Trend: a damped linear regression over the last 4 weeks.
- Backtest accuracy: it re-runs the same model trained on all-but-the-last-7-days and
  compares the prediction to what actually happened, producing an honest
  `backtestAccuracy` percentage shown in the UI - this is a real, checkable number,
  not a made-up confidence score.

The AI's only job (`generateInsight()`) is to read the finished forecast JSON and turn
it into a written summary, prioritised recommendations, and a 7-day prep-quantity
plan - the system prompt explicitly forbids it from inventing numbers not present in
the data it was given. Results are saved to the `ai_insights` table so history persists
across sessions.

## If you add a new AI-touching feature

- Add the feature to `FEATURE_MODEL_MAP` if it needs a sensible default model.
- Always call through `chat()` - don't hit OpenRouter directly - to keep
  retry/backup/budget/logging consistent.
- Always validate model output before using it for anything that mutates state
  (follow the `ai-assistant.ts` zod-schema pattern), and never let free-text model
  output reach `dangerouslySetInnerHTML`, SQL, or a shell command.

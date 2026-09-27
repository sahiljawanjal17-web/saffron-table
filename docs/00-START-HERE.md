# Start here — for any AI or developer picking up this project

This `docs/` folder is written so a new AI assistant (or human dev) with **zero prior
context** can read it and start making correct changes safely. Read files in this order:

1. **00-START-HERE.md** (this file) — orientation, golden rules
2. **01-ARCHITECTURE.md** — tech stack, folder map, how a request flows end to end
3. **02-DATABASE.md** — every table, every column, the stock/order invariants
4. **03-PAGES-AND-ROUTES.md** — every page and API route, what each does
5. **04-PAYMENTS.md** — payment methods, what's wired up, **what's still pending**
6. **05-AI-INTEGRATION.md** — how the engine models plug in, AI assistant, AI insights
7. **06-CONVENTIONS-AND-REUSE.md** — coding patterns to follow, the reuse-first rule
8. **07-SETUP-AND-DEPLOY.md** — env vars, running locally, deploying

The project's own root files are still authoritative and should be read too:
- `../PLAN.md` — full history of what was built, why, and the reuse log (which repo
  each piece of UI came from). **This is the most detailed single file.**
- `../README.md` — shorter, user-facing setup/run instructions.
- `../env.example.txt` — every environment variable, with comments on where to get it.

## What this project is

**Saffron Table** — a white-label restaurant / cloud-kitchen website + back-office
system. One codebase serves:
- A public customer website (menu, cart, checkout, table booking, order tracking)
- An admin dashboard at `/dashboard` (POS, stock, staff, finance, reports, AI)

It is built to be **re-skinned and resold** to different restaurants: brand name,
colours, copy, menu and payment settings all live in the database (`settings` table),
editable from `/dashboard/settings` or by asking the AI assistant in plain language —
never hardcoded in components.

## Golden rules — read before editing anything

1. **Reuse first, hand-write last.** This project was built by copying files from
   MIT-licensed open-source repos (dashboard starter, restaurant landing page
   templates, a POS terminal) and adapting them, not by writing everything from
   scratch. If you need a new page/section/feature: look for an existing open-source
   component first, copy it, adapt it. Only hand-write when nothing suitable exists.
   Full details and the list of what came from where: `06-CONVENTIONS-AND-REUSE.md`
   and `../PLAN.md` section 8 ("Reuse Log"). **Keep that Reuse Log updated** when you
   add something new — this is a standing project rule, not a one-time task.
2. **Never oversell stock.** Order placement uses a single SQL `UPDATE ... WHERE
   remaining >= qty` inside a DB transaction (see `02-DATABASE.md`). Do not "fix" this
   with a read-then-write pattern — it reintroduces a race condition.
3. **Never touch payment gateway secrets in code.** Razorpay/Stripe keys live only in
   environment variables (`src/lib/payment-methods.ts` reads them). Never hardcode a
   key, never log a key, never put one in a client component.
4. **Money is a `real` (float) column in SQLite for simplicity**, always rounded with
   `round2()` from `src/lib/money.ts` after arithmetic. Don't introduce a new place
   that adds/subtracts money without rounding.
5. **All server-side money/date logic is currency- and timezone-aware** via the
   `business` settings row (`currency`, `locale`, `timezone`). Don't hardcode `₹`,
   `INR`, or `Asia/Kolkata` in new code — read from settings.
6. **The AI models come from an external file**, not from this repo:
   `data_science/engine/model_config.py` → synced into
   `src/generated/models.json` by `npm run sync:models` (auto-runs before dev/build).
   Don't hand-edit `models.json`; edit the engine config and re-sync, or edit the
   sync script if the source format changes.
7. **Demo/seed data is intentional.** `npm run db:seed` fills the DB with realistic
   dishes, staff and 90 days of order history so charts/AI have something to show in
   client demos. The user (owner of this project) explicitly asked to keep it — don't
   wipe `data/app.db` without asking first. For a real paying client's own deployment,
   the right move is a **fresh empty database** (see `07-SETUP-AND-DEPLOY.md`).

## Quick facts

- **Stack:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript, Tailwind v4,
  shadcn/ui (New York style, base-ui primitives), Drizzle ORM + libSQL/SQLite.
- **No separate backend** — everything is Next.js server components, server actions,
  and route handlers under `src/app/api/`.
- **Auth:** single owner login (not multi-user), password from env, signed JWT cookie
  via `jose`. See `src/lib/auth.ts`, `src/lib/auth-server.ts`, `src/proxy.ts`.
- **Run:** `npm run dev` → http://localhost:3000. Admin: `/login` (dev password
  `admin123` unless `ADMIN_PASSWORD` is set).

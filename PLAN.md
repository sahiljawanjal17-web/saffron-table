# Saffron Table — Restaurant / Cloud-Kitchen OS

Premium restaurant website + management system. Brand name, colours and copy are
editable from Settings / AI assistant, so the same codebase can be re-sold to any
restaurant client (white-label base).

---

## ⭐ SABSE ZAROORI NIYAM (MAIN RULE) — har kaam se pehle padhna

### Niyam 1 — Bani-banayi cheez uthao, khud mat banao
**Har badi cheez (page, section, feature, component) online open-source se uthani hai,
usme thode changes karke lagani hai. Scratch se haath se likhna aakhri option hai.**

Har naye kaam ka order:
1. **Pehle dhundho:** GitHub / shadcn blocks / starter ke purane demo files me wahi cheez bani hui hai?
2. **License check:** sirf MIT / Apache-2.0 / BSD jaisa open license. Bina license wala repo → sirf idea lena, code nahi.
3. **File copy karo:** poori file(s) project me laao (upar source ka link comment me likho).
4. **Sirf zaroori badlav:** naam, text, photos, colors, aur hamare database / API se connection.
5. **Haath se tabhi likhna** jab online kuch na mile, ya cheez sirf hamare project ki ho
   (jaise engine ke models wala AI client, stock deduction). Wajah neeche log me likhni hai.

**Mana hai (DON'T):**
- Repo ki kaam ki file delete karke waisi hi cheez dobara khud likhna (pehle theme system ke saath yahi galti hui thi).
- Repo clone karke "idea le liya" bolna, par file use na karna (landing page repos ke saath yahi hua tha).
- Chalti hui cheez ko sirf apne style me dobara likhna.

### Niyam 2 — Ye MD file hamesha update rehni chahiye
Har kaam (ya har bade step) ke **turant baad** ye file update karni hai:
- **Section 7 (Progress):** kya bana, kya baaki hai.
- **Section 8 (Reuse Log):** kaunsi cheez kis repo/file se li, kya badla, ya kyun haath se likhi.
- Koi bada faisla badla ho (stack, library, design) to wo bhi yahin likhna.

Session band ho jaaye, token khatam ho jaayein, ya naya session shuru ho — **isi file se kaam wahin se chalu hoga.**

---

## 1. Open-source foundation (mix + customise)

| Source (licence) | What we take | What we change |
|---|---|---|
| [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) (MIT, 6k★) | Whole admin shell: sidebar, layout, data tables (TanStack), charts (Recharts), forms (TanStack Form + Zod), theme system (OKLCH `[data-theme]`), AI chat UI | Remove Clerk/Sentry/kanban/demo pages; replace with own auth + restaurant modules; AI chat wired to OpenRouter |
| [arnobt78/Restaurant-Landing-Page-1--NextJS-Frontend](https://github.com/arnobt78/Restaurant-Landing-Page-1--NextJS-Frontend) (MIT) | Landing section structure: hero, menu, about, reservation form (date picker), map | Port to Tailwind v4 + shadcn, connect menu/reservation to live DB, premium restyle |
| [GetNextjsTemplates/chef-kitchen](https://github.com/GetNextjsTemplates/chef-kitchen-nextjs-landing-page-template) (MIT) | Section ideas: features strip, chefs, gallery masonry, newsletter, footer | Restyle + data-driven |
| shadcn/ui + motion | UI primitives, animations | — |
| Unsplash / Pexels (free licence) | Food photography + short ambient video | Downloaded locally into `/public/media` |

`kitsada1984/pos-restaurant-app` was reviewed for POS ideas only — it has no licence, so no code copied.

## 2. Tech stack

- **Next.js 16 (App Router) + React 19 + TypeScript**, Tailwind CSS v4, shadcn/ui
- **Database:** Drizzle ORM + libSQL. Local file (`data/app.db`) in dev; one env change → Turso (hosted, global edge SQLite) in production
- **Auth:** owner login (password from env, bcrypt-free HMAC-signed session cookie via `jose`), middleware-protected `/dashboard`
- **AI:** OpenRouter (OpenAI-compatible REST) called only from server routes
  - Model list **generated from** `data_science/engine/model_config.py` (`npm run sync:models` → `src/generated/models.json`) — single source of truth, all 6 models, selectable in UI
  - Key read from `OPENROUTER_API_KEY` or from `ENGINE_DIR/.env` — never sent to the browser
  - Same rules as engine orchestrator: 2 retries → backup model, INR budget cap (₹40 default) with usage log in DB, per-model `default_max_tokens`
- **Deploy:** Vercel (app) + Turso (DB). Works on any Node host / Docker too.

## 3. Database schema

```
settings         key PK, value JSON                      (brand, theme, tax %, currency, opening hours)
staff            id, name, role, phone?, email?, joinDate?, salary?, status, notes?
salary_payments  id, staffId→staff, month(YYYY-MM), amount, paidOn, note?
monthly_revenue  id, month UNIQUE, revenue, expenses?, note?   (manual entries for past months)
menu_items       id, name, description?, category, kind(dish|raw), price, imageUrl?, isVeg,
                 isPermanent, defaultDailyQty, unit, active, createdAt
daily_stock      id, date(YYYY-MM-DD), menuItemId→menu_items, openingQty, soldQty, adjustQty
                 UNIQUE(date, menuItemId)   remaining = opening + adjust − sold
tables           id, label, capacity
orders           id, code, customerName, phone?, type(dine_in|takeaway|delivery|online),
                 source(counter|online), status(pending|preparing|ready|completed|cancelled),
                 subtotal, tax, total, notes?, createdAt
order_items      id, orderId→orders, menuItemId, name, price, qty
reservations     id, code, name, phone, email?, partySize, dateTime, tableId?, status,
                 notes?, preorderTotal, createdAt
reservation_items id, reservationId, menuItemId, name, price, qty
ai_usage         id, modelKey, feature, inputTokens, outputTokens, costInr, createdAt
ai_insights      id, period(weekly|monthly), modelKey, forecast JSON, content, createdAt
day_closings     id, date UNIQUE, summary JSON, createdAt
```

**Stock deduction:** order creation runs in one transaction; each line does
`UPDATE daily_stock SET soldQty = soldQty + n WHERE date=? AND menuItemId=? AND openingQty+adjustQty-soldQty >= n`.
If any update touches 0 rows → rollback → "sold out" error. No overselling even with parallel orders.

**Permanent items:** "Start today" (or first access of the day) auto-creates `daily_stock` rows
for every `isPermanent` item with `defaultDailyQty`; non-permanent items are added per day.

## 4. Modules

### Customer site (`/`)
Hero with ambient video, signature dishes, live menu (only today's in-stock items, sold-out badges),
cart drawer → checkout (name/phone/type) → order confirmation + bill download, table reservation with
optional pre-order, about/gallery, hours + map, footer. Order tracking page `/order/[code]`.

### Admin (`/dashboard`)
| Page | Features |
|---|---|
| Overview | Today's sales, orders, low stock, reservations, 30-day revenue chart, top dishes |
| POS / Orders | Counter order entry from live stock, order list with status flow, bill `.txt` download + 80mm print view |
| Menu | CRUD, permanent flag, default qty, veg flag, image |
| Daily stock | Pick date, start day (auto-fill permanent), add items, set/adjust quantities, live remaining |
| Reservations | List/calendar by date, status, assign table, pre-order items |
| Staff | CRUD with optional fields, salary payments per month |
| Finance | Monthly revenue (auto from orders + manual past months), expenses, salary total, net |
| Reports | **End of Day** button → sales total, orders by type/status, items sold, stock remaining, reservations, cash summary; download `.txt`; closing history |
| AI Insights | Choose model + weekly/monthly → statistical forecast (weighted moving avg + weekday seasonality) computed in code, then LLM turns numbers into actionable insights; history saved |
| AI Assistant | Chat (model selector) that can change theme/colours, brand text, hero copy, tax %, mark items sold out, answer data questions. Actions returned as JSON, validated with Zod, applied server-side |
| Settings | Brand, theme presets, tax, hours, AI budget + usage log |

## 5. Design system
- Palette presets (no neon / cyberpunk): **Saffron Noir** (charcoal #1c1917, ivory #faf7f2, saffron gold #c8a15a, deep wine #6b1f2a) default; **Olive Grove**, **Terracotta**, **Classic Ivory**
- AI colour changes are clamped: saturation/lightness limits reject neon/electric hues
- Type: Cormorant Garamond (display) + Manrope (UI)
- Large photography, slow parallax/fade reveals, generous whitespace, thin gold rules, glass-free

## 6. Roadmap
1. Scaffold: copy starter, strip Clerk/Sentry/demos, install, own auth ✅ when `npm run build` passes
2. DB: Drizzle schema, migrations, seed (menu ~24 dishes, staff, 60 days of order history for charts/AI)
3. Model sync from engine + AI client (retry/backup/budget/usage)
4. Admin modules: menu, daily stock, POS/orders + bills, reservations, staff, finance
5. Reports / EOD
6. AI insights + AI assistant with theme actions
7. Customer site: landing, live menu, cart/checkout, reservation + pre-order, order tracking
8. Media, polish, responsive/dark checks, production build, README (setup + deploy)

## 7. Progress (updated 2026-09-16, session 2 final) — 100% of planned scope

**Done & verified**
- Customer site: home (hero video, features, about, signature dishes, booking), /menu live stock, cart, /checkout, /order/[code] tracking, bill .txt
- Admin: Overview, Orders & POS, Reservations, Daily Stock, Menu, Staff + salaries, Finance, Reports (EOD + .txt + closing history), AI Insights, AI Assistant, Settings
- Tests: all pages 200 and 0 browser console errors (14 pages, puppeteer); order -> stock 40->38, oversell + invalid input rejected, bill .txt, cancel -> stock restored; AI assistant real call (Hinglish, refused neon, applied preset; reverted); AI insights (backup model fallback, revenue backtest 89%)
- Visual QA (headless Chrome): desktop 1440 + mobile 390 — no horizontal overflow; dashboard dark mode OK
- Fixes from QA: mobile dish overlay always visible, menu page overflow, one-time scroll animations, reservation heading colour, Base UI link buttons (nativeButton=false), hero badge hidden when menu empty
- `npm run build` passes
- Demo data kept (user decision 2026-09-16) so the site looks full for client demos

**Payments (added 2026-09-16)**
- Methods: pay at counter/table, cash on delivery, card/UPI on delivery, UPI QR (owner VPA, manual verify), Razorpay (UPI/cards/netbanking/wallets), Stripe (intl cards/Apple/Google Pay); POS: cash/UPI/card/UPI QR/pay later
- orders.payment_status (unpaid/awaiting/paid/failed/refunded), payment_ref, paid_at; Mark paid in admin; EOD collected vs outstanding; bill shows payment
- Online orders hold stock; auto-cancel + stock release after hold minutes (Settings)
- Security: secrets only in env, Razorpay HMAC verify + webhook signature, Stripe session re-check + webhook constructEvent, UPI QR off until owner sets own UPI ID
- Tested (10 checks): method gating, UPI QR link/QR, claim + mark paid, stale hold release returns stock, Razorpay bad/good signature, Stripe hidden without keys, counter cash paid instantly. Live gateway calls NOT tested (no API keys)

**Optional next steps**
1. Deploy (Vercel + Turso), set ADMIN_PASSWORD + AUTH_SECRET
2. For a real client: delete `data/app.db`, `npm run db:push`, add their menu/brand from dashboard
3. Add real Razorpay/Stripe test keys and run one test payment end to end + webhooks

**Run:** `npm run dev` -> http://localhost:3000 · login `/login` (dev password `admin123`)

## 7b. Onboarding docs (added 2026-09-16)

A `docs/` folder now exists with 8 files written for a fresh AI/developer with zero context to read and start working safely: architecture, full DB schema, every page/route, payments status (what's tested vs. what still needs real gateway keys), AI integration, coding conventions + the reuse-first rule, and setup/deploy steps. Start at `docs/00-START-HERE.md`. Keep it updated alongside this file when the project changes.

## 8. Reuse Log (har kaam ke baad update karna)

| Cheez | Source (repo / file) | Tarika | Kya badla / kyun |
|---|---|---|---|
| UI components (~70), sidebar, header, breadcrumbs, search, kbar, dark mode | Kiranism/next-shadcn-dashboard-starter (MIT) | ✅ Copy | Clerk/Sentry/demo hataye, nav badla |
| Admin layout, login ka design idea | Same starter | ✅ Copy + badlav | Clerk ki jagah apna password login |
| Theme system | Starter ka tha | ❌ Haath se (galti) | Starter ka system delete karke naya likha — Niyam 1 ke khilaf. Aage aisa nahi |
| Database schema, stock deduction, orders, EOD report, bill .txt | — | ✍️ Haath se | Koi MIT repo me ye features nahi mile; POS repo bina license tha |
| AI client (engine ke 6 models, retry, budget) | Logic engine/orchestrator.py se | ✍️ Port | Python se TypeScript me, engine ke rules same |
| Forecast (statistics + backtest) | — | ✍️ Haath se | Project-specific |
| Photos (28) | Unsplash (free license) | ✅ Download | — |
| Hero video | Mixkit #49231 (free license) | ✅ Download | — |
| Site Header, Logo, nav links, Hero, Features, About (Cook), Signature gallery, Footer, ScrollToTop | chef-kitchen (MIT) | ✅ Copy + badlav | Auth modals -> cart, brand data, photos/video, theme tokens |
| Reservation section + form, Menu grid (/menu), fade variants | arnobt78 (MIT) | ✅ Copy + badlav | base-ui popover, API submit, pre-order, live stock + add-to-cart |
| Menu form sheet, Staff form sheet, cell actions (edit/delete menu) | Starter users/user-form-sheet + products cell-action (MIT) | ✅ Copy + badlav | Fields + server actions; staff me salary dialog |
| Payment gateways (Razorpay checkout.js + orders API, Stripe Checkout Sessions + webhooks, UPI QR) | Official razorpay / stripe SDKs + qrcode (MIT) | ✅ SDK reuse | Glue code (order linking, verify, hold/release) haath se — project-specific |
| Cart context + cart sheet, checkout, order tracking page, public APIs | — | ✍️ Haath se (chhota) | Koi MIT cart component nahi mila jo hamare stock logic se jude |
| POS terminal | JoaoHenriqueBarbosa/FinOpenPOS (MIT) apps/web/src/app/admin/pos | ✅ Copy + badlav | tRPC/i18n/NFC-e hataye, live stock grid, order type/payment, bill |
| Overview charts (area, bar, pie, recent sales) + stat cards layout | Starter features/overview (MIT) | ✅ Copy + badlav | Mock data -> real revenue/top dishes/order mix; bar chart Finance me bhi reuse |
| AI Assistant chat UI | Starter features/ai-chat/ai-chat-demo (MIT) | ✅ Copy + badlav | Scripted transport -> engine models API, model selector, applied actions |
| Settings forms | Starter useAppForm pattern (MIT) | ✅ Pattern reuse | Brand/business/theme/AI |
| Stock table, reservations controls, finance month form, EOD panel, insights page | — | ✍️ Haath se | Project-specific screens; starter Table/Card/Badge components use kiye |
| AI assistant actions + insights prompt | — | ✍️ Haath se | Project-specific (zod-validated actions, forecast explanation) |

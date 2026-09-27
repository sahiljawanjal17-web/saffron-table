# Conventions and the reuse-first rule

## The standing rule: reuse before you hand-write

This project was deliberately built by copying files from MIT-licensed open-source
repos and adapting them, rather than writing every screen from scratch. This is a
**standing instruction from the project owner**, not a one-time decision — apply it to
any future work here too:

1. **Look first.** Before writing a new page/section/component, check whether an
   existing open-source repo, shadcn block, or a file already in this codebase does
   something close enough to adapt.
2. **License check.** Only reuse MIT / Apache-2.0 / BSD-licensed code. A repo with no
   license can be looked at for ideas but its code must not be copied in.
3. **Copy the file(s) in**, with a comment at the top naming the source repo/file and
   what license it's under (see the existing files below for the exact format).
4. **Make only the changes needed**: names, copy, images, and wiring to this project's
   database/API instead of the original's mock data or backend.
5. **Hand-write only when nothing suitable exists**, or the thing is genuinely
   project-specific (stock deduction, the AI client, the forecast model). When you do,
   note *why* in `PLAN.md`'s Reuse Log (section 8) so the next person doesn't wonder.
6. **Don't rewrite something that already works** just to restyle it in your own way —
   adapt the existing file in place instead. (This was a real mistake made early in
   this project's history — a working theme system was deleted and rewritten by hand
   for no functional reason. Don't repeat it.)

**Keep `PLAN.md` section 8 ("Reuse Log") updated** whenever you add a new
copied-and-adapted piece or a new hand-written piece — it's the audit trail for what
came from where, which matters both for license compliance and for onboarding.

## Where things came from (see `PLAN.md` section 8 for the full, current table)

| Source | License | Used for |
|---|---|---|
| Kiranism/next-shadcn-dashboard-starter | MIT | Whole admin shell, UI components, forms, charts, table patterns, AI chat UI skeleton |
| GetNextjsTemplates/chef-kitchen | MIT | Site header, hero, features, about, gallery, footer |
| arnobt78/Restaurant-Landing-Page-1 | MIT | Reservation section/form, menu grid, motion variants |
| JoaoHenriqueBarbosa/FinOpenPOS | MIT | POS terminal page |
| razorpay, stripe, qrcode (npm) | MIT | Official SDKs for payments |

Anything not in that list (stock/order transaction logic, the AI client, the
statistical forecast, the cart, checkout, settings forms wiring) was hand-written
because it's specific to this project's data model.

## Code style conventions actually in use

- **Server Components by default.** Only add `'use client'` when you need state,
  effects, or browser APIs. Data fetching happens directly in `page.tsx` files with
  `await db.select()...` — there's no separate data-fetching hook layer for admin
  pages (unlike the original starter's React Query pattern, which was kept only for
  the parts copied verbatim from it).
- **Mutations are Server Actions**, one file per feature at
  `src/features/<feature>/actions.ts`, each function starting with
  `await requireAdmin()`, then delegating to `src/server/*.ts` for actual logic, then
  calling `revalidatePath()` for every page that shows the changed data.
- **Validation with zod**, schema colocated in `src/features/<feature>/schema.ts` when
  a form uses it, or inline in the `actions.ts`/`server/*.ts` file for simpler cases.
- **Forms use `useAppForm`** (`src/lib/form.ts`, a TanStack Form wrapper) with field
  components from `src/components/forms/fields/*` (`field.TextField`,
  `field.SwitchField`, `field.SelectField`, etc.) inside `<form.AppField name=... />`.
  Don't hand-roll `<input>` + `useState` for admin forms — follow this pattern so
  validation/error display stays consistent.
- **Money**: always `round2()` (`src/lib/money.ts`) after arithmetic; always format
  for display with `formatMoney(amount, business.currency, business.locale)`, never a
  hardcoded `₹` or `$`.
- **Dates/times**: the restaurant's "business day" is computed in the configured
  timezone (`src/lib/time.ts#dateInTz`), not the server's local time or naive UTC
  date — always use these helpers for anything date-bucketing related to orders/stock.
- **Icons**: import from `src/components/icons.tsx` (`Icons.xyz`), which
  re-exports `@tabler/icons-react` icons under short names — don't import
  `@tabler/icons-react` directly in new components; add a new short name to
  `icons.tsx` instead so all icon usage stays discoverable in one file.
- **Component comments**: every copied-and-adapted file starts with a `// Source: ...`
  comment naming the origin repo/file and license, followed by `// Changes: ...`
  summarising what was adapted. Keep doing this for consistency and auditability.

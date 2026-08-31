# Phase 15 — Hackathon Polish

> Spec — 2026-08-31. Authoritative design record for Phase 15 (AGENTS.md §10).
> Interview: `grill-me`, 2026-08-31. All decisions below are settled.

---

## 1. Objective

Optimize the final product for judging (problem impact · creative use of AI ·
practical viability) **without adding unstable features** (AGENTS.md §10 "Do
not", P5). Phase 15 also clears the three carry-overs PROGRESS.md tagged
"→ Phase 15".

Judging-visible deliverables: a real landing page, a first-run onboarding flow,
and a one-command demo-data seed. Behind the scenes: the `auditLog` table, a
correct `confirmAction` failure path, `@clerk/ui` removed, and a measured
dashboard load.

**Out of this pass:** requirement #7 (deploy to Vercel + Convex prod) — needs the
user's accounts and commits stay local. A deploy checklist is written instead.

---

## 2. Decisions (grill-me)

| # | Question | Decision |
|---|----------|----------|
| 1 | Overall scope | Full code scope (items 1–6 + all 3 carry-overs). Deploy stays with the user. |
| 2 | Landing page | Full pitch page: hero · problem · **scripted live-assistant demo** · feature grid · safety section · footer CTA. Warm-ledger design (`frontend-design`). No new deps. |
| 3 | Landing bilingual | **ur/en toggle in the header** — full copy swap, `dir` flips with it. Urdu is the default. |
| 4 | Onboarding | **Dedicated `/onboarding` route**, skippable. 3 steps: monthly income → first budget → assistant intro. New `users.onboardingCompletedAt`. |
| 5 | Demo mode | **Seed script only** (`convex/seed.ts → seed:demo`). Folds in / replaces `proactiveDemo`. One designated Clerk account. No in-app button. |
| 6 | auditLog scope | **AI-initiated mutations only** — the 3 `confirmAction` executors + `imports.confirmImport`. Manual CRUD not logged. |
| 7 | Performance | **Measure + low-risk fixes** — per-section dashboard loading, lazy charts, confirm index usage. No RSC rewrite. |
| 8 | Commit order | schema → convex → seed → chore(clerk) → onboarding → landing → perf → docs. 8 staged commits. |

Implementation-detail defaults (not grilled, low ambiguity):

- **confirmAction fix**: the executor path stays; on catch, `confirmAction`
  **patches `status:"failed"` + `resultMessage` and returns
  `{ success:false, error }` instead of re-throwing**. No throw ⇒ the patch
  commits (Convex atomicity was the whole bug). `hooks/useAssistant.ts`
  surfaces `success:false` as a thrown error so `ConfirmationCard`'s existing
  catch shows the failed state; the card's `ResolvedCard` already renders
  `status:"failed"`.
- **@clerk/ui removal**: replace `appearance={shadcn}` (from `@clerk/ui/themes`)
  and the `@import "@clerk/ui/themes/shadcn.css"` with an **inline `appearance`
  object** on `<ClerkProvider>` — `variables` only (colorPrimary `#0F5132`,
  colorBackground `#FBF9F4`, borderRadius `10px`, fontFamily the sans stack).
  The per-page `elements` overrides on login/signup already carry the detailed
  look and stay untouched. `npm uninstall @clerk/ui`.
- **Onboarding step 1** creates one **income transaction** (salary category,
  today's date, `source:"manual"`) — no recurring-income model exists and one
  txn makes the dashboard non-empty.
- **Onboarding redirect**: a client `OnboardingGuard` in `(app)/layout.tsx`
  redirects to `/onboarding` when `getCurrentUser().onboardingCompletedAt` is
  absent. `/onboarding` redirects to `/dashboard` when it is already set.
  "Skip" and "finish" both call `users.completeOnboarding` (stamps the field).
- **seed:demo** stamps `onboardingCompletedAt` so the judge login lands on the
  dashboard. Existing dev accounts see the onboarding once (acceptable — that
  is the intended "first-time" behaviour).

---

## 3. Commit sequence

Each commit is gated (where the files touched make it relevant) on
`npm run typecheck` · `lint` · `test` · `next build` · `npx convex codegen`.
AGENTS.md §15: no commit touches both `lib/finance/` and `lib/ai/` source — none
here touches either.

### Commit 1 — `feat(schema): auditLog table + users.onboardingCompletedAt`

- `convex/schema.ts`:
  - Add the `auditLog` table **exactly as AGENTS.md §6** defines it
    (`userId`, `action`, `entityType`, `entityId?`, `metadata?`,
    `source: "user"|"ai"|"system"`, `createdAt`) with `.index("by_userId", ["userId"])`.
  - Add `users.onboardingCompletedAt: v.optional(v.number())`.
- `npx convex codegen`. No behaviour change yet.

### Commit 2 — `feat(convex): auditLog writes + confirmAction failure path`

- `convex/auditLog.ts` (new): `logAudit(ctx, { action, entityType, entityId?, metadata?, source })`
  internal helper — inserts one row for `user._id`. Plus a `list` query
  (auth-scoped, `by_userId`, `.order("desc").take(n)`) for future use / tests.
- `convex/pendingActions.ts`:
  - Each executor return path → `logAudit(ctx, { action: "transaction.create" | "transaction.delete" | "goal.create", entityType, entityId, source: "ai", metadata: JSON.stringify(params) })`.
  - `confirmAction` catch block: patch `status:"failed"` + `resultMessage`,
    **`return { success:false, error: message }`** (no re-throw).
- `convex/imports.ts`: `confirmImport` success → `logAudit(ctx, { action:"import.confirm", entityType:"import", entityId: importId, source:"user", metadata: JSON.stringify({ importedCount }) })`.
- `hooks/useAssistant.ts`: `confirmAction` checks `result?.success === false` →
  `throw new Error(result.error)` so the card shows the failed state.
- Tests:
  - `tests/integration/confirmation-gate.test.ts` — rewrite the "bad params"
    case: assert `confirmAction` **resolves** `{ success:false }`, the action
    row is now `status:"failed"` with a `resultMessage`, and **no** transaction
    row exists. Drop the old `KNOWN LIMITATION` comment.
  - `tests/integration/audit-log.test.ts` (new): a confirmed createTransaction
    writes one `auditLog` row (`source:"ai"`, `action:"transaction.create"`);
    a confirmed import writes one (`source:"user"`); `auditLog.list` is
    auth-scoped (user B sees none of user A's).
- PROGRESS.md §12 "Confirmation gate" / §9 audit criterion → ✅.

### Commit 3 — `feat(convex): seed:demo — realistic judge-demo dataset`

- `convex/seed.ts`: replace `proactiveDemo` with `demo` (keep `clearDemo`,
  keep the `email` arg + the "sign in once first" guard + `wipeUserFinance` +
  `ensureCurrentMonthBudget`). `demo` builds, for the resolved user:
  - **Income**: salary Rs. 85,000 on `midMonth(0 / -1 / -2)`.
  - **~40 expenses** across food / transportation / utilities / shopping /
    entertainment / health / phone, spread over the current + 2 prior months,
    Urdu descriptions, realistic amounts.
  - **Current-month budget** (find-or-create) with category limits; **food
    seeded to ~88%** of its limit (keeps the Phase 13 budget-warning surface).
  - **Unusual spending**: utilities current month ≈ 60% over its 3-month
    average (keeps the anomaly surface).
  - **2 goals**: `ایمرجنسی فنڈ` at ~60%, `لیپ ٹاپ` at ~95%.
  - **2 recurring bills**: `بجلی کا بل` due tomorrow, `انٹرنیٹ` due in ~5 days.
  - **3 past conversations** with 1–2 user/assistant message pairs each
    (educate / analyze / act examples — no pendingActions).
  - Stamp `users.onboardingCompletedAt = Date.now()`.
  - Return an `expect: [...]` checklist like the old helper.
- Update the file header comment. Update references:
  `memory/convex-cli-json-args-windows.md`, PROGRESS.md Phase 13/14 seed lines
  (`seed:proactiveDemo` → `seed:demo`).
- `npx convex codegen`.

### Commit 4 — `chore(auth): drop @clerk/ui, inline Clerk appearance`

- `app/layout.tsx`: remove `import { shadcn } from "@clerk/ui/themes"`;
  `<ClerkProvider appearance={{ variables: { … } }}>`.
- `app/globals.css`: remove line 4 `@import "@clerk/ui/themes/shadcn.css"`.
- `package.json` / lockfile: `npm uninstall @clerk/ui`.
- `npm audit` re-run → capture the new advisory count for AUDIT.md §12.1.
- Manual check (developer): `/login` and `/signup` still render on-brand.
  Documented on the browser checklist, not gated.

### Commit 5 — `feat(onboarding): 3-step first-run flow`

- `convex/users.ts`: `completeOnboarding` mutation (stamps
  `onboardingCompletedAt`, idempotent).
- `app/onboarding/layout.tsx` (new): `ConvexClientProvider` + `LanguageProvider`
  + centered cream canvas, **no sidebar**. `app/onboarding/page.tsx` (new,
  client): 3-step wizard — progress dots, back, skip-all.
  - Step 1 `ماہانہ آمدنی`: amount input → `transactions.create({ type:"income", categoryId: <salary>, amount, date: todayMidnight, source:"manual" })`.
  - Step 2 `پہلا بجٹ`: 1–3 category rows (food / transportation / utilities
    prefilled names) with limit inputs → `budgets.create({ month: firstOfMonth })`
    (tolerate "already exists") then `budgets.upsertCategory` per filled row.
  - Step 3 `مددگار سے ملیں`: copy + 3 example prompts +
    `[شروع کریں]` (→ `/assistant`) and `[بعد میں]` (→ `/dashboard`).
    Both first call `completeOnboarding`.
- `components/OnboardingGuard.tsx` (new, client): `useQuery(getCurrentUser)`;
  while `undefined` render children (no flash); if loaded and
  `onboardingCompletedAt == null` and `pathname` starts `/` app routes →
  `router.replace("/onboarding")`. Mount in `(app)/layout.tsx` inside
  `LanguageProvider`.
- `app/onboarding/page.tsx`: if `onboardingCompletedAt` set → `router.replace("/dashboard")`.
- i18n: new `onboarding.*` keys in `lib/i18n/{ur,en}.ts`.
- Tests: `tests/integration/users.test.ts` — `completeOnboarding` stamps the
  field, is idempotent, throws unauthenticated.

### Commit 6 — `feat(landing): bilingual pitch page at /`

- `app/page.tsx`: keep the server auth check (`auth()` → `redirect("/dashboard")`
  when signed in); otherwise render `<Landing />`.
- `components/landing/Landing.tsx` (new, client) + small sub-components
  (`LandingChatDemo.tsx` for the scripted typing animation). Self-contained —
  **no** `LanguageProvider` / Convex / shared app components. Local
  `lang` state (`"ur" | "en"`), header toggle, wrapper `dir` flips, also syncs
  `document.documentElement.dir/lang` in an effect.
  - Sections: hero · the literacy-gap problem (P1) · scripted assistant demo
    (Urdu Q→A that types itself out, a `ConfirmationCard`-style cameo) ·
    6-card feature grid (track / budget / goals / voice / receipt / import) ·
    "how it stays safe" (confirmation gate, data grounding) · footer CTA.
  - CTAs → `/signup`. Warm-ledger palette from `globals.css` tokens; Nastaliq
    display for Urdu headings, Manrope for English. CSS-only animation
    (`@keyframes`) — no framer-motion on this route.
  - Copy: both languages authored inline in the component (small `COPY` map).
- Responsive 320 / 768 / 1280; both `dir`s.

### Commit 7 — `perf(dashboard): per-section loading + lazy charts`

- `app/(app)/dashboard/page.tsx`: drop the single
  `if (loading) return <PageSkeleton/>`. Render the header immediately; each
  region (stat cards, category chart, goals, proactive alerts, recent txns)
  shows its own skeleton until its hook resolves.
- `next/dynamic` for the chart-heavy blocks (`ssr:false`, skeleton fallback).
- Measure: `next build` First-Load-JS for `/dashboard` before/after; note in
  PROGRESS.md. (True field <1.5 s needs the deployed site — on the checklist.)
- Confirm `getFinancialSummary` / `getIntelligenceData` use the range indexes
  (they do — `by_userId_date`). No query change unless the number is bad.

### Commit 8 — `chore: cleanup sweep + Phase 15 docs`

- Sweep: `console.*` audit — the ~23 hits are all `console.warn`/`console.error`
  on real error paths (transcription, import, orchestrator, receipt OCR). Keep
  them (AGENTS.md §8 "never silently swallow"); the `[assistant]` soft-failure
  `console.warn` in `useAssistant.ts:246` and any dev-only log get a short
  justifying comment or removal. No `console.log` in production paths (only in
  `tests/live/**`). No `TODO`/`FIXME` in `*.ts`/`*.tsx` outside tests
  (verified). Document "swept, intentional error logging retained".
- API keys: confirm `.gitignore` covers `.env*.local` / `.env` (it does) and
  `git ls-files | grep -i env` shows only `.env.example`. Document.
- `.env.example`: ensure every key Phase 8–13 introduced is listed
  (`GOOGLE_GENERATIVE_AI_API_KEY`, `ASSEMBLYAI_API_KEY`, Clerk keys,
  `NEXT_PUBLIC_CONVEX_URL`) with the "set in the Convex deployment, not
  `.env.local`" note for action-side keys.
- `docs/DEPLOY.md` (new): the Vercel + Convex production checklist (env vars on
  both, `npx convex deploy`, Vercel project settings, Clerk production
  instance, post-deploy smoke test = the 5-minute judge script).
- PROGRESS.md: Phase 15 section rewrite — status, decisions, what shipped,
  what's left (deploy + the browser checklist), success criteria.
- AUDIT.md §12: Phase 15 row ("removed `@clerk/ui`"; new `auditLog` table;
  no new packages). §12.1: refreshed `npm audit` numbers.
- Phase-overview table line 28 → `✅ COMPLETE (code) / 🟡 deploy+demo manual`.

---

## 4. New / changed files

| File | Commit | Note |
|------|--------|------|
| `convex/schema.ts` | 1 | `auditLog` table, `users.onboardingCompletedAt` |
| `convex/auditLog.ts` | 2 | **new** — `logAudit` helper + `list` query |
| `convex/pendingActions.ts` | 2 | audit writes; `confirmAction` returns instead of throws |
| `convex/imports.ts` | 2 | audit write on `confirmImport` |
| `hooks/useAssistant.ts` | 2 | surface `{ success:false }` |
| `convex/seed.ts` | 3 | `proactiveDemo` → `demo` (superset) |
| `app/layout.tsx` | 4 | inline Clerk `appearance` |
| `app/globals.css` | 4 | drop `@clerk/ui` css import |
| `package.json` + lock | 4 | remove `@clerk/ui` |
| `convex/users.ts` | 5 | `completeOnboarding` |
| `app/onboarding/{layout,page}.tsx` | 5 | **new** — wizard |
| `components/OnboardingGuard.tsx` | 5 | **new** |
| `lib/i18n/{ur,en}.ts` | 5 | `onboarding.*` keys |
| `app/page.tsx` | 6 | render `<Landing/>` for logged-out |
| `components/landing/*` | 6 | **new** — `Landing.tsx`, `LandingChatDemo.tsx` |
| `app/(app)/dashboard/page.tsx` | 7 | per-section loading, lazy charts |
| `.env.example` | 8 | complete key list |
| `docs/DEPLOY.md` | 8 | **new** — deploy checklist |
| `PROGRESS.md`, `AUDIT.md` | 2,8 | phase docs |
| `tests/integration/{confirmation-gate,audit-log,users}.test.ts` | 2,5 | |

No new npm packages. No `lib/finance/` or `lib/ai/` source changes.

---

## 5. Out of scope / left for the user

- **Deploy** (req. #7): `docs/DEPLOY.md` checklist; user runs it.
- **Demo login**: user designates the demo Clerk account, signs in once,
  runs `npx convex run seed:demo '{"email":"<that account>"}'` (via **Git Bash**
  on Windows — see `memory/convex-cli-json-args-windows.md`).
- **Browser checklist** (carried from Phase 14 + new):
  - Phase 14 items still open (RTL@320, responsive, mutation-failure toast,
    AI-failure message, ambiguous Urdu, empty state, large amount).
  - New: `/login` + `/signup` look correct after `@clerk/ui` removal;
    `/onboarding` 3 steps at 320px RTL; landing page ur↔en toggle + both `dir`s
    at all breakpoints; dashboard cold-load < 1.5 s on the deployed site;
    run the full 5-minute judge script on the seeded demo account.
- **`auditLog` for manual CRUD** — deliberately not wired (grill-me #6).
- **Landing "try demo without signup"** — rejected (grill-me #5, auth-model risk).

---

## 6. Exit gate

- Automated: `typecheck` + `lint` (0 errors) + `test` (all pass, live self-skip)
  + `next build` + `npx convex codegen` all green after commit 8.
- `confirmAction` failure path covered by a passing integration test.
- `auditLog` rows verified in tests for AI + import paths.
- `npm audit` — new numbers recorded; `@clerk/ui` advisory chain gone.
- Manual (user): deploy + the browser/demo checklist above. Phase stays
  **🟡 manual** on the deploy + judge-script line until the user confirms.

# Design — Phase 13: Proactive Financial Assistance

> **Date:** 2026-08-31
> **Status:** Approved (grill-me interview) — implementing
> **Scope:** Budget threshold warnings, recurring-expense reminders, unusual-spending
> alerts, monthly savings summary. All disableable in Settings.
> **References:** AGENTS.md §10 Phase 13, §9.2 Budgeting, §13 Testing, PROGRESS.md Phase 13.
> **Concurrency rule (AGENTS.md §15):** `lib/finance/` changes ship in their own commit.
> **This phase does NOT touch `lib/ai/`.**

---

## 1. Problem

The app records finances but never speaks first. Phase 13 adds a **bounded, explainable,
user-controllable** set of proactive surfaces:

| Feature | Trigger | Surface |
| --- | --- | --- |
| Budget threshold warning | A category at ≥80% / ≥100% of its limit | Toast at the moment of a manual entry (already exists) + a persistent dismissible card on the dashboard |
| Recurring-bill reminder | An active recurring expense due within 3 days, or overdue | Dismissible banner on the dashboard |
| Unusual-spending alert | A category ≥30% above its 3-month rolling average (with noise guards) | Dismissible card on the dashboard |
| Monthly summary | First dashboard visit of a new month, when last month had data | Dismissible recap card at the top of the dashboard |

Nothing here sends push notifications (AGENTS.md Tier 4 / §17 deferred).

---

## 2. Current state (from the audit)

- **Budget warning** already fires as a toast in `app/(app)/transactions/page.tsx:219`, but
  only for manual entries on that page — not AI / import / voice / receipt. Threshold logic
  is inline and duplicated.
- **Anomaly pipeline is done**: `lib/finance/calculations.ts#detectCategoryAnomalies` +
  `convex/summary.ts#getIntelligenceData` already return `categoryRollingAverages`
  (`average`, `currentSpend` per category). Only a query wrapper + card is missing.
- **`recurringExpenses` table exists** (schema) but has **no Convex module and no UI**.
  `convex/summary.ts` reads it for the dashboard "Upcoming bills" widget, so that widget is
  always empty today.
- **`reminders` and `financialSnapshots` tables** exist, both unused. Not used by this phase.
- **Settings notification toggles** (`app/(app)/settings/page.tsx:109`) are hardcoded
  literals wired to nothing. No schema field for preferences.
- **Design tokens** for exactly this already live in `app/globals.css`:
  `--color-rq-alert-bg/-border/-text`, `--color-rq-info-bg/-border`, `--color-rq-caution`,
  `--color-rq-danger`, `--color-rq-success`, `--color-rq-gold`.
- `tw-animate-css` is imported and already used by `components/shared/Toast.tsx`
  (`animate-in fade-in slide-in-from-bottom-2`). `framer-motion` is scoped to
  `components/assistant/**` per AUDIT.md §12 — **not widened here**.

---

## 3. Data model changes (`convex/schema.ts`)

### 3.1 `users` — two new optional fields

```ts
notificationPrefs: v.optional(
  v.object({
    budget80: v.boolean(),
    budget100: v.boolean(),
    billReminder: v.boolean(),
    unusualSpend: v.boolean(),
    monthlySummary: v.boolean(),
  }),
),
lastSummaryDismissedMonth: v.optional(v.number()), // month-start Unix ms
```

Absent `notificationPrefs` ⇒ treated as all-`true` (default on). `updateNotificationPrefs`
writes the whole object.

### 3.2 `recurringExpenses` — unchanged shape, now written

The existing table is sufficient: `userId`, `categoryId`, `description`, `amount`,
`frequency` (`daily|weekly|monthly|yearly`), `nextDueDate`, `isActive`, `createdAt`.
Add nothing.

### 3.3 New table `dismissedAlerts`

```ts
dismissedAlerts: defineTable({
  userId: v.id("users"),
  alertKey: v.string(),   // "budget80:<catId>" | "budget100:<catId>" | "anomaly:<catId>" | "bill:<recurringId>"
  periodKey: v.string(),  // month-start ms (budget/anomaly) or nextDueDate ms (bill), as string
  createdAt: v.number(),
}).index("by_userId", ["userId"]),
```

One row per dismissal. The alert query filters out any derived alert whose
`(alertKey, periodKey)` pair has a row. `periodKey` scoping means a dismissed budget alert
**re-appears next month** if still over threshold, and a dismissed bill reminder re-appears
on the **next due cycle** (new `nextDueDate` ⇒ new `periodKey`).

Monthly summary uses `users.lastSummaryDismissedMonth` instead of this table (single value,
cheaper, and it must survive as a "high-water mark").

---

## 4. Convex modules

### 4.1 `convex/recurring.ts` (new) — recurring-bill CRUD

| Fn | Kind | Notes |
| --- | --- | --- |
| `list` | query | Active + inactive, `by_userId`, joined with category name/icon for display |
| `create` | mutation | Validates: `amount > 0`, non-empty description, category owned by user, `nextDueDate` finite. `isActive: true`. |
| `update` | mutation | Ownership check; same validation on provided fields |
| `remove` | mutation | Ownership check, hard delete |
| `markPaid` | mutation | Args `{ id, logExpense: boolean }`. Ownership check. Advances `nextDueDate` via `advanceDueDate(nextDueDate, frequency)` (pure fn imported from `lib/finance/recurring-schedule.ts`). If `logExpense`, inserts a `transactions` row (`type:"expense"`, `source:"manual"`, `amount`, `categoryId`, `date: <the due date being paid>`, `description`, `isRecurring:true`, `recurringExpenseId:<id>`). Single mutation ⇒ atomic. |

`transactions.create` is **not** modified — `markPaid` inserts directly (it is a mutation with
`ctx.db` access). The `transactions` schema already has `isRecurring` and
`recurringExpenseId` fields.

### 4.2 `convex/proactive.ts` (new) — derived alerts

All queries call `requireUser`. All read live data — **no generator, no cron**.

**`getAlerts` query** → `{ budgetAlerts, unusualAlerts, billReminders }`

1. Load `notificationPrefs` (default all true), current-month transactions, budget +
   budgetCategories, categories, active `recurringExpenses`, and this user's
   `dismissedAlerts` rows.
2. **Budget alerts** (if `budget80` / `budget100`): for each budget category, `pct = spent/limit*100`.
   `≥100` ⇒ severity `over` (key `budget100:<catId>`); else `≥80` ⇒ severity `warning`
   (key `budget80:<catId>`). `periodKey` = current month-start ms.
3. **Unusual alerts** (if `unusualSpend`): reuse `getIntelligenceData`'s
   `categoryRollingAverages`. Apply guards via `lib/finance/unusual-spend.ts#flagUnusualSpending`:
   `average ≥ 1000` AND `currentSpend - average ≥ 500` AND `monthsWithSpend ≥ 2`.
   Sort by deviation %, take **top 2**. Key `anomaly:<catId>`, `periodKey` = month-start ms.
   *(`monthsWithSpend` requires a small addition to `getIntelligenceData`'s return — see §4.3.)*
4. **Bill reminders** (if `billReminder`): active recurring expenses with
   `nextDueDate ≤ now + 3*24h` (includes overdue, i.e. `nextDueDate < now`).
   Key `bill:<id>`, `periodKey` = `nextDueDate` ms. Each carries
   `{ id, description, amount, categoryId, categoryNameUr, categoryIcon, nextDueDate, overdue }`.
5. Filter every list against `dismissedAlerts`.

**`dismissAlert` mutation** — args `{ alertKey, periodKey }`. Ownership implicit
(`requireUser`). Idempotent: skip insert if a row already exists.

**`getMonthlySummary` query** → `{ show: boolean, summary: MonthSummary | null }`

- `show` = `notificationPrefs.monthlySummary !== false` AND
  `(lastSummaryDismissedMonth ?? 0) < prevMonthStart` AND prev month had ≥1 transaction.
- `summary` built by `lib/finance/month-summary.ts#summarizeMonth` from prev-month +
  month-before transactions: `{ month, income, expenses, net, savingsRate, topCategories: [{nameUr, icon, amount}] (max 3), expenseDeltaPct (vs month before, null if no prior data) }`.

**`dismissMonthlySummary` mutation** — sets `users.lastSummaryDismissedMonth` to the current
month-start ms (high-water mark; a later month re-triggers).

**Timezone note:** these queries run in Convex (UTC). "current month" / "last month" are
computed from `new Date()` in UTC, consistent with the existing `getIntelligenceData` /
`getFinancialSummary`. A PKT user within ~5h of a month boundary may see the rollover early/late.
Acceptable for the hackathon; documented, not fixed (same trade-off noted in
`lib/finance/import/*`).

### 4.3 `convex/summary.ts` — one additive change

`getIntelligenceData`'s `categoryRollingAverages` entries gain `monthsWithSpend: number`
(count of the last 3 months with >0 spend in that category). Purely additive; existing
consumers ignore it.

---

## 5. Pure functions — `lib/finance/` (own commit, no `lib/ai/`)

### 5.1 `lib/finance/recurring-schedule.ts` (new)

```ts
export function advanceDueDate(dueDate: number, frequency: Frequency): number
```

- `daily` → +1 day, `weekly` → +7 days, `yearly` → +1 calendar year.
- `monthly` → same day next month, **clamped** to the last day of the target month
  (Jan 31 → Feb 28/29). Implemented with `new Date(y, m+1, min(day, daysInMonth(y, m+1)))`.
- Operates on local-midnight semantics to match the manual-entry date convention.

### 5.2 `lib/finance/unusual-spend.ts` (new)

```ts
export function flagUnusualSpending(
  rows: Array<{ categoryId; name; nameUr; average; currentSpend; monthsWithSpend }>,
  opts?: { minAverage?: number; minOverspend?: number; minMonths?: number; max?: number },
): Array<{ categoryId; nameUr; name; average; currentSpend; deviationPercent }>
```

Defaults `minAverage: 1000`, `minOverspend: 500`, `minMonths: 2`, `max: 2`.
Deviation = `(currentSpend - average) / average * 100`, rounded. Sorted desc, capped at `max`.

### 5.3 `lib/finance/month-summary.ts` (new)

```ts
export function summarizeMonth(
  monthTxns: Txn[],
  priorMonthTxns: Txn[],
  categoryMeta: Map<string, { nameUr; name; icon }>,
): MonthSummary
```

Deterministic. `expenseDeltaPct = null` when `priorMonthTxns` has no expenses.
`topCategories` sorted desc by amount, sliced to 3.

### 5.4 Shared helper for the existing toast

`lib/finance/calculations.ts` gains:

```ts
export function budgetThresholdSeverity(spent: number, limit: number): "none" | "warning" | "over"
```

`transactions/page.tsx` is refactored to use it (removes the inline `pct >= 100 / >= 80`
duplication). No behaviour change to the toast.

### 5.5 Tests — `tests/unit/`

- `recurring-schedule.test.ts`: each frequency; month clamp (Jan 31→Feb, Aug 31→Sep 30,
  Dec→Jan year rollover, leap-year Feb).
- `unusual-spend.test.ts`: below `minAverage` filtered; small overspend filtered;
  `monthsWithSpend < 2` filtered; sort + cap to 2; zero-average safe.
- `month-summary.test.ts`: totals, savings rate, top-3 slice, delta vs prior, null delta.
- `calculations.test.ts`: add cases for `budgetThresholdSeverity`.

---

## 6. Client hooks — `hooks/`

| Hook | Wraps | Returns |
| --- | --- | --- |
| `useRecurring` | `recurring.{list,create,update,remove,markPaid}` | `{ items, loading, error, create, update, remove, markPaid }` — mirrors `useGoals` shape (incl. the `api as any` + `id as any` casts used elsewhere) |
| `useProactiveAlerts` | `proactive.{getAlerts,dismissAlert}` | `{ budgetAlerts, unusualAlerts, billReminders, loading, dismiss(alertKey, periodKey) }` |
| `useMonthlySummary` | `proactive.{getMonthlySummary,dismissMonthlySummary}` | `{ show, summary, loading, dismiss }` |
| `useNotificationPrefs` | `users.getCurrentUser` (read) + `users.updateNotificationPrefs` | `{ prefs, setPref(key, value) }` — optimistic, mirrors `LanguageProvider` pattern |

---

## 7. UI

### 7.1 Aesthetic direction

The app's established language is **warm editorial ledger** — cream paper (`#F7F4EC`), deep
forest green, one gold accent, `rounded-2xl` cards, thin warm borders, Manrope for figures,
Nastaliq for reading surfaces, RTL-first. Proactive alerts must read as **calm margin notes
in a ledger**, never as a notification tray shouting.

- **Severity via a 3px inline-start spine** (`border-s-[3px]`, logical ⇒ RTL-correct), not
  loud background fills. Amber spine = `--color-rq-caution` (budget 80%, bill due),
  terracotta = `--color-rq-danger` (budget 100%, overdue bill), forest =
  `--color-rq-success` (unusual-spend — informative, not alarming), gold =
  `--color-rq-gold` (monthly summary).
- Card body: `bg-[var(--color-rq-card)]` with a very light severity wash
  (`--color-rq-alert-bg` / `--color-rq-info-bg`) only on the icon chip, keeping the card
  itself paper-calm.
- One small glyph (lucide: `TriangleAlert`, `CalendarClock`, `TrendingUp`, `Sparkles`),
  Urdu headline in `font-sans` semibold `[15px]`, one-line detail `[13px]`
  `text-[var(--color-rq-text-secondary)]` with figures in `font-[var(--font-manrope)]`,
  a text action link where relevant, and a `✕` dismiss (ghost, `--color-rq-text-faint`).
- **Motion:** staggered entrance — each card `animate-in fade-in slide-in-from-top-2
  duration-200` with `style={{ animationDelay: \`\${i * 60}ms\` }}`. Dismiss = optimistic
  removal (the mutation + reactive query handle persistence); wrap in
  `animate-out fade-out` is optional and skipped to keep it simple. No `framer-motion`.
- The monthly-summary card is the one place to be slightly more expressive: a gold hairline
  top border (`border-t-2 border-[var(--color-rq-gold)]`), the four figures in a compact
  Manrope row, top-3 category chips, and the delta as a `↑/↓ N%` in caution/success color.

### 7.2 `components/dashboard/ProactiveAlerts.tsx` (new)

Renders the stacked region. Internal sub-components (same file):
`AlertCard` (generic), `BillReminderRow`, `MonthlySummaryCard`.

Order rendered: monthly summary → bill reminders (one card, rows inside) → unusual-spend
cards → budget cards. Renders **nothing** (no wrapper, no spacing) when everything is empty.

`BillReminderRow`: description + `Rs.` amount + due phrasing (`کل واجب` / `2 دن میں` /
`X دن پہلے واجب تھا`), a pre-checked inline checkbox *"اس بل کا خرچ بھی درج کریں"*, a
**"ادا شدہ" (Mark paid)** button → `markPaid({ id, logExpense: checkbox })`, and a `✕`
(→ `dismiss("bill:<id>", String(nextDueDate))`).

### 7.3 `app/(app)/dashboard/page.tsx` — mount the region

Insert `<ProactiveAlerts />` between `<DashboardHeader />` and the stat-cards grid, inside
the populated branch **and** the empty branch is skipped (no data ⇒ no alerts). It is its
own client component doing its own queries, so it degrades independently — a slow/failed
alert query never blocks the dashboard.

### 7.4 `app/(app)/budgets/page.tsx` — "Recurring bills" section

New card below the category table (left column), always visible when a budget exists — and
also when no budget exists (recurring bills are independent of budgets). Actually: render it
in its own full-width row under the existing grid so it shows regardless of budget state.

- List rows: icon + description + `Rs.` amount + frequency label + next-due date + edit/delete
  icon buttons (reuse the exact button markup from the category table).
- "بل شامل کریں" opens a `Dialog`: description, amount (`dir="ltr"` number input), category
  `Select` (expense + both), frequency `Select`, next-due `<input type="date">`.
- Delete → `AlertDialog` (reuse the category-delete pattern).
- Empty state: `EmptyState` component, `icon="🔁"`.
- All strings via `t()`.

### 7.5 `app/(app)/settings/page.tsx` — wire the toggles

Replace the hardcoded `[{label, on}]` array with values from `useNotificationPrefs()`.
Each `<Toggle>` `onChange` → `setPref(key, !value)`. Keys map:
`notifBudget80→budget80`, `notifBudget100→budget100`, `notifBillReminder→billReminder`,
`notifUnusualSpend→unusualSpend`, `notifMonthlySummary→monthlySummary`. Default view =
all on (matches "absent prefs ⇒ all true"). The `settings.notifUnusualSpend` toggle's
current hardcoded `on:false` becomes `on:true` by default.

### 7.6 `app/(app)/transactions/page.tsx`

Only change: import `budgetThresholdSeverity` and replace the inline `pct` branching
(lines ~224–239). Same two toasts, same copy.

### 7.7 i18n — `lib/i18n/ur.ts` + `lib/i18n/en.ts`

New key groups (both files, same keys):

- `proactive.*` — region + card copy: `budgetWarnTitle`, `budgetOverTitle`,
  `budgetDetail` (`{cat} · {pct}% · {spent} / {limit}` — built in component, so keys are
  label fragments), `unusualTitle`, `unusualDetail`, `billDueTitle`, `billDueTomorrow`,
  `billDueInDays`, `billOverdue`, `billMarkPaid`, `billLogExpense`, `dismiss`, `viewTxns`.
- `summary.*` — `title` ("پچھلے مہینے کا خلاصہ"), `income`, `expenses`, `net`,
  `savingsRate`, `topCategories`, `vsLastMonth`, `more`, `dismiss`.
- `recurring.*` — Budgets-page section: `title`, `subtitle`, `add`, `empty`, `emptyDesc`,
  `colDescription`, `colAmount`, `colFrequency`, `colNextDue`, `freqDaily`, `freqWeekly`,
  `freqMonthly`, `freqYearly`, `dialogAddTitle`, `dialogEditTitle`, `fieldDescription`,
  `fieldAmount`, `fieldCategory`, `fieldFrequency`, `fieldNextDue`, `deleteTitle`,
  `deleteDesc`, `toast.*`.

`TranslationKey` is `keyof typeof ur` so `ur.ts` stays the source of truth; `en.ts` must add
the identical keys or `tsc` fails.

---

## 8. Build order & commits

1. **`feat(schema): recurring + proactive-alerts data model`**
   `convex/schema.ts`, `convex/recurring.ts`, `convex/proactive.ts`,
   `convex/summary.ts` (+`monthsWithSpend`), `convex/users.ts` (`updateNotificationPrefs`).
   Gate: `npx convex codegen`, `npm run typecheck`.
2. **`feat(finance): recurring schedule, unusual-spend guard, month summary`**
   `lib/finance/recurring-schedule.ts`, `lib/finance/unusual-spend.ts`,
   `lib/finance/month-summary.ts`, `lib/finance/calculations.ts`
   (`budgetThresholdSeverity`), `tests/unit/*`. **No other dirs** (concurrency rule).
   Gate: `npm run test`, `npm run typecheck`.
3. **`feat(proactive): dashboard alerts, recurring bills UI, settings wiring`**
   `hooks/useRecurring.ts`, `hooks/useProactiveAlerts.ts`, `hooks/useMonthlySummary.ts`,
   `hooks/useNotificationPrefs.ts`, `components/dashboard/ProactiveAlerts.tsx`,
   `app/(app)/dashboard/page.tsx`, `app/(app)/budgets/page.tsx`,
   `app/(app)/settings/page.tsx`, `app/(app)/transactions/page.tsx`,
   `lib/i18n/{ur,en}.ts`.
   Gate: `npm run typecheck`, `npm run lint`, `npm run build`.
4. **`docs(progress): Phase 13 complete`** — `PROGRESS.md`, `AUDIT.md` §12
   (no new npm packages — nothing to log there beyond a note that Phase 13 added none).

Commits are user-authored, no Claude trailer (per repo memory). **Not pushed.**

---

## 9. Definition of Done (AGENTS.md §14) — Phase 13

- [ ] UI renders at 320 / 768 / 1280, LTR + RTL
- [ ] Backend: `recurring.ts` + `proactive.ts` queries/mutations, all `requireUser` + ownership
- [ ] Loading state: alert region simply absent while `loading`; recurring section uses `ListSkeleton`
- [ ] Empty state: no alerts ⇒ region renders nothing; recurring section `EmptyState`
- [ ] Error state: alert queries fail independently, dashboard unaffected
- [ ] Server-side validation: recurring `amount > 0`, description non-empty, category owned
- [ ] Urdu applied, RTL spine via logical `border-s`
- [ ] No AI mutation path added ⇒ confirmation gate N/A
- [ ] Unit tests for all three new pure modules + `budgetThresholdSeverity`
- [ ] No mock data, no `console.log`
- [ ] `typecheck` + `lint` + `test` + `build` + `convex codegen` green

## 10. Exit gate (manual — documented in PROGRESS.md for the user to run)

1. Create a budget category with a low limit; add expenses to push it past 80% then 100%
   → warning card then over card appear on the dashboard; dismiss → gone; reload → still gone
   (this month).
2. Add a recurring bill with next-due = tomorrow → reminder banner on dashboard;
   "ادا شدہ" with the checkbox on → bill's next-due advances one cycle, an expense
   transaction appears in the list, banner clears.
3. With ≥2 months of history in a category, spike the current month ≥30% (and past the
   Rs. floors) → unusual-spending card appears.
4. On the first dashboard load of a new month (or reset `lastSummaryDismissedMonth`) →
   monthly summary card with last month's figures; dismiss → does not return.
5. Settings: toggle each notification off → the corresponding surface stops appearing.

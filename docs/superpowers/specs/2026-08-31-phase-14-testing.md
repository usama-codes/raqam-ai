# Design — Phase 14: Safety, Reliability & Testing

> **Date:** 2026-08-31
> **Status:** Approved (grill-me interview) — implementing
> **Scope:** Full automated test pass across every prior phase — unit coverage for the
> last untested `lib/finance/` modules, Zod-schema validation tests for the AI layer,
> `convex-test` integration tests for every Convex module and the confirmation gate,
> automated two-user auth-isolation proof, `npm audit` review. Browser-only checks
> (RTL @320px, responsive @768/1280, UI error surfaces) are handed to the user as a
> manual checklist in `PROGRESS.md`.
> **References:** AGENTS.md §10 Phase 14, §12 Success Criteria, §13 Testing Strategy,
> §14 Definition of Done, PROGRESS.md Phase 14.
> **Concurrency rule (AGENTS.md §15):** `lib/finance/` and `lib/ai/` test files ship in
> separate commits. No `lib/finance/` or `lib/ai/` **source** changes in this phase.

---

## 1. Problem

Phases 0–13 are built. The harness (`vitest` + `convex-test` + `.github/workflows/ci.yml`)
exists and carries 111 unit tests plus 7 Convex integration tests (`proactive.test.ts`).
What is missing is breadth: most Convex mutations have no integration test, the AI Zod
schemas are untested, two `lib/finance/` modules (`anomaly.ts`, `projections.ts`) have no
direct test, the confirmation-gate cycle has no test, auth isolation is asserted only
informally, and `npm audit` has not been run against the Phase-14 gate.

Phase 14 also **fixes blocking issues found while testing** (grill-me: small/safe inline,
each in its own commit; anything larger is surfaced to the user).

---

## 2. Current state (from exploration)

| Area | State |
| --- | --- |
| `tests/unit/**` | `transcription`, `wav`, `calculations`, `import`, `recurring-schedule`, `unusual-spend`, `month-summary` — 111 tests |
| `tests/integration/**` | `proactive.test.ts` only — 7 tests, `convex-test` + `// @vitest-environment edge-runtime`, modules via `import.meta.glob(["../../convex/**/*.ts","!../../convex/ai.ts"])` |
| `tests/live/**` | `transcription.live.test.ts` — self-skips without `ASSEMBLYAI_API_KEY` |
| `lib/finance/anomaly.ts` | `isAnomaly`, `deviationFromAverage` — **untested directly** |
| `lib/finance/projections.ts` | `projectEndOfMonth`, `whatIfScenario`, `monthsToGoal` — **untested directly** |
| `lib/ai/schemas.ts` | `IntentClassification`, `TransactionExtraction`, `AIResponse` — **untested** |
| `lib/ai/action-schemas.ts` | `CreateTransactionParams`, `DeleteTransactionParams`, `CreateSavingsGoalParams`, `ActionExtraction` — **untested** |
| `convex/*` | `transactions`, `budgets`, `goals`, `categories`, `users`, `imports`, `summary`, `conversations`, `assistant`, `pendingActions` — **no integration tests** (proactive/recurring covered) |

### Bugs already spotted (to fix this phase)

1. **`convex/assistant.ts#getConversationHistory`** — no `requireUser`, no ownership check.
   Any caller (even unauthenticated) can read any conversation's messages by id. Compare
   `convex/conversations.ts#getMessages`, which checks both. **Fix:** add `requireUser` +
   conversation-ownership check.
2. **`convex/budgets.ts#getBudgetCategories` (line ~38)** — throws
   `"Budget not found or does not belong to this user."` when `ctx.db.get(budgetId)` is
   null. A reactive query holding a now-deleted budget id logs a console error for one
   render (seen during Phase 13 seeding). **Fix:** return `[]` when the budget is missing
   or not owned — no information leak, no error surface.

### Not fixed this phase (surfaced to user)

- **`auditLog` table** is in AGENTS.md §6 but not in `convex/schema.ts`; Phase 9's
  "audit log entry for every AI mutation" criterion is unmet. Fixing = schema change +
  touching every mutation → out of "small/safe". Note for Phase 15 / user decision.

---

## 3. Decisions (grill-me)

| # | Decision |
| --- | --- |
| 1 | **Full automated pass.** Every remaining Convex module gets an integration test; AI Zod schemas get unit tests; the 2 remaining `lib/finance/` files get unit tests; auth isolation is automated with two `convex-test` identities. Browser-only items → manual checklist in `PROGRESS.md`. **No Playwright** (no new dep). |
| 2 | **AI tests = offline schemas + one self-skipping live suite.** Deterministic Zod tests in `tests/unit/ai-schemas.test.ts`. A `tests/live/ai.live.test.ts` runs ~12 Urdu/Roman-Urdu/English samples through the real `orchestrate()` only when `GOOGLE_GENERATIVE_AI_API_KEY` is set; asserts **aggregate routing accuracy ≥ 80%** (LLM routing is not deterministic). Mirrors `transcription.live.test.ts`. |
| 3 | **Fix small/safe bugs inline**, each in its own commit with a `PROGRESS.md` note. The two bugs in §2 qualify. Larger findings are surfaced, not fixed. |
| 4 | **`npm audit`: document + fix only critical/high.** Record full `npm audit` output (severity counts) in `AUDIT.md §12`. Fix any critical/high with targeted overrides, re-run the full gate. Low/moderate transitive advisories are documented as accepted for the hackathon — no blind `npm audit fix`. |
| 5 | **Keep the existing `tests/{unit,integration,live}` split** (AGENTS.md §15: prefer the existing repo pattern). No new `tests/ai/` or `tests/import/` dirs — AI schema tests live in `tests/unit/`, live AI in `tests/live/`, import tests already in `tests/unit/import.test.ts`. |

---

## 4. Test plan

### 4.1 New unit tests (`tests/unit/`)

**`anomaly.test.ts`**
- `isAnomaly`: `rollingAvg === 0` → `false`; exactly `+30%` → `true`; `+29.9%` → `false`;
  negative deviation → `false`; custom threshold honoured.
- `deviationFromAverage`: zero avg → `0`; `+40%` → `40`; underspend → negative.

**`projections.test.ts`** (verified against hand arithmetic, AGENTS.md §13)
- `projectEndOfMonth(50000, 1200, 10)` → `38000`; zero days → unchanged balance.
- `whatIfScenario(40000, 8000, 30)` → `37600`; 0% → unchanged; 100% → `currentExpenses - categoryExpenses`.
- `monthsToGoal`: `monthlySavings <= 0` → `Infinity`; already met → `0`;
  `(100000, 40000, 20000)` → `3`; non-integer → `Math.ceil`.

**`ai-schemas.test.ts`**
- `IntentClassification`: valid `{intent,confidence,rationale}` passes; bad `intent`
  enum fails; missing `rationale` fails.
- `TransactionExtraction`: valid passes; `amount: -1` fails; `amount: 0` fails;
  missing `amount` fails; `clarificationNeeded` optional.
- `AIResponse`: `actionExtraction` optional; nested extraction validated.
- `CreateTransactionParams` / `DeleteTransactionParams` / `CreateSavingsGoalParams`:
  positive-amount + min-length rules; optional dates.
- `ActionExtraction` discriminated union: each `action` routes to its param schema;
  unknown `action` fails; mismatched params fail.

### 4.2 New integration tests (`tests/integration/`) — `convex-test`, edge-runtime

Shared helper module `tests/integration/_helpers.ts`: `modules` glob, `SUBJECT_A` /
`SUBJECT_B`, `seedUser(t, subject)` → `{ userId, cat }` (inserts user + the 14 system
categories via `t.run`), `addTxn(...)`. (Refactored out of the pattern already in
`proactive.test.ts`; that file keeps its own copy to avoid churn, or is migrated — TBD
during implementation, low-risk.)

**`transactions.test.ts`**
- `create`: valid → row; `amount <= 0` → throws; `Rs. 9_999_999` → ok; foreign
  `categoryId` → throws; no identity → throws.
- `update`: non-owner id → throws; `amount <= 0` → throws; partial patch leaves other
  fields; foreign category on change → throws.
- `remove`: non-owner id → throws; owner → gone.
- `list`: returns only caller's rows, newest-first, `dateFrom`/`dateTo` window.
- **Auth isolation:** B's `list` never returns A's rows; B's `update`/`remove` on A's id → throws.

**`budgets.test.ts`**
- `create`: duplicate month → throws; `totalLimit <= 0` → throws.
- `upsertCategory`: insert then update-in-place (same `_id`); foreign budget → throws;
  foreign category → throws; `limit <= 0` → throws.
- `deleteCategory`: non-owner → throws.
- `getBudgetCategories`: `spent` summed from expense txns inside `[month, month+1)` only;
  **after fix** — missing/foreign `budgetId` → `[]` (no throw).

**`goals.test.ts`**
- `create`: empty/whitespace name → throws; `targetAmount <= 0` → throws.
- `contribute`: `amount <= 0` → throws; non-owner → throws; crossing target sets
  `isCompleted`.
- `update`: `targetAmount <= 0` → throws; lowering target below `currentAmount` sets
  `isCompleted`.
- `remove`: non-owner → throws.
- **Auth isolation:** B cannot see/mutate A's goals.

**`categories.test.ts`**
- `users.ensureUser` (first call) seeds 14 system categories; second call is idempotent
  (still 14) and patches changed email/phone/username.
- `categories.create`: empty name → throws; duplicate name → throws; valid custom →
  `isSystem: false`.
- `list`: only caller's categories.

**`imports.test.ts`**
- `createPreview`: `fileType !== "csv"` → throws; `rows: []` → throws; `> MAX_IMPORT_ROWS`
  → throws; a row with `amount <= 0` or bad `date` → throws and **nothing persists**
  (no `imports` row); duplicate vs an existing transaction (same day+amount+desc) →
  row flagged `isDuplicate`.
- `confirmImport`: selected rows → `transactions` with `source: "import"`, `importId`
  set; deselected rows → skipped, no txn; foreign `categoryId` → throws and **nothing
  persists**; status flips `preview → confirmed`; second `confirmImport` → throws
  ("already been processed").
- Re-preview the same batch after confirm → rows flagged `isDuplicate` (dup detection
  against the just-imported txns).
- `cancelImport`: `preview` only; deletes `importedTransactions` + the `imports` row.
- **Auth isolation:** B's `getPreview`/`confirmImport`/`cancelImport` on A's import → throws.

**`summary.test.ts`**
- `getFinancialSummary`: `totalIncome`/`totalExpenses` from current-month rows only;
  `savingsRate = net/income*100` (0 when income 0); `categoryBreakdown[].percentage`
  sums to ~100; `recentTransactions` capped at 5, newest-first.
- `getIntelligenceData`: `historicalMonths` has 3 entries (months −3…−1);
  `categoryRollingAverages[].average = total/3`; `monthsWithSpend` counts months with
  `> 0` spend; `currentMonth.daysElapsed`/`totalDaysInMonth` sane.
- **Auth isolation:** B's summary excludes A's data.

**`users.test.ts`**
- `ensureUser` idempotent; `updateProfile` patches name + language; `updateNotificationPrefs`
  writes the 5-boolean object; `getCurrentUser` returns the row; no identity → throws.

**`confirmation-gate.test.ts`** (Phase 9 cycle, §12 criterion)
- `createPendingAction`: foreign conversation → throws; valid → `status: "pending"`.
- `confirmAction` / `createTransaction`: underlying `transactions` row created,
  `status → "executed"`, `resultMessage` set.
- `confirmAction` / `createSavingsGoal`: `savingsGoals` row created.
- `confirmAction` / `deleteTransaction`: matching row removed.
- `rejectAction`: **no** underlying row, `status → "rejected"`.
- `confirmAction` twice / on a rejected action → throws "no longer pending".
- Cross-user `confirmAction`/`rejectAction` → throws.
- `confirmAction` with params that fail the executor's checks → `status → "failed"` and
  throws; no partial write.
- **§12 assertion:** after a full pending→reject cycle, `transactions`/`savingsGoals`
  are untouched — no write-tool effect without a confirmed action.

**`auth-isolation.test.ts`** (Phase 14 exit gate — "two real users")
- Seed `SUBJECT_A` + `SUBJECT_B`, each with a transaction, budget, goal, category,
  conversation, import.
- For each read query (`transactions.list`, `goals.list`, `categories.list`,
  `budgets.get`, `summary.getFinancialSummary`, `conversations.list`,
  `assistant.getConversationHistory` **after fix**): B's call returns only B's data.
- For a sampling of by-id mutations: B acting on A's id → throws.
- No-identity call to one representative query/mutation per module → throws `ConvexError`.

### 4.3 New live test (`tests/live/ai.live.test.ts`)

- `describe.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)`.
- ~12 samples: 4 `educate` ("inflation kya hai?", "what is compound interest",
  "committee kya hoti hai?", "riba kya hai?"), 5 `analyze` ("is mahine kitna kharch
  hua?", "meri savings kitni hai?", "kya main 15000 ka phone afford kar sakta hoon?",
  "where do I spend most?", "mahine ke end tak kitna bachega?"), 3 `act`
  ("500 ka petrol add karo", "delete yesterday's grocery transaction", "savings goal
  banao 50000 ka").
- `orchestrate({userMessage, preferredLanguage, conversationHistory: []}, fakeCtx, {})`
  where `fakeCtx.runQuery` throws (financial context stays null — fine for routing).
- Assert **aggregate accuracy ≥ 80%**; log per-sample mismatches.

### 4.4 `npm audit`

- Run `npm audit` + `npm audit --json`; capture `metadata.vulnerabilities` counts.
- If `critical > 0 || high > 0`: fix via `overrides` / targeted bumps, re-run
  `typecheck + lint + test + build`.
- Else: add an `AUDIT.md §12` row with the counts and an "accepted for hackathon —
  all transitive, dev-only / no exploit path" rationale.

---

## 5. Commit sequence

1. `test(finance): unit tests for anomaly and projections`
2. `test(ai): Zod schema validation tests`
3. `fix(assistant): getConversationHistory enforces auth and ownership`
4. `fix(budgets): getBudgetCategories returns [] for a missing budget`
5. `test(convex): integration tests for transactions, budgets, goals, categories`
6. `test(convex): integration tests for imports, summary, users`
7. `test(convex): confirmation-gate and auth-isolation integration tests`
8. `test(ai): self-skipping live intent-classifier suite`
9. `chore: npm audit review, Phase 14 progress and audit log`

(1) and (2) stay separate per AGENTS.md §15. (3)/(4) are `convex/` source fixes, each
isolated. Gate after every commit: `npm run typecheck && npm run lint && npm run test &&
npx convex codegen` — full `next build` before commit 9.

---

## 6. Out of scope / deferred

- Playwright / React Testing Library — no component or browser automation this phase.
- `auditLog` table + wiring — surfaced to user (see §2).
- Load / performance testing — Phase 15.
- Fixing low/moderate `npm audit` transitive advisories — documented, not chased.

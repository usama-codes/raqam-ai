# Design — AI Pipeline Fix + Urdu Font System

> **Date:** 2026-08-29
> **Status:** Approved (brainstorming) — pending implementation plan
> **Scope:** Two independent fixes bundled into one spec:
> 1. Make the conversational AI pipeline run (currently 100% failure).
> 2. Replace the Urdu font with a hybrid Nastaliq + Sans Arabic system for legibility.
> **References:** AGENTS.md §7 (AI Architecture), §9.4 (Urdu-First Experience), PROGRESS.md Phase 8.

---

## Part 1 — AI Pipeline Fix

### 1.1 Problem

The assistant always replies with the generic Urdu fallback:

> معذرت، معاون میں کوئی مسئلہ آ گیا۔ براہ کرم دوبارہ کوشش کریں۔

**Confirmed root cause** (from Convex logs):

```
Gemini API error 404: This model models/gemini-2.0-flash is no longer available.
```

`gemini-2.0-flash` has been retired. `orchestrate()` catches the error and returns a friendly
message with the real error tucked into `result.error`, which the UI never renders — so the
failure was invisible.

**Second, currently-masked bug:** `lib/ai/gemini-provider.ts` (`GeminiModel.convertInputToMessages`)
only handles items with `role: "user" | "assistant" | "system" | "tool"` and `type: "function_call"`.
It never converts the SDK's function-call **result** items back into Chat Completions `tool`
messages. The moment the Triage agent hands off to a specialist, the follow-up request to Gemini
is missing the tool result and returns `400`. Fixing only the model name would expose this
immediately.

### 1.2 Decision

Run the AI orchestration in a **Convex Node.js action** and drive Gemini through the **real
`openai` SDK client** via the Agents SDK's built-in provider — the path documented at
<https://openai.github.io/openai-agents-js/guides/models/>.

Rationale:

- The Agents SDK's own `OpenAIChatCompletionsModel` formats tool-call / tool-result / handoff
  messages correctly. The hand-rolled provider does not, and maintaining it is ongoing risk.
- In the Convex **default** (V8/workerd-like) runtime, `@openai/agents-core` resolves to
  `shims-browser`, which references `CustomEvent` — hence the current polyfill. In a `"use node"`
  action it resolves to `shims-node`, which does **not** reference `CustomEvent` (verified in
  `node_modules/@openai/agents-core/dist/shims/`). The polyfill and the custom provider both
  become unnecessary.
- `"use node"` cold-start cost (~1s occasionally) is acceptable for a chat feature.

Multi-agent handoff architecture (Triage → Education | Analyze | Action) is **kept** as designed
in AGENTS.md §7. Only the transport is fixed.

### 1.3 Model

| Setting | Value |
| --- | --- |
| Model ID | `gemini-3.5-flash-lite` |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/openai/` (OpenAI-compatible, unchanged) |
| API mode | `chat_completions` |
| Tracing | disabled |

`gemini-3.5-flash-lite` is on the Gemini API free tier, is the cheapest current Flash-Lite tier,
and supports function calling. Defined as a single `MODEL` constant so it is swappable in one line.

> Note: `gemini-2.0-flash` (original) and `gemini-2.5-flash-lite` both returned 404 during
> implementation — the first retired, the second "no longer available to new users". The
> deployment's API key resolves `gemini-3.5-flash-lite`.

### 1.4 Changes

#### New: `convex/ai.ts`

```ts
"use node";
```

- Contains **only** the `sendMessage` action, moved verbatim from `convex/assistant.ts`.
- Already compatible: `sendMessage` uses only `ctx.runQuery` / `ctx.runMutation`, never `ctx.db`.
- Calls `api.assistant.saveUserMessage`, `api.assistant.getConversationHistory`,
  `api.assistant.getPreferredLanguage`, `api.assistant.saveAssistantMessage` (unchanged).

#### Modified: `convex/assistant.ts`

- Remove the `sendMessage` action and the `orchestrate` import.
- Keep: `getPreferredLanguage`, `getConversationHistory`, `saveUserMessage`, `saveAssistantMessage`.

#### Modified: `lib/ai/orchestrator.ts`

- **Delete** the `CustomEvent` polyfill block (lines ~9–25).
- **Delete** `import { GeminiModelProvider } from "./gemini-provider"` and all use of it.
- **Add** module-scope configuration (runs once per action instance):

  ```ts
  import OpenAI from "openai";
  import {
    setDefaultOpenAIClient,
    setOpenAIAPI,
    setTracingDisabled,
  } from "@openai/agents";

  setTracingDisabled(true);
  setOpenAIAPI("chat_completions");
  setDefaultOpenAIClient(
    new OpenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    }),
  );
  ```

- Keep the existing `apiKey` presence check; throw the same clear error if unset.
- **Add** `const MODEL = "gemini-3.5-flash-lite";` and replace all four `model: "gemini-2.0-flash"`
  occurrences with `model: MODEL`.
- **Change** `new Runner({ modelProvider: geminiProvider, tracingDisabled: true })` →
  `new Runner({ tracingDisabled: true })`. The default provider now uses the global OpenAI client.
- Everything else unchanged: `buildAgents()`, the 4 agents, handoffs, `toAgentInput`,
  `agentNameToIntent`, `buildFinancialContext`, prompt composition.
- In the `catch` block, log the full error object (not just `.message`) via `console.error` for
  debuggability. Keep returning the friendly localized fallback.

#### Deleted: `lib/ai/gemini-provider.ts`

#### Modified: `hooks/useAssistant.ts`

- `useAction((api as any).assistant.sendMessage)` → `useAction((api as any).ai.sendMessage)`.
- Capture the action's return value; if `result?.error` is truthy, `console.warn("[assistant]", result.error)`.
- No UX change — the friendly fallback assistant message still renders in the transcript.

#### Modified: `package.json`

- Add `"openai": "7.8.0"` to `dependencies` (currently only transitive via `@openai/agents`).
  Pinned exact per AGENTS.md §3 version discipline.

#### Post-change

- Run `npx convex codegen` so `api.ai.sendMessage` is typed.
- `tsc --noEmit` and `next build` must pass.

### 1.5 Data flow (unchanged)

```
useAssistant.sendMessage(content)
  → api.ai.sendMessage  (Convex "use node" action)
      → runMutation api.assistant.saveUserMessage
      → runQuery   api.assistant.getConversationHistory   (last 10)
      → runQuery   api.assistant.getPreferredLanguage
      → orchestrate({ userMessage, preferredLanguage, conversationHistory }, ctx, api)
          → buildFinancialContext(ctx, api)      (best-effort; specialists handle absence)
          → Runner.run(triageAgent, [...history, userMessage], { context, maxTurns: 5 })
              → Gemini (chat completions, gemini-3.5-flash-lite)
              → handoff → Education | Analyze | Action agent → final text
          → { content, intentType }              (intentType from result.lastAgent.name)
      → runMutation api.assistant.saveAssistantMessage
      → return result
  → Convex reactivity re-renders the transcript
```

### 1.6 Known risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Gemini's OpenAI-compat function-calling is "beta"; parallel tool calls during handoff may error | Set `modelSettings: { parallelToolCalls: false }` on the Triage agent. Add only if observed — not pre-built. |
| `@openai/agents` bundle size in a Convex Node action | Well within Convex Node action limits; no action needed unless the deploy rejects it. |
| Free-tier rate limits during demo | Handoffs cost ~2 calls/message. Acceptable at demo volume. If throttled, collapse to a single agent (future change, out of scope here). |

### 1.7 Out of scope

- Phase 9 confirmation gate / `pendingActions` / write tools.
- Collapsing the multi-agent architecture.
- Streaming responses (`getStreamedResponse` remains unused).
- Changing the friendly-fallback UX.

---

## Part 2 — Urdu Font System

### 2.1 Problem

Body text is hard to read. `app/layout.tsx` loads **Noto Naskh Arabic** as the default font.
Naskh is thin, Arabic-flavored, and stiff for Urdu; native readers scan Nastaliq far faster,
and the current rendering serves neither native speakers nor learners well.

### 2.2 Decision — Hybrid

| Surface | Font | Reason |
| --- | --- | --- |
| Text people **read**: AI assistant replies, assistant empty-state greeting, long-form/educational copy | **Noto Nastaliq Urdu** | The script Urdu readers expect and parse fastest |
| Text people **scan**: nav, sidebar, labels, stat-card titles, table cells, buttons, form fields, chips, badges, toasts, dialog bodies, page headings | **Noto Sans Arabic** | Modern humanist sans; larger apparent x-height, full weight range, crisp in dense rows; easiest for new learners |
| Pure numeric displays (stat values) | **Manrope** | Unchanged — already used for figures |

Chosen over: all-Nastaliq (poor UI density, weak bolds), all-Sans (reads plain / "Arabic" to
native speakers), Gulzar (single weight only).

### 2.3 Changes

#### `app/layout.tsx`

- **Add** `Noto_Sans_Arabic` from `next/font/google`:
  - `variable: "--font-noto-sans-arabic"`, `subsets: ["arabic"]`,
    `weight: ["400", "500", "600", "700"]`, `display: "swap"`.
- **Keep** `Noto_Nastaliq_Urdu` (`--font-noto-nastaliq-urdu`, `weight: ["400", "700"]`, already present).
- **Remove** the `Noto_Naskh_Arabic` import, its instantiation, and its `.variable` from the
  `<html>` className. (Noto Sans Arabic fully covers the Urdu character set; keeps the payload to
  two Arabic-script families.)
- **Remove** the `font-[var(--font-noto-naskh-arabic)]` class from `<body>`. The default now comes
  solely from `globals.css` `html { @apply font-sans }`.
- Add `${notoSansArabic.variable}` to the `<html>` className.

#### `app/globals.css`

- In `@theme inline`:
  - `--font-sans` → `var(--font-noto-sans-arabic), var(--font-geist-sans), system-ui, sans-serif`
  - `--font-heading` → same value as `--font-sans`
  - `--font-nastaliq` → `var(--font-noto-nastaliq-urdu), serif` (already present — keep)
  - Replace every remaining `var(--font-noto-naskh-arabic)` with `var(--font-noto-sans-arabic)`.
- Add a reading utility (used for Nastaliq blocks):

  ```css
  @layer components {
    .font-reading {
      font-family: var(--font-nastaliq);
      line-height: 2.4;
    }
  }
  ```

#### `app/(app)/assistant/page.tsx`

- Assistant (AI) message bubble: add `font-reading` to the content element; ensure its container
  padding accommodates `line-height: 2.4` without clipping.
- Empty-state greeting (`assistant.greeting`) and its description (`assistant.greetingDesc`):
  add `font-reading`.
- User message bubbles: **no change** — stay Sans Arabic (visual contrast; user input is often
  Roman Urdu / English).
- The `ر` logo glyph: no change (already `font-[var(--font-noto-nastaliq-urdu)]`).
- Header, intent badges, chips, input, send button: no change — inherit Sans Arabic.

#### All other screens

No per-file edits. Dashboard, transactions, budgets, goals, settings, sidebar, shared
components, dialogs, and toasts inherit **Noto Sans Arabic** through the `--font-sans` /
`--font-heading` token swap. `dir="rtl"` is already global and is unaffected.

The existing `رقم` brand wordmarks that set `font-[var(--font-noto-nastaliq-urdu)]` explicitly
(`components/layout/sidebar.tsx`, `app/(auth)/login/[[...login]]/page.tsx`,
`app/(auth)/signup/[[...signup]]/page.tsx`, and the `ر` glyph in the assistant header) are
intentionally left as Nastaliq — do not change them.

The only files that reference `--font-noto-naskh-arabic` today are `app/layout.tsx` and
`app/globals.css` (lines 13 and 16); no component uses it directly.

#### Post-change

- `tsc --noEmit` and `next build` must pass.
- Manual check: assistant page (Nastaliq replies, loose line-height, no clipping) and one dense
  screen (dashboard) at 320 / 768 / 1280 in RTL.

### 2.4 Trade-off accepted

Noto Nastaliq Urdu weight files are large. Restricting Nastaliq to assistant reading surfaces
(not the whole app) contains the cost. `next/font/google` self-hosts and subsets to the `arabic`
range automatically.

### 2.5 Out of scope

- Urdu-Indic numeral rendering (AGENTS.md keeps Western digits).
- Per-page Nastaliq headings outside the assistant.
- A user-facing font toggle.

---

## Part 3 — Markdown rendering in assistant replies (added 2026-08-29)

### 3.1 Problem

With the pipeline live, Gemini's `analyze` / `educate` replies come back as Markdown — `**bold**`
term labels, `-` bullet lists, `1.` numbered lists, occasional tables. The assistant bubble
rendered `{msg.content}` as a raw string, so every marker leaked through as literal text and
newlines collapsed into one run-on block.

### 3.2 Decision

Render `msg.content` through `react-markdown@10.1.0` with:

- `remark-gfm@4.0.1` — tables, strikethrough, task lists, autolinks.
- `remark-breaks@4.0.0` — a single `\n` becomes a line break. LLMs emit `\n` expecting it to
  show; without this, soft-wrapped lines merge.

No `rehype-raw` — embedded HTML in model output stays inert (escaped), so there is no injection
surface. All three packages are MIT and dependency-free of runtime services (AGENTS.md §3: exact
pins added to `package.json`).

### 3.3 Changes

#### New: `components/assistant/MarkdownMessage.tsx`

Client component. `<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={…}>`.
The `components` map restyles every element for the RTL Nastaliq reading surface:

- Running text (`p`) keeps a tall `leading-[2.3]`; headings and list rows use tighter leading so
  they don't drift apart.
- Lists use logical `ps-*`; blockquote uses `border-s-*` — both resolve to the right-hand side
  under `dir="rtl"`.
- `strong` renders in the brand green (`#0F5132`) — Gemini uses bold for the figure labels
  ("کل آمدنی", "کھانا"), so this doubles as visual structure.
- `code` / `pre` / table cells are forced `dir="ltr"` / `text-start` (they hold PKR figures and
  identifiers).
- `h1`–`h4` are downshifted to `h3`–`h6` (the bubble is deep in the page outline).

#### Modified: `app/(app)/assistant/page.tsx`

- AI bubble content: `{msg.content}` → `<MarkdownMessage content={msg.content} />`. Bubble keeps
  `font-reading text-[16px]` (font-family + base size cascade into the rendered elements);
  padding bumped `py-[14px]` → `py-4`.
- User bubbles: **no change** — still plain text.

#### Modified: `package.json`

`react-markdown` `10.1.0`, `remark-breaks` `4.0.0`, `remark-gfm` `4.0.1` added to `dependencies`.

### 3.4 Out of scope

- Syntax highlighting for code blocks (finance replies rarely contain code).
- Streaming/incremental markdown parse (replies arrive whole from the Convex action).
- Markdown in user messages.

---

## Verification (both parts)

1. `npx convex codegen` — clean.
2. `npx tsc --noEmit` — zero errors.
3. `next build` — compiles.
4. Live: send `"انفلیشن کیا ہوتی ہے؟"` → Urdu explanation renders in Nastaliq, `EDUCATE` badge.
5. Live: send `"اس مہینے کتنا خرچ ہوا؟"` → data-grounded reply (or the "add transactions first"
   message if no data), `ANALYZE` badge.
6. Live: send `"500 کا پیٹرول ایڈ کرو"` → `ACT` badge, extraction described (no write — Phase 9).
7. Convex logs show no errors during 4–6.
8. Dashboard + assistant legible at 320 / 768 / 1280, RTL intact.

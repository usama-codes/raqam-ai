# Implementation Plan — AI Pipeline Fix + Urdu Font System

> **Spec:** `docs/superpowers/specs/2026-08-29-ai-pipeline-and-urdu-font-design.md`
> **Date:** 2026-08-29
> Execute phases in order. Each phase ends with a verification gate — do not start the next
> phase until the current gate passes.

---

## Phase A — Dependency

1. `package.json` → add `"openai": "7.8.0"` to `dependencies` (alphabetical order, exact pin).
2. `npm install`.

**Gate:** `node_modules/openai/package.json` shows `7.8.0`; `npm ls openai` resolves without peer warnings.

---

## Phase B — Split the Convex action into a Node runtime file

1. Create `convex/ai.ts`:
   - First line: `"use node";`
   - Move the entire `sendMessage` `action({...})` export from `convex/assistant.ts` **verbatim**.
   - Imports needed: `action` from `./_generated/server`, `v` from `convex/values`, `api` from
     `./_generated/api`, `orchestrate` from `@/lib/ai/orchestrator`.
2. Edit `convex/assistant.ts`:
   - Remove the `sendMessage` export.
   - Remove `import { orchestrate } from "@/lib/ai/orchestrator";`.
   - Remove `action` from the `./_generated/server` import if now unused.
   - Keep `getPreferredLanguage`, `getConversationHistory`, `saveUserMessage`, `saveAssistantMessage`.
3. `npx convex codegen`.

**Gate:** `npx convex codegen` succeeds; `convex/_generated/api.d.ts` contains `ai.sendMessage`;
`npx tsc --noEmit` passes.

---

## Phase C — Rewrite the orchestrator transport

Edit `lib/ai/orchestrator.ts`:

1. Delete the `CustomEvent` polyfill block (top of file, ~lines 9–25).
2. Remove `import { GeminiModelProvider } from "./gemini-provider";`.
3. Add near the top, after imports:
   ```ts
   import OpenAI from "openai";
   import {
     setDefaultOpenAIClient,
     setOpenAIAPI,
     setTracingDisabled,
   } from "@openai/agents";

   const MODEL = "gemini-2.5-flash-lite";

   setTracingDisabled(true);
   setOpenAIAPI("chat_completions");
   setDefaultOpenAIClient(
     new OpenAI({
       apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
       baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
     }),
   );
   ```
   (Keep it module-scope; it runs once per action instance. The `apiKey` presence check inside
   `orchestrate()` stays as the user-facing guard.)
4. In `buildAgents()`, replace all four `model: "gemini-2.0-flash"` with `model: MODEL`.
5. In `orchestrate()`:
   - Delete the `geminiProvider` construction.
   - `new Runner({ modelProvider: geminiProvider, tracingDisabled: true })` →
     `new Runner({ tracingDisabled: true })`.
   - In the `catch` block, change `console.error("AI orchestration error:", message)` to also log
     the error object: `console.error("AI orchestration error:", err)`. Keep the localized return.
6. Delete `lib/ai/gemini-provider.ts`.

**Gate:** `npx tsc --noEmit` passes; no remaining import of `gemini-provider` or `GeminiModelProvider`
anywhere (`grep -rn "gemini-provider\|GeminiModelProvider" lib convex` is empty).

---

## Phase D — Client hook

Edit `hooks/useAssistant.ts`:

1. `useAction((api as any).assistant.sendMessage)` → `useAction((api as any).ai.sendMessage)`.
2. In `sendMessage`, capture the result and warn on soft errors:
   ```ts
   const result = await sendMessageAction({ ... });
   if (result?.error) console.warn("[assistant]", result.error);
   ```

**Gate:** `npx tsc --noEmit` passes; `grep -rn "assistant.sendMessage" hooks app components` is empty.

---

## Phase E — Verify Part 1

1. `npx convex codegen` — clean.
2. `npx tsc --noEmit` — zero errors.
3. `next build` — compiles.
4. Ensure `npx convex dev` is running (deploys the new `convex/ai.ts`).
5. Live smoke test in the app (user, authenticated), watching `npx convex logs`:
   | Input | Expect |
   | --- | --- |
   | `انفلیشن کیا ہوتی ہے؟` | Urdu explanation, `EDUCATE` badge, no log errors |
   | `اس مہینے کتنا خرچ ہوا؟` | Data-grounded reply or "add transactions first", `ANALYZE` badge |
   | `500 کا پیٹرول ایڈ کرو` | `ACT` badge, extraction described, no write (Phase 9 not built) |
6. If handoffs error on Gemini (parallel tool calls): add
   `modelSettings: { parallelToolCalls: false }` to the Triage agent in `buildAgents()`, redeploy,
   re-test.

**Gate:** all three smoke inputs return a real Gemini answer; Convex logs show no errors.

**Commit:** `fix(ai): run orchestration in a node action via the real openai client → Gemini`

---

## Phase F — Urdu font system

Invoke the `frontend-design` skill before editing, to apply typographic judgement to the Nastaliq
surfaces (line-height, size, weight, exact scope).

1. `app/layout.tsx`:
   - Add `Noto_Sans_Arabic` from `next/font/google`: `variable: "--font-noto-sans-arabic"`,
     `subsets: ["arabic"]`, `weight: ["400","500","600","700"]`, `display: "swap"`.
   - Remove the `Noto_Naskh_Arabic` import, its `notoNaskhArabic` instantiation, and its
     `.variable` from the `<html>` className.
   - Add `${notoSansArabic.variable}` to the `<html>` className.
   - Remove `font-[var(--font-noto-naskh-arabic)]` from the `<body>` className.
2. `app/globals.css`, in `@theme inline`:
   - `--font-sans` → `var(--font-noto-sans-arabic), var(--font-geist-sans), system-ui, sans-serif`
   - `--font-heading` → same as `--font-sans`
   - Leave `--font-nastaliq` as is.
   - Add:
     ```css
     @layer components {
       .font-reading {
         font-family: var(--font-nastaliq);
         line-height: 2.4;
       }
     }
     ```
3. `app/(app)/assistant/page.tsx`:
   - Assistant (AI) message bubble content element → add `font-reading`; verify the `py-*` padding
     on its container is enough for `line-height: 2.4` (bump if it clips).
   - Empty-state `assistant.greeting` `<h2>` and `assistant.greetingDesc` `<p>` → add `font-reading`.
   - Leave user bubbles, header, badges, chips, input, send button unchanged.
4. Do **not** touch the `رقم` / `ر` Nastaliq wordmarks in `sidebar.tsx` or the auth pages.

**Gate:** `grep -rn "noto-naskh-arabic\|Noto_Naskh" app` is empty; `npx tsc --noEmit` passes;
`next build` compiles.

---

## Phase G — Verify Part 2

1. Run the app. Assistant page: AI replies render in Nastaliq with comfortable spacing, no
   clipping, RTL intact.
2. Dashboard + transactions: labels / numbers / tables render in Noto Sans Arabic, denser and
   crisper than before.
3. Check 320 / 768 / 1280 widths in RTL — no overflow or misalignment.

**Commit:** `feat(ui): hybrid Urdu font — Nastaliq for AI replies, Sans Arabic for UI`

---

## Phase H — Wrap up

1. Update `PROGRESS.md` Phase 8 notes: SDK transport corrected (node action + real openai client,
   `gemini-2.5-flash-lite`); font system updated.
2. Confirm `.env.example` still lists `GOOGLE_GENERATIVE_AI_API_KEY` (it does) — no change.

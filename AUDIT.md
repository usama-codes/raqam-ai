# AUDIT.md — Phase 0 Repository and Architecture Audit

> **Date:** 2026-08-27
> **Agent:** AI Coding Agent
> **Phase:** Phase 0 — Repository and Architecture Audit
> **Status:** COMPLETE

---

## Executive Summary

The Raqam-AI repository is a **greenfield project**. It contains no application code, no dependencies, no configuration, and no infrastructure. The only substantive file is `AGENTS.md`, which serves as the complete product and engineering specification. Phase 1 (UI Fidelity / Design Mirroring) can begin immediately after this audit, as there is no existing code to refactor, migrate, or reconcile.

---

## 1. Current Repository State

### 1.1 Files

| File         | Purpose                                      |
| ------------ | -------------------------------------------- |
| `AGENTS.md`  | Product specification and agent instructions |
| `.gitignore` | Standard Next.js/Node.js ignore patterns     |

**Total tracked files:** 2
**Total application code files:** 0

### 1.2 Git History

| Commit    | Description              |
| --------- | ------------------------ |
| `52f8d09` | Initial commit           |
| `92b185e` | AGENTS.md initialized    |
| `5c692b7` | Add .gitignore           |
| `1550518` | Merge remote main (HEAD) |

**Branch:** `main` (single branch, up to date with `origin/main`)
**Unstaged changes:** `AGENTS.md` (modified locally)

### 1.3 Package Manager / Dependencies

- **No `package.json` exists.** No Node.js project has been initialized.
- **No `node_modules/` directory.**
- **No lock files** (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`).
- **No dependencies installed or declared.**

---

## 2. Routes and Data Sources

### Current routes

**None.** No Next.js application has been initialized. There is no `app/` directory, no `pages/` directory, and no routing configuration of any kind.

### Data sources

**None.** No data fetching, no API calls, no database connections, no hardcoded data files exist.

---

## 3. Mock / Hardcoded Data

**None.** There are no TypeScript files, no data arrays, no fixture files, and no `// MOCK_DATA` comments anywhere in the repository.

---

## 4. Existing Convex Functions

**None.** There is no `convex/` directory, no `convex/schema.ts`, no queries, no mutations, no actions, and no Convex configuration.

---

## 5. Current Authentication State

**None.** No authentication provider (Clerk, Convex Auth, or otherwise) has been configured. There are no auth-related files, no middleware, no protected routes, and no user management code.

---

## 6. Missing Environment Variables

All environment variables specified in `AGENTS.md` §5 are missing. No `.env`, `.env.example`, or `.env.local` files exist.

| Variable                            | Status  | Required By                 |
| ----------------------------------- | ------- | --------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`            | Missing | Phase 4 (Convex Layer)      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Missing | Phase 3 (Auth)              |
| `CLERK_SECRET_KEY`                  | Missing | Phase 3 (Auth)              |
| `GOOGLE_GENERATIVE_AI_API_KEY`      | Missing | Phase 8 (Conversational AI) |
| `OPENAI_API_KEY`                    | Missing | Alternative to Gemini       |
| `GOOGLE_CLOUD_VISION_API_KEY`       | Missing | Phase 11 (Multimodal)       |
| `OPENAI_WHISPER_API_KEY`            | Missing | Phase 11 (Multimodal)       |

---

## 7. Dependency Conflicts with Tech Stack Requirements

**None.** Since no dependencies exist, there are no conflicts. The following stack must be established in Phase 1:

| Concern     | Required Technology      |
| ----------- | ------------------------ |
| Framework   | Next.js (App Router)     |
| Language    | TypeScript (strict mode) |
| Styling     | Tailwind CSS             |
| Components  | shadcn/ui                |
| Backend/DB  | Convex                   |
| Auth        | Clerk or Convex Auth     |
| AI Provider | Gemini or GPT-4o         |

---

## 8. Technical Debt

**None.** There is no code to incur debt against.

---

## 9. `.gitignore` Assessment

The existing `.gitignore` is a standard Next.js/Node.js ignore file. It correctly excludes:

- `node_modules/`
- `.next/` and `out/`
- `.env` and `.env*.local`
- `build/`
- `coverage/`
- `.vercel`
- `*.tsbuildinfo` and `next-env.d.ts`

**Missing entries to add in Phase 1 or later:**

- `convex/_generated/` (Convex auto-generated code)
- `.turbo/` (if Turborepo is used)
- `components/ui/` (shadcn/ui generated components — per AGENTS.md §5 "do not edit")

---

## 10. Phase 1 Readiness Assessment

### What needs to happen before Phase 1 can begin

The current app is in state: **Empty repository with only a specification document.**

The following **12 things** need to be created/established in Phase 1:

1. **Initialize Next.js project** with App Router and TypeScript (strict mode).
2. **Install and configure Tailwind CSS** with RTL support.
3. **Install and configure shadcn/ui** component library.
4. **Set up the directory structure** as specified in AGENTS.md §5 (routes, components, lib, hooks, convex, public/fonts).
5. **Load Urdu-capable font** (Noto Naskh Arabic) in `app/layout.tsx`.
6. **Create all primary route pages** (dashboard, transactions, budgets, goals, assistant, settings, login, signup).
7. **Build navigation** (sidebar or bottom bar).
8. **Implement all primary screens** with realistic placeholder/mock data labeled `// MOCK_DATA — replace in Phase 2`.
9. **Ensure RTL compatibility** from the start (`dir="rtl"` support, Tailwind RTL variants).
10. **Ensure responsiveness** at 320px, 768px, and 1280px breakpoints.
11. **Create `.env.example`** with all required environment variable names (values empty).
12. **Update `.gitignore`** to include `convex/_generated/` and `components/ui/`.

### Blockers for Phase 1

**None.** The repository is clean and ready for Phase 1 to begin immediately.

---

## 11. Conclusion

This is a greenfield repository. The audit confirms:

- **0 routes** exist
- **0 mock data sources** exist
- **0 Convex functions** exist
- **0 auth implementation** exists
- **0 environment variables** are configured
- **0 dependency conflicts** exist
- **0 technical debt** exists

The repository is in a pristine state, ready for Phase 1 (UI Fidelity / Design Mirroring) to begin. The `AGENTS.md` specification is comprehensive and provides all necessary guidance for implementation. No existing code needs to be reconciled, migrated, or refactored.

---

## 12. Post-Audit Dependency & Service Log

Additions made after Phase 0, recorded here per AGENTS.md §15 ("Introducing a new npm package without adding it to `AUDIT.md` with justification" is prohibited).

| Date       | Item                                               | Type                                       | Justification                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | -------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-30 | `vitest` `4.1.11`                                  | devDependency (test runner)                | Runs `tests/unit/**`. Seeds AGENTS.md Phase 14. Zero runtime/bundle footprint. Adds `npm run test` / `typecheck` scripts + `.github/workflows/ci.yml`.                                                                                                                                                                                                                                                                                    |
| 2026-08-30 | AssemblyAI (`api.assemblyai.com`)                  | External service (speech-to-text)          | Primary voice-transcription engine (model `universal-2` — cheapest tier, and the only AssemblyAI model supporting Urdu). Free tier covers hackathon demo volume. **User-approved.** No SDK added — raw `fetch` from `convex/ai.ts` via `lib/ai/transcription.ts`. Falls back to Gemini, then the browser Web Speech API. Key: `ASSEMBLYAI_API_KEY` (Convex deployment env).                                                               |
| 2026-08-30 | `framer-motion` `13.1.1`                           | dependency (UI animation)                  | Assistant-page micro-interactions — composer focus ring, `VoiceRecorder` entrance, message-bubble entrance, suggestion-card hover. **User-approved.** React-19 compatible; ~35 KB gz. Scoped to `components/assistant/**`.                                                                                                                                                                                                                |
| 2026-08-31 | `papaparse` `5.7.0` + `@types/papaparse` `5.5.2`   | dependency + devDependency (CSV parsing)   | Phase 12 bank-statement import. Battle-tested RFC-4180 parser (quoted commas, CRLF, BOM) instead of hand-rolled CSV splitting. Runs **client-side only** — `convex/imports.ts` imports just the pure normalizer, so papaparse never enters the Convex bundle. Pinned exact; `npm audit`: zero advisories from this package.                                                                                                               |
| 2026-09-02 | Twilio SMS (`api.twilio.com`) | External service (proactive notifications) | Phase 13 proactive Urdu budget/bill/monthly-summary alerts. **User-requested swap** replacing the removed WhatsApp Cloud API channel. No SDK — raw `fetch` via `lib/notifications/twilio.ts` from the Convex Node runtime. Consent-first (`notificationSettings`, all alerts default OFF), per-alert dedup log, internal-only cron functions (§8). Keys: `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` (Convex deployment env, to be filled by the user). |
| 2026-09-01 | Gemini TTS (`gemini-3.1-flash-tts-preview`)        | External service (text-to-speech)          | Urdu voice replies for the hands-free voice-call mode. Reuses the existing `GOOGLE_GENERATIVE_AI_API_KEY` — no new keys; optional `GEMINI_TTS_MODEL` / `GEMINI_TTS_VOICE` overrides (Convex deployment env). Raw `fetch` (no SDK); browser `speechSynthesis` (ur-PK) fallback keeps replies audible even without the API.                                                                                                                 |

---

_Audit completed. Phase 0 exit criteria satisfied: AUDIT.md exists, accurately describes the current state, and a human or another agent can read it and agree it is accurate._

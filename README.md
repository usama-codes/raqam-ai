# Raqam AI

An intelligent personal finance platform for Urdu-speaking users, powered by AI agents and real-time financial analysis.

## 📋 Overview

Raqam AI is a Next.js-based financial companion that helps users in Pakistan manage their money through:
- **AI-driven insights** using Gemini and OpenAI models
- **Urdu-first interface** with Nastaliq font rendering
- **Intelligent transaction management** with CSV import and categorization
- **Budget tracking and projections** with natural language AI assistance
- **Real-time data persistence** through Convex backend

## 🎯 Key Features

- **Multi-language support** (Urdu & English) with RTL rendering
- **Financial data import** from CSV with intelligent column detection
- **AI assistant** for financial education, analysis, recommendations, and actions
- **Budget management** with category-based tracking
- **Duplicate detection** across imported and manually-entered transactions
- **Secure authentication** via Clerk
- **Audit logging** for all financial actions

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router) + React 19 | UI framework |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS + shadcn/ui | Responsive UI components |
| **Backend** | Convex | Database, realtime sync, server actions |
| **Auth** | Clerk | User authentication & identity |
| **AI** | OpenAI SDK + Google Gemini API | LLM models for agents |
| **Data Import** | PapaParse | CSV parsing & normalization |
| **Markdown** | react-markdown + remark-gfm | Rich text rendering for AI responses |

### Dependency Versions

See `package.json` for complete dependency list. All dependencies are pinned to exact versions for reproducibility.

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/usama-codes/raqam-ai.git
   cd raqam-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Required variables:
   - `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk public key
   - `CLERK_SECRET_KEY` — Clerk secret key (server-only)
   - `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini API key
   - `OPENAI_API_KEY` — OpenAI API key (optional, fallback)

4. **Start development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## 🚀 Development

### Build & Test

```bash
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm run test         # Run unit tests
npm run test:watch   # Watch mode
```

### Project Structure

```
raqam-ai/
├── app/                      # Next.js App Router
│   ├── (app)/               # Authenticated routes
│   ├── onboarding/          # User onboarding wizard
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── assistant/           # AI chat interface
│   ├── import/              # CSV import flow
│   ├── landing/             # Landing page components
│   ├── ui/                  # shadcn/ui base components
│   └── OnboardingGuard.tsx  # Auth wrapper
├── convex/                  # Convex backend
│   ├── schema.ts           # Database schema
│   ├── ai.ts               # AI orchestration action
│   ├── assistant.ts        # Chat history & persistence
│   ├── auditLog.ts         # Audit trail logging
│   ├── imports.ts          # CSV import handling
│   ├── users.ts            # User management
│   └── seed.ts             # Demo data seeding
├── hooks/                   # React hooks
│   ├── useAssistant.ts     # Chat orchestration
│   └── useImports.ts       # Import workflow
├── lib/                     # Utilities & domain logic
│   ├── ai/                 # AI agent definitions & orchestration
│   ├── finance/            # Financial calculations & utilities
│   │   ├── import/         # CSV parsing & normalization
│   │   └── ...             # Balance, category logic
│   └── i18n/               # Internationalization (Urdu & English)
├── tests/                   # Unit & integration tests
├── docs/                    # Documentation & planning
│   └── DEPLOY.md           # Deployment checklist
├── AGENTS.md               # Complete product specification
├── AUDIT.md                # Architecture & phase audit
├── PROGRESS.md             # Development progress tracking
└── package.json
```

## 🤖 AI Architecture

### Intent Router

The AI assistant routes user requests into four intents:

- **EDUCATE** — Explain financial concepts in Urdu (inflation, savings rate, debt management)
- **ANALYZE** — Break down current financial status with key metrics
- **RECOMMEND** — Suggest budget adjustments and savings strategies
- **ACT** — Execute financial actions (create budget, log transaction) with user confirmation gate

### Data Flow

```
User Input (Urdu or English)
        ↓
Intent Detection & Financial Context Builder
        ↓
Agent Selection (schema, tools, system prompt)
        ↓
OpenAI/Gemini LLM Call
        ↓
Structured Output Parsing
        ↓
Confirmation Gate (for ACT intent)
        ↓
Convex Action Execution
        ↓
Audit Log + Response to User
```

See `AGENTS.md` (§2–5) for full specification.

## 💾 Data Import

### CSV Import Workflow

1. **Upload** — Validate file (type, size ≤5 MB, rows ≤500)
2. **Parse & Normalize** — Client-side CSV parsing with PapaParse
3. **Column Detection** — Auto-detect "Date", "Amount", "Description", "Category"
4. **Preview** — Editable table with duplicate detection and per-row validation
5. **Confirm** — Atomic Convex mutation: insert all selected rows or none
6. **History** — Track import status and view previous imports

### Supported Columns

- **Date** — Parsed as local-midnight Unix timestamp (client-side)
- **Amount** — Auto-detects debit/credit; handles negative and D/C tokens
- **Description** — Free-text; used for duplicate detection and categorization
- **Category** — User-selected during import; rule-based suggestions available

See `PROGRESS.md` (Import Phase) for implementation details.

## 🌍 Localization

Raqam AI ships with full Urdu (اردو) and English support:

- **UI strings** — Stored in `lib/i18n/{ur,en}.ts`
- **Date/number formatting** — Locale-aware utilities
- **Font rendering** — Nastaliq font for Urdu reading surface
- **RTL layout** — Tailwind logical properties (`start`, `end`, `ps`, `pe`)

Switching between Urdu and English via a language selector updates all UI text and layout direction in real-time.

## 🔐 Authentication & Security

- **Clerk integration** — Sign-up, sign-in, MFA, session management
- **Protected routes** — `OnboardingGuard` wrapper ensures onboarding completion
- **Audit logging** — All financial actions logged with timestamp, user ID, and action type
- **Server-only keys** — `CLERK_SECRET_KEY` never exposed to client
- **No localStorage for financial records** — All data persisted to Convex (source of truth)

## 📊 Database Schema (Convex)

- **users** — Profile, auth metadata, onboarding status
- **transactions** — Income & expenses with categories, amounts, dates
- **budgets** — Category budgets with limits and tracking
- **imports** — Import history and metadata
- **importedTransactions** — Imported row data linked to source import
- **conversations** — Chat history with timestamps and intents
- **pendingActions** — Confirmation queue for ACT intent
- **auditLog** — Immutable action trail for compliance

See `convex/schema.ts` for detailed schema definitions.

## 🚢 Deployment

For production deployment to Vercel + Convex:

1. **Read** `docs/DEPLOY.md` — Complete checklist
2. **Set environment variables** on both Vercel and Convex
3. **Deploy Convex** — `npx convex deploy`
4. **Deploy to Vercel** — Connect GitHub repo, env vars auto-deployed
5. **Run smoke tests** — Verify auth, chat, and import flows
6. **Seed demo data** (optional) — `npx convex run seed:demo ...`

## 📝 Development Phases

Raqam AI is built in 15 phases:

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Architecture Audit | ✅ Complete |
| 1–3 | UI, Auth, Chat | ✅ Complete |
| 4–6 | Financial Domain, CSV Import | ✅ Complete |
| 7–9 | Advanced AI, Category Logic | ✅ Complete |
| 10–12 | Refinements & Polish | ✅ Complete |
| 13–14 | Performance, Accessibility | ✅ Complete |
| 15 | Hackathon Polish & Deploy | ✅ Complete |

See `PROGRESS.md` and `AUDIT.md` for detailed phase breakdowns and decisions.

## 🧪 Testing

- **Unit tests** — `tests/unit/*.test.ts` (CSV parsing, calculations, categorization)
- **Integration tests** — `tests/integration/*.test.ts` (auth, confirmation gate, audit log)
- **Test framework** — Vitest

Run tests:
```bash
npm run test           # Single run
npm run test:watch    # Watch mode
```

## 🐛 Known Limitations & Future Work

- Speech-to-text via Web Speech API (Urdu accuracy may vary; Whisper fallback planned)
- Image/OCR via Google Cloud Vision (optional for receipt scanning)
- No subscription/premium tiers (single-user demo mode)
- No mobile app (responsive web only)

## 📚 Documentation

- **`AGENTS.md`** — Product spec, agent definitions, architecture layers, tech choices
- **`AUDIT.md`** — Repository audit, missing features per phase, tech checklist
- **`PROGRESS.md`** — Phase-by-phase implementation notes, decisions, file changes
- **`DEPLOY.md`** — Deployment steps and post-deploy verification
- **`docs/superpowers/`** — Detailed implementation plans and specs

## 📄 License

This project is private. See LICENSE file if present.

## 👤 Author

**Usama Codes**
- GitHub: [@usama-codes](https://github.com/usama-codes)
- Repository: [usama-codes/raqam-ai](https://github.com/usama-codes/raqam-ai)

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org) — React framework
- [Convex](https://www.convex.dev) — Backend & database
- [Clerk](https://clerk.com) — Authentication
- [shadcn/ui](https://ui.shadcn.com) — Component library
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [OpenAI](https://openai.com) & [Google Gemini](https://deepmind.google/technologies/gemini/) — AI models

---

**Questions or contributions?** Open an issue or reach out on GitHub.

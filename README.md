# Raqam AI

Raqam AI is an Urdu-first personal finance assistant for users in Pakistan. It
combines a bilingual, RTL-friendly dashboard with AI-powered financial
education, analysis, recommendations, and confirmed actions.

## What it does

- **Bilingual finance workspace** — Urdu and English UI with RTL support and
  Nastaliq typography.
- **Dashboard insights** — income and expense summaries, monthly trends,
  category breakdowns, projections, unusual-spend detection, and proactive
  alerts.
- **Transactions** — add, edit, delete, search, and filter income and expenses.
- **Budgets and recurring bills** — track category budgets and upcoming
  recurring expenses.
- **Goals** — create savings goals and monitor progress.
- **AI assistant** — ask financial questions, analyze your data, receive
  recommendations, or request actions. Financial actions require confirmation
  before they are executed.
- **Voice experience** — Urdu/English voice input, spoken replies, and the
  hands-free “Call Raqam” conversation flow.
- **Data import** — CSV import with column detection, normalization, validation,
  duplicate detection, preview, and atomic confirmation.
- **Receipt capture** — optional receipt upload and OCR support.
- **Notifications** — optional budget, bill, and anomaly alerts by email or SMS.
- **Auditability** — financial actions are recorded in an audit log.

## Tech stack

- [Next.js](https://nextjs.org) 16 with the App Router
- React 19 and TypeScript
- [Convex](https://www.convex.dev) for the database, realtime queries, and
  server actions
- [Clerk](https://clerk.com) for authentication
- OpenAI Agents SDK with Google Gemini as the model provider
- Tailwind CSS and shadcn/ui
- Vitest for unit and integration tests

## Requirements

- Node.js 20+
- npm
- A Convex deployment
- A Clerk application
- Google Gemini API access

Optional integrations provide OCR, transcription, Azure neural speech,
notification email, and notification SMS.

## Local development

```bash
git clone https://github.com/usama-codes/raqam-ai.git
cd raqam-ai
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set the client and authentication values in `.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

The AI, transcription, speech, and notification secrets are server-side
configuration. Set them in the Convex deployment rather than exposing them to
the browser. See `.env.example` for the complete list and `docs/DEPLOY.md` for
production setup.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/login` | Clerk sign-in |
| `/signup` | Clerk sign-up |
| `/onboarding` | New-user setup |
| `/dashboard` | Financial overview and proactive insights |
| `/transactions` | Transaction management |
| `/budgets` | Budgets and recurring bills |
| `/goals` | Savings goals |
| `/import` | CSV transaction import |
| `/assistant` | AI chat and voice assistant |
| `/settings` | Preferences and notification settings |

## Useful commands

```bash
npm run dev        # Start the development server
npm run build      # Create a production build
npm run start      # Start the production server
npm run lint       # Run ESLint
npm run typecheck  # Generate Next types and run TypeScript checks
npm test           # Run unit and integration tests
npm run test:watch # Run Vitest in watch mode
```

Live integration tests require external credentials and are kept under
`tests/live/`; the regular `npm test` command runs the local test suite.

## Project structure

```text
app/          Next.js routes and page layouts
components/   UI, dashboard, assistant, import, receipt, and form components
convex/       Schema, queries, mutations, actions, cron jobs, and seed helpers
hooks/        Client hooks for auth, finance data, assistant, and voice
lib/          AI orchestration, finance logic, localization, audio, and alerts
tests/        Unit, integration, and credential-backed live tests
docs/         Deployment notes and implementation specifications
```

## Deployment

Raqam AI uses Vercel for the Next.js application and Convex for backend
functions and data:

1. Create production Clerk and Convex deployments.
2. Deploy backend functions with `npx convex deploy`.
3. Configure Convex server secrets, including the Gemini key and any optional
   integration keys.
4. Configure Vercel with the public Convex URL and Clerk variables.
5. Deploy the application with `vercel --prod` or through the connected Git
   repository.
6. Run the smoke-test checklist in [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Security notes

- Keep Clerk secret, AI provider, speech, OCR, SMTP, and AWS credentials
  server-side.
- AI actions that change financial data pass through a confirmation gate.
- User data is scoped through Convex authentication checks.
- Financial mutations are recorded in the audit log.

## Documentation

- [`docs/DEPLOY.md`](docs/DEPLOY.md) — production deployment and smoke tests
- [`AGENTS.md`](AGENTS.md) — product and architecture specification
- [`AUDIT.md`](AUDIT.md) — repository audit and implementation checklist
- [`PROGRESS.md`](PROGRESS.md) — development history and phase notes
- [`.env.example`](.env.example) — environment variable reference

## Author

**Usama Codes** · [GitHub](https://github.com/usama-codes)

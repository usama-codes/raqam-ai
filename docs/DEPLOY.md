# Deploy checklist — Raqam-AI

Phase 15 requirement #7. Everything below needs **your** Vercel / Convex / Clerk
accounts, so it is not automated. Run it once, then keep the notes for redeploys.

Local gate before you start (all must be green):

```
npm run typecheck && npm run lint && npm test && npm run build && npx convex codegen
```

---

## 1. Convex — production deployment

```
npx convex deploy          # creates / pushes to the prod deployment
```

Set the server-side env vars **on the production deployment** (Convex Dashboard →
your prod deployment → Settings → Environment Variables, or `--prod` on the CLI):

```
npx convex env set GOOGLE_GENERATIVE_AI_API_KEY <key> --prod
npx convex env set ASSEMBLYAI_API_KEY           <key> --prod
npx convex env set CLERK_ISSUER                 <clerk-issuer-url> --prod
```

- `GOOGLE_GENERATIVE_AI_API_KEY` — AI pipeline + receipt OCR + Gemini transcription
  fallback. **Without it the assistant returns the localized "kuch masla" message.**
- `ASSEMBLYAI_API_KEY` — primary voice transcription. Optional (falls back to
  Gemini, then Web Speech).
- `CLERK_ISSUER` — the **production** Clerk instance's Frontend API / issuer URL
  (`convex/auth.config.ts` falls back to a hardcoded dev value if unset — always
  set it in prod). The prod Clerk instance also needs a JWT template named
  `convex` with `aud: "convex"`.

Note the prod deployment URL — it becomes `NEXT_PUBLIC_CONVEX_URL` on Vercel.

## 2. Clerk — production instance

- Create a **Production** instance in the Clerk dashboard (separate keys from dev).
- Add the Vercel domain(s) to the allowed origins / redirect URLs.
- Copy the JWT issuer URL into the Convex env var above.
- Grab the production `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

## 3. Vercel — project + env vars

```
npm i -g vercel        # if not installed
vercel link
vercel --prod
```

Environment variables (Vercel Dashboard → Project → Settings → Environment
Variables, **Production** scope) — mirror `.env.example`:

| Var | Value |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | the prod Convex URL from step 1 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | prod Clerk publishable key |
| `CLERK_SECRET_KEY` | prod Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `GOOGLE_CLOUD_VISION_API_KEY` | optional (Phase 11 OCR alt path) |

The AI / AssemblyAI keys live on **Convex**, not Vercel — Convex actions read
their own deployment env.

## 4. Seed the demo account

- Pick the Clerk account you'll present from. Sign into the deployed site once so
  the `users` row is created.
- Seed its data (Windows → run in **Git Bash**, not PowerShell — see
  `memory` note on JSON args):

```
npx convex run seed:demo '{"email":"<demo account email>"}' --prod
```

- Undo any time with `npx convex run seed:clearDemo '{"email":"..."}' --prod`.

## 5. Post-deploy smoke test = the 5-minute judge script

Run these on the **deployed** URL, signed in as the demo account:

1. Landing page (`/` while logged out) — hero, ur⇄en toggle, scripted chat,
   all sections; CTAs go to `/signup`.
2. Dashboard cold-load feels **< 1.5 s**; stat cards, category chart, proactive
   alert cards (budget ~88%, unusual utilities, bill due tomorrow, monthly
   summary), goals.
3. Transactions — filter, search, add one; dashboard total updates.
4. Budgets — the food row near its limit; recurring bills section.
5. Assistant — ask "is mahine kitna kharch hua?" → grounded Urdu answer;
   "500 ka petrol add karo" → ConfirmationCard → confirm → appears in
   Transactions.
6. New account — sign up fresh → `/onboarding` 3 steps → dashboard empty state.

## 6. Redeploys

- Code push to the linked branch → Vercel auto-builds.
- Convex schema/function changes → `npx convex deploy` (run it before or with
  the Vercel deploy so the client and backend agree).

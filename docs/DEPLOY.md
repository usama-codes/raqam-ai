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

### 1a. Alert notifications — Gmail SMTP + AWS End User Messaging

Post-hackathon addition (`convex/notifications.ts` + `convex/crons.ts`, hourly
sweep). Both are optional independently — a channel with no credentials set
just fails silently per-send and retries next sweep; the other channel still
goes out. See `.env.example` for the full comments.

```
npx convex env set GMAIL_USER            <gmail-address> --prod
npx convex env set GMAIL_APP_PASSWORD    <16-char-app-password> --prod
npx convex env set AWS_REGION            us-east-1 --prod
npx convex env set AWS_ACCESS_KEY_ID     <iam-access-key-id> --prod
npx convex env set AWS_SECRET_ACCESS_KEY <iam-secret-key> --prod
npx convex env set AWS_SMS_SENDER_ID     RaqamAI --prod
```

**Gmail** — turn on 2-Step Verification on the sending Google account, then
generate an App Password at https://myaccount.google.com/apppasswords
(app "Mail", device "Other" — name it e.g. "Raqam AI Convex"). Use that
16-character password, not the account password. Gmail SMTP caps around
~500 sends/day on a personal account; fine for this scale.

**AWS End User Messaging (SMS)** —

1. Create/use an AWS account, then in IAM create a user (or role) for Convex
   with a scoped policy granting only `sms-voice:SendTextMessage`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       { "Effect": "Allow", "Action": "sms-voice:SendTextMessage", "Resource": "*" }
     ]
   }
   ```

   Generate an access key for that user (`AWS_ACCESS_KEY_ID` /
   `AWS_SECRET_ACCESS_KEY` above). Tighten `Resource` later to the specific
   Sender ID ARN (`arn:aws:sms-voice:<region>:<account-id>:sender-id/RaqamAI/PK`)
   once it exists.
2. In the **End User Messaging → SMS and voice** console, register an
   alphanumeric **Sender ID** (e.g. `RaqamAI`) for **Pakistan**. This is
   self-service and doesn't require the destination-country pre-approval that
   e.g. India/Turkey/Vietnam need — matches `AWS_SMS_SENDER_ID` above.
3. Pick a region where End User Messaging SMS is available (`us-east-1` is
   the safe default) — this is `AWS_REGION`, and is independent of where
   your users live; it only has to match the region the Sender ID was
   registered in.
4. `users.phone` must be E.164 (`+92...`) for `sendAlertSms` to work —
   confirm however phone numbers are captured (Clerk) normalizes to that
   format.

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

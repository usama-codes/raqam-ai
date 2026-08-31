"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLanguage } from "@/components/LanguageProvider";

// ─── Styling shorthands (warm-ledger vocabulary, matches the app forms) ─────────
const inputCls =
  "h-11 w-full rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 font-[var(--font-manrope)] text-[16px] font-semibold text-[#14231B] placeholder:font-normal placeholder:text-[#9BA79F] focus-visible:border-[#0F5132] focus-visible:ring-2 focus-visible:ring-[#0F5132]/20 focus-visible:outline-none";
const primaryBtn =
  "rounded-[10px] bg-[#0F5132] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#14231B] disabled:opacity-50";
const ghostBtn =
  "rounded-[10px] px-4 py-2.5 text-[14px] font-medium text-[#6B7A70] transition-colors hover:bg-[#F1EEE4] disabled:opacity-50";

const BUDGET_SLUGS = ["food", "transportation", "utilities"] as const;
const TOTAL_STEPS = 3;

function firstOfMonth(): number {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).getTime();
}
function todayMidnight(): number {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
}
function parseAmount(raw: string): number {
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t, dir } = useLanguage();

  const user = useQuery(api.users.getCurrentUser);
  const categories = useQuery(api.categories.list);
  const currentBudget = useQuery(api.budgets.get, {});
  const createTransaction = useMutation(api.transactions.create);
  const createBudget = useMutation(api.budgets.create);
  const upsertBudgetCategory = useMutation(api.budgets.upsertCategory);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [step, setStep] = React.useState(0);
  const [income, setIncome] = React.useState("");
  const [limits, setLimits] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Already onboarded (or a re-visit) → straight to the dashboard.
  React.useEffect(() => {
    if (user && user.onboardingCompletedAt != null) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const catId = React.useCallback(
    (slug: string) => categories?.find((c) => c.name === slug)?._id,
    [categories],
  );
  const catLabel = React.useCallback(
    (slug: string) => categories?.find((c) => c.name === slug)?.nameUr ?? slug,
    [categories],
  );

  const finish = React.useCallback(
    async (dest: "/dashboard" | "/assistant") => {
      setBusy(true);
      try {
        await completeOnboarding({});
        router.replace(dest);
      } catch {
        setError(t("onboarding.error"));
        setBusy(false);
      }
    },
    [completeOnboarding, router, t],
  );

  const submitIncome = React.useCallback(async () => {
    const amount = parseAmount(income);
    const salaryId = catId("salary");
    if (amount > 0 && salaryId) {
      setBusy(true);
      setError(null);
      try {
        await createTransaction({
          type: "income",
          amount,
          categoryId: salaryId,
          date: todayMidnight(),
          description: "ماہانہ آمدنی",
          source: "manual",
        });
      } catch {
        setError(t("onboarding.error"));
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setStep(1);
  }, [income, catId, createTransaction, t]);

  const submitBudget = React.useCallback(async () => {
    const filled = BUDGET_SLUGS.map((slug) => ({
      slug,
      limit: parseAmount(limits[slug] ?? ""),
    })).filter((r) => r.limit > 0);

    if (filled.length > 0) {
      setBusy(true);
      setError(null);
      try {
        let budgetId = currentBudget?._id as string | undefined;
        if (!budgetId) {
          budgetId = (await createBudget({ month: firstOfMonth() })) as string;
        }
        for (const { slug, limit } of filled) {
          const cid = catId(slug);
          if (cid) {
            await upsertBudgetCategory({
              budgetId: budgetId as never,
              categoryId: cid,
              limit,
            });
          }
        }
      } catch {
        setError(t("onboarding.error"));
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setStep(2);
  }, [limits, currentBudget, createBudget, upsertBudgetCategory, catId, t]);

  if (user === undefined) {
    return (
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F5132] border-t-transparent" />
    );
  }

  return (
    <div dir={dir} className="w-full max-w-[460px]">
      {/* Mark + welcome */}
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="grid h-[42px] w-[42px] place-items-center rounded-[12px] bg-[#E8B931] pb-1 font-[var(--font-noto-nastaliq-urdu)] text-[21px] font-bold text-[#0B3B26]">
          ر
        </div>
        <p className="font-[var(--font-noto-nastaliq-urdu)] text-[17px] leading-[1.9] text-[#14231B]">
          {t("onboarding.welcome")}
        </p>
      </div>

      {/* Progress dots */}
      <div className="mb-5 flex items-center justify-center gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step
                ? "w-6 bg-[#0F5132]"
                : i < step
                  ? "w-1.5 bg-[#0F5132]"
                  : "w-1.5 bg-[#DCD6C8]"
            }`}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-[#E7E2D6] bg-white px-6 py-6 shadow-sm">
        {step === 0 && (
          <StepShell
            title={t("onboarding.s1.title")}
            desc={t("onboarding.s1.desc")}
          >
            <label className="mb-1.5 block text-[13px] text-[#4C5A52]">
              {t("onboarding.s1.label")}
            </label>
            <input
              inputMode="numeric"
              autoFocus
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="85,000"
              className={inputCls}
            />
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            title={t("onboarding.s2.title")}
            desc={t("onboarding.s2.desc")}
          >
            <div className="flex flex-col gap-3">
              {BUDGET_SLUGS.map((slug) => (
                <div key={slug} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[14px] text-[#4C5A52]">
                    {catLabel(slug)}
                  </span>
                  <input
                    inputMode="numeric"
                    value={limits[slug] ?? ""}
                    onChange={(e) =>
                      setLimits((p) => ({ ...p, [slug]: e.target.value }))
                    }
                    placeholder="Rs. —"
                    className={`${inputCls} h-10 text-[14px]`}
                  />
                </div>
              ))}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            title={t("onboarding.s3.title")}
            desc={t("onboarding.s3.desc")}
          >
            <ul className="flex flex-col gap-2">
              {[
                t("onboarding.s3.example1"),
                t("onboarding.s3.example2"),
                t("onboarding.s3.example3"),
              ].map((ex) => (
                <li
                  key={ex}
                  className="rounded-[10px] border border-[#E6EFE9] bg-[#F4F8F5] px-3.5 py-2.5 font-reading text-[14px] leading-[1.9] text-[#4C5A52]"
                >
                  {ex}
                </li>
              ))}
            </ul>
          </StepShell>
        )}

        {error && (
          <p className="mt-3 text-[13px] text-[#B3261E]" role="alert">
            {error}
          </p>
        )}

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            className={ghostBtn}
            disabled={busy}
            onClick={() => (step === 0 ? finish("/dashboard") : setStep(step - 1))}
          >
            {step === 0 ? t("onboarding.skip") : t("onboarding.back")}
          </button>

          {step === 0 && (
            <button
              type="button"
              className={primaryBtn}
              disabled={busy}
              onClick={submitIncome}
            >
              {t("onboarding.next")}
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              className={primaryBtn}
              disabled={busy}
              onClick={submitBudget}
            >
              {t("onboarding.next")}
            </button>
          )}
          {step === 2 && (
            <div className="flex gap-2">
              <button
                type="button"
                className={ghostBtn}
                disabled={busy}
                onClick={() => finish("/dashboard")}
              >
                {t("onboarding.finish")}
              </button>
              <button
                type="button"
                className={primaryBtn}
                disabled={busy}
                onClick={() => finish("/assistant")}
              >
                {t("onboarding.s3.cta")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="mb-1.5 font-[var(--font-noto-nastaliq-urdu)] text-[19px] font-bold leading-[1.8] text-[#14231B]">
        {title}
      </h1>
      <p className="mb-5 text-[13.5px] leading-[1.9] text-[#6B7A70]">{desc}</p>
      {children}
    </div>
  );
}

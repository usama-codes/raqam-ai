// tests/integration/_helpers.ts — shared setup for the convex-test integration
// suites (AGENTS.md Phase 14: "Integration tests for all Convex mutations").
//
// Not a test file (no `.test.ts` suffix) so vitest does not collect it directly.
// Every integration suite opts into the edge runtime with a per-file
//   // @vitest-environment edge-runtime
// pragma — convex-test's in-memory backend needs it.

import { convexTest } from "convex-test";
import type { Id } from "@/convex/_generated/dataModel";

// All Convex function modules except the "use node" action file (convex-test runs
// in the edge runtime and cannot load node actions).
export const modules = import.meta.glob(
  ["../../convex/**/*.ts", "!../../convex/ai.ts"],
  { eager: false },
);

export const SUBJECT_A = "clerk|user-a";
export const SUBJECT_B = "clerk|user-b";

export const DAY = 24 * 60 * 60 * 1000;

const now = new Date();
export const curMonthStart = new Date(
  now.getFullYear(),
  now.getMonth(),
  1,
).getTime();
export const monthStart = (delta: number) =>
  new Date(now.getFullYear(), now.getMonth() + delta, 1).getTime();
/** A safe mid-month timestamp for a month `delta` away from the current one. */
export const midMonth = (delta: number) => monthStart(delta) + 12 * DAY;

export type TestConvex = ReturnType<typeof convexTest>;

export interface SeededUser {
  userId: Id<"users">;
  cat: (name: string) => Id<"categories">;
}

// Mirrors convex/categories.ts SYSTEM_CATEGORIES (14 system categories seeded on
// user creation). Kept in sync by categories.test.ts, which asserts the count.
const SYSTEM_CATEGORIES: Array<
  [string, string, string, "income" | "expense" | "both"]
> = [
  ["salary", "تنخواہ", "💰", "income"],
  ["freelance", "فری لانس", "💻", "income"],
  ["food", "کھانا", "🍔", "expense"],
  ["transportation", "نقل و حمل", "🚗", "expense"],
  ["utilities", "یوٹیلٹیز", "💡", "expense"],
  ["rent", "کرایہ", "🏠", "expense"],
  ["health", "صحت", "🏥", "expense"],
  ["education", "تعلیم", "📚", "expense"],
  ["shopping", "خریداری", "🛍️", "expense"],
  ["entertainment", "تفریح", "🎮", "expense"],
  ["savings", "بچت / سرمایہ کاری", "🏦", "expense"],
  ["gifts", "تحائف", "🎁", "both"],
  ["phone", "فون / انٹرنیٹ", "📱", "expense"],
  ["other", "دیگر", "📦", "both"],
];

/**
 * Insert a user row + the 14 system categories directly (bypassing auth), the
 * way convex/users.ts#ensureUser would. Returns the user id and a `cat(name)`
 * resolver. Pass distinct `subject` values to seed two isolated users.
 */
export async function seedUser(
  t: TestConvex,
  subject: string = SUBJECT_A,
): Promise<SeededUser> {
  const catIds: Record<string, Id<"categories">> = {};
  const userId = await t.run(async (ctx) => {
    const uid = await ctx.db.insert("users", {
      clerkId: subject,
      email: `${subject.replace(/\W+/g, "-")}@example.com`,
      preferredLanguage: "ur",
      currency: "PKR",
      createdAt: Date.now(),
    });
    for (const [name, nameUr, icon, type] of SYSTEM_CATEGORIES) {
      catIds[name] = await ctx.db.insert("categories", {
        userId: uid,
        name,
        nameUr,
        icon,
        color: "#000000",
        type,
        isSystem: true,
        createdAt: Date.now(),
      });
    }
    return uid;
  });
  return {
    userId,
    cat: (n) => {
      const id = catIds[n];
      if (!id) throw new Error(`test category "${n}" was not seeded`);
      return id;
    },
  };
}

/** Insert a transaction row directly (bypassing the mutation's validation). */
export async function addTxn(
  t: TestConvex,
  userId: Id<"users">,
  categoryId: Id<"categories">,
  type: "income" | "expense",
  amount: number,
  date: number,
  description = "",
): Promise<Id<"transactions">> {
  return t.run(async (ctx) =>
    ctx.db.insert("transactions", {
      userId,
      type,
      amount,
      categoryId,
      date,
      description: description || undefined,
      source: "manual",
      isRecurring: false,
      pendingConfirmation: false,
      createdAt: date,
      updatedAt: date,
    }),
  );
}

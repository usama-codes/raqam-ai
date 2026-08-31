// @vitest-environment edge-runtime
//
// convex/users.ts — ensureUser (idempotent + profile patch), updateProfile,
// updateNotificationPrefs, getCurrentUser, and the unauthenticated guard.

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules, SUBJECT_A } from "./_helpers";

const PREFS_OFF = {
  budget80: false,
  budget100: false,
  billReminder: false,
  unusualSpend: false,
  monthlySummary: false,
};

describe("users.ensureUser", () => {
  test("creates once, then patches changed contact fields on later calls", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    const id1 = await asUser.mutation(api.users.ensureUser, {
      email: "a@example.com",
    });
    const id2 = await asUser.mutation(api.users.ensureUser, {
      email: "a@example.com",
      phone: "+92300",
    });
    expect(id2).toBe(id1); // same record

    const me = await asUser.query(api.users.getCurrentUser, {});
    expect(me?.phone).toBe("+92300");

    const allUsers = await t.run((ctx) => ctx.db.query("users").collect());
    expect(allUsers).toHaveLength(1);
  });
});

describe("users.updateProfile / updateNotificationPrefs", () => {
  test("patches name + language and writes the notification prefs object", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    await asUser.mutation(api.users.ensureUser, { email: "a@example.com" });

    await asUser.mutation(api.users.updateProfile, {
      name: "Ayesha",
      preferredLanguage: "en",
    });
    await asUser.mutation(api.users.updateNotificationPrefs, { prefs: PREFS_OFF });

    const me = await asUser.query(api.users.getCurrentUser, {});
    expect(me?.name).toBe("Ayesha");
    expect(me?.preferredLanguage).toBe("en");
    expect(me?.notificationPrefs).toEqual(PREFS_OFF);
  });
});

describe("users.completeOnboarding", () => {
  test("stamps onboardingCompletedAt once; idempotent; needs auth", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    await asUser.mutation(api.users.ensureUser, { email: "a@example.com" });

    const before = await asUser.query(api.users.getCurrentUser, {});
    expect(before?.onboardingCompletedAt).toBeUndefined();

    await asUser.mutation(api.users.completeOnboarding, {});
    const first = (await asUser.query(api.users.getCurrentUser, {}))
      ?.onboardingCompletedAt;
    expect(first).toBeTruthy();

    await asUser.mutation(api.users.completeOnboarding, {});
    const second = (await asUser.query(api.users.getCurrentUser, {}))
      ?.onboardingCompletedAt;
    expect(second).toBe(first); // not overwritten

    await expect(
      t.mutation(api.users.completeOnboarding, {}),
    ).rejects.toThrow();
  });
});

describe("auth guard", () => {
  test("an unauthenticated caller cannot read or write user data", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.users.getCurrentUser, {})).rejects.toThrow();
    await expect(
      t.mutation(api.users.updateProfile, { name: "x" }),
    ).rejects.toThrow();
  });
});

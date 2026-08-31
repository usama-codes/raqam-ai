// @vitest-environment edge-runtime
//
// convex/categories.ts + convex/users.ts#ensureUser — system-category seeding
// (14 categories, idempotent) and custom-category validation.

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules, seedUser, SUBJECT_A, SUBJECT_B } from "./_helpers";

describe("users.ensureUser → system categories", () => {
  test("seeds 14 system categories on first call and is idempotent", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    await asUser.mutation(api.users.ensureUser, { email: "a@example.com" });
    const first = await asUser.query(api.categories.list, {});
    expect(first).toHaveLength(14);
    expect(first.every((c) => c.isSystem)).toBe(true);
    expect(new Set(first.map((c) => c.name)).size).toBe(14);

    // Second call: no new user, no duplicate categories, email patch applied.
    await asUser.mutation(api.users.ensureUser, { email: "a2@example.com" });
    expect(await asUser.query(api.categories.list, {})).toHaveLength(14);
    const me = await asUser.query(api.users.getCurrentUser, {});
    expect(me?.email).toBe("a2@example.com");
  });
});

describe("categories.create", () => {
  test("rejects an empty name and a duplicate name", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t); // seeds the 14 system categories
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    await expect(
      asUser.mutation(api.categories.create, {
        name: "  ",
        nameUr: "خالی",
        type: "expense",
      }),
    ).rejects.toThrow(/cannot be empty/);

    await expect(
      asUser.mutation(api.categories.create, {
        name: "food", // already a system category
        nameUr: "کھانا",
        type: "expense",
      }),
    ).rejects.toThrow(/already exists/);
  });

  test("creates a custom category flagged isSystem: false", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    const id = await asUser.mutation(api.categories.create, {
      name: "committee",
      nameUr: "کمیٹی",
      icon: "🤝",
      type: "both",
    });
    const row = await t.run((ctx) => ctx.db.get(id));
    expect(row?.isSystem).toBe(false);
    expect(row?.name).toBe("committee");
  });
});

describe("categories.list", () => {
  test("returns only the caller's categories", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    const asB = t.withIdentity({ subject: SUBJECT_B });
    await asB.mutation(api.categories.create, {
      name: "b-only",
      nameUr: "صرف ب",
      type: "expense",
    });

    const bCats = await asB.query(api.categories.list, {});
    expect(bCats).toHaveLength(15); // 14 system + 1 custom
    const asA = t.withIdentity({ subject: SUBJECT_A });
    expect(await asA.query(api.categories.list, {})).toHaveLength(14);
  });
});

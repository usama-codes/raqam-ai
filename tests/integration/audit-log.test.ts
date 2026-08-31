// @vitest-environment edge-runtime
//
// convex/auditLog.ts — the append-only trail (AGENTS.md §6, §9).
// Phase 15 wires the AI-initiated write paths: confirmAction executors
// (source "ai") and import confirmation (source "user"). The `list` query is
// auth-scoped. (The confirmAction → auditLog path also has a case in
// confirmation-gate.test.ts.)

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules, seedUser, midMonth, SUBJECT_A, SUBJECT_B } from "./_helpers";

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  type: "expense" as const,
  amount: 1200,
  description: "grocery store",
  date: midMonth(0),
  raw: { Amount: "1200", Description: "grocery store" },
  ...over,
});

describe("auditLog — import confirmation", () => {
  test("confirmImport writes one row, source: user", async () => {
    const t = convexTest(schema, modules);
    const { cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    const preview = await asUser.mutation(api.imports.createPreview, {
      fileName: "statement.csv",
      fileType: "csv",
      skippedCount: 0,
      rows: [row({ amount: 300, description: "chai" })],
    });
    const rows = (
      await asUser.query(api.imports.getPreview, { importId: preview.importId })
    ).rows;

    await asUser.mutation(api.imports.confirmImport, {
      importId: preview.importId,
      rows: rows.map((r) => ({
        rowId: r._id,
        type: r.type,
        amount: r.amount,
        description: r.description,
        date: r.date,
        categoryId: cat("other"),
        selected: true,
      })),
    });

    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audit).toHaveLength(1);
    expect(audit[0].source).toBe("user");
    expect(audit[0].action).toBe("import.confirm");
    expect(audit[0].entityType).toBe("import");
    expect(JSON.parse(audit[0].metadata!).importedCount).toBe(1);
  });
});

describe("auditLog.list", () => {
  test("is auth-scoped — a user sees only their own rows", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);

    // Seed one audit row for each user directly.
    await t.run(async (ctx) => {
      const [a, b] = await ctx.db.query("users").collect();
      await ctx.db.insert("auditLog", {
        userId: a._id,
        action: "transaction.create",
        entityType: "transaction",
        source: "ai",
        createdAt: Date.now(),
      });
      await ctx.db.insert("auditLog", {
        userId: b._id,
        action: "goal.create",
        entityType: "savingsGoal",
        source: "ai",
        createdAt: Date.now(),
      });
    });

    const aRows = await t
      .withIdentity({ subject: SUBJECT_A })
      .query(api.auditLog.list, {});
    expect(aRows).toHaveLength(1);
    expect(aRows[0].action).toBe("transaction.create");

    await expect(
      t.withIdentity({ subject: "clerk|nobody" }).query(api.auditLog.list, {}),
    ).rejects.toThrow();
  });
});

// @vitest-environment edge-runtime
//
// convex/imports.ts — createPreview / getPreview / confirmImport / cancelImport.
// AGENTS.md §12: import atomicity (interrupted import leaves zero partial records)
// and duplicate detection.

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules, seedUser, addTxn, midMonth, SUBJECT_A, SUBJECT_B } from "./_helpers";

type PreviewRow = {
  type: "income" | "expense";
  amount: number;
  description: string;
  date: number;
  raw: Record<string, string>;
};

const row = (over: Partial<PreviewRow> = {}): PreviewRow => ({
  type: "expense",
  amount: 1200,
  description: "grocery store",
  date: midMonth(0),
  raw: { Amount: "1200", Description: "grocery store" },
  ...over,
});

describe("imports.createPreview", () => {
  test("rejects a non-CSV file and an empty batch", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    await expect(
      asUser.mutation(api.imports.createPreview, {
        fileName: "s.pdf",
        fileType: "pdf",
        skippedCount: 0,
        rows: [row()],
      }),
    ).rejects.toThrow(/Only CSV/);

    await expect(
      asUser.mutation(api.imports.createPreview, {
        fileName: "s.csv",
        fileType: "csv",
        skippedCount: 0,
        rows: [],
      }),
    ).rejects.toThrow(/No data rows/);
  });

  test("a bad amount/date row throws and nothing persists", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    await expect(
      asUser.mutation(api.imports.createPreview, {
        fileName: "s.csv",
        fileType: "csv",
        skippedCount: 0,
        rows: [row(), row({ amount: 0 })],
      }),
    ).rejects.toThrow(/No valid transactions/);

    const imports = await t.run((ctx) => ctx.db.query("imports").collect());
    const previewRows = await t.run((ctx) =>
      ctx.db.query("importedTransactions").collect(),
    );
    expect(imports).toHaveLength(0);
    expect(previewRows).toHaveLength(0);
  });

  test("flags a row that duplicates an existing transaction", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    await addTxn(t, userId, cat("food"), "expense", 1200, midMonth(0), "grocery store");

    const res = await asUser.mutation(api.imports.createPreview, {
      fileName: "s.csv",
      fileType: "csv",
      skippedCount: 2,
      rows: [row(), row({ amount: 555, description: "petrol pump" })],
    });
    expect(res.rowCount).toBe(2);
    expect(res.duplicateCount).toBe(1);
    expect(res.skippedCount).toBe(2);

    const preview = await asUser.query(api.imports.getPreview, {
      importId: res.importId,
    });
    const dup = preview.rows.find((r) => r.amount === 1200);
    expect(dup?.isDuplicate).toBe(true);
  });
});

describe("imports.confirmImport", () => {
  test("selected rows land as source:import, deselected are skipped, status flips", async () => {
    const t = convexTest(schema, modules);
    const { cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    const res = await asUser.mutation(api.imports.createPreview, {
      fileName: "s.csv",
      fileType: "csv",
      skippedCount: 0,
      rows: [
        row({ amount: 300, description: "chai" }),
        row({ amount: 900, description: "uber" }),
      ],
    });
    const preview = await asUser.query(api.imports.getPreview, {
      importId: res.importId,
    });

    const confirm = await asUser.mutation(api.imports.confirmImport, {
      importId: res.importId,
      rows: preview.rows.map((r, i) => ({
        rowId: r._id,
        type: r.type,
        amount: r.amount,
        description: r.description,
        date: r.date,
        categoryId: cat("other"),
        selected: i === 0, // only the first row
      })),
    });
    expect(confirm.importedCount).toBe(1);

    const txns = await t.run((ctx) => ctx.db.query("transactions").collect());
    expect(txns).toHaveLength(1);
    expect(txns[0].source).toBe("import");
    expect(txns[0].importId).toBe(res.importId);

    const imp = await t.run((ctx) => ctx.db.get(res.importId));
    expect(imp?.status).toBe("confirmed");

    // A second confirm is refused.
    await expect(
      asUser.mutation(api.imports.confirmImport, { importId: res.importId, rows: [] }),
    ).rejects.toThrow(/already been processed/);
  });

  test("a foreign category throws and nothing persists", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    const b = await seedUser(t, SUBJECT_B);
    const asA = t.withIdentity({ subject: SUBJECT_A });

    const res = await asA.mutation(api.imports.createPreview, {
      fileName: "s.csv",
      fileType: "csv",
      skippedCount: 0,
      rows: [row({ amount: 300 })],
    });
    const preview = await asA.query(api.imports.getPreview, {
      importId: res.importId,
    });

    await expect(
      asA.mutation(api.imports.confirmImport, {
        importId: res.importId,
        rows: preview.rows.map((r) => ({
          rowId: r._id,
          type: r.type,
          amount: r.amount,
          description: r.description,
          date: r.date,
          categoryId: b.cat("food"), // B's category
          selected: true,
        })),
      }),
    ).rejects.toThrow(/Category not found/);

    expect(await t.run((ctx) => ctx.db.query("transactions").collect())).toHaveLength(0);
    expect((await t.run((ctx) => ctx.db.get(res.importId)))?.status).toBe("preview");
  });

  test("re-previewing a confirmed batch flags every row as a duplicate", async () => {
    const t = convexTest(schema, modules);
    const { cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    const batch = [
      row({ amount: 300, description: "chai" }),
      row({ amount: 900, description: "uber" }),
    ];

    const first = await asUser.mutation(api.imports.createPreview, {
      fileName: "s.csv",
      fileType: "csv",
      skippedCount: 0,
      rows: batch,
    });
    const preview = await asUser.query(api.imports.getPreview, {
      importId: first.importId,
    });
    await asUser.mutation(api.imports.confirmImport, {
      importId: first.importId,
      rows: preview.rows.map((r) => ({
        rowId: r._id,
        type: r.type,
        amount: r.amount,
        description: r.description,
        date: r.date,
        categoryId: cat("other"),
        selected: true,
      })),
    });

    const second = await asUser.mutation(api.imports.createPreview, {
      fileName: "s.csv",
      fileType: "csv",
      skippedCount: 0,
      rows: batch,
    });
    expect(second.duplicateCount).toBe(2);
  });
});

describe("imports.cancelImport", () => {
  test("deletes the preview rows and the import; owner-only", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    const asA = t.withIdentity({ subject: SUBJECT_A });
    const asB = t.withIdentity({ subject: SUBJECT_B });

    const res = await asA.mutation(api.imports.createPreview, {
      fileName: "s.csv",
      fileType: "csv",
      skippedCount: 0,
      rows: [row(), row({ amount: 42, description: "x" })],
    });

    await expect(
      asB.mutation(api.imports.cancelImport, { importId: res.importId }),
    ).rejects.toThrow(/does not belong/);

    await asA.mutation(api.imports.cancelImport, { importId: res.importId });
    expect(await t.run((ctx) => ctx.db.get(res.importId))).toBeNull();
    expect(
      await t.run((ctx) => ctx.db.query("importedTransactions").collect()),
    ).toHaveLength(0);
  });
});

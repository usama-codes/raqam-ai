// convex/auditLog.ts — Append-only audit trail (AGENTS.md §6, §9).
//
// Phase 15 wires the AI-initiated write paths only:
//   • pendingActions.confirmAction executors  → source "ai"
//   • imports.confirmImport                   → source "user"
// Manual transaction / budget / goal CRUD is intentionally NOT logged for the
// hackathon build (grill-me 2026-08-31, decision #6). Extending coverage later
// just means calling logAudit() from more mutations.

import { query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import type { Id } from "./_generated/dataModel";

export type AuditSource = "user" | "ai" | "system";

interface LogAuditArgs {
  userId: Id<"users">;
  action: string; // "transaction.create" | "transaction.delete" | "goal.create" | "import.confirm" | …
  entityType: string; // "transaction" | "savingsGoal" | "import" | …
  entityId?: string;
  metadata?: string; // JSON stringified — caller's responsibility
  source: AuditSource;
}

/**
 * Insert one audit-log row. Call from inside a mutation handler that has
 * already resolved the acting user. Never throws on its own — a logging
 * failure must not roll back the mutation it accompanies, so keep the
 * payload small and valid.
 */
export async function logAudit(
  ctx: MutationCtx,
  args: LogAuditArgs,
): Promise<void> {
  await ctx.db.insert("auditLog", {
    userId: args.userId,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    metadata: args.metadata,
    source: args.source,
    createdAt: Date.now(),
  });
}

// ─── Query ──────────────────────────────────────────────────────────────────────

/**
 * The current user's audit trail, newest first. Auth-scoped by userId — a
 * caller only ever sees their own rows.
 */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: QueryCtx, args: { limit?: number }) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("auditLog")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

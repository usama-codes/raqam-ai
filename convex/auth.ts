import { ConvexError } from "convex/values";
import { type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

/**
 * Extracts the authenticated user's Clerk ID from the Convex auth context.
 * Throws ConvexError if the caller is not authenticated.
 *
 * Usage: Every Convex query/mutation begins with:
 *   const userId = await getUserId(ctx);
 */
export async function getUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthenticated: user must be signed in.");
  }
  // Clerk provides the Clerk user ID as identity.subject
  return identity.subject;
}

/**
 * Looks up the internal Convex `users` table ID for the authenticated Clerk user.
 * Returns null if the user record has not been created yet.
 */
export async function getUserDocId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> {
  const clerkId = await getUserId(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .first();
  return user?._id ?? null;
}

/**
 * Retrieves the authenticated user's document from the `users` table.
 * Throws ConvexError if the user is not authenticated or not found.
 *
 * Usage: Every Convex query/mutation that needs the user document:
 *   const user = await requireUser(ctx);
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const clerkId = await getUserId(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .first();
  if (!user) {
    throw new ConvexError("User not found. Call ensureUser first.");
  }
  return user;
}

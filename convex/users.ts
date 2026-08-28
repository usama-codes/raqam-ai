import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./auth";

/**
 * Ensure a `users` record exists for the authenticated Clerk user.
 * Called on first login / session start. Idempotent — returns existing
 * document ID if the user already exists.
 */
export const ensureUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args: { email: string; name?: string }) => {
    const clerkId = await getUserId(ctx);

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new user record
    return await ctx.db.insert("users", {
      clerkId,
      email: args.email,
      name: args.name,
      preferredLanguage: "ur",
      currency: "PKR",
      createdAt: Date.now(),
    });
  },
});

/**
 * Get the current authenticated user's record.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const clerkId = await getUserId(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

/**
 * Update user profile fields (name, preferred language).
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    preferredLanguage: v.optional(v.union(v.literal("ur"), v.literal("en"))),
  },
  handler: async (
    ctx: MutationCtx,
    args: { name?: string; preferredLanguage?: "ur" | "en" },
  ) => {
    const clerkId = await getUserId(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new Error("User not found. Call ensureUser first.");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.preferredLanguage !== undefined)
      updates.preferredLanguage = args.preferredLanguage;

    await ctx.db.patch(user._id, updates);
  },
});

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./auth";
import { seedSystemCategories } from "./categories";

/**
 * Ensure a `users` record exists for the authenticated Clerk user.
 * Called on first login / session start. Idempotent — returns existing
 * document ID if the user already exists.
 *
 * On first creation, also seeds the 14 system categories for the user.
 */
export const ensureUser = mutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (
    ctx: MutationCtx,
    args: { email?: string; phone?: string; username?: string; name?: string },
  ) => {
    const clerkId = await getUserId(ctx);

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      // Patch phone/email/username if they changed (e.g. user added phone later)
      const updates: Record<string, unknown> = {};
      if (args.email !== undefined && args.email !== existing.email)
        updates.email = args.email;
      if (args.phone !== undefined && args.phone !== existing.phone)
        updates.phone = args.phone;
      if (args.username !== undefined && args.username !== existing.username)
        updates.username = args.username;
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }
      return existing._id;
    }

    // Create new user record
    const userId = await ctx.db.insert("users", {
      clerkId,
      email: args.email,
      phone: args.phone,
      username: args.username,
      name: args.name,
      preferredLanguage: "ur",
      currency: "PKR",
      createdAt: Date.now(),
    });

    // Seed system categories for the new user
    await seedSystemCategories(ctx, userId);

    return userId;
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

import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import type { Id } from "./_generated/dataModel";

// ─── System category definitions ───────────────────────────────────────────────

const SYSTEM_CATEGORIES = [
  {
    name: "salary",
    nameUr: "تنخواہ",
    icon: "💰",
    color: "#22c55e",
    type: "income" as const,
  },
  {
    name: "freelance",
    nameUr: "فری لانس",
    icon: "💻",
    color: "#3b82f6",
    type: "income" as const,
  },
  {
    name: "food",
    nameUr: "کھانا",
    icon: "🍔",
    color: "#f97316",
    type: "expense" as const,
  },
  {
    name: "transportation",
    nameUr: "نقل و حمل",
    icon: "🚗",
    color: "#8b5cf6",
    type: "expense" as const,
  },
  {
    name: "utilities",
    nameUr: "یوٹیلٹیز",
    icon: "💡",
    color: "#eab308",
    type: "expense" as const,
  },
  {
    name: "rent",
    nameUr: "کرایہ",
    icon: "🏠",
    color: "#ef4444",
    type: "expense" as const,
  },
  {
    name: "health",
    nameUr: "صحت",
    icon: "🏥",
    color: "#ec4899",
    type: "expense" as const,
  },
  {
    name: "education",
    nameUr: "تعلیم",
    icon: "📚",
    color: "#06b6d4",
    type: "expense" as const,
  },
  {
    name: "shopping",
    nameUr: "خریداری",
    icon: "🛍️",
    color: "#a855f7",
    type: "expense" as const,
  },
  {
    name: "entertainment",
    nameUr: "تفریح",
    icon: "🎮",
    color: "#f43f5e",
    type: "expense" as const,
  },
  {
    name: "savings",
    nameUr: "بچت / سرمایہ کاری",
    icon: "🏦",
    color: "#14b8a6",
    type: "expense" as const,
  },
  {
    name: "gifts",
    nameUr: "تحائف",
    icon: "🎁",
    color: "#d946ef",
    type: "both" as const,
  },
  {
    name: "phone",
    nameUr: "فون / انٹرنیٹ",
    icon: "📱",
    color: "#0ea5e9",
    type: "expense" as const,
  },
  {
    name: "other",
    nameUr: "دیگر",
    icon: "📦",
    color: "#6b7280",
    type: "both" as const,
  },
];

// ─── Seed helper (called from users.ts ensureUser) ─────────────────────────────

/**
 * Seeds system categories for a newly created user.
 * Idempotent — skips categories that already exist for the user.
 */
export async function seedSystemCategories(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Id<"categories">[]> {
  const existing = await ctx.db
    .query("categories")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  const existingNames = new Set(existing.map((c) => c.name));
  const ids: Id<"categories">[] = [];

  for (const cat of SYSTEM_CATEGORIES) {
    if (existingNames.has(cat.name)) {
      const found = existing.find((c) => c.name === cat.name);
      if (found) ids.push(found._id);
      continue;
    }
    const id = await ctx.db.insert("categories", {
      userId,
      name: cat.name,
      nameUr: cat.nameUr,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      isSystem: true,
      createdAt: Date.now(),
    });
    ids.push(id);
  }

  return ids;
}

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * List all categories for the authenticated user.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Create a custom (non-system) category.
 */
export const create = mutation({
  args: {
    name: v.string(),
    nameUr: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    type: v.union(v.literal("income"), v.literal("expense"), v.literal("both")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Validate name is not empty
    if (!args.name.trim()) {
      throw new Error("Category name cannot be empty.");
    }

    // Check for duplicate name
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      throw new Error(`Category "${args.name}" already exists.`);
    }

    return await ctx.db.insert("categories", {
      userId: user._id,
      name: args.name.trim(),
      nameUr: args.nameUr,
      icon: args.icon,
      color: args.color,
      type: args.type,
      isSystem: false,
      createdAt: Date.now(),
    });
  },
});

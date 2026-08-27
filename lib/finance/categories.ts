// lib/finance/categories.ts — Category taxonomy
// System categories that are pre-seeded for every user.

export interface CategoryDefinition {
  name: string;
  nameUr: string;
  icon: string;
  color: string;
  type: "income" | "expense" | "both";
  isSystem: boolean;
}

export const SYSTEM_CATEGORIES: CategoryDefinition[] = [
  {
    name: "salary",
    nameUr: "تنخواہ",
    icon: "💰",
    color: "#22c55e",
    type: "income",
    isSystem: true,
  },
  {
    name: "freelance",
    nameUr: "فری لانس",
    icon: "💻",
    color: "#3b82f6",
    type: "income",
    isSystem: true,
  },
  {
    name: "food",
    nameUr: "کھانا",
    icon: "🍔",
    color: "#f97316",
    type: "expense",
    isSystem: true,
  },
  {
    name: "transportation",
    nameUr: "نقل و حمل",
    icon: "🚗",
    color: "#8b5cf6",
    type: "expense",
    isSystem: true,
  },
  {
    name: "utilities",
    nameUr: "یوٹیلٹیز",
    icon: "💡",
    color: "#eab308",
    type: "expense",
    isSystem: true,
  },
  {
    name: "rent",
    nameUr: "کرایہ",
    icon: "🏠",
    color: "#ef4444",
    type: "expense",
    isSystem: true,
  },
  {
    name: "health",
    nameUr: "صحت",
    icon: "🏥",
    color: "#ec4899",
    type: "expense",
    isSystem: true,
  },
  {
    name: "education",
    nameUr: "تعلیم",
    icon: "📚",
    color: "#06b6d4",
    type: "expense",
    isSystem: true,
  },
  {
    name: "shopping",
    nameUr: "خریداری",
    icon: "🛍️",
    color: "#a855f7",
    type: "expense",
    isSystem: true,
  },
  {
    name: "entertainment",
    nameUr: "تفریح",
    icon: "🎮",
    color: "#f43f5e",
    type: "expense",
    isSystem: true,
  },
  {
    name: "other",
    nameUr: "دیگر",
    icon: "📦",
    color: "#6b7280",
    type: "both",
    isSystem: true,
  },
];

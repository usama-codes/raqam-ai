"use client";

import {
  SYSTEM_CATEGORIES,
  type CategoryDefinition,
} from "@/lib/finance/categories";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface Category extends CategoryDefinition {
  id: string;
  createdAt: number;
}

// ─── Hook return type ────────────────────────────────────────────────────────────

export interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: Error | null;
  createCategory: (
    input: Omit<CategoryDefinition, "isSystem">,
  ) => Promise<void>;
}

// ─── Hook (Phase 2: returns system categories as stubs; Convex wired in Phase 4) ─

export function useCategories(): UseCategoriesReturn {
  // Return system categories as stubs so forms can render category dropdowns
  const stubCategories: Category[] = SYSTEM_CATEGORIES.map((cat, i) => ({
    ...cat,
    id: `stub-${cat.name}-${i}`,
    createdAt: Date.now(),
  }));

  return {
    categories: stubCategories,
    loading: false,
    error: null,
    createCategory: async () => {
      // No-op until Convex is connected in Phase 4
    },
  };
}

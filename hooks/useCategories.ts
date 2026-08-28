"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  SYSTEM_CATEGORIES,
  type CategoryDefinition,
} from "@/lib/finance/categories";

// ─── Raw Convex document shape (needed because `api as any` erases inference) ──

interface RawCategoryDoc {
  _id: string;
  name: string;
  nameUr: string;
  icon?: string;
  color?: string;
  type: "income" | "expense" | "both";
  isSystem: boolean;
  createdAt: number;
}

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

// ─── Hook (Phase 4: wired to Convex) ─────────────────────────────────────────────

export function useCategories(): UseCategoriesReturn {
  // Explicit cast avoids IDE failure to resolve the deep FilterApi generic chain
  // in the generated api.d.ts (tsc resolves correctly, but IDE TS server may not).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;
  const rawCategories = useQuery(typedApi.categories.list);
  const create = useMutation(typedApi.categories.create);

  const categories: Category[] = React.useMemo(() => {
    if (!rawCategories) {
      // Fallback to system category stubs while Convex is loading
      return SYSTEM_CATEGORIES.map((cat, i) => ({
        ...cat,
        id: `stub-${cat.name}-${i}`,
        createdAt: 0,
      }));
    }
    return (rawCategories as RawCategoryDoc[]).map((c) => ({
      id: c._id,
      name: c.name,
      nameUr: c.nameUr,
      icon: c.icon ?? "",
      color: c.color ?? "#6b7280",
      type: c.type,
      isSystem: c.isSystem,
      createdAt: c.createdAt,
    }));
  }, [rawCategories]);

  const createCategory = React.useCallback(
    async (input: Omit<CategoryDefinition, "isSystem">) => {
      await create({
        name: input.name,
        nameUr: input.nameUr,
        icon: input.icon,
        color: input.color,
        type: input.type,
      });
    },
    [create],
  );

  return {
    categories,
    loading: rawCategories === undefined,
    error: null,
    createCategory,
  };
}

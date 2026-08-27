// MOCK_DATA — replace in Phase 2
import type { MockBudget } from "./types";

export const mockBudgets: MockBudget[] = [
  { id: "b-001", categoryId: "cat-food", limit: 15000, spent: 5300 },
  { id: "b-002", categoryId: "cat-transport", limit: 8000, spent: 1450 },
  { id: "b-003", categoryId: "cat-utilities", limit: 10000, spent: 4200 },
  { id: "b-004", categoryId: "cat-rent", limit: 25000, spent: 25000 },
  { id: "b-005", categoryId: "cat-health", limit: 5000, spent: 2500 },
  { id: "b-006", categoryId: "cat-shopping", limit: 10000, spent: 5600 },
  { id: "b-007", categoryId: "cat-entertainment", limit: 5000, spent: 1200 },
  { id: "b-008", categoryId: "cat-education", limit: 8000, spent: 3000 },
];

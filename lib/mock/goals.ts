// MOCK_DATA — replace in Phase 2
import type { MockGoal } from "./types";

const now = Date.now();
const DAY_MS = 86_400_000;

export const mockGoals: MockGoal[] = [
  {
    id: "g-001",
    name: "Emergency Fund",
    nameUr: "ایمرجنسی فنڈ",
    targetAmount: 300000,
    currentAmount: 185000,
    targetDate: now + 180 * DAY_MS,
    isCompleted: false,
  },
  {
    id: "g-002",
    name: "New Laptop",
    nameUr: "نیا لیپ ٹاپ",
    targetAmount: 200000,
    currentAmount: 75000,
    targetDate: now + 120 * DAY_MS,
    isCompleted: false,
  },
  {
    id: "g-003",
    name: "Umrah Savings",
    nameUr: "عمرہ کی بچت",
    targetAmount: 500000,
    currentAmount: 500000,
    isCompleted: true,
  },
  {
    id: "g-004",
    name: "Car Down Payment",
    nameUr: "گاڑی کی قسط",
    targetAmount: 800000,
    currentAmount: 120000,
    targetDate: now + 365 * DAY_MS,
    isCompleted: false,
  },
];

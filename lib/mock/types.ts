// MOCK_DATA — replace in Phase 2
// Shared types for mock data. These mirror the Convex schema defined in AGENTS.md §6.

export interface MockCategory {
  id: string;
  name: string;
  nameUr: string;
  icon: string;
  color: string;
  type: "income" | "expense" | "both";
  isSystem: boolean;
}

export interface MockTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string;
  description?: string;
  descriptionUr?: string;
  date: number;
  notes?: string;
  source: "manual" | "conversational" | "voice" | "receipt" | "import";
  isRecurring: boolean;
  pendingConfirmation: boolean;
}

export interface MockBudget {
  id: string;
  categoryId: string;
  limit: number;
  spent: number;
}

export interface MockGoal {
  id: string;
  name: string;
  nameUr?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: number;
  isCompleted: boolean;
}

export interface MockMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// MOCK_DATA — replace in Phase 2
import { mockBudgets } from "@/lib/mock/budgets";
import { mockCategories } from "@/lib/mock/categories";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">بجٹ</h2>
        <Button>
          <Plus className="ms-2 h-4 w-4" />
          نیا بجٹ
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockBudgets.map((budget) => {
          const category = mockCategories.find(
            (c) => c.id === budget.categoryId,
          );
          const utilization =
            budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
          const isOverBudget = utilization >= 100;
          const isWarning = utilization >= 80 && utilization < 100;

          return (
            <div
              key={budget.id}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{category?.icon ?? "📦"}</span>
                  <span className="text-sm font-medium">
                    {category?.nameUr ?? "نامعلوم"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Rs. {budget.spent.toLocaleString()} /{" "}
                  {budget.limit.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOverBudget
                      ? "bg-destructive"
                      : isWarning
                        ? "bg-yellow-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-end">
                {Math.round(utilization)}% استعمال
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

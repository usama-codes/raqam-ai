// MOCK_DATA — replace in Phase 2
import { mockGoals } from "@/lib/mock/goals";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">بچت کے اہداف</h2>
        <Button>
          <Plus className="ms-2 h-4 w-4" />
          نیا ہدف
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockGoals.map((goal) => {
          const progress =
            goal.targetAmount > 0
              ? (goal.currentAmount / goal.targetAmount) * 100
              : 0;

          return (
            <div
              key={goal.id}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{goal.nameUr ?? goal.name}</h3>
                {goal.isCompleted && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                    مکمل
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Rs. {goal.currentAmount.toLocaleString()}</span>
                  <span>Rs. {goal.targetAmount.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-end">
                  {Math.round(progress)}% مکمل
                </p>
              </div>
              {goal.targetDate && (
                <p className="text-xs text-muted-foreground">
                  ہدف کی تاریخ:{" "}
                  {new Date(goal.targetDate).toLocaleDateString("ur-PK")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

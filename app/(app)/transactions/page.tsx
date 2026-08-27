// MOCK_DATA — replace in Phase 2
import { mockTransactions } from "@/lib/mock/transactions";
import { mockCategories } from "@/lib/mock/categories";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">لین دین</h2>
        <Button>
          <Plus className="ms-2 h-4 w-4" />
          نیا لین دین
        </Button>
      </div>

      {/* Filters placeholder */}
      <div className="flex flex-wrap gap-2">
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option>تمام اقسام</option>
          <option>آمدنی</option>
          <option>اخراجات</option>
        </select>
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option>تمام زمرے</option>
          {mockCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nameUr}
            </option>
          ))}
        </select>
      </div>

      {/* Transaction list */}
      <div className="rounded-lg border border-border">
        <div className="divide-y divide-border">
          {mockTransactions.map((tx) => {
            const category = mockCategories.find((c) => c.id === tx.categoryId);
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{category?.icon ?? "📦"}</span>
                  <div>
                    <p className="text-sm font-medium">
                      {tx.descriptionUr ?? tx.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString("ur-PK")}
                      {tx.notes && ` — ${tx.notes}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-medium ${
                    tx.type === "income" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"} Rs.{" "}
                  {tx.amount.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

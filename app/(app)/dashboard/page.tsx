// MOCK_DATA — replace in Phase 2
import { mockTransactions } from "@/lib/mock/transactions";
import { mockCategories } from "@/lib/mock/categories";

export default function DashboardPage() {
  const totalIncome = mockTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = mockTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">ڈیش بورڈ</h2>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">کل بیلنس</p>
          <p className="text-2xl font-bold">Rs. {balance.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">ماہانہ آمدنی</p>
          <p className="text-2xl font-bold text-green-600">
            Rs. {totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">ماہانہ اخراجات</p>
          <p className="text-2xl font-bold text-red-600">
            Rs. {totalExpenses.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">بچت کی شرح</p>
          <p className="text-2xl font-bold">
            {totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold">حالیہ لین دین</h3>
        </div>
        <div className="divide-y divide-border">
          {mockTransactions.slice(0, 5).map((tx) => {
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

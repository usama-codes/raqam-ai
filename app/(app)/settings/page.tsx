export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">ترتیبات</h2>

      <div className="space-y-4">
        {/* Language preference */}
        <div className="rounded-lg border border-border p-4 space-y-2">
          <h3 className="font-medium">زبان / Language</h3>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="ur">اردو</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Currency */}
        <div className="rounded-lg border border-border p-4 space-y-2">
          <h3 className="font-medium">کرنسی</h3>
          <p className="text-sm text-muted-foreground">PKR — پاکستانی روپیہ</p>
        </div>

        {/* Account */}
        <div className="rounded-lg border border-border p-4 space-y-2">
          <h3 className="font-medium">اکاؤنٹ</h3>
          <p className="text-sm text-muted-foreground">
            ای میل: user@example.com
          </p>
        </div>
      </div>
    </div>
  );
}

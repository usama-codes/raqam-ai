import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Raqam-AI</h1>
        <p className="text-muted-foreground">
          اپنی مالیاتی زندگی کو بہتر بنائیں
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            ای میل
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            پاس ورڈ
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button className="w-full">لاگ ان</Button>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        اکاؤنٹ نہیں ہے؟{" "}
        <Link
          href="/signup"
          className="underline underline-offset-4 hover:text-primary"
        >
          سائن اپ کریں
        </Link>
      </p>
    </div>
  );
}

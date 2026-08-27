import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect authenticated users to dashboard, others to login
  // Auth check will be implemented in Phase 3
  redirect("/dashboard");
}

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";

export default async function RootPage() {
  const { userId } = await auth();

  // Authenticated — straight to the app.
  if (userId) {
    redirect("/dashboard");
  }

  // Logged out — the product pitch (Phase 15).
  return <Landing />;
}

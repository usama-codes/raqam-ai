import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const { userId } = await auth();

  if (userId) {
    // Authenticated — send to dashboard
    redirect("/dashboard");
  }

  // Not authenticated — send to login
  redirect("/login");
}

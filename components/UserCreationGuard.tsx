"use client";

import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "convex/react";
import { anyApi } from "convex/server";

/**
 * Ensures a `users` record exists in Convex for the signed-in Clerk user.
 * Renders a loading state while the user record is being created.
 * This component is mounted inside ConvexClientProvider.
 *
 * When Convex is not yet configured (no NEXT_PUBLIC_CONVEX_URL), it silently
 * passes through so the UI remains functional with stub hooks.
 */
export function UserCreationGuard({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoaded } = useAuth();
  const [ensured, setEnsured] = React.useState(false);
  const hasConvex = !!process.env.NEXT_PUBLIC_CONVEX_URL;

  // Using anyApi since typed API references require `npx convex dev` codegen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ensureUser = useMutation(anyApi.users.ensureUser as any);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || ensured || !hasConvex) return;

    let cancelled = false;

    async function run() {
      try {
        await ensureUser({
          email: user!.email,
          name: user!.name ?? undefined,
        });
        if (!cancelled) setEnsured(true);
      } catch {
        // Convex may not be deployed yet.
        // Silently proceed so the UI doesn't block forever.
        if (!cancelled) setEnsured(true);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, ensured, ensureUser, hasConvex]);

  // While Clerk is loading auth state, show a spinner
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F5132] border-t-transparent" />
          <span className="text-[14px] text-[#6B7A70]">لوڈ ہو رہا ہے...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

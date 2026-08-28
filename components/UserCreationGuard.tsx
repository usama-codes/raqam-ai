"use client";

import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 500;

/**
 * Ensures a `users` record exists in Convex for the signed-in Clerk user.
 * Renders a loading state while the user record is being created.
 * This component is mounted inside ConvexClientProvider.
 *
 * Includes retry with exponential backoff to handle the timing gap between
 * Clerk reporting isSignedIn=true and the Convex client having the JWT
 * available for request authentication.
 *
 * When Convex is not yet configured (no NEXT_PUBLIC_CONVEX_URL), it silently
 * passes through so the UI remains functional with stub hooks.
 */
export function UserCreationGuard({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoaded } = useAuth();
  const [ensured, setEnsured] = React.useState(false);
  const hasConvex = !!process.env.NEXT_PUBLIC_CONVEX_URL;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ensureUser = useMutation((api as any).users.ensureUser);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || ensured || !hasConvex) return;

    let cancelled = false;

    async function run() {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await ensureUser({
            email: user!.email || undefined,
            phone: user!.phone || undefined,
            username: user!.username || undefined,
            name: user!.name ?? undefined,
          });
          if (!cancelled) setEnsured(true);
          return;
        } catch {
          // Retry with exponential backoff — Clerk's JWT may not yet be
          // propagated to the Convex client on the first render after signup.
          if (cancelled) return;
          if (attempt < MAX_RETRIES - 1) {
            await new Promise((r) =>
              setTimeout(r, BASE_DELAY_MS * 2 ** attempt),
            );
          }
        }
      }
      // All retries exhausted — proceed so the UI doesn't block forever.
      if (!cancelled) setEnsured(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, ensured, ensureUser, hasConvex]);

  // Block children until Clerk is loaded AND the user record is ensured.
  if (!isLoaded || (isSignedIn && !ensured && hasConvex)) {
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

"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Redirects a signed-in user who has never finished (or skipped) the first-run
 * flow to `/onboarding`. Phase 15.
 *
 * Mounted in `(app)/layout.tsx` only — `/onboarding` has its own layout, so
 * there is no redirect loop. While the user document is still loading we render
 * children (UserCreationGuard upstream already gated on auth), so there is no
 * extra blocking spinner; the redirect fires the moment the document arrives
 * with `onboardingCompletedAt` absent.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.getCurrentUser);
  const router = useRouter();
  const pathname = usePathname();
  const needsOnboarding = user != null && user.onboardingCompletedAt == null;

  React.useEffect(() => {
    if (needsOnboarding && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [needsOnboarding, pathname, router]);

  if (needsOnboarding) return null;
  return <>{children}</>;
}

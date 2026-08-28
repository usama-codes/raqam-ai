"use client";

import * as React from "react";
import { ConvexAvailableContext } from "@/components/ConvexClientProvider";
import { UserCreationGuard } from "@/components/UserCreationGuard";

/**
 * Conditionally wraps children with `UserCreationGuard` only when Convex is
 * available. When Convex is not configured, children pass through directly.
 */
export function ConvexGuardWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasConvex = React.useContext(ConvexAvailableContext);

  if (hasConvex) {
    return <UserCreationGuard>{children}</UserCreationGuard>;
  }

  return <>{children}</>;
}

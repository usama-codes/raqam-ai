"use client";

import * as React from "react";
import { useUser as useClerkUser, useClerk } from "@clerk/nextjs";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string; // Clerk user ID
  email: string;
  name: string | null;
  imageUrl: string | null;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  signOut: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Client-side auth hook wrapping Clerk's `useUser`.
 * Provides a normalized AuthUser interface for the rest of the app.
 */
export function useAuth(): UseAuthReturn {
  const { user, isSignedIn, isLoaded } = useClerkUser();
  const { signOut: clerkSignOut } = useClerk();

  const authUser: AuthUser | null = React.useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? user.firstName ?? null,
      imageUrl: user.imageUrl ?? null,
    };
  }, [user]);

  return {
    user: authUser,
    isSignedIn: isSignedIn ?? false,
    isLoaded: isLoaded ?? false,
    signOut: async () => {
      await clerkSignOut({ redirectUrl: "/login" });
    },
  };
}

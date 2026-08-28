"use client";

import * as React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

let convexClient: ConvexReactClient | null = null;

function getConvexClient(): ConvexReactClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  if (!convexClient) {
    convexClient = new ConvexReactClient(url);
  }
  return convexClient;
}

export const ConvexAvailableContext = React.createContext(false);

/**
 * Provides the Convex React context to the component tree.
 *
 * When `NEXT_PUBLIC_CONVEX_URL` is set, wraps children with `ConvexProvider`.
 * When not set (e.g. before a Convex deployment is created), renders children
 * directly without the provider. Use `ConvexAvailableContext` to check
 * availability before calling Convex hooks.
 */
export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = getConvexClient();

  if (client) {
    return (
      <ConvexAvailableContext.Provider value={true}>
        <ConvexProvider client={client}>{children}</ConvexProvider>
      </ConvexAvailableContext.Provider>
    );
  }

  return (
    <ConvexAvailableContext.Provider value={false}>
      {children}
    </ConvexAvailableContext.Provider>
  );
}

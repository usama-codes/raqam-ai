/**
 * Convex Auth Configuration — Clerk provider.
 *
 * Tells Convex how to verify JWTs issued by Clerk.
 * Convex reads CLERK_PUBLISHABLE_KEY from the dashboard environment.
 *
 * @see https://docs.convex.dev/auth/clerk
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER ?? "https://clerk.raquam.ai",
      applicationID: "convex",
    },
  ],
};

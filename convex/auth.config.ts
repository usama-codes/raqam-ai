/**
 * Convex Auth Configuration — Clerk provider.
 *
 * Tells Convex how to verify JWTs issued by Clerk.
 * Requires a JWT template named "convex" in the Clerk dashboard that
 * includes `aud: "convex"` so Convex can match the `applicationID`.
 *
 * @see https://docs.convex.dev/auth/clerk
 */
const authConfig = {
  providers: [
    {
      domain:
        process.env.CLERK_ISSUER ??
        "https://factual-snake-1606.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;

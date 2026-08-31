import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests run everywhere (offline, deterministic). The `tests/live/**` suite
// hits real third-party APIs and self-skips (describe.skipIf) unless the relevant
// API key is present in the environment — so `npm test` and CI stay hermetic.
// `tests/integration/**` exercises Convex queries/mutations against convex-test's
// in-memory backend (no deployment, no auth server); those files opt into the
// edge-runtime environment with a per-file `// @vitest-environment edge-runtime`
// pragma. E2E comes with AGENTS.md Phase 14. The production build is verified on Vercel.
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/live/**/*.live.test.ts",
    ],
  },
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" path alias so test imports match app imports.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});

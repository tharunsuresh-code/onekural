import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "test-anon-key",
    },
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 30,
        branches: 30,
        functions: 30,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

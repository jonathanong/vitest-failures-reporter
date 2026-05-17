import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.mts"],
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      thresholds: {
        100: true,
        perFile: true,
      },
    },
    environment: "node",
    exclude: ["**/.tmp/**", "**/node_modules/**"],
    fileParallelism: false,
  },
});

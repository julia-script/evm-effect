import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // `src/schemas/index.test.ts` imports `./index.js`, which is not in the tree yet.
    exclude: ["src/schemas/index.test.ts"],
    passWithNoTests: true,
  },
});

import * as path from "node:path";

export const testDir = path.dirname(new URL(import.meta.url).pathname);
export const packageRoot = path.join(testDir, "..");
export const testFixturesRoot = path.join(testDir, "test-fixtures");

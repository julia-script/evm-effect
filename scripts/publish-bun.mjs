/**
 * Publishes workspace packages with `bun publish` (resolves workspace:/catalog: in tarballs).
 * Order matches internal dependency edges: types → rlp → crypto → solc → evm.
 * @see https://ianm.com/posts/2025-08-18-setting-up-changesets-with-bun-workspaces
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** Dependency order for @evm-effect/* public packages */
const PUBLISH_ORDER = [
  "packages/ethereum-types",
  "packages/rlp",
  "packages/crypto",
  "packages/solc",
  "packages/evm",
];

if (process.env.NPM_TOKEN && !process.env.NPM_CONFIG_TOKEN) {
  process.env.NPM_CONFIG_TOKEN = process.env.NPM_TOKEN;
}

for (const relative of PUBLISH_ORDER) {
  const pkgDir = join(root, relative);
  const pkgPath = join(pkgDir, "package.json");
  const json = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (json.private === true) {
    console.log(`publish-bun: skip ${relative} (private)`);
    continue;
  }
  console.log(`publish-bun: publishing ${json.name}…`);
  const result = spawnSync(
    "bun",
    ["publish", "--access", "public", "--tolerate-republish"],
    {
      cwd: pkgDir,
      stdio: "inherit",
      env: process.env,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `publish-bun: bun publish failed for ${json.name} (exit ${result.status})`,
    );
  }
}

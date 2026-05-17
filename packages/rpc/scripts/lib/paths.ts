import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const root = path.resolve(__dirname, "../..");
export const cloneDir = path.resolve(root, ".tmp-execution-apis");
export const openRpcCachePath = path.resolve(root, ".tmp-refs-openrpc.json");
export const generatedSchemasPath = path.resolve(
  root,
  "src/schemas/generated-schemas.ts",
);

export const generatedRpcSchemasPath = path.resolve(
  root,
  "src/schemas/generated-rpc-schemas.ts",
);

export const biomeConfigPath = path.resolve(root, "../../biome.json");

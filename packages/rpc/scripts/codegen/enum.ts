import { Effect } from "effect";
import type { JsonSchemaEncoded } from "../lib/openrpc-schema.js";
import type { SchemaEntry } from "../lib/types.js";

export const genEffectEnumSchema = Effect.fn("genEffectEnumSchema")(function* (
  name: string,
  schema: JsonSchemaEncoded,
  _depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  if (!schema.enum) {
    return yield* Effect.die("No enum found");
  }
  if (schema.type === "string") {
    return {
      name,
      schema: `Schema.Literals([${schema.enum.map((item) => `"${item}"`).join(", ")}])`,
      deps: [],
    };
  }
  return {
    name,
    schema: `Schema.Literals([${schema.enum.map((item) => `${item}`).join(", ")}])`,
    deps: [],
  };
});

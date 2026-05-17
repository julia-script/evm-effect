import { Effect } from "effect";
import type { JsonSchemaEncoded, SchemaEntry } from "../lib/types.ts";

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

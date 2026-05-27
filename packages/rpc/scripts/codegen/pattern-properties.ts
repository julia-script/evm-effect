import { Effect } from "effect";
import type { JsonSchemaEncoded } from "../lib/openrpc-schema.js";
import type { SchemaEntry } from "../lib/types.js";
import { genEffectSchema } from "./generate.js";

export const genEffectPatternPropertiesSchema = Effect.fn(
  "genEffectPatternPropertiesSchema",
)(function* (
  name: string,
  schema: JsonSchemaEncoded,
  depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  const [patternedProperty] = Object.entries(schema.patternProperties || {});
  if (!patternedProperty) {
    return yield* Effect.die("No patternProperties found");
  }
  const [pattern, property] = patternedProperty;
  const propertySchema = yield* genEffectSchema(name, property, depth + 1);

  const hexKeyPatterns = new Set([
    "^0x[a-fA-F0-9]{64}$",
    "^0x[a-fA-F0-9]{40}$",
  ]);
  const out = hexKeyPatterns.has(pattern)
    ? `Schema.Record(EthTypes.HexString, ${propertySchema.schema})`
    : `Schema.Unknown /* ${name} */`;

  return {
    name,
    schema: out,
    deps: propertySchema.deps,
  };
});

import { Effect } from "effect";
import type { JsonSchemaEncoded, SchemaEntry } from "../lib/types.ts";
import { genEffectAllOfSchema } from "./all-of.ts";
import { genEffectArraySchema } from "./array.ts";
import { genEffectEnumSchema } from "./enum.ts";
import { genEffectObjectSchema } from "./object.ts";
import { genEffectPatternPropertiesSchema } from "./pattern-properties.ts";
import { genEffectRefSchema } from "./ref.ts";
import { genEffectAnyOfSchema, genEffectOneOfSchema } from "./union.ts";

const hexLiteralPattern = /^\^(0x[0-9a-fA-F]+)\$$/;

export const genEffectSchema = Effect.fn("genEffectSchema")(function* (
  name: string,
  schema: JsonSchemaEncoded,
  depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  if ("oneOf" in schema) {
    return yield* genEffectOneOfSchema(name, schema, depth);
  }
  if ("anyOf" in schema) {
    return yield* genEffectAnyOfSchema(name, schema, depth);
  }
  if ("allOf" in schema) {
    return yield* genEffectAllOfSchema(name, schema, depth);
  }
  if (schema.type === "array" || schema.items) {
    return yield* genEffectArraySchema(name, schema, depth);
  }
  if (schema.type === "object" && schema.patternProperties) {
    return yield* genEffectPatternPropertiesSchema(name, schema, depth);
  }
  if (schema.type === "object" || schema.properties) {
    return yield* genEffectObjectSchema(name, schema, depth);
  }
  if ("$ref" in schema) {
    return yield* genEffectRefSchema(name, schema, depth + 1);
  }
  if (schema.enum) {
    return yield* genEffectEnumSchema(name, schema, depth + 1);
  }
  if (schema.type === "string") {
    const match = schema.pattern?.match(hexLiteralPattern);
    if (match) {
      const literal = BigInt(match[1]);
      return {
        name,
        schema: `EthTypes.BigIntFromString.pipe(Schema.refine((value): value is ${literal}n => value === ${literal}n))`,
        deps: [],
      };
    }
    return { name, schema: `Schema.String`, deps: [] };
  }
  if (schema.type === "boolean") {
    return { name, schema: `Schema.Boolean`, deps: [] };
  }
  if (schema.type === "number") {
    return { name, schema: `Schema.Number`, deps: [] };
  }
  if (schema.type === "null") {
    return { name, schema: `Schema.Null`, deps: [] };
  }
  if (schema.const !== undefined) {
    return {
      name,
      schema: `Schema.Literal(${schema.const})`,
      deps: [],
    };
  }

  return {
    name,
    schema: `Schema.Unknown /* ${name} */`,
    deps: [],
  };
});

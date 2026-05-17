import { Effect } from "effect";
import type { JsonSchemaEncoded, SchemaEntry } from "../lib/types.ts";
import { genEffectSchema } from "./generate.ts";
import { genEffectObjectSchema } from "./object.ts";

export const genEffectArraySchema = Effect.fn("genEffectArraySchema")(
  function* (
    name: string,
    schema: JsonSchemaEncoded,
    depth: number = 0,
  ): Effect.fn.Return<SchemaEntry> {
    if (!schema.items && schema.properties) {
      const result = yield* genEffectObjectSchema(
        name,
        { ...schema.properties, type: "object" },
        depth + 1,
      );
      return {
        name,
        schema: `Schema.Array(${result.schema})`,
        deps: result.deps,
      };
    }
    if (schema.items) {
      const result = yield* genEffectSchema(name, schema.items, depth + 1);
      return {
        name,
        schema: `Schema.Array(${result.schema})`,
        deps: result.deps,
      };
    }
    return yield* Effect.die(
      `No items found in array schema: ${name} ${JSON.stringify(schema)}`,
    );
  },
);

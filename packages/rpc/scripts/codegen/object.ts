import { Effect } from "effect";
import type { JsonSchemaEncoded, SchemaEntry } from "../lib/types.ts";
import { genEffectSchema } from "./generate.ts";
import { genHeaderComment } from "./header.ts";

export const genEffectObjectSchema = Effect.fn("genEffectObjectSchema")(
  function* (
    name: string,
    schema: JsonSchemaEncoded,
    depth: number = 0,
  ): Effect.fn.Return<SchemaEntry> {
    const deps: string[] = [];
    let out = "Schema.Struct({\n";
    const required = new Set<string>(schema.required || []);

    for (const [key, value] of Object.entries(schema.properties || {})) {
      out += yield* genHeaderComment(key, value);
      const result = yield* genEffectSchema(key, value, depth + 1);
      if (required.has(key)) {
        out += `  ${key}: ${result.schema},\n`;
      } else {
        out += `  ${key}: ${result.schema}.pipe(Schema.optional),\n`;
      }
      deps.push(...result.deps);
    }

    out += "})";
    return { name, schema: out, deps };
  },
);

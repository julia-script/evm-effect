import { Effect } from "effect";
import type { JsonSchemaEncoded } from "../lib/openrpc-schema.js";
import type { SchemaEntry } from "../lib/types.js";
import { genEffectSchema } from "./generate.js";
import { genHeaderComment } from "./header.js";

export const genEffectObjectSchema = Effect.fn("genEffectObjectSchema")(
  function* (
    name: string,
    schema: JsonSchemaEncoded,
    depth: number = 0,
  ): Effect.fn.Return<SchemaEntry> {
    const deps: string[] = [];
    let out = "Schema.Struct({\n";
    const required = new Set<string>(schema.required || []);
    const entries = Object.entries(schema.properties || {}).sort((a, b) =>
      a[0] === "type" ? -1 : b[0] === "type" ? 1 : 0,
    );

    for (const [key, value] of entries) {
      out += yield* genHeaderComment(key, value);
      if (key === "type" && value.pattern && required.has(key)) {
        out += `  ${key}: Schema.tag("${value.pattern.slice(1, -1)}"),\n`;
        continue;
      }
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

import { Effect } from "effect";
import type { JsonSchemaEncoded, SchemaEntry } from "../lib/types.ts";
import { genEffectSchema } from "./generate.ts";

export const genEffectAllOfSchema = Effect.fn("genEffectAllOfSchema")(
  function* (
    name: string,
    schema: JsonSchemaEncoded,
    depth: number = 0,
  ): Effect.fn.Return<SchemaEntry> {
    if (!schema.allOf) {
      return yield* Effect.die("No allOf found");
    }
    const deps: string[] = [];
    const [first, ...rest] = schema.allOf
      .slice()
      .sort((a, _b) => ("$ref" in a ? -1 : 1));

    const firstResult = yield* genEffectSchema(name, first, depth + 1);
    let out = firstResult.schema;
    const isEnum = firstResult.schema === "TransactionSigned";
    if (isEnum) {
      out += ".mapMembers(Tuple.map(Schema.fieldsAssign({\n";
    } else {
      out += ".mapFields((fields) => ({\n";
      out += "  ...fields,\n";
    }
    deps.push(...firstResult.deps);

    for (const item of rest) {
      if (!item.properties) {
        return yield* Effect.die(
          `No properties found in allOf schema: ${name} ${JSON.stringify(item)}`,
        );
      }
      const required = new Set<string>(item.required || []);
      for (const [key, value] of Object.entries(item.properties)) {
        const result = yield* genEffectSchema(key, value, depth + 1);
        if (required.has(key)) {
          out += `  ${key}: ${result.schema},\n`;
        } else {
          out += `  ${key}: ${result.schema}.pipe(Schema.optional),\n`;
        }
        deps.push(...result.deps);
      }
    }

    out += isEnum ? "})))" : "}))";
    return { name, schema: out, deps };
  },
);

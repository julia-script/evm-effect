import { Effect } from "effect";
import type { JsonSchemaEncoded } from "../lib/openrpc-schema.js";
import type { SchemaEntry } from "../lib/types.js";
import { genEffectSchema } from "./generate.js";

export const genEffectOneOfSchema = Effect.fn("genEffectOneOfSchema")(
  function* (
    name: string,
    schema: JsonSchemaEncoded,
    depth: number = 0,
  ): Effect.fn.Return<SchemaEntry> {
    if (!schema.oneOf) {
      return yield* Effect.die("No oneOf found");
    }
    const items = yield* Effect.all(
      schema.oneOf.map((item) => genEffectSchema(name, item, depth + 1)),
    );
    return {
      name,
      schema: `Schema.Union([${items.map((item) => item.schema).join(", ")}])`,
      deps: items.flatMap((item) => item.deps),
    };
  },
);

export const genEffectAnyOfSchema = Effect.fn("genEffectAnyOfSchema")(
  function* (
    name: string,
    schema: JsonSchemaEncoded,
    depth: number = 0,
  ): Effect.fn.Return<SchemaEntry> {
    if (!schema.anyOf) {
      return yield* Effect.die("No anyOf found");
    }
    const items = yield* Effect.all(
      schema.anyOf.map((item) => genEffectSchema(name, item, depth + 1)),
    );
    return {
      name,
      schema: `Schema.Union([${items.map((item) => item.schema).join(", ")}])`,
      deps: items.flatMap((item) => item.deps),
    };
  },
);

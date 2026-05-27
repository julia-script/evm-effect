import { Config, Effect } from "effect";
import {
  codegenContext,
  derefComponentsSchemaRef,
} from "../lib/codegen-context.js";
import {
  COMPONENTS_SCHEMA_PREFIX,
  ignoredSchemas,
  refToEthType,
} from "../lib/constants.js";
import type { JsonSchemaEncoded } from "../lib/openrpc-schema.ts";
import type { SchemaEntry } from "../lib/types.ts";
import { genEffectSchema } from "./generate.js";

const refPrefix = Config.string("refPrefix").pipe(Config.withDefault(""));

export const genEffectRefSchema = Effect.fn("genEffectRefSchema")(function* (
  name: string,
  schema: JsonSchemaEncoded,
  depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  const ref = schema.$ref || "";
  if (!ref) {
    return yield* Effect.die("No ref found");
  }

  const ethType = refToEthType[ref];
  if (ethType !== undefined) {
    return { name, schema: ethType, deps: [] };
  }

  if (ref.startsWith(COMPONENTS_SCHEMA_PREFIX)) {
    const pathSegments = ref
      .slice(COMPONENTS_SCHEMA_PREFIX.length)
      .split("/")
      .filter((segment) => segment.length > 0);
    if (pathSegments.length > 1) {
      const resolved = derefComponentsSchemaRef(
        ref,
        codegenContext.componentsSchemas,
      );
      if (resolved !== undefined) {
        return yield* genEffectSchema(name, resolved, depth);
      }
    }
  }

  const refName = ref.split("/").pop() || "";
  if (ref === `${COMPONENTS_SCHEMA_PREFIX}${refName}`) {
    if (ignoredSchemas.has(refName)) {
      return { name, schema: `Schema.Unknown/* ${ref} */`, deps: [] };
    }

    const prefix = yield* refPrefix.pipe(Effect.orDie);
    return { name, schema: `${prefix}${refName}`, deps: [ref] };
  }

  return { name, schema: `Schema.Unknown/* ${ref} */`, deps: [] };
});

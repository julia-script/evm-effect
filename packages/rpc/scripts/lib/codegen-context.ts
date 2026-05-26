import type { JsonSchemaEncoded } from "./openrpc-schema.ts";

/** Populated before schema generation so $ref can resolve nested JSON pointers. */
export const codegenContext: {
  componentsSchemas: Record<string, JsonSchemaEncoded>;
} = { componentsSchemas: {} };

export function derefComponentsSchemaRef(
  ref: string,
  componentsSchemas: Record<string, JsonSchemaEncoded>,
): JsonSchemaEncoded | undefined {
  const prefix = "#/components/schemas/";
  if (!ref.startsWith(prefix)) {
    return undefined;
  }
  const segments = ref
    .slice(prefix.length)
    .split("/")
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return undefined;
  }
  const rootSchema = componentsSchemas[segments[0]];
  if (rootSchema === undefined) {
    return undefined;
  }
  let current: unknown = rootSchema;
  for (let i = 1; i < segments.length; i++) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    const next = (current as Record<string, unknown>)[segments[i]];
    if (next === undefined) {
      return undefined;
    }
    current = next;
  }
  return current as JsonSchemaEncoded;
}

import { Effect } from "effect";
import type { JsonSchemaEncoded } from "../lib/types.ts";

export const genHeaderComment = Effect.fn("genHeaderComment")(function* (
  name: string,
  schema: JsonSchemaEncoded,
): Effect.fn.Return<string> {
  let out = "/**\n";
  out += ` * ${name}\n`;
  if (schema.title || schema.description) {
    out += " *\n";
  }
  if (schema.title) {
    out += ` * ${schema.title}\n`;
  }
  if (schema.description) {
    out += ` * ${schema.description}\n`;
  }
  out += " */\n";
  return out;
});

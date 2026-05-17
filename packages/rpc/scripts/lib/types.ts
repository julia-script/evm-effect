import { Schema } from "effect";

export type SchemaEntry = {
  name: string;
  schema: string;
  deps: Array<string>;
};

export const TypeSchema = Schema.Union([
  Schema.Literal("array"),
  Schema.Literal("object"),
  Schema.Literal("string"),
  Schema.Literal("number"),
  Schema.Literal("integer"),
  Schema.Literal("boolean"),
  Schema.Literal("null"),
]);

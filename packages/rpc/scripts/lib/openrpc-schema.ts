import { Effect, Schema } from "effect";
import { TypeSchema } from "./types.ts";
export interface JsonSchemaEncoded {
  $ref?: string;
  items?: JsonSchemaEncoded;
  title?: string;
  type?:
    | (typeof TypeSchema)["Encoded"]
    | readonly (typeof TypeSchema)["Encoded"][];
  oneOf?: readonly JsonSchemaEncoded[];
  anyOf?: readonly JsonSchemaEncoded[];
  allOf?: readonly JsonSchemaEncoded[];
  properties?: Record<string, JsonSchemaEncoded>;
  required?: readonly string[];
  additionalProperties?: boolean | JsonSchemaEncoded;
  description?: string;
  patternProperties?: Record<string, JsonSchemaEncoded>;
  enum?: readonly string[];
  const?: string | number | boolean | null;
  pattern?: string;
  not?: JsonSchemaEncoded;
  maximum?: number;
  minimum?: number;
}

const jsonSchema = Schema.suspend(
  (): Schema.Codec<JsonSchemaEncoded> => JsonSchema,
);

export const JsonSchema = Schema.Struct({
  $ref: Schema.String.pipe(Schema.optional),
  items: Schema.suspend((): Schema.Codec<JsonSchemaEncoded> => JsonSchema).pipe(
    Schema.optional,
  ),
  title: Schema.String.pipe(Schema.optional),
  type: Schema.Union([TypeSchema, Schema.Array(TypeSchema)]).pipe(
    Schema.optional,
  ),
  oneOf: Schema.Array(jsonSchema).pipe(Schema.optional),
  anyOf: Schema.Array(jsonSchema).pipe(Schema.optional),
  allOf: Schema.Array(jsonSchema).pipe(Schema.optional),
  properties: Schema.Record(Schema.String, jsonSchema).pipe(Schema.optional),
  required: Schema.Array(Schema.String).pipe(Schema.optional),
  additionalProperties: Schema.Union([Schema.Boolean, jsonSchema]).pipe(
    Schema.optional,
  ),
  description: Schema.String.pipe(Schema.optional),
  patternProperties: Schema.Record(Schema.String, jsonSchema).pipe(
    Schema.optional,
  ),
  enum: Schema.Array(Schema.String).pipe(Schema.optional),
  const: Schema.Union([
    Schema.String,
    Schema.Number,
    Schema.Boolean,
    Schema.Null,
  ]).pipe(Schema.optional),
  pattern: Schema.String.pipe(Schema.optional),
  not: jsonSchema.pipe(Schema.optional),
  maximum: Schema.Number.pipe(Schema.optional),
  minimum: Schema.Number.pipe(Schema.optional),
});

export const OpenRpcDoc = Schema.Struct({
  openrpc: Schema.String,
  info: Schema.Struct({
    title: Schema.String,
    license: Schema.Struct({
      name: Schema.String,
      url: Schema.String,
    }),
    version: Schema.String,
    description: Schema.String,
  }),
  methods: Schema.Array(
    Schema.Struct({
      examples: Schema.Array(Schema.Unknown).pipe(Schema.optional),
      name: Schema.String,
      summary: Schema.String,
      errors: Schema.Array(
        Schema.Struct({
          code: Schema.Number,
          message: Schema.String,
          data: Schema.Unknown.pipe(Schema.optional),
        }),
      ).pipe(Schema.optional),
      params: Schema.Array(
        Schema.Struct({
          name: Schema.String,
          schema: JsonSchema,
          required: Schema.Boolean.pipe(
            Schema.withDecodingDefaultType(Effect.succeed(false)),
          ),
          description: Schema.String.pipe(Schema.optional),
        }),
      ),
      result: Schema.Struct({
        name: Schema.String,
        schema: JsonSchema,
        description: Schema.String.pipe(Schema.optional),
      }),
      externalDocs: Schema.Struct({
        url: Schema.String,
        description: Schema.String,
      }).pipe(Schema.optional),
      description: Schema.String.pipe(Schema.optional),
    }),
  ),
  components: Schema.Struct({
    schemas: Schema.Record(Schema.String, JsonSchema),
  }),
});

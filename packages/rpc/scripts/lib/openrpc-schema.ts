import { Effect, Schema } from "effect";
import { TypeSchema } from "./types.js";
export interface JsonSchemaEncoded {
  $ref?: string | undefined;
  items?: JsonSchemaEncoded | undefined;
  title?: string | undefined;
  type?:
    | (typeof TypeSchema)["Encoded"]
    | readonly (typeof TypeSchema)["Encoded"][]
    | undefined;
  oneOf?: readonly JsonSchemaEncoded[] | undefined;
  anyOf?: readonly JsonSchemaEncoded[] | undefined;
  allOf?: readonly JsonSchemaEncoded[] | undefined;
  properties?: Record<string, JsonSchemaEncoded> | undefined;
  required?: readonly string[] | undefined;
  additionalProperties?: boolean | JsonSchemaEncoded | undefined;
  description?: string | undefined;
  patternProperties?: Record<string, JsonSchemaEncoded> | undefined;
  enum?: readonly string[] | undefined;
  const?: string | number | boolean | null | undefined;
  pattern?: string | undefined;
  not?: JsonSchemaEncoded | undefined;
  maximum?: number | undefined;
  minimum?: number | undefined;
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

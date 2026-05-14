// git@github.com:ethereum/execution-apis.git

import { inspect } from "node:util";
import { BunServices } from "@effect/platform-bun";
import { Console, Data, Effect, Result, Schema, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";
// import * as JsonSchema from "json-schema";
import yaml from "yaml";

// Stdio.

import path from "node:path";
import { fileURLToPath } from "node:url";
// import { JSONSchemaAnnotationId } from "effect/SchemaAST";
// import { JsonSchema } from "effect/JsonSchema";
import { FileSystem } from "effect/FileSystem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cloneDir = path.resolve(root, ".tmp-execution-apis");
const _schemasDir = path.resolve(cloneDir, "src");
const cloneCommand = ChildProcess.make(
  "git",
  [
    "clone",
    "git@github.com:ethereum/execution-apis.git",
    "--depth=1",
    "--branch=main",
    cloneDir,
  ],
  {
    cwd: root,
    stderr: "pipe",
    stdout: "pipe",
  },
);

const makeCommand = ChildProcess.make("make", ["build"], {
  cwd: cloneDir,
  stderr: "pipe",
  stdout: "pipe",
});
class ParseYamlError extends Data.TaggedError("ParseYamlError")<{
  readonly message: string;
}> {}
const _parseYaml = (content: string) =>
  Effect.try({
    try: () => yaml.parse(content) as unknown,
    catch: (error) => {
      return new ParseYamlError({
        message: String(error),
      });
    },
  });

const generatedRpcFile = Effect.fn("generatedRpcFile")(function* () {
  const fs = yield* FileSystem;

  const exists = yield* fs.exists(path.resolve(root, "refs-openrpc.json"));

  if (exists) {
    return;
  }
  {
    const command = yield* cloneCommand;

    const stderr = yield* command.stderr
      .pipe(Stream.runCollect)
      .pipe(
        Effect.map((value) =>
          value.map((value) => new TextDecoder().decode(value)).join(""),
        ),
      );
    yield* Console.log(stderr);
  }
  {
    const command = yield* makeCommand;
    const stderr = yield* command.stderr
      .pipe(Stream.runCollect)
      .pipe(
        Effect.map((value) =>
          value.map((value) => new TextDecoder().decode(value)).join(""),
        ),
      );
    yield* Console.log(stderr);
  }

  yield* fs.copyFile(
    path.resolve(cloneDir, "refs-openrpc.json"),
    path.resolve(root, "refs-openrpc.json"),
  );

  yield* fs.remove(cloneDir, {
    recursive: true,
  });
});

const program = Effect.gen(function* () {
  const fs = yield* FileSystem;
  yield* generatedRpcFile();

  const decode = Schema.decodeUnknownEffect(Schema.fromJsonString(OpenRpcDoc));
  const openrpcFile = yield* fs.readFileString(
    path.resolve(root, "refs-openrpc.json"),
  );

  const openrpc = yield* decode(openrpcFile, {
    onExcessProperty: "error",
  }).pipe(Effect.result);
  if (Result.isFailure(openrpc)) {
    return yield* Console.log(openrpc.failure.message);
  }
  yield* Console.log(
    inspect(openrpc.success.components.schemas, {
      depth: 10,
      colors: true,
    }),
  );

  // const files = yield* fs
  //   .readDirectory(schemasDir, { recursive: true })
  //   .pipe(
  //     Effect.map((files) => files.filter((file) => file.endsWith(".yaml"))),
  //   );
  // yield* Console.log(files);

  // const schemaFiles = yield* Effect.all(
  //   files.map((file) =>
  //     fs.readFileString(path.resolve(schemasDir, file)).pipe(
  //       Effect.map((content) => {
  //         return [file, content] as const;
  //       }),
  //     ),
  //   ),
  // );
  // // yield* Console.log(schemaFiles);
  // const EthSchemas = Schema.Struct({
  //   name: Schema.String,
  // });

  // const decode = Schema.decodeUnknownEffect(
  //   Schema.Union([EthSchemas, Schema.Array(EthSchemas)]),
  // );
  // const validate = JsonSchema.validate(JsonSchema.JSONSchema7);
  // const schemas = yield* Effect.all(
  //   schemaFiles.map(([file, content]) => {
  //     return parseYaml(content).pipe( Effect.flatMap((schema) => decode(schema)));
  //   }),
  // );

  // const a = schemas[1]
  // a;
  // yield* Console.log(JSON.stringify(a, null, 2));
  // yield* Console.log(schemas);

  // .pipe(
  //   Effect.tryMap({
  //     try: (entries) =>
  //       entries.map(
  //         ([file, content]) =>
  //           [
  //             file.replace(".yaml", ""),
  //             yaml.parse(content) as JsonSchema7Root,
  //           ] as const,
  //       ),
  //     catch: (error) => {
  //       return Effect.die(error);
  //     },
  //   }),
  // );
  // const schemas = Object.fromEntries(schemaFiles);

  // yield* Console.log(
  //   schemaFiles.filter(([file]) => file.startsWith("schemas/")),
  // );

  // JSONSchema
  // yield* Console.log(command.stdout.pipe(Stream.runCollect))
  // yield* Console.log(command);
  // const command = yield* Command.start().pipe(

  // );
  // const result = yield* command.stdout.pipe()

  // console.log(result);
}).pipe(Effect.scoped);

const TypeSchema = Schema.Union([
  Schema.Literal("array"),
  Schema.Literal("object"),
  Schema.Literal("string"),
  Schema.Literal("number"),
  Schema.Literal("integer"),
  Schema.Literal("boolean"),
  Schema.Literal("null"),
]);
interface JsonSchemaEncoded {
  $ref?: string;
  items?: JsonSchemaEncoded;
  title?: string;
  type?:
    | (typeof TypeSchema)["Encoded"]
    | readonly (typeof TypeSchema)["Encoded"][];
  oneOf?: readonly JsonSchemaEncoded[];
  anyOf?: readonly JsonSchemaEncoded[];
}

const jsonSchema = Schema.suspend(
  (): Schema.Codec<JsonSchemaEncoded> => JsonSchema,
);

const JsonSchema = Schema.Struct({
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
const OpenRpcDoc = Schema.Struct({
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

await Effect.runPromise(
  program.pipe(
    // Effect.provide(NodeChildProcessSpawner.layer),
    Effect.provide(BunServices.layer),
  ),
);

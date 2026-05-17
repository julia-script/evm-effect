// git@github.com:ethereum/execution-apis.git

import { Biome, Distribution } from "@biomejs/js-api";
import { NodeServices } from "@effect/platform-node";
import { Console, Effect, Result, Schema, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { dedent } from "ts-dedent";

const biome = await Biome.create({ distribution: Distribution.NODE });
// biome.formatContent
const { projectKey } = biome.openProject("");

import path from "node:path";
import { fileURLToPath } from "node:url";
// import { JSONSchemaAnnotationId } from "effect/SchemaAST";
// import { JsonSchema } from "effect/JsonSchema";
import { FileSystem } from "effect/FileSystem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cloneDir = path.resolve(root, ".tmp-execution-apis");
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

const ignored = new Set([
  "address",
  "addresses",
  "byte",
  "bytes",
  "bytes16",
  "bytes256",
  "bytes32",
  "bytes48",
  "bytes65",
  "bytes8",
  "bytes96",
  "bytesMax32",
  "hash32",
  "notFound",
  "ratio",
  "uint",
  "uint256",
  "uint32",
  "uint64",
  "uintDecimal",
]);
const generatedRpcFile = Effect.fn("generatedRpcFile")(function* () {
  const fs = yield* FileSystem;

  const exists = yield* fs.exists(path.resolve(root, ".tmp-refs-openrpc.json"));

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
    path.resolve(root, ".tmp-refs-openrpc.json"),
  );

  yield* fs.remove(cloneDir, {
    recursive: true,
  });
});

type SchemaEntry = {
  name: string;
  schema: string;
  deps: Array<string>;
};

function topologicalSort(schemas: SchemaEntry[]): SchemaEntry[] {
  const byName = new Map(schemas.map((item) => [item.name, item]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const item of schemas) {
    indegree.set(item.name, 0);
    dependents.set(item.name, []);
  }

  for (const item of schemas) {
    for (const depRef of item.deps) {
      const depName = depRef.split("/").pop() ?? "";
      if (!byName.has(depName)) {
        continue;
      }
      dependents.get(depName)?.push(item.name);
      indegree.set(item.name, (indegree.get(item.name) ?? 0) + 1);
    }
  }

  const queue = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([name]) => name)
    .sort();

  const sorted: SchemaEntry[] = [];
  while (queue.length > 0) {
    queue.sort();
    const name = queue.shift() as string;
    sorted.push(byName.get(name) as SchemaEntry);
    for (const dependent of dependents.get(name) ?? []) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        queue.push(dependent);
      }
    }
  }

  if (sorted.length !== schemas.length) {
    const remaining = schemas
      .filter((item) => !sorted.some((s) => s.name === item.name))
      .map((item) => item.name);
    throw new Error(`Circular schema dependencies: ${remaining.join(", ")}`);
  }

  return sorted;
}

function derefComponentsSchemaRef(
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

/** Populated before schema generation so $ref can resolve nested JSON pointers. */
const codegenCtx: {
  componentsSchemas: Record<string, JsonSchemaEncoded>;
} = { componentsSchemas: {} };

const program = Effect.gen(function* () {
  const fs = yield* FileSystem;
  yield* generatedRpcFile();

  const decode = Schema.decodeUnknownEffect(Schema.fromJsonString(OpenRpcDoc));
  const openrpcFile = yield* fs.readFileString(
    path.resolve(root, ".tmp-refs-openrpc.json"),
  );

  const openrpc = yield* decode(openrpcFile, {
    onExcessProperty: "error",
  }).pipe(Effect.result);
  if (Result.isFailure(openrpc)) {
    return yield* Console.log(openrpc.failure.message);
  }

  const schemas = openrpc.success.components.schemas;
  codegenCtx.componentsSchemas = schemas;
  let file = dedent`
  import { Schema, Tuple } from 'effect';
  import * as EthTypes from './base-types.js';

  
  `;
  const generatedSchemas: SchemaEntry[] = [];
  // const schemaEntries: { name: string, schema: string }[] = [];
  for (const [name, schema] of Object.entries(schemas)) {
    if (ignored.has(name)) {
      continue;
    }
    const header = yield* genHeaderComment(name, schema);
    const entry = yield* genEffectSchema(name, schema);
    generatedSchemas.push({
      name: name,
      schema: header + entry.schema,
      deps: [...entry.deps],
    });
  }

  const sortedSchemas = topologicalSort(generatedSchemas);
  const biomeConfig = yield* fs.readFileString(
    path.resolve(root, "../../biome.json"),
  );
  biome.applyConfiguration(projectKey, JSON.parse(biomeConfig));
  const allSchemas = sortedSchemas.map((item) => item.schema).join("\n\n");
  const formatted = biome.formatContent(projectKey, allSchemas, {
    filePath: "src/schemas/generated-schemas.ts",
  });

  if (formatted.diagnostics.length > 0) {
    yield* Console.log(formatted.diagnostics);
  }
  file += `${formatted.content}\n`;
  // yield* Console.log(file);
  yield* fs.writeFileString(
    path.resolve(root, "src/schemas/generated-schemas.ts"),
    file,
  );
  // const formatted = biome.formatContent(projectKey, allSchemas, { filePath: `${name}.ts` });
  // yield* Console.log(formatted.content);
}).pipe(Effect.scoped);
const genHeaderComment = Effect.fn("genHeaderComment")(function* (
  name: string,
  schema: JsonSchemaEncoded,
): Effect.fn.Return<string> {
  let out = "";
  out += "/**\n";
  out += ` * ${name}\n`;
  if (schema.title || schema.description) {
    out += ` *\n`;
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
const genEffectSchema = Effect.fn("genEffectSchema")(function* (
  name: string,
  schema: JsonSchemaEncoded,
  depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  // console.log(schema);
  let out = "";

  if (depth === 0) {
    out += `export const ${name} = `;
  }

  if ("oneOf" in schema) {
    const result = yield* genEffectOneOfSchema(name, schema, depth);
    return {
      name: name,
      schema: out + result.schema,
      deps: [...result.deps],
    };
  }
  if ("anyOf" in schema) {
    const result = yield* genEffectAnyOfSchema(name, schema, depth);
    return {
      name: name,
      schema: out + result.schema,
      deps: [...result.deps],
    };
  }
  if ("allOf" in schema) {
    const result = yield* genEffectAllOfSchema(name, schema, depth);
    return {
      name: name,
      schema: out + result.schema,
      deps: [...result.deps],
    };
  }

  if (schema.type === "array" || schema.items) {
    const result = yield* genEffectArraySchema(name, schema, depth);
    return {
      name: name,
      schema: out + result.schema,
      deps: [...result.deps],
    };
  }

  if (schema.type === "object" && schema.patternProperties) {
    const result = yield* genEffectPatternPropertiesSchema(name, schema, depth);
    return {
      name: name,
      schema: out + result.schema,
      deps: [...result.deps],
    };
  }

  if (schema.type === "object" || schema.properties) {
    const result = yield* genEffectObjectSchema(name, schema, depth);
    return {
      name: name,
      schema: out + result.schema,
      deps: [...result.deps],
    };
  }

  if ("$ref" in schema) {
    const result = yield* genEffectRefSchema(name, schema, depth + 1);
    return {
      name: name,
      schema: out + result.schema,
      deps: [...result.deps],
    };
    // return out + (yield* genEffectSchema(schema.$ref, schema, depth + 1));
  }
  if (schema.enum) {
    const result = yield* genEffectEnumSchema(name, schema, depth + 1);
    return {
      name: name,
      schema: out + result.schema,
      deps: [...result.deps],
    };
  }
  if (schema.type === "string") {
    // console.log(name, schema);
    const reg = new RegExp(/^\^(0x[0-9a-fA-F]+)\$$/);
    const match = schema.pattern?.match(reg);
    // console.log("match",schema.pattern, match);
    if (match) {
      const value = match[1];
      const bigint = BigInt(value);
      return {
        name: name,
        schema: `${out}${out}EthTypes.BigIntFromString.pipe(Schema.refine((value) :value is ${bigint}n => value === ${bigint}n))`,
        deps: [],
      };
    }
    if (schema.pattern) {
      return {
        name: name,
        schema: `${out}Schema.String`,
        deps: [],
      };
    }
    //   if (schema.pattern) {
    //     return Schema.Literal(schema.pattern.slice(1, -1));
    //   }
    return {
      name: name,
      schema: `${out}Schema.String`,
      deps: [],
    };
  }
  if (schema.type === "boolean") {
    return {
      name: name,
      schema: `${out}Schema.Boolean`,
      deps: [],
    };
  }
  if (schema.type === "null") {
    return {
      name: name,
      schema: `${out}Schema.Null`,
      deps: [],
    };
  }
  if (schema.const) {
    return {
      name: name,
      schema: `${out}Schema.Literal(${schema.const})`,
      deps: [],
    };
  }

  yield* Console.log(name, schema);

  // out.split("\n").forEach((line) => {
  //   console.log("  ".repeat(depth) + line);
  // });

  return {
    name: name,
    schema: `${out}Schema.Unknown /* ${name} */`,
    deps: [],
  };
});

const genEffectPatternPropertiesSchema = Effect.fn(
  "genEffectPatternPropertiesSchema",
)(function* (
  name: string,
  schema: JsonSchemaEncoded,
  depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  const [patternedProperty] = Object.entries(schema.patternProperties || {});
  if (!patternedProperty) {
    return yield* Effect.die("No patternProperties found");
  }
  const [pattern, property] = patternedProperty;

  const propertySchema = yield* genEffectSchema(name, property, depth + 1);

  let out = "";
  if (pattern === "^0x[a-fA-F0-9]{64}$") {
    out = `EthTypes.EntriesFromRecord(EthTypes.Bytes32FromString, ${propertySchema.schema})`;
  } else if (pattern === "^0x[a-fA-F0-9]{40}$") {
    out = `EthTypes.EntriesFromRecord(EthTypes.AddressFromString, ${propertySchema.schema})`;
  } else {
    out = `Schema.Unknown /* ${name} */`;
  }
  // out += `Schema.Unknown /* ${name} */`;
  return {
    name: name,
    schema: out,
    deps: [...propertySchema.deps],
  };
});
const genEffectEnumSchema = Effect.fn("genEffectEnumSchema")(function* (
  name: string,
  schema: JsonSchemaEncoded,
  _depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  if (!schema.enum) {
    return yield* Effect.die("No enum found");
  }
  if (schema.type === "string") {
    return {
      name: name,
      schema: `Schema.Literals([${schema.enum.map((item) => `"${item}"`).join(", ")}])`,
      deps: [],
    };
  }
  return {
    name: name,
    schema: `Schema.Literals([${schema.enum.map((item) => `${item}`).join(", ")}])`,
    deps: [],
  };
});
const genEffectOneOfSchema = Effect.fn("genEffectOneOfSchema")(function* (
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
    name: name,
    schema: `Schema.Union([${items.map((item) => item.schema).join(", ")}])`,
    deps: [...items.flatMap((item) => item.deps)],
  };
});
const genEffectAnyOfSchema = Effect.fn("genEffectAnyOfSchema")(function* (
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
    name: name,
    schema: `Schema.Union([${items.map((item) => item.schema).join(", ")}])`,
    deps: [...items.flatMap((item) => item.deps)],
  };
});

// const schema = Schema.Union([
//   Schema.Struct({ a: Schema.String }),
//   Schema.Struct({ b: Schema.Number })
// ]).mapMembers(Tuple.map(Schema.fieldsAssign({ c: Schema.Number })))
// const schemab =
//   Schema.Struct({ b: Schema.Number }).mapFields((fields) => ({ ...fields, c: Schema.Number }))

const genEffectAllOfSchema = Effect.fn("genEffectAllOfSchema")(function* (
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
  // TransactionSigned is an enum so we map it differently
  if (isEnum) {
    out += ".mapMembers(Tuple.map(Schema.fieldsAssign({\n";
    // console.log(firstResult.schema);
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
  if (isEnum) {
    out += "})))";
  } else {
    out += "}))";
  }
  return {
    name: name,
    schema: out,
    deps: deps,
  };
});

const genEffectRefSchema = Effect.fn("genEffectRefSchema")(function* (
  name: string,
  schema: JsonSchemaEncoded,
  depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  const ref = schema.$ref || "";
  const refName = ref.split("/").pop() || "";
  if (!ref) {
    return yield* Effect.die("No ref found");
  }

  const componentsPrefix = "#/components/schemas/";
  if (ref.startsWith(componentsPrefix)) {
    const pathSegments = ref
      .slice(componentsPrefix.length)
      .split("/")
      .filter((segment) => segment.length > 0);
    if (pathSegments.length > 1) {
      const resolved = derefComponentsSchemaRef(
        ref,
        codegenCtx.componentsSchemas,
      );
      if (resolved !== undefined) {
        return yield* genEffectSchema(name, resolved, depth);
      }
    }
  }

  // switch (ref) {
  if (ref === "#/components/schemas/address") {
    return {
      name: name,
      schema: `EthTypes.AddressFromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/bytes") {
    return {
      name: name,
      schema: `EthTypes.BytesFromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/bytes32") {
    return {
      name: name,
      schema: `EthTypes.Bytes32FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/bytes64") {
    return {
      name: name,
      schema: `EthTypes.Bytes64FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/uint") {
    return {
      name: name,
      schema: `EthTypes.UintFromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/uint8") {
    return {
      name: name,
      schema: `EthTypes.U8FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/uint16") {
    return {
      name: name,
      schema: `EthTypes.U16FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/uint32") {
    return {
      name: name,
      schema: `EthTypes.U32FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/uint64") {
    return {
      name: name,
      schema: `EthTypes.U64FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/uint256") {
    return {
      name: name,
      schema: `EthTypes.U256FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/int") {
    return {
      name: name,
      schema: `EthTypes.IntFromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/hash32") {
    return {
      name: name,
      schema: `EthTypes.Bytes32FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/bytes256") {
    return {
      name: name,
      schema: `EthTypes.Bytes256FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/bytes64") {
    return {
      name: name,
      schema: `EthTypes.Bytes64FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/bytes32") {
    return {
      name: name,
      schema: `EthTypes.Bytes32FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/byte") {
    return {
      name: name,
      schema: `EthTypes.U8FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/bytes48") {
    return {
      name: name,
      schema: `EthTypes.BytesFromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/addresses") {
    return {
      name: name,
      schema: `Schema.Array(EthTypes.AddressFromString)`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/bytes8") {
    return {
      name: name,
      schema: `EthTypes.Bytes8FromString`,
      deps: [],
    };
  }
  if (ref === "#/components/schemas/bytesMax32") {
    return {
      name: name,
      schema: `EthTypes.BytesFromString`,
      deps: [],
    };
  }

  if (ref === `#/components/schemas/${refName}`) {
    if (ignored.has(refName)) {
      console.log(`Ignored schema: ${refName}`);
      return {
        name: name,
        schema: `Schema.Unknown/* ${ref} */`,
        deps: [],
      };
    }
    return {
      name: name,
      schema: refName,
      deps: [ref],
    };
  } else {
    return {
      name: name,
      schema: `Schema.Unknown/* ${ref} */`,
      deps: [],
    };
  }
});

const genEffectArraySchema = Effect.fn("genEffectArraySchema")(function* (
  name: string,
  schema: JsonSchemaEncoded,
  depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  if (!schema.items && schema.properties) {
    const result = yield* genEffectObjectSchema(
      name,
      { ...schema.properties, type: "object" },
      depth + 1,
    );
    return {
      name: name,
      schema: `Schema.Array(${result.schema})`,
      deps: [...result.deps],
    };
  }
  if (schema.items) {
    const result = yield* genEffectSchema(name, schema.items, depth + 1);
    return {
      name: name,
      schema: `Schema.Array(${result.schema})`,
      deps: [...result.deps],
    };
  }
  return yield* Effect.die(
    `No items found in array schema: ${name} ${JSON.stringify(schema)}`,
  );
});
const genEffectObjectSchema = Effect.fn("genEffectObjectSchema")(function* (
  name: string,
  schema: JsonSchemaEncoded,
  depth: number = 0,
): Effect.fn.Return<SchemaEntry> {
  const deps: string[] = [];
  let out = "";
  out += "Schema.Struct({\n";

  const required = new Set<string>(schema.required || []);
  for (const [key, value] of Object.entries(schema.properties || {})) {
    out += yield* genHeaderComment(key, value);
    const result = yield* genEffectSchema(key, value, depth + 1);
    if (required.has(key)) {
      out += `  ${key}: ${result.schema},\n`;
    } else {
      out += `  ${key}: ${result.schema}.pipe(Schema.optional),\n`;
    }
    deps.push(...result.deps);
    // out += `  ${key}: ${yield* genEffectSchema(key, value, depth + 1)},\n`;
  }
  out += "})";
  return {
    name: name,
    schema: out,
    deps: deps,
  };
});

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
    Effect.provide(NodeServices.layer),
  ),
);

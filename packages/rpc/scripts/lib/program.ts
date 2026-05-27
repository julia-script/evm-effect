import { ConfigProvider, Effect } from "effect";
import { FileSystem } from "effect/FileSystem";
import { dedent } from "ts-dedent";
import { genEffectSchema } from "../codegen/generate.js";
import { genHeaderComment } from "../codegen/header.js";
import { formatGeneratedSchemas } from "./biome.js";
import { codegenContext } from "./codegen-context.js";
import { ignoredSchemas } from "./constants.js";
import { fetchOpenRpcSpec } from "./fetch-openrpc.js";
import type { JsonSchemaEncoded, OpenRpcDoc } from "./openrpc-schema.ts";
import { generatedRpcSchemasPath, generatedSchemasPath } from "./paths.js";
import { topologicalSort } from "./topological-sort.js";
import type { SchemaEntry } from "./types.ts";

const generatedFileHeader = dedent`
  import { Schema, Tuple } from 'effect';
  import EthTypes from '@evm-effect/ethereum-types';

  `;

export const generateSchemasProgram = Effect.gen(function* () {
  const fs = yield* FileSystem;
  const openrpc = yield* fetchOpenRpcSpec();

  const schemas = openrpc.components.schemas;
  codegenContext.componentsSchemas = schemas as Record<
    string,
    JsonSchemaEncoded
  >;

  const generatedSchemas: SchemaEntry[] = [];
  for (const [name, schema] of Object.entries(schemas)) {
    if (ignoredSchemas.has(name)) {
      continue;
    }
    const header = yield* genHeaderComment(name, schema);
    const entry = yield* genEffectSchema(name, schema);
    const exportPrefix = `export const ${name} = `;
    generatedSchemas.push({
      name,
      schema: header + exportPrefix + entry.schema,
      deps: [...entry.deps],
    });
  }

  const sortedSchemas = topologicalSort(generatedSchemas);
  const allSchemas = sortedSchemas.map((item) => item.schema).join("\n\n");
  const formatted = yield* formatGeneratedSchemas(allSchemas);

  yield* fs.writeFileString(
    generatedSchemasPath,
    `${generatedFileHeader}${formatted.content}\n`,
  );
}).pipe(Effect.scoped);

export const generateRpcSchemasProgram = Effect.gen(function* () {
  const openrpc = yield* fetchOpenRpcSpec();

  const header = `

  import { Schema  } from 'effect';
  import EthTypes from '@evm-effect/ethereum-types';
  import * as Components from './generated-schemas.js';

  `;
  const results: string[] = [];
  for (const method of openrpc.methods) {
    const result = yield* generateRpcSchemas(method);
    results.push(result);
  }
  const formatted = yield* formatGeneratedSchemas(results.join("\n"));
  const fs = yield* FileSystem;
  yield* fs.writeFileString(
    generatedRpcSchemasPath,
    `${header}${formatted.content}`,
  );
}).pipe(Effect.scoped);

const generateHeader = Effect.fn("generateHeader")(function* (
  name: string,
  description?: string,
  summary?: string,
) {
  let out = "/**\n";
  out += ` * ${name}\n`;
  if (summary) {
    out += " *\n";
    out += ` * ${summary.trim()}\n`;
  }
  if (description) {
    out += " *\n";
    out += ` * ${description.trim()}\n`;
  }
  out += " */\n";
  return out;
});
export const generateRpcSchemas = Effect.fn("generateRpcSchemas")(function* (
  method: (typeof OpenRpcDoc.Type)["methods"][number],
) {
  let out = "";
  out += yield* generateHeader(
    `${method.name} RPC method`,
    method.description,
    method.summary,
  );
  out += `export const ${method.name} = {\n`;
  out += `  method: "${method.name}" as const,\n`;

  out += `  params: Schema.Tuple([\n`;
  const config = ConfigProvider.fromEnv({
    env: {
      refPrefix: "Components.",
    },
  });
  for (const param of method.params) {
    const header = yield* generateHeader(param.name, param.description);
    out += header;

    const result = yield* genEffectSchema(param.name, param.schema, 1).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, config),
    );
    out += `    ${result.schema},\n`;
  }
  out += `  ]),\n`;
  const result = yield* genEffectSchema(
    method.result.name,
    method.result.schema,
    1,
  ).pipe(Effect.provideService(ConfigProvider.ConfigProvider, config));
  const resultHeader = yield* generateHeader(
    method.result.name,
    method.result.description,
  );
  out += resultHeader;
  out += `  result: ${result.schema},\n`;

  if (method.errors) {
    out += `  errors: Schema.Union([\n`;
    for (const error of method.errors) {
      out += "Schema.Struct({\n";
      out += `    code: Schema.Literal(${error.code}),\n`;
      out += `    message: Schema.Literal("${error.message}"),\n`;
      out += `}),\n`;

      // }
    }
    out += `  ]),\n`;
  }

  out += `}\n`;
  return out;
});

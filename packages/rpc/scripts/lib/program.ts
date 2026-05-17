import { ConfigProvider, Effect } from "effect";
import { FileSystem } from "effect/FileSystem";
import { dedent } from "ts-dedent";
import { genEffectSchema } from "../codegen/generate.ts";
import { genHeaderComment } from "../codegen/header.ts";
import { formatGeneratedSchemas } from "./biome.ts";
import { codegenContext } from "./codegen-context.ts";
import { ignoredSchemas } from "./constants.ts";
import { fetchOpenRpcSpec } from "./fetch-openrpc.ts";
import type { OpenRpcDoc } from "./openrpc-schema.ts";
import { generatedRpcSchemasPath, generatedSchemasPath } from "./paths.ts";
import { topologicalSort } from "./topological-sort.ts";
import type { SchemaEntry } from "./types.ts";

const generatedFileHeader = dedent`
  import { Schema, Tuple } from 'effect';
  import * as EthTypes from '@evm-effect/ethereum-types/schemas/base-types';


  `;

export const generateSchemasProgram = Effect.gen(function* () {
  const fs = yield* FileSystem;
  const openrpc = yield* fetchOpenRpcSpec();

  const schemas = openrpc.components.schemas;
  codegenContext.componentsSchemas = schemas;

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

  import { Schema, Tuple } from 'effect';
  import * as EthTypes from '@evm-effect/ethereum-types/schemas/base-types';
  import * as Components from './generated-schemas.js';

  `;
  // codegenContext.componentsSchemas = schemas;
  // console.log(openrpc.methods);
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
  // console.log(results);
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
  out += `  method: "${method.name}",\n`;

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
  // console.log(method)
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

  // out += `  result: Schema.Tuple([\n`
  // out += `  ]),\n`;

  if (method.errors) {
    console.log(method.errors);
    out += `  errors: Schema.Union([\n`;
    for (const error of method.errors) {
      out += "Schema.Struct({\n";
      out += `    code: Schema.Literal(${error.code}),\n`;
      out += `    message: Schema.Literal("${error.message}"),\n`;
      // out += `    data: Schema.Unknown.pipe(Schema.optional),\n`;
      out += `}),\n`;
      //   const header = yield* generateHeader(error.name, error.description);
      //   out += header;
      //   out += `    ${error.schema},\n`;
      // }
    }
    out += `  ]),\n`;
  }

  out += `}\n`;
  return out;
});

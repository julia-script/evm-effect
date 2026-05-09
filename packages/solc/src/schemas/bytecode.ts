/**
 * Bytecode and EVM output schemas for Solidity compiler
 */
import { Schema } from "effect";
import { HexString } from "./types.js";
import { YulBlock } from "./yul-ast.js";

export const LinkReferencePosition = Schema.Struct({
  start: Schema.Number,
  length: Schema.Number,
});

export type LinkReferencePosition = typeof LinkReferencePosition.Type;

export const LinkReferences = Schema.Record(
  Schema.String,
  Schema.Record(Schema.String, Schema.Array(LinkReferencePosition)),
);

export type LinkReferences = typeof LinkReferences.Type;

export const ImmutableReferences = Schema.Record(
  Schema.String,
  Schema.Array(LinkReferencePosition),
);

export type ImmutableReferences = typeof ImmutableReferences.Type;

export const GeneratedSource = Schema.Struct({
  ast: Schema.optional(YulBlock),
  contents: Schema.String,
  id: Schema.Number,
  language: Schema.String,
  name: Schema.String,
});

export type GeneratedSource = typeof GeneratedSource.Type;

export const FunctionDebugData = Schema.Struct({
  entryPoint: Schema.NullishOr(Schema.Number),
  id: Schema.NullishOr(Schema.Number),
  parameterSlots: Schema.NullishOr(Schema.Number),
  returnSlots: Schema.NullishOr(Schema.Number),
});

export type FunctionDebugData = typeof FunctionDebugData.Type;

export const Bytecode = Schema.Struct({
  object: Schema.optional(HexString),
  opcodes: Schema.optional(Schema.String),
  sourceMap: Schema.optional(Schema.String),
  linkReferences: Schema.optional(LinkReferences),
  immutableReferences: Schema.optional(ImmutableReferences),
  generatedSources: Schema.optional(Schema.Array(GeneratedSource)),
  functionDebugData: Schema.optional(
    Schema.Record(Schema.String, FunctionDebugData),
  ),
  ethdebug: Schema.optional(Schema.Unknown),
});

export type Bytecode = typeof Bytecode.Type;

export const GasEstimates = Schema.Struct({
  creation: Schema.optional(
    Schema.Struct({
      codeDepositCost: Schema.String,
      executionCost: Schema.String,
      totalCost: Schema.String,
    }),
  ),
  external: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  internal: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

export type GasEstimates = typeof GasEstimates.Type;

export const MethodIdentifiers = Schema.Record(Schema.String, Schema.String);

export type MethodIdentifiers = typeof MethodIdentifiers.Type;

export const EVMOutput = Schema.Struct({
  assembly: Schema.optional(Schema.String),
  legacyAssembly: Schema.optional(Schema.Unknown),
  bytecode: Schema.optional(Bytecode),
  deployedBytecode: Schema.optional(Bytecode),
  methodIdentifiers: Schema.optional(MethodIdentifiers),
  gasEstimates: Schema.optional(GasEstimates),
});

export type EVMOutput = typeof EVMOutput.Type;

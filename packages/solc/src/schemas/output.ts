/**
 * Complete compiler output schema
 */
import { Schema } from "effect";
import { ABI } from "./abi.js";
import { EVMOutput } from "./bytecode.js";
import { DevDoc, UserDoc } from "./documentation.js";
import { ErrorType, Severity } from "./types.js";

// Source location
export const SourceLocation = Schema.Struct({
  file: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
});

export type SourceLocation = typeof SourceLocation.Type;

// Secondary source location
export const SecondarySourceLocation = Schema.Struct({
  file: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
  message: Schema.String,
});

export type SecondarySourceLocation = typeof SecondarySourceLocation.Type;

// Compiler error/warning
export const CompilerError = Schema.Struct({
  sourceLocation: Schema.optional(SourceLocation),
  secondarySourceLocations: Schema.optional(
    Schema.Array(SecondarySourceLocation),
  ),
  type: ErrorType,
  component: Schema.String,
  severity: Severity,
  errorCode: Schema.optional(Schema.String),
  message: Schema.String,
  formattedMessage: Schema.optional(Schema.String),
});

export type CompilerError = typeof CompilerError.Type;

// Auxiliary input requested (SMT queries)
export const AuxiliaryInputRequested = Schema.Struct({
  smtlib2queries: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.String,
    }),
  ),
});

export type AuxiliaryInputRequested = typeof AuxiliaryInputRequested.Type;

// Source output
export const SourceOutput = Schema.Struct({
  id: Schema.Number,
  ast: Schema.optional(Schema.Unknown),
});

export type SourceOutput = typeof SourceOutput.Type;

// Storage layout entry
export const StorageLayoutEntry = Schema.Struct({
  astId: Schema.Number,
  contract: Schema.String,
  label: Schema.String,
  offset: Schema.Number,
  slot: Schema.String,
  type: Schema.String,
});

export type StorageLayoutEntry = typeof StorageLayoutEntry.Type;

// Storage layout type (recursive definition for struct members)
const StorageLayoutTypeBase = Schema.Struct({
  encoding: Schema.String,
  label: Schema.String,
  numberOfBytes: Schema.String,
  base: Schema.optional(Schema.String),
  key: Schema.optional(Schema.String),
  value: Schema.optional(Schema.String),
});

export interface StorageLayoutType
  extends Schema.Schema.Type<typeof StorageLayoutTypeBase> {
  readonly members: ReadonlyArray<StorageLayoutEntry> | undefined;
}

export const StorageLayoutType = Schema.Struct({
  ...StorageLayoutTypeBase.fields,
  members: Schema.optional(
    Schema.Array(Schema.suspend(() => StorageLayoutEntry)),
  ),
});

// Storage layout
export const StorageLayout = Schema.Struct({
  storage: Schema.Array(StorageLayoutEntry),
  types: Schema.NullOr(
    Schema.Record({
      key: Schema.String,
      value: StorageLayoutType,
    }),
  ),
});

export type StorageLayout = typeof StorageLayout.Type;

// Contract output
export const ContractOutput = Schema.Struct({
  abi: Schema.optional(ABI),
  metadata: Schema.optional(Schema.String),
  userdoc: Schema.optional(UserDoc),
  devdoc: Schema.optional(DevDoc),
  ir: Schema.optional(Schema.String),
  irAst: Schema.optional(Schema.Unknown), // Complex Yul AST structure
  irOptimized: Schema.optional(Schema.String),
  irOptimizedAst: Schema.optional(Schema.Unknown), // Complex Yul AST structure
  yulCFGJson: Schema.optional(Schema.Unknown), // Control Flow Graph JSON
  storageLayout: Schema.optional(StorageLayout),
  transientStorageLayout: Schema.optional(StorageLayout),
  evm: Schema.optional(EVMOutput),
});

export type ContractOutput = typeof ContractOutput.Type;

// Contracts output: source file -> contract name -> contract data
export const ContractsOutput = Schema.Record({
  key: Schema.String,
  value: Schema.Record({
    key: Schema.String,
    value: ContractOutput,
  }),
});

export type ContractsOutput = typeof ContractsOutput.Type;

// Sources output: source name -> source data
export const SourcesOutput = Schema.Record({
  key: Schema.String,
  value: SourceOutput,
});

export type SourcesOutput = typeof SourcesOutput.Type;

// Complete compiler output
export const CompilerOutput = Schema.Struct({
  errors: Schema.optional(Schema.Array(CompilerError)),
  auxiliaryInputRequested: Schema.optional(AuxiliaryInputRequested),
  sources: Schema.optional(SourcesOutput),
  contracts: Schema.optional(ContractsOutput),
  ethdebug: Schema.optional(Schema.Unknown),
});

export type CompilerOutput = typeof CompilerOutput.Type;

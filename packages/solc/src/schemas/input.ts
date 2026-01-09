/**
 * Complete compiler input schema
 */
import { Schema } from "effect";
import { ModelCheckerSettings } from "./model-checker.js";
import { OptimizerSettings } from "./optimizer.js";
import {
  DebugInfoComponent,
  EVMVersion,
  HexString,
  MetadataHash,
  RevertStrings,
} from "./types.js";

// Source file for Solidity/Yul - must have content or urls
export const SourceFile = Schema.Struct({
  keccak256: Schema.optional(Schema.String),
  content: Schema.optional(Schema.String),
  urls: Schema.optional(Schema.Array(Schema.String)),
}).pipe(
  Schema.filter(
    (source) => source.content !== undefined || source.urls !== undefined,
    {
      message: () => "source must have either 'content' or 'urls'",
    },
  ),
);

export type SourceFile = typeof SourceFile.Type;

// Sources for Solidity/Yul (must be non-empty, source names must not be empty)
export const SolidityYulSources = Schema.Record({
  key: Schema.String.pipe(Schema.minLength(1)),
  value: SourceFile,
}).pipe(
  Schema.filter((sources) => Object.keys(sources).length > 0, {
    message: () => "sources must not be empty",
  }),
);

// Source file for SolidityAST - only has ast field
export const SourceFileAST = Schema.Struct({
  ast: Schema.Unknown,
});

export type SourceFileAST = typeof SourceFileAST.Type;

// Sources for SolidityAST (must be non-empty, source names must not be empty)
export const SolidityASTSources = Schema.Record({
  key: Schema.String.pipe(Schema.minLength(1)),
  value: SourceFileAST,
}).pipe(
  Schema.filter((sources) => Object.keys(sources).length > 0, {
    message: () => "sources must not be empty",
  }),
);

// Source file for EVMAssembly - only has assemblyJson
export const SourceFileEVMAssembly = Schema.Struct({
  assemblyJson: Schema.Unknown,
});

export type SourceFileEVMAssembly = typeof SourceFileEVMAssembly.Type;

// Sources for EVMAssembly (exactly one source required, source name must not be empty)
export const EVMAssemblySources = Schema.Record({
  key: Schema.String.pipe(Schema.minLength(1)),
  value: SourceFileEVMAssembly,
}).pipe(
  Schema.filter((sources) => Object.keys(sources).length === 1, {
    message: () => "EVMAssembly requires exactly one source file",
  }),
);

// Auxiliary input for SMT
export const AuxiliaryInput = Schema.Struct({
  smtlib2responses: Schema.optional(
    Schema.Record({
      key: HexString,
      value: Schema.String,
    }),
  ),
});

export type AuxiliaryInput = typeof AuxiliaryInput.Type;

// Debug settings
export const DebugSettings = Schema.Struct({
  revertStrings: Schema.optional(RevertStrings),
  debugInfo: Schema.optional(Schema.Array(DebugInfoComponent)),
});

export type DebugSettings = typeof DebugSettings.Type;

// Metadata settings
export const MetadataSettings = Schema.Struct({
  appendCBOR: Schema.optional(Schema.Boolean),
  useLiteralContent: Schema.optional(Schema.Boolean),
  bytecodeHash: Schema.optional(MetadataHash),
});

export type MetadataSettings = typeof MetadataSettings.Type;

// Libraries map: source file -> library name -> address
export const Libraries = Schema.Record({
  key: Schema.String,
  value: Schema.Record({
    key: Schema.String,
    value: HexString,
  }),
});

export type Libraries = typeof Libraries.Type;

// Output selection: file -> contract -> outputs
export const OutputSelection = Schema.Record({
  key: Schema.String,
  value: Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.String),
  }),
});

export type OutputSelection = typeof OutputSelection.Type;

// Remapping string (must be non-empty and contain "=")
const Remapping = Schema.String.pipe(
  Schema.minLength(1),
  Schema.filter((s) => s.includes("="), {
    message: () => "remapping must contain '=' separator",
  }),
);

// Compiler settings
export const Settings = Schema.Struct({
  stopAfter: Schema.optional(Schema.Literal("parsing")),
  remappings: Schema.optional(Schema.Array(Remapping)),
  optimizer: Schema.optional(OptimizerSettings),
  evmVersion: Schema.optional(EVMVersion),
  eofVersion: Schema.optional(Schema.Literal(1)), // Currently only version 1 is valid
  viaIR: Schema.optional(Schema.Boolean),
  debug: Schema.optional(DebugSettings),
  metadata: Schema.optional(MetadataSettings),
  libraries: Schema.optional(Libraries),
  outputSelection: Schema.optional(OutputSelection),
  modelChecker: Schema.optional(ModelCheckerSettings),
});

export type Settings = typeof Settings.Type;

// Yul sources (exactly one source required, same validation as EVMAssembly)
const YulSources = Schema.Record({
  key: Schema.String.pipe(Schema.minLength(1)),
  value: SourceFile,
}).pipe(
  Schema.filter((sources) => Object.keys(sources).length === 1, {
    message: () => "Yul requires exactly one source file",
  }),
);

// Compiler input for Solidity
const CompilerInputSolidity = Schema.Struct({
  language: Schema.Literal("Solidity"),
  sources: SolidityYulSources,
  auxiliaryInput: Schema.optional(AuxiliaryInput),
  settings: Schema.optional(Settings),
});

// Compiler input for Yul (requires exactly one source)
const CompilerInputYul = Schema.Struct({
  language: Schema.Literal("Yul"),
  sources: YulSources,
  auxiliaryInput: Schema.optional(AuxiliaryInput),
  settings: Schema.optional(Settings),
});

// Compiler input for SolidityAST
const CompilerInputSolidityAST = Schema.Struct({
  language: Schema.Literal("SolidityAST"),
  sources: SolidityASTSources,
  auxiliaryInput: Schema.optional(AuxiliaryInput),
  settings: Schema.optional(Settings),
});

// Compiler input for EVMAssembly
const CompilerInputEVMAssembly = Schema.Struct({
  language: Schema.Literal("EVMAssembly"),
  sources: EVMAssemblySources,
  auxiliaryInput: Schema.optional(AuxiliaryInput),
  settings: Schema.optional(Settings),
});

// Complete compiler input (discriminated union by language)
export const CompilerInput = Schema.Union(
  CompilerInputSolidity,
  CompilerInputYul,
  CompilerInputSolidityAST,
  CompilerInputEVMAssembly,
);

export type CompilerInput = typeof CompilerInput.Type;

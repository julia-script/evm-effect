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

export const SolidityYulSources = Schema.Record({
  key: Schema.String.pipe(Schema.minLength(1)),
  value: SourceFile,
}).pipe(
  Schema.filter((sources) => Object.keys(sources).length > 0, {
    message: () => "sources must not be empty",
  }),
);

export const SourceFileAST = Schema.Struct({
  ast: Schema.Unknown,
});

export type SourceFileAST = typeof SourceFileAST.Type;

export const SolidityASTSources = Schema.Record({
  key: Schema.String.pipe(Schema.minLength(1)),
  value: SourceFileAST,
}).pipe(
  Schema.filter((sources) => Object.keys(sources).length > 0, {
    message: () => "sources must not be empty",
  }),
);

export const SourceFileEVMAssembly = Schema.Struct({
  assemblyJson: Schema.Unknown,
});

export type SourceFileEVMAssembly = typeof SourceFileEVMAssembly.Type;

export const EVMAssemblySources = Schema.Record({
  key: Schema.String.pipe(Schema.minLength(1)),
  value: SourceFileEVMAssembly,
}).pipe(
  Schema.filter((sources) => Object.keys(sources).length === 1, {
    message: () => "EVMAssembly requires exactly one source file",
  }),
);

export const AuxiliaryInput = Schema.Struct({
  smtlib2responses: Schema.optional(
    Schema.Record({
      key: HexString,
      value: Schema.String,
    }),
  ),
});

export type AuxiliaryInput = typeof AuxiliaryInput.Type;

export const DebugSettings = Schema.Struct({
  revertStrings: Schema.optional(RevertStrings),
  debugInfo: Schema.optional(Schema.Array(DebugInfoComponent)),
});

export type DebugSettings = typeof DebugSettings.Type;

export const MetadataSettings = Schema.Struct({
  appendCBOR: Schema.optional(Schema.Boolean),
  useLiteralContent: Schema.optional(Schema.Boolean),
  bytecodeHash: Schema.optional(MetadataHash),
});

export type MetadataSettings = typeof MetadataSettings.Type;

export const Libraries = Schema.Record({
  key: Schema.String,
  value: Schema.Record({
    key: Schema.String,
    value: HexString,
  }),
});

export type Libraries = typeof Libraries.Type;

export const OutputSelection = Schema.Record({
  key: Schema.String,
  value: Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.String),
  }),
});

export type OutputSelection = typeof OutputSelection.Type;

const Remapping = Schema.String.pipe(
  Schema.minLength(1),
  Schema.filter((s) => s.includes("="), {
    message: () => "remapping must contain '=' separator",
  }),
);

export const Settings = Schema.Struct({
  stopAfter: Schema.optional(Schema.Literal("parsing")),
  remappings: Schema.optional(Schema.Array(Remapping)),
  optimizer: Schema.optional(OptimizerSettings),
  evmVersion: Schema.optional(EVMVersion),
  eofVersion: Schema.optional(Schema.Literal(1)),
  viaIR: Schema.optional(Schema.Boolean),
  debug: Schema.optional(DebugSettings),
  metadata: Schema.optional(MetadataSettings),
  libraries: Schema.optional(Libraries),
  outputSelection: Schema.optional(OutputSelection),
  modelChecker: Schema.optional(ModelCheckerSettings),
});

export type Settings = typeof Settings.Type;

const YulSources = Schema.Record({
  key: Schema.String.pipe(Schema.minLength(1)),
  value: SourceFile,
}).pipe(
  Schema.filter((sources) => Object.keys(sources).length === 1, {
    message: () => "Yul requires exactly one source file",
  }),
);

const CompilerInputSolidity = Schema.Struct({
  language: Schema.Literal("Solidity"),
  sources: SolidityYulSources,
  auxiliaryInput: Schema.optional(AuxiliaryInput),
  settings: Schema.optional(Settings),
});

const CompilerInputYul = Schema.Struct({
  language: Schema.Literal("Yul"),
  sources: YulSources,
  auxiliaryInput: Schema.optional(AuxiliaryInput),
  settings: Schema.optional(Settings),
});

const CompilerInputSolidityAST = Schema.Struct({
  language: Schema.Literal("SolidityAST"),
  sources: SolidityASTSources,
  auxiliaryInput: Schema.optional(AuxiliaryInput),
  settings: Schema.optional(Settings),
});

const CompilerInputEVMAssembly = Schema.Struct({
  language: Schema.Literal("EVMAssembly"),
  sources: EVMAssemblySources,
  auxiliaryInput: Schema.optional(AuxiliaryInput),
  settings: Schema.optional(Settings),
});

export const CompilerInput = Schema.Union(
  CompilerInputSolidity,
  CompilerInputYul,
  CompilerInputSolidityAST,
  CompilerInputEVMAssembly,
);

export type CompilerInput = typeof CompilerInput.Type;

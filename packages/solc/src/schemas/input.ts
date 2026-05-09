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
  Schema.check(
    Schema.makeFilter(
      (source) => source.content !== undefined || source.urls !== undefined,
      {
        message: "source must have either 'content' or 'urls'",
      },
    ),
  ),
);

export type SourceFile = typeof SourceFile.Type;

/** Source files map for `language: "Solidity"` (one or more `.sol` inputs), not standalone Yul mode. */
export const SolidityYulSources = Schema.Record(
  Schema.String.pipe(Schema.check(Schema.isMinLength(1))),
  SourceFile,
).pipe(
  Schema.check(
    Schema.makeFilter(
      (sources: Record<string, SourceFile>) => Object.keys(sources).length > 0,
      {
        message: "sources must not be empty",
      },
    ),
  ),
);

export const SourceFileAST = Schema.Struct({
  ast: Schema.Unknown,
});

export type SourceFileAST = typeof SourceFileAST.Type;

export const SolidityASTSources = Schema.Record(
  Schema.String.pipe(Schema.check(Schema.isMinLength(1))),
  SourceFileAST,
).pipe(
  Schema.check(
    Schema.makeFilter(
      (sources: Record<string, SourceFileAST>) =>
        Object.keys(sources).length > 0,
      {
        message: "sources must not be empty",
      },
    ),
  ),
);

export const SourceFileEVMAssembly = Schema.Struct({
  assemblyJson: Schema.Unknown,
});

export type SourceFileEVMAssembly = typeof SourceFileEVMAssembly.Type;

export const EVMAssemblySources = Schema.Record(
  Schema.String.pipe(Schema.check(Schema.isMinLength(1))),
  SourceFileEVMAssembly,
);

export const AuxiliaryInput = Schema.Struct({
  smtlib2responses: Schema.optional(Schema.Record(HexString, Schema.String)),
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

export const Libraries = Schema.Record(
  Schema.String,
  Schema.Record(Schema.String, HexString),
);

export type Libraries = typeof Libraries.Type;

export const OutputSelection = Schema.Record(
  Schema.String,
  Schema.Record(Schema.String, Schema.Array(Schema.String)),
);

export type OutputSelection = typeof OutputSelection.Type;

const Remapping = Schema.String.pipe(
  Schema.check(Schema.isMinLength(1)),
  Schema.check(
    Schema.makeFilter((s: string) => s.includes("="), {
      message: "remapping must contain '=' separator",
    }),
  ),
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

const YulSources = Schema.Record(
  Schema.String.pipe(Schema.check(Schema.isMinLength(1))),
  SourceFile,
).pipe(
  Schema.check(
    Schema.makeFilter(
      (sources: Record<string, SourceFile>) =>
        Object.keys(sources).length === 1,
      {
        message: "Yul requires exactly one source file",
      },
    ),
  ),
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

export const CompilerInput = Schema.Union([
  CompilerInputSolidity,
  CompilerInputYul,
  CompilerInputSolidityAST,
  CompilerInputEVMAssembly,
]);

export type CompilerInput = typeof CompilerInput.Type;
//     ^?

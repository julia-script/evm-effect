/**
 * Common types and enums for Solidity compiler schemas
 */
import { Schema } from "effect";

export const Language = Schema.Literal(
  "Solidity",
  "Yul",
  "SolidityAST",
  "EVMAssembly",
);

export const EVMVersion = Schema.Literal(
  "homestead",
  "tangerineWhistle",
  "spuriousDragon",
  "byzantium",
  "constantinople",
  "petersburg",
  "istanbul",
  "berlin",
  "london",
  "paris",
  "shanghai",
  "cancun",
  "prague",
  "osaka",
);

export const ErrorType = Schema.Literal(
  "JSONError",
  "IOError",
  "ParserError",
  "DocstringParsingError",
  "SyntaxError",
  "DeclarationError",
  "TypeError",
  "UnimplementedFeatureError",
  "InternalCompilerError",
  "Exception",
  "CompilerError",
  "FatalError",
  "YulException",
  "SMTLogicException",
  "Warning",
  "Info",
);

export const Severity = Schema.Literal("error", "warning", "info");

export const RevertStrings = Schema.Literal(
  "default",
  "strip",
  "debug",
  "verboseDebug",
);

export const DebugInfoComponent = Schema.Literal("location", "snippet", "*");

export const MetadataHash = Schema.Literal("ipfs", "bzzr1", "none");

export const ModelCheckerEngine = Schema.Literal("all", "bmc", "chc", "none");

export const ModelCheckerExtCalls = Schema.Literal("trusted", "untrusted");

export const ModelCheckerInvariant = Schema.Literal("contract", "reentrancy");

export const ModelCheckerSolver = Schema.Literal("cvc5", "smtlib2", "z3");

export const ModelCheckerTarget = Schema.Literal(
  "constantCondition",
  "underflow",
  "overflow",
  "divByZero",
  "balance",
  "assert",
  "popEmptyArray",
  "outOfBounds",
);

export const HexString = Schema.String.pipe(
  Schema.pattern(/^(0x)?[0-9a-fA-F]*$/),
);

export const NonEmptyHexString = Schema.String.pipe(
  Schema.pattern(/^(0x)?[0-9a-fA-F]*$/),
);

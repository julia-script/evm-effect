/**
 * Common types and enums for Solidity compiler schemas
 */
import { Schema } from "effect";

// Language types
export const Language = Schema.Literal(
  "Solidity",
  "Yul",
  "SolidityAST",
  "EVMAssembly",
);

// EVM Version enum
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

// Error types from the compiler
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

// Severity levels
export const Severity = Schema.Literal("error", "warning", "info");

// Revert strings settings
export const RevertStrings = Schema.Literal(
  "default",
  "strip",
  "debug",
  "verboseDebug",
);

// Debug info components
export const DebugInfoComponent = Schema.Literal("location", "snippet", "*");

// Metadata hash types
export const MetadataHash = Schema.Literal("ipfs", "bzzr1", "none");

// Model checker engine
export const ModelCheckerEngine = Schema.Literal("all", "bmc", "chc", "none");

// Model checker external calls
export const ModelCheckerExtCalls = Schema.Literal("trusted", "untrusted");

// Model checker invariants
export const ModelCheckerInvariant = Schema.Literal("contract", "reentrancy");

// Model checker solvers
export const ModelCheckerSolver = Schema.Literal("cvc5", "smtlib2", "z3");

// Model checker targets
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

// Hex string schema (for addresses, bytecode, etc.)
export const HexString = Schema.String.pipe(
  Schema.pattern(/^(0x)?[0-9a-fA-F]*$/),
);

// Non-empty hex string
export const NonEmptyHexString = Schema.String.pipe(
  Schema.pattern(/^(0x)?[0-9a-fA-F]*$/),
);

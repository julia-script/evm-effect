/**
 * Common types and enums for Solidity compiler schemas
 */
import { Schema } from "effect";
import { isPattern } from "effect/Schema";

export const Language = Schema.Union([
  Schema.Literal("Solidity"),
  Schema.Literal("Yul"),
  Schema.Literal("SolidityAST"),
  Schema.Literal("EVMAssembly"),
]);

export const EVMVersion = Schema.Union([
  Schema.Literal("homestead"),
  Schema.Literal("tangerineWhistle"),
  Schema.Literal("spuriousDragon"),
  Schema.Literal("byzantium"),
  Schema.Literal("constantinople"),
  Schema.Literal("petersburg"),
  Schema.Literal("istanbul"),
  Schema.Literal("berlin"),
  Schema.Literal("london"),
  Schema.Literal("paris"),
  Schema.Literal("shanghai"),
  Schema.Literal("cancun"),
  Schema.Literal("prague"),
  Schema.Literal("osaka"),
]);

export const ErrorType = Schema.Union([
  Schema.Literal("JSONError"),
  Schema.Literal("IOError"),
  Schema.Literal("ParserError"),
  Schema.Literal("DocstringParsingError"),
  Schema.Literal("SyntaxError"),
  Schema.Literal("DeclarationError"),
  Schema.Literal("TypeError"),
  Schema.Literal("UnimplementedFeatureError"),
  Schema.Literal("InternalCompilerError"),
  Schema.Literal("Exception"),
  Schema.Literal("CompilerError"),
  Schema.Literal("FatalError"),
  Schema.Literal("YulException"),
  Schema.Literal("SMTLogicException"),
  Schema.Literal("Warning"),
  Schema.Literal("Info"),
]);

export const Severity = Schema.Union([
  Schema.Literal("error"),
  Schema.Literal("warning"),
  Schema.Literal("info"),
]);

export const RevertStrings = Schema.Union([
  Schema.Literal("default"),
  Schema.Literal("strip"),
  Schema.Literal("debug"),
  Schema.Literal("verboseDebug"),
]);

export const DebugInfoComponent = Schema.Union([
  Schema.Literal("location"),
  Schema.Literal("snippet"),
  Schema.Literal("*"),
]);

export const MetadataHash = Schema.Union([
  Schema.Literal("ipfs"),
  Schema.Literal("bzzr1"),
  Schema.Literal("none"),
]);

export const ModelCheckerEngine = Schema.Union([
  Schema.Literal("all"),
  Schema.Literal("bmc"),
  Schema.Literal("chc"),
  Schema.Literal("none"),
]);

export const ModelCheckerExtCalls = Schema.Union([
  Schema.Literal("trusted"),
  Schema.Literal("untrusted"),
]);

export const ModelCheckerInvariant = Schema.Union([
  Schema.Literal("contract"),
  Schema.Literal("reentrancy"),
]);

export const ModelCheckerSolver = Schema.Union([
  Schema.Literal("cvc5"),
  Schema.Literal("smtlib2"),
  Schema.Literal("z3"),
]);

export const ModelCheckerTarget = Schema.Union([
  Schema.Literal("constantCondition"),
  Schema.Literal("underflow"),
  Schema.Literal("overflow"),
  Schema.Literal("divByZero"),
  Schema.Literal("balance"),
  Schema.Literal("assert"),
  Schema.Literal("popEmptyArray"),
  Schema.Literal("outOfBounds"),
]);

export const HexString = Schema.String.pipe(
  Schema.check(isPattern(/^(0x)?[0-9a-fA-F]*$/)),
);

export const NonEmptyHexString = Schema.String.pipe(
  Schema.check(isPattern(/^(0x)?[0-9a-fA-F]*$/)),
);

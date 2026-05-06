/**
 * Yul JSON AST (libyul `AsmJsonConverter` / `AsmJsonImporter`, `Object::toJson`).
 * Used for `contracts.*.*.irAst`, `irOptimizedAst`, and Solidity `InlineAssembly.AST` (root `YulBlock`).
 */
import { Schema } from "effect";

/** Wide node type for recursive Yul asm JSON (`src` / `nativeSrc` only on asm nodes). */
export interface YulJsonNode {
  readonly nodeType: string;
  readonly src?: string | undefined;
  readonly nativeSrc?: string | undefined;
  readonly statements?: ReadonlyArray<YulJsonNode> | undefined;
  readonly body?: YulJsonNode | undefined;
  readonly expression?: YulJsonNode | undefined;
  readonly name?: string | undefined;
  readonly [key: string]: unknown;
}

const yulExpr = (): Schema.Schema<YulJsonNode> =>
  Schema.suspend(() => YulExpressionSchema);

const yulStmt = (): Schema.Schema<YulJsonNode> =>
  Schema.suspend(() => YulStatementSchema);

const YulLiteral = Schema.Struct({
  nodeType: Schema.Literal("YulLiteral"),
  src: Schema.String,
  nativeSrc: Schema.String,
  kind: Schema.Literal("number", "bool", "string"),
  type: Schema.optional(Schema.String),
  value: Schema.optional(Schema.String),
  hexValue: Schema.optional(Schema.String),
});

const YulIdentifier = Schema.Struct({
  nodeType: Schema.Literal("YulIdentifier"),
  src: Schema.String,
  nativeSrc: Schema.String,
  name: Schema.String,
});

const YulFunctionCall = Schema.Struct({
  nodeType: Schema.Literal("YulFunctionCall"),
  src: Schema.String,
  nativeSrc: Schema.String,
  functionName: YulIdentifier,
  arguments: Schema.Array(yulExpr()),
});

const YulExpressionCatchall = Schema.Struct({
  nodeType: Schema.String,
  src: Schema.optional(Schema.String),
  nativeSrc: Schema.optional(Schema.String),
});

export const YulExpressionSchema: Schema.Schema<YulJsonNode> = Schema.suspend(
  () =>
    Schema.Union(
      YulLiteral,
      YulIdentifier,
      YulFunctionCall,
      YulExpressionCatchall,
    ),
);

const YulTypedName = Schema.Struct({
  nodeType: Schema.Literal("YulTypedName"),
  src: Schema.String,
  nativeSrc: Schema.String,
  name: Schema.String,
  type: Schema.String,
});

const YulBlock = Schema.Struct({
  nodeType: Schema.Literal("YulBlock"),
  src: Schema.String,
  nativeSrc: Schema.String,
  statements: Schema.Array(yulStmt()),
});

const YulExpressionStatement = Schema.Struct({
  nodeType: Schema.Literal("YulExpressionStatement"),
  src: Schema.String,
  nativeSrc: Schema.String,
  expression: yulExpr(),
});

const YulAssignment = Schema.Struct({
  nodeType: Schema.Literal("YulAssignment"),
  src: Schema.String,
  nativeSrc: Schema.String,
  variableNames: Schema.Array(YulIdentifier),
  value: Schema.NullOr(yulExpr()),
});

const YulVariableDeclaration = Schema.Struct({
  nodeType: Schema.Literal("YulVariableDeclaration"),
  src: Schema.String,
  nativeSrc: Schema.String,
  variables: Schema.Array(YulTypedName),
  value: Schema.optional(yulExpr()),
});

const YulFunctionDefinition = Schema.Struct({
  nodeType: Schema.Literal("YulFunctionDefinition"),
  src: Schema.String,
  nativeSrc: Schema.String,
  name: Schema.String,
  parameters: Schema.optionalWith(Schema.Array(YulTypedName), {
    default: () => [],
  }),
  returnVariables: Schema.optional(Schema.Array(YulTypedName)),
  body: YulBlock,
});

const YulIf = Schema.Struct({
  nodeType: Schema.Literal("YulIf"),
  src: Schema.String,
  nativeSrc: Schema.String,
  condition: yulExpr(),
  body: YulBlock,
});

const YulCase = Schema.Struct({
  nodeType: Schema.Literal("YulCase"),
  src: Schema.String,
  nativeSrc: Schema.String,
  value: Schema.Union(Schema.Literal("default"), YulLiteral),
  body: YulBlock,
});

const YulSwitch = Schema.Struct({
  nodeType: Schema.Literal("YulSwitch"),
  src: Schema.String,
  nativeSrc: Schema.String,
  expression: yulExpr(),
  cases: Schema.Array(YulCase),
});

const YulForLoop = Schema.Struct({
  nodeType: Schema.Literal("YulForLoop"),
  src: Schema.String,
  nativeSrc: Schema.String,
  pre: YulBlock,
  condition: yulExpr(),
  post: YulBlock,
  body: YulBlock,
});

const YulBreak = Schema.Struct({
  nodeType: Schema.Literal("YulBreak"),
  src: Schema.String,
  nativeSrc: Schema.String,
});

const YulContinue = Schema.Struct({
  nodeType: Schema.Literal("YulContinue"),
  src: Schema.String,
  nativeSrc: Schema.String,
});

const YulLeave = Schema.Struct({
  nodeType: Schema.Literal("YulLeave"),
  src: Schema.String,
  nativeSrc: Schema.String,
});

const YulStatementCatchall = Schema.Struct({
  nodeType: Schema.String,
  src: Schema.optional(Schema.String),
  nativeSrc: Schema.optional(Schema.String),
});

export const YulStatementSchema: Schema.Schema<YulJsonNode> = Schema.suspend(
  () =>
    Schema.Union(
      YulBlock,
      YulExpressionStatement,
      YulAssignment,
      YulVariableDeclaration,
      YulFunctionDefinition,
      YulIf,
      YulSwitch,
      YulForLoop,
      YulBreak,
      YulContinue,
      YulLeave,
      YulStatementCatchall,
    ),
);

/** Root of `InlineAssembly.AST` in Solidity JSON. */
export const YulInlineAssemblyAst = YulBlock;

export type YulInlineAssemblyAst = typeof YulInlineAssemblyAst.Type;

/** Hex data sub-object in `YulObject.subObjects`. */
export const YulData = Schema.Struct({
  nodeType: Schema.Literal("YulData"),
  value: Schema.String,
});

export type YulData = typeof YulData.Type;

export const YulCode = Schema.Struct({
  nodeType: Schema.Literal("YulCode"),
  block: YulBlock,
});

export type YulCode = typeof YulCode.Type;

// Self-referential `subObjects`; cast aligns `Schema` with wide `YulJsonNode` under exactOptionalPropertyTypes.
export const YulObjectSchema = Schema.Struct({
  nodeType: Schema.Literal("YulObject"),
  name: Schema.String,
  code: YulCode,
  subObjects: Schema.Array(
    Schema.suspend(() => Schema.Union(YulObjectSchema, YulData)),
  ),
}) as unknown as Schema.Schema<YulJsonNode>;

export type YulObject = typeof YulObjectSchema.Type;

/** `irAst` / `irOptimizedAst`: Yul object tree, or `{}` when absent. */
export const YulIrAst = Schema.Union(YulObjectSchema, Schema.Struct({}));

export type YulIrAst = typeof YulIrAst.Type;

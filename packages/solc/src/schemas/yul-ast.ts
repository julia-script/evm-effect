/**
 * Yul JSON AST (libyul `AsmJsonConverter` / `AsmJsonImporter`, `Object::toJson`).
 * Used for `contracts.*.*.irAst`, `irOptimizedAst`, and Solidity `InlineAssembly.AST` (root `YulBlock`).
 */
import { Schema } from "effect";

export const yulExpr = Schema.suspend(
  (): Schema.Schema<YulExpressionEncoded> => YulExpressionSchema,
);

export const yulStmt = Schema.suspend(
  (): Schema.Schema<YulStatementEncoded> => YulStatementSchema,
);

export interface YulLiteralEncoded {
  nodeType: "YulLiteral";
  src: string;
  nativeSrc: string;
  kind: "number" | "bool" | "string";
  type?: string | undefined;
  value?: string | undefined;
  hexValue?: string | undefined;
}
export const YulLiteral = Schema.Struct({
  nodeType: Schema.Literal("YulLiteral"),
  src: Schema.String,
  nativeSrc: Schema.String,
  kind: Schema.Literal("number", "bool", "string"),
  type: Schema.optional(Schema.String),
  value: Schema.optional(Schema.String),
  hexValue: Schema.optional(Schema.String),
});

export interface YulIdentifierEncoded {
  nodeType: "YulIdentifier";
  src: string;
  nativeSrc: string;
  name: string;
}
export const YulIdentifier = Schema.Struct({
  nodeType: Schema.Literal("YulIdentifier"),
  src: Schema.String,
  nativeSrc: Schema.String,
  name: Schema.String,
});

export interface YulFunctionCallEncoded {
  nodeType: "YulFunctionCall";
  src: string;
  nativeSrc: string;
  functionName: YulIdentifierEncoded;
  arguments: readonly YulExpressionEncoded[];
}
export const YulFunctionCall = Schema.Struct({
  nodeType: Schema.Literal("YulFunctionCall"),
  src: Schema.String,
  nativeSrc: Schema.String,
  functionName: YulIdentifier,
  arguments: Schema.Array(yulExpr),
});

export type YulExpressionEncoded =
  | YulLiteralEncoded
  | YulIdentifierEncoded
  | YulFunctionCallEncoded;
export const YulExpressionSchema = Schema.Union(
  YulLiteral,
  YulIdentifier,
  YulFunctionCall,
);

export interface YulTypedNameEncoded {
  nodeType: "YulTypedName";
  src: string;
  nativeSrc: string;
  name: string;
  type: string;
}
export const YulTypedName = Schema.Struct({
  nodeType: Schema.Literal("YulTypedName"),
  src: Schema.String,
  nativeSrc: Schema.String,
  name: Schema.String,
  type: Schema.String,
});

export interface YulBlockEncoded {
  nodeType: "YulBlock";
  src: string;
  nativeSrc: string;
  statements: readonly YulStatementEncoded[];
}

export const YulBlock = Schema.Struct({
  nodeType: Schema.Literal("YulBlock"),
  src: Schema.String,
  nativeSrc: Schema.String,
  statements: Schema.Array(yulStmt),
});

export interface YulExpressionStatementEncoded {
  nodeType: "YulExpressionStatement";
  src: string;
  nativeSrc: string;
  expression: YulExpressionEncoded;
}
export const YulExpressionStatement = Schema.Struct({
  nodeType: Schema.Literal("YulExpressionStatement"),
  src: Schema.String,
  nativeSrc: Schema.String,
  expression: yulExpr,
});

export interface YulAssignmentEncoded {
  nodeType: "YulAssignment";
  src: string;
  nativeSrc: string;
  variableNames: readonly YulIdentifierEncoded[];
  value: YulExpressionEncoded | null;
}
export const YulAssignment = Schema.Struct({
  nodeType: Schema.Literal("YulAssignment"),
  src: Schema.String,
  nativeSrc: Schema.String,
  variableNames: Schema.Array(YulIdentifier),
  value: Schema.NullOr(yulExpr),
});

export interface YulVariableDeclarationEncoded {
  nodeType: "YulVariableDeclaration";
  src: string;
  nativeSrc: string;
  variables: readonly YulTypedNameEncoded[];
  value?: YulExpressionEncoded | undefined;
}
export const YulVariableDeclaration = Schema.Struct({
  nodeType: Schema.Literal("YulVariableDeclaration"),
  src: Schema.String,
  nativeSrc: Schema.String,
  variables: Schema.Array(YulTypedName),
  value: Schema.optional(yulExpr),
});

export interface YulFunctionDefinitionEncoded {
  nodeType: "YulFunctionDefinition";
  src: string;
  nativeSrc: string;
  name: string;
  parameters?: readonly YulTypedNameEncoded[] | undefined;
  returnVariables?: readonly YulTypedNameEncoded[] | undefined;
  body: YulBlockEncoded;
}
export const YulFunctionDefinition = Schema.Struct({
  nodeType: Schema.Literal("YulFunctionDefinition"),
  src: Schema.String,
  nativeSrc: Schema.String,
  name: Schema.String,
  parameters: Schema.optional(Schema.Array(YulTypedName)),
  returnVariables: Schema.optional(Schema.Array(YulTypedName)),
  body: YulBlock,
});

export interface YulIfEncoded {
  nodeType: "YulIf";
  src: string;
  nativeSrc: string;
  condition: YulExpressionEncoded;
  body: YulBlockEncoded;
}

export const YulIf = Schema.Struct({
  nodeType: Schema.Literal("YulIf"),
  src: Schema.String,
  nativeSrc: Schema.String,
  condition: yulExpr,
  body: YulBlock,
});

export interface YulCaseEncoded {
  nodeType: "YulCase";
  src: string;
  nativeSrc: string;
  value: YulLiteralEncoded | "default";
  body: YulBlockEncoded;
}

export const YulCase = Schema.Struct({
  nodeType: Schema.Literal("YulCase"),
  src: Schema.String,
  nativeSrc: Schema.String,
  value: Schema.Union(Schema.Literal("default"), YulLiteral),
  body: YulBlock,
});

export interface YulSwitchEncoded {
  nodeType: "YulSwitch";
  src: string;
  nativeSrc: string;
  expression: YulExpressionEncoded;
  cases: readonly YulCaseEncoded[];
}
export const YulSwitch = Schema.Struct({
  nodeType: Schema.Literal("YulSwitch"),
  src: Schema.String,
  nativeSrc: Schema.String,
  expression: yulExpr,
  cases: Schema.Array(YulCase),
});

export interface YulForLoopEncoded {
  nodeType: "YulForLoop";
  src: string;
  nativeSrc: string;
  pre: YulBlockEncoded;
  condition: YulExpressionEncoded;
  post: YulBlockEncoded;
  body: YulBlockEncoded;
}
export const YulForLoop = Schema.Struct({
  nodeType: Schema.Literal("YulForLoop"),
  src: Schema.String,
  nativeSrc: Schema.String,
  pre: YulBlock,
  condition: yulExpr,
  post: YulBlock,
  body: YulBlock,
});

export interface YulBreakEncoded {
  nodeType: "YulBreak";
  src: string;
  nativeSrc: string;
}
export const YulBreak = Schema.Struct({
  nodeType: Schema.Literal("YulBreak"),
  src: Schema.String,
  nativeSrc: Schema.String,
});

export interface YulContinueEncoded {
  nodeType: "YulContinue";
  src: string;
  nativeSrc: string;
}
export const YulContinue = Schema.Struct({
  nodeType: Schema.Literal("YulContinue"),
  src: Schema.String,
  nativeSrc: Schema.String,
});

export interface YulLeaveEncoded {
  nodeType: "YulLeave";
  src: string;
  nativeSrc: string;
}
export const YulLeave = Schema.Struct({
  nodeType: Schema.Literal("YulLeave"),
  src: Schema.String,
  nativeSrc: Schema.String,
});

// export interface YulStatementCatchallEncoded {
//   nodeType: string;
//   src?: string | undefined;
//   nativeSrc?: string | undefined;
// }
// export const YulStatementCatchall = Schema.Struct({
//   nodeType: Schema.String,
//   src: Schema.optional(Schema.String),
//   nativeSrc: Schema.optional(Schema.String),
// });

export type YulStatementEncoded =
  | YulBlockEncoded
  | YulExpressionStatementEncoded
  | YulAssignmentEncoded
  | YulVariableDeclarationEncoded
  | YulFunctionDefinitionEncoded
  | YulIfEncoded
  | YulSwitchEncoded
  | YulForLoopEncoded
  | YulBreakEncoded
  | YulContinueEncoded
  | YulLeaveEncoded;
// | YulStatementCatchallEncoded;

export const YulStatementSchema = Schema.Union(
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
);

export interface YulDataEncoded {
  nodeType: "YulData";
  value: string;
}
export const YulData = Schema.Struct({
  nodeType: Schema.Literal("YulData"),
  value: Schema.String,
});

export const YulCode = Schema.Struct({
  nodeType: Schema.Literal("YulCode"),
  block: YulBlock,
});
export interface YulCodeEncoded {
  nodeType: "YulCode";
  block: YulBlockEncoded;
}

// Self-referential `subObjects`; cast aligns `Schema` with wide `YulJsonNode` under exactOptionalPropertyTypes.
export interface YulObjectEncoded {
  nodeType: "YulObject";
  name: string;
  code: YulCodeEncoded;
  subObjects: readonly (YulObjectEncoded | YulDataEncoded)[];
}
export const YulObjectSchema = Schema.Struct({
  nodeType: Schema.Literal("YulObject"),
  name: Schema.String,
  code: YulCode,
  subObjects: Schema.Array(
    Schema.suspend(
      (): Schema.Schema<YulObjectEncoded | YulDataEncoded> =>
        Schema.Union(YulObjectSchema, YulData),
    ),
  ),
});

export type YulObject = typeof YulObjectSchema.Type;

export type YulNode = YulExpressionEncoded | YulStatementEncoded;

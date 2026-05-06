/**
 * Solidity compiler JSON AST schemas (standard JSON-IO `sources[file].ast`).
 * Node kinds align with `libsolidity/ast/ASTJsonImporter.cpp`.
 */
import { Schema } from "effect";
import { StateMutability } from "./abi.js";
import { YulInlineAssemblyAst, type YulJsonNode } from "./yul-ast.js";

/**
 * Recursive Solidity JSON AST node (`nodeType` discriminates variants).
 * Intentionally wide so recursive `Schema.suspend` typings resolve.
 */
export interface AstNode {
  readonly id: number;
  readonly src: string;
  readonly nodeType: string;
  /** Present on contracts, source units, etc. */
  readonly nodes?: ReadonlyArray<AstNode> | undefined;
  /** Present on blocks, unchecked blocks. */
  readonly statements?: ReadonlyArray<AstNode> | undefined;
  readonly name?: string | undefined;
  readonly body?: AstNode | undefined;
  /** Yul block JSON on `InlineAssembly` nodes */
  readonly AST?: YulJsonNode | undefined;
  readonly [key: string]: unknown;
}

/** `typeDescriptions` on many expression/type nodes */
export const TypeDescriptions = Schema.Struct({
  typeIdentifier: Schema.String,
  typeString: Schema.String,
});

export type TypeDescriptions = typeof TypeDescriptions.Type;

const OptionalDoc = Schema.optional(
  Schema.Union(
    Schema.String,
    Schema.suspend(() => AstNodeSchema),
  ),
);

const ast = (): Schema.Schema<AstNode> => Schema.suspend(() => AstNodeSchema);

const Visibility = Schema.Literal(
  "default",
  "private",
  "internal",
  "public",
  "external",
);

const VariableMutability = Schema.Literal("constant", "mutable", "immutable");

const ContractKind = Schema.Literal("interface", "contract", "library");

const FunctionKind = Schema.Literal(
  "constructor",
  "function",
  "fallback",
  "receive",
  "freeFunction",
);

const LiteralKind = Schema.Literal(
  "number",
  "string",
  "unicodeString",
  "hexString",
  "bool",
);

const StorageLocation = Schema.Literal(
  "default",
  "storage",
  "memory",
  "calldata",
  "transient",
);

// --- Declarations & directive nodes ---

const PragmaDirective = Schema.Struct({
  nodeType: Schema.Literal("PragmaDirective"),
  id: Schema.Number,
  src: Schema.String,
  literals: Schema.Array(Schema.String),
});

const ImportSymbolAlias = Schema.Struct({
  foreign: ast(),
  local: Schema.NullOr(Schema.String),
});

const ImportDirective = Schema.Struct({
  nodeType: Schema.Literal("ImportDirective"),
  id: Schema.Number,
  src: Schema.String,
  file: Schema.String,
  unitAlias: Schema.optional(Schema.String),
  nameLocation: Schema.String,
  absolutePath: Schema.String,
  symbolAliases: Schema.Array(ImportSymbolAlias),
});

const ContractDefinition = Schema.Struct({
  nodeType: Schema.Literal("ContractDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: OptionalDoc,
  contractKind: ContractKind,
  abstract: Schema.Boolean,
  baseContracts: Schema.Array(ast()),
  nodes: Schema.Array(ast()),
  storageLayout: Schema.optional(ast()),
  // Compiler output metadata (optional on import)
  canonicalName: Schema.optional(Schema.String),
  fullyImplemented: Schema.optional(Schema.Boolean),
  linearizedBaseContracts: Schema.optional(Schema.Array(Schema.Number)),
  scope: Schema.optional(Schema.Number),
  usedErrors: Schema.optional(Schema.Array(Schema.Number)),
  usedEvents: Schema.optional(Schema.Array(Schema.Number)),
  contractDependencies: Schema.optional(Schema.Array(Schema.Number)),
});

const IdentifierPath = Schema.Struct({
  nodeType: Schema.Literal("IdentifierPath"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocations: Schema.optional(Schema.Array(Schema.String)),
});

const InheritanceSpecifier = Schema.Struct({
  nodeType: Schema.Literal("InheritanceSpecifier"),
  id: Schema.Number,
  src: Schema.String,
  baseName: ast(),
  arguments: Schema.NullOr(Schema.Array(ast())),
});

const UsingForFunctionListEntry = Schema.Struct({
  function: Schema.optional(ast()),
  operator: Schema.optional(Schema.String),
  definition: Schema.optional(ast()),
});

const UsingForDirective = Schema.Struct({
  nodeType: Schema.Literal("UsingForDirective"),
  id: Schema.Number,
  src: Schema.String,
  global: Schema.Boolean,
  libraryName: Schema.optional(ast()),
  functionList: Schema.optional(Schema.Array(UsingForFunctionListEntry)),
  typeName: Schema.optional(ast()),
});

const StructDefinition = Schema.Struct({
  nodeType: Schema.Literal("StructDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: OptionalDoc,
  members: Schema.Array(ast()),
  canonicalName: Schema.optional(Schema.String),
  scope: Schema.optional(Schema.Number),
  visibility: Schema.optional(Visibility),
});

const EnumDefinition = Schema.Struct({
  nodeType: Schema.Literal("EnumDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: OptionalDoc,
  members: Schema.Array(ast()),
  canonicalName: Schema.optional(Schema.String),
});

const EnumValue = Schema.Struct({
  nodeType: Schema.Literal("EnumValue"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  documentation: OptionalDoc,
});

const UserDefinedValueTypeDefinition = Schema.Struct({
  nodeType: Schema.Literal("UserDefinedValueTypeDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  underlyingType: ast(),
  canonicalName: Schema.optional(Schema.String),
});

const ParameterList = Schema.Struct({
  nodeType: Schema.Literal("ParameterList"),
  id: Schema.Number,
  src: Schema.String,
  parameters: Schema.Array(ast()),
});

const OverrideSpecifier = Schema.Struct({
  nodeType: Schema.Literal("OverrideSpecifier"),
  id: Schema.Number,
  src: Schema.String,
  overrides: Schema.Array(ast()),
});

const FunctionDefinition = Schema.Struct({
  nodeType: Schema.Literal("FunctionDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: OptionalDoc,
  kind: FunctionKind,
  virtual: Schema.Boolean,
  implemented: Schema.Boolean,
  visibility: Visibility,
  stateMutability: StateMutability,
  parameters: ast(),
  returnParameters: ast(),
  modifiers: Schema.Array(ast()),
  overrides: Schema.optional(ast()),
  body: Schema.optional(ast()),
  scope: Schema.optional(Schema.Number),
  functionSelector: Schema.optional(Schema.String),
});

const VariableDeclaration = Schema.Struct({
  nodeType: Schema.Literal("VariableDeclaration"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: OptionalDoc,
  typeName: Schema.optional(ast()),
  mutability: VariableMutability,
  constant: Schema.Boolean,
  stateVariable: Schema.optional(Schema.Boolean),
  visibility: Visibility,
  storageLocation: StorageLocation,
  overrides: Schema.optional(ast()),
  value: Schema.optional(ast()),
  indexed: Schema.optional(Schema.Boolean),
  scope: Schema.optional(Schema.Number),
  functionSelector: Schema.optional(Schema.String),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

const ModifierDefinition = Schema.Struct({
  nodeType: Schema.Literal("ModifierDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: OptionalDoc,
  virtual: Schema.Boolean,
  parameters: ast(),
  overrides: Schema.optional(ast()),
  body: Schema.optional(ast()),
});

const ModifierInvocation = Schema.Struct({
  nodeType: Schema.Literal("ModifierInvocation"),
  id: Schema.Number,
  src: Schema.String,
  modifierName: ast(),
  arguments: Schema.NullOr(Schema.Array(ast())),
});

const EventDefinition = Schema.Struct({
  nodeType: Schema.Literal("EventDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: OptionalDoc,
  parameters: ast(),
  anonymous: Schema.Boolean,
});

const ErrorDefinition = Schema.Struct({
  nodeType: Schema.Literal("ErrorDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: OptionalDoc,
  parameters: ast(),
});

// --- Type name nodes ---

const ElementaryTypeName = Schema.Struct({
  nodeType: Schema.Literal("ElementaryTypeName"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  typeDescriptions: Schema.optional(TypeDescriptions),
  stateMutability: Schema.optional(StateMutability),
});

const UserDefinedTypeName = Schema.Struct({
  nodeType: Schema.Literal("UserDefinedTypeName"),
  id: Schema.Number,
  src: Schema.String,
  pathNode: ast(),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

const FunctionTypeName = Schema.Struct({
  nodeType: Schema.Literal("FunctionTypeName"),
  id: Schema.Number,
  src: Schema.String,
  parameterTypes: ast(),
  returnParameterTypes: ast(),
  visibility: Visibility,
  stateMutability: StateMutability,
});

const Mapping = Schema.Struct({
  nodeType: Schema.Literal("Mapping"),
  id: Schema.Number,
  src: Schema.String,
  keyType: ast(),
  keyName: Schema.String,
  keyNameLocation: Schema.String,
  valueType: ast(),
  valueName: Schema.String,
  valueNameLocation: Schema.String,
});

const ArrayTypeName = Schema.Struct({
  nodeType: Schema.Literal("ArrayTypeName"),
  id: Schema.Number,
  src: Schema.String,
  baseType: ast(),
  length: Schema.optional(ast()),
});

// --- Statements ---

const Block = Schema.Struct({
  nodeType: Schema.Literal("Block"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  statements: Schema.Array(ast()),
});

const UncheckedBlock = Schema.Struct({
  nodeType: Schema.Literal("UncheckedBlock"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  statements: Schema.Array(ast()),
});

const PlaceholderStatement = Schema.Struct({
  nodeType: Schema.Literal("PlaceholderStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
});

const IfStatement = Schema.Struct({
  nodeType: Schema.Literal("IfStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  condition: ast(),
  trueBody: ast(),
  falseBody: Schema.optional(ast()),
});

const TryCatchClause = Schema.Struct({
  nodeType: Schema.Literal("TryCatchClause"),
  id: Schema.Number,
  src: Schema.String,
  errorName: Schema.String,
  parameters: Schema.optional(ast()),
  block: ast(),
});

const TryStatement = Schema.Struct({
  nodeType: Schema.Literal("TryStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  externalCall: ast(),
  clauses: Schema.Array(ast()),
});

const WhileStatement = Schema.Struct({
  nodeType: Schema.Literal("WhileStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  condition: ast(),
  body: ast(),
});

const DoWhileStatement = Schema.Struct({
  nodeType: Schema.Literal("DoWhileStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  condition: ast(),
  body: ast(),
});

const ForStatement = Schema.Struct({
  nodeType: Schema.Literal("ForStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  initializationExpression: Schema.optional(ast()),
  condition: Schema.optional(ast()),
  loopExpression: Schema.optional(ast()),
  body: ast(),
});

const Continue = Schema.Struct({
  nodeType: Schema.Literal("Continue"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
});

const Break = Schema.Struct({
  nodeType: Schema.Literal("Break"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
});

const Return = Schema.Struct({
  nodeType: Schema.Literal("Return"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  expression: Schema.optional(ast()),
  functionReturnParameters: Schema.optional(Schema.Number),
});

const EmitStatement = Schema.Struct({
  nodeType: Schema.Literal("EmitStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  eventCall: ast(),
});

const RevertStatement = Schema.Struct({
  nodeType: Schema.Literal("RevertStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  errorCall: ast(),
});

const Throw = Schema.Struct({
  nodeType: Schema.Literal("Throw"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
});

const VariableDeclarationStatement = Schema.Struct({
  nodeType: Schema.Literal("VariableDeclarationStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  declarations: Schema.Array(Schema.NullOr(ast())),
  initialValue: Schema.optional(ast()),
});

const ExpressionStatement = Schema.Struct({
  nodeType: Schema.Literal("ExpressionStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  expression: ast(),
});

// --- Expressions ---

const Conditional = Schema.Struct({
  nodeType: Schema.Literal("Conditional"),
  id: Schema.Number,
  src: Schema.String,
  condition: ast(),
  trueExpression: ast(),
  falseExpression: ast(),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

const Assignment = Schema.Struct({
  nodeType: Schema.Literal("Assignment"),
  id: Schema.Number,
  src: Schema.String,
  operator: Schema.String,
  leftHandSide: ast(),
  rightHandSide: ast(),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
});

const TupleExpression = Schema.Struct({
  nodeType: Schema.Literal("TupleExpression"),
  id: Schema.Number,
  src: Schema.String,
  components: Schema.Array(Schema.NullOr(ast())),
  isInlineArray: Schema.Boolean,
  typeDescriptions: Schema.optional(TypeDescriptions),
});

const UnaryOperation = Schema.Struct({
  nodeType: Schema.Literal("UnaryOperation"),
  id: Schema.Number,
  src: Schema.String,
  operator: Schema.String,
  prefix: Schema.Boolean,
  subExpression: ast(),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

const BinaryOperation = Schema.Struct({
  nodeType: Schema.Literal("BinaryOperation"),
  id: Schema.Number,
  src: Schema.String,
  operator: Schema.String,
  leftExpression: ast(),
  rightExpression: ast(),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
  commonType: Schema.optional(TypeDescriptions),
});

const FunctionCall = Schema.Struct({
  nodeType: Schema.Literal("FunctionCall"),
  id: Schema.Number,
  src: Schema.String,
  expression: ast(),
  arguments: Schema.Array(ast()),
  names: Schema.Array(Schema.String),
  tryCall: Schema.optional(Schema.Boolean),
  kind: Schema.optional(Schema.String),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
  nameLocations: Schema.optional(Schema.Array(Schema.String)),
});

const FunctionCallOptions = Schema.Struct({
  nodeType: Schema.Literal("FunctionCallOptions"),
  id: Schema.Number,
  src: Schema.String,
  expression: ast(),
  names: Schema.Array(Schema.String),
  options: Schema.Array(ast()),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

const NewExpression = Schema.Struct({
  nodeType: Schema.Literal("NewExpression"),
  id: Schema.Number,
  src: Schema.String,
  typeName: ast(),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

const MemberAccess = Schema.Struct({
  nodeType: Schema.Literal("MemberAccess"),
  id: Schema.Number,
  src: Schema.String,
  expression: ast(),
  memberName: Schema.String,
  memberLocation: Schema.optional(Schema.String),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
  referencedDeclaration: Schema.optional(Schema.Number),
});

const IndexAccess = Schema.Struct({
  nodeType: Schema.Literal("IndexAccess"),
  id: Schema.Number,
  src: Schema.String,
  baseExpression: ast(),
  indexExpression: Schema.optional(ast()),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
});

const IndexRangeAccess = Schema.Struct({
  nodeType: Schema.Literal("IndexRangeAccess"),
  id: Schema.Number,
  src: Schema.String,
  baseExpression: ast(),
  startExpression: Schema.optional(ast()),
  endExpression: Schema.optional(ast()),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

const Identifier = Schema.Struct({
  nodeType: Schema.Literal("Identifier"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  overloadedDeclarations: Schema.optional(Schema.Array(Schema.Number)),
  referencedDeclaration: Schema.optional(Schema.Number),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

const ElementaryTypeNameExpression = Schema.Struct({
  nodeType: Schema.Literal("ElementaryTypeNameExpression"),
  id: Schema.Number,
  src: Schema.String,
  typeName: ast(),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
});

const Literal = Schema.Struct({
  nodeType: Schema.Literal("Literal"),
  id: Schema.Number,
  src: Schema.String,
  kind: LiteralKind,
  value: Schema.optional(Schema.String),
  hexValue: Schema.optional(Schema.String),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
  subdenomination: Schema.optional(Schema.String),
});

// --- Documentation & misc ---

const StructuredDocumentation = Schema.Struct({
  nodeType: Schema.Literal("StructuredDocumentation"),
  id: Schema.Number,
  src: Schema.String,
  text: Schema.String,
});

const StorageLayoutSpecifier = Schema.Struct({
  nodeType: Schema.Literal("StorageLayoutSpecifier"),
  id: Schema.Number,
  src: Schema.String,
  baseSlotExpression: ast(),
});

/** Yul subtree shape varies; keep opaque */
const InlineAssembly = Schema.Struct({
  nodeType: Schema.Literal("InlineAssembly"),
  id: Schema.Number,
  src: Schema.String,
  evmVersion: Schema.String,
  eofVersion: Schema.optional(Schema.Number),
  documentation: Schema.optional(Schema.String),
  flags: Schema.optional(Schema.Array(Schema.String)),
  AST: YulInlineAssemblyAst,
});

const AstCatchall = Schema.Struct({
  id: Schema.Number,
  nodeType: Schema.String,
  src: Schema.String,
});

/** Grouped unions (for readability); flattened into `AstNodeSchema`. */
const DeclarationNode = Schema.Union(
  PragmaDirective,
  ImportDirective,
  ContractDefinition,
  IdentifierPath,
  InheritanceSpecifier,
  UsingForDirective,
  StructDefinition,
  EnumDefinition,
  EnumValue,
  UserDefinedValueTypeDefinition,
  ParameterList,
  OverrideSpecifier,
  FunctionDefinition,
  VariableDeclaration,
  ModifierDefinition,
  ModifierInvocation,
  EventDefinition,
  ErrorDefinition,
);

const TypeNode = Schema.Union(
  ElementaryTypeName,
  UserDefinedTypeName,
  FunctionTypeName,
  Mapping,
  ArrayTypeName,
);

const StatementNode = Schema.Union(
  Block,
  UncheckedBlock,
  PlaceholderStatement,
  IfStatement,
  TryCatchClause,
  TryStatement,
  WhileStatement,
  DoWhileStatement,
  ForStatement,
  Continue,
  Break,
  Return,
  EmitStatement,
  RevertStatement,
  Throw,
  VariableDeclarationStatement,
  ExpressionStatement,
);

const ExpressionNode = Schema.Union(
  Conditional,
  Assignment,
  TupleExpression,
  UnaryOperation,
  BinaryOperation,
  FunctionCall,
  FunctionCallOptions,
  NewExpression,
  MemberAccess,
  IndexAccess,
  IndexRangeAccess,
  Identifier,
  ElementaryTypeNameExpression,
  Literal,
);

const DocOrMiscNode = Schema.Union(
  StructuredDocumentation,
  StorageLayoutSpecifier,
  InlineAssembly,
);

export const AstNodeSchema: Schema.Schema<AstNode> = Schema.suspend(() =>
  Schema.Union(
    DeclarationNode,
    TypeNode,
    StatementNode,
    ExpressionNode,
    DocOrMiscNode,
    AstCatchall,
  ),
);

/** Root AST attached under `sources[absolutePath].ast` */
export const SolcAst = Schema.Struct({
  nodeType: Schema.Literal("SourceUnit"),
  id: Schema.Number,
  src: Schema.String,
  absolutePath: Schema.optional(Schema.String),
  exportedSymbols: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Array(Schema.Number),
    }),
  ),
  license: Schema.optional(Schema.String),
  experimentalSolidity: Schema.optional(Schema.Boolean),
  nodes: Schema.Array(AstNodeSchema),
});

export type SolcAst = typeof SolcAst.Type;

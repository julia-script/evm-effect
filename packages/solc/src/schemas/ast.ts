/**
 * Solidity compiler JSON AST schemas (standard JSON-IO `sources[file].ast`).
 * Node kinds align with `libsolidity/ast/ASTJsonImporter.cpp`.
 */
import { Schema } from "effect";
import { StateMutability } from "./abi.js";
import { YulBlock, type YulBlockEncoded } from "./yul-ast.js";

/** `typeDescriptions` on many expression/type nodes */
export const TypeDescriptions = Schema.Struct({
  typeIdentifier: Schema.optional(Schema.String),
  typeString: Schema.optional(Schema.String),
});

export type TypeDescriptionsEncoded = typeof TypeDescriptions.Type;

export type OptionalDocEncoded = string | AstNodeEncoded;
export const OptionalDoc = Schema.Union([
  Schema.String,
  Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
]);

export const Visibility = Schema.Union([
  Schema.Literal("default"),
  Schema.Literal("private"),
  Schema.Literal("internal"),
  Schema.Literal("public"),
  Schema.Literal("external"),
]);
export type VisibilityEncoded = typeof Visibility.Encoded;
export const VariableMutability = Schema.Union([
  Schema.Literal("constant"),
  Schema.Literal("mutable"),
  Schema.Literal("immutable"),
]);
export type VariableMutabilityEncoded = typeof VariableMutability.Encoded;
export const ContractKind = Schema.Union([
  Schema.Literal("interface"),
  Schema.Literal("contract"),
  Schema.Literal("library"),
]);
export type ContractKindEncoded = typeof ContractKind.Encoded;

export const FunctionKind = Schema.Union([
  Schema.Literal("constructor"),
  Schema.Literal("function"),
  Schema.Literal("fallback"),
  Schema.Literal("receive"),
  Schema.Literal("freeFunction"),
]);
export type FunctionKindEncoded = typeof FunctionKind.Encoded;
export const LiteralKind = Schema.Union([
  Schema.Literal("number"),
  Schema.Literal("string"),
  Schema.Literal("unicodeString"),
  Schema.Literal("hexString"),
  Schema.Literal("bool"),
]);
export type LiteralKindEncoded = typeof LiteralKind.Encoded;
export const StorageLocation = Schema.Union([
  Schema.Literal("default"),
  Schema.Literal("storage"),
  Schema.Literal("memory"),
  Schema.Literal("calldata"),
  Schema.Literal("transient"),
]);
export type StorageLocationEncoded = typeof StorageLocation.Encoded;
// --- Declarations & directive nodes ---

export interface PragmaDirectiveEncoded {
  nodeType: "PragmaDirective";
  id: number;
  src: string;
  literals: readonly string[];
}
export const PragmaDirective = Schema.Struct({
  nodeType: Schema.Literal("PragmaDirective"),
  id: Schema.Number,
  src: Schema.String,
  literals: Schema.Array(Schema.String),
});

export interface ImportSymbolAliasEncoded {
  foreign: AstNodeEncoded;
  local: string | null;
}
export const ImportSymbolAlias = Schema.Struct({
  foreign: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  local: Schema.NullOr(Schema.String),
});

export interface ImportDirectiveEncoded {
  nodeType: "ImportDirective";
  id: number;
  src: string;
  file: string;
  unitAlias?: string | undefined;
  nameLocation: string;
  absolutePath: string;
  symbolAliases: readonly ImportSymbolAliasEncoded[];
}
export const ImportDirective = Schema.Struct({
  nodeType: Schema.Literal("ImportDirective"),
  id: Schema.Number,
  src: Schema.String,
  file: Schema.String,
  unitAlias: Schema.optional(Schema.String),
  nameLocation: Schema.String,
  absolutePath: Schema.String,
  symbolAliases: Schema.Array(ImportSymbolAlias),
});

export interface ContractDefinitionEncoded {
  nodeType: "ContractDefinition";
  id: number;
  src: string;
  name: string;
  nameLocation: string;
  documentation?: OptionalDocEncoded | undefined;
  contractKind: ContractKindEncoded;
  abstract: boolean;
  baseContracts: readonly AstNodeEncoded[];
  nodes: readonly AstNodeEncoded[];
  storageLayout?: AstNodeEncoded | undefined;
  canonicalName?: string | undefined;
  fullyImplemented?: boolean | undefined;
  linearizedBaseContracts?: readonly number[] | undefined;
  scope?: number | undefined;
  usedErrors?: readonly number[] | undefined;
  usedEvents?: readonly number[] | undefined;
  contractDependencies?: readonly number[] | undefined;
}
export const ContractDefinition = Schema.Struct({
  nodeType: Schema.Literal("ContractDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: Schema.optional(
    Schema.suspend((): Schema.Codec<OptionalDocEncoded> => OptionalDoc),
  ),
  contractKind: ContractKind,
  abstract: Schema.Boolean,
  baseContracts: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  nodes: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  storageLayout: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  // Compiler output metadata (optional on import)
  canonicalName: Schema.optional(Schema.String),
  fullyImplemented: Schema.optional(Schema.Boolean),
  linearizedBaseContracts: Schema.optional(Schema.Array(Schema.Number)),
  scope: Schema.optional(Schema.Number),
  usedErrors: Schema.optional(Schema.Array(Schema.Number)),
  usedEvents: Schema.optional(Schema.Array(Schema.Number)),
  contractDependencies: Schema.optional(Schema.Array(Schema.Number)),
});

export interface IdentifierPathEncoded {
  nodeType: "IdentifierPath";
  id: number;
  src: string;
  name: string;
  nameLocations?: readonly string[] | undefined;
}
export const IdentifierPath = Schema.Struct({
  nodeType: Schema.Literal("IdentifierPath"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocations: Schema.optional(Schema.Array(Schema.String)),
});

export interface InheritanceSpecifierEncoded {
  nodeType: "InheritanceSpecifier";
  id: number;
  src: string;
  baseName: AstNodeEncoded;
  arguments?: readonly AstNodeEncoded[] | undefined;
}
export const InheritanceSpecifier = Schema.Struct({
  nodeType: Schema.Literal("InheritanceSpecifier"),
  id: Schema.Number,
  src: Schema.String,
  baseName: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  arguments: Schema.optional(
    Schema.Array(
      Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
    ),
  ),
});

export interface UsingForFunctionListEntryEncoded {
  function?: AstNodeEncoded | undefined;
  operator?: string | undefined;
  definition?: AstNodeEncoded | undefined;
}

export const UsingForFunctionListEntry = Schema.Struct({
  function: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  operator: Schema.optional(Schema.String),
  definition: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface UsingForDirectiveEncoded {
  nodeType: "UsingForDirective";
  id: number;
  src: string;
  global: boolean;
  libraryName?: AstNodeEncoded | undefined;
  functionList?: readonly UsingForFunctionListEntryEncoded[] | undefined;
  typeName?: AstNodeEncoded | undefined;
}

export const UsingForDirective = Schema.Struct({
  nodeType: Schema.Literal("UsingForDirective"),
  id: Schema.Number,
  src: Schema.String,
  global: Schema.Boolean,
  libraryName: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  functionList: Schema.optional(Schema.Array(UsingForFunctionListEntry)),
  typeName: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface StructDefinitionEncoded {
  nodeType: "StructDefinition";
  id: number;
  src: string;
  name: string;
  nameLocation: string;
  documentation?: OptionalDocEncoded | undefined;
  members: readonly AstNodeEncoded[];
  canonicalName?: string | undefined;
  scope?: number | undefined;
  visibility?: VisibilityEncoded | undefined;
}

export const StructDefinition = Schema.Struct({
  nodeType: Schema.Literal("StructDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: Schema.optional(OptionalDoc),
  members: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  canonicalName: Schema.optional(Schema.String),
  scope: Schema.optional(Schema.Number),
  visibility: Schema.optional(Visibility),
});

export interface EnumDefinitionEncoded {
  nodeType: "EnumDefinition";
  id: number;
  src: string;
  name: string;
  nameLocation: string;
  documentation?: OptionalDocEncoded | undefined;
  members: readonly AstNodeEncoded[];
  canonicalName?: string | undefined;
}

export const EnumDefinition = Schema.Struct({
  nodeType: Schema.Literal("EnumDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: Schema.optional(OptionalDoc),
  members: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  canonicalName: Schema.optional(Schema.String),
});

export interface EnumValueEncoded {
  nodeType: "EnumValue";
  id: number;
  src: string;
  name: string;
  documentation?: OptionalDocEncoded | undefined;
}
export const EnumValue = Schema.Struct({
  nodeType: Schema.Literal("EnumValue"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  documentation: Schema.optional(OptionalDoc),
});

export interface UserDefinedValueTypeDefinitionEncoded {
  nodeType: "UserDefinedValueTypeDefinition";
  id: number;
  src: string;
  name: string;
  nameLocation: string;
  underlyingType: AstNodeEncoded;
  canonicalName?: string | undefined;
}
export const UserDefinedValueTypeDefinition = Schema.Struct({
  nodeType: Schema.Literal("UserDefinedValueTypeDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  underlyingType: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  canonicalName: Schema.optional(Schema.String),
});

export interface ParameterListEncoded {
  nodeType: "ParameterList";
  id: number;
  src: string;
  parameters: readonly AstNodeEncoded[];
}

export const ParameterList = Schema.Struct({
  nodeType: Schema.Literal("ParameterList"),
  id: Schema.Number,
  src: Schema.String,
  parameters: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface OverrideSpecifierEncoded {
  nodeType: "OverrideSpecifier";
  id: number;
  src: string;
  overrides: readonly AstNodeEncoded[];
}

export const OverrideSpecifier = Schema.Struct({
  nodeType: Schema.Literal("OverrideSpecifier"),
  id: Schema.Number,
  src: Schema.String,
  overrides: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface FunctionDefinitionEncoded {
  nodeType: "FunctionDefinition";
  id: number;
  src: string;
  name: string;
  nameLocation: string;
  documentation?: OptionalDocEncoded | undefined;
  kind: FunctionKindEncoded;
  virtual: boolean;
  implemented: boolean;
  visibility: VisibilityEncoded;
  stateMutability: typeof StateMutability.Type;
  parameters: ParameterListEncoded;
  returnParameters: ParameterListEncoded;
  modifiers: readonly AstNodeEncoded[];
  overrides?: readonly AstNodeEncoded[] | undefined;
  body?: AstNodeEncoded | undefined;
  scope?: number | undefined;
  functionSelector?: string | undefined;
}
export const FunctionDefinition = Schema.Struct({
  nodeType: Schema.Literal("FunctionDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: Schema.optional(OptionalDoc),
  kind: FunctionKind,
  virtual: Schema.Boolean,
  implemented: Schema.Boolean,
  visibility: Visibility,
  stateMutability: StateMutability,
  parameters: ParameterList,
  returnParameters: ParameterList,
  modifiers: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  overrides: Schema.optional(
    Schema.Array(
      Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
    ),
  ),
  body: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  scope: Schema.optional(Schema.Number),
  functionSelector: Schema.optional(Schema.String),
});

export interface VariableDeclarationEncoded {
  nodeType: "VariableDeclaration";
  id: number;
  src: string;
  name: string;
  nameLocation: string;
  documentation?: OptionalDocEncoded | undefined;
  typeName?: AstNodeEncoded | undefined;
  mutability: VariableMutabilityEncoded;
  constant: boolean;
  stateVariable?: boolean | undefined;
  visibility: VisibilityEncoded;
  storageLocation: StorageLocationEncoded;
  overrides?: readonly AstNodeEncoded[] | undefined;
  value?: AstNodeEncoded | undefined;
  indexed?: boolean | undefined;
  scope?: number | undefined;
  functionSelector?: string | undefined;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
}
export const VariableDeclaration = Schema.Struct({
  nodeType: Schema.Literal("VariableDeclaration"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: Schema.optional(OptionalDoc),
  typeName: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  mutability: VariableMutability,
  constant: Schema.Boolean,
  stateVariable: Schema.optional(Schema.Boolean),
  visibility: Visibility,
  storageLocation: StorageLocation,
  overrides: Schema.optional(
    Schema.Array(
      Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
    ),
  ),
  value: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  indexed: Schema.optional(Schema.Boolean),
  scope: Schema.optional(Schema.Number),
  functionSelector: Schema.optional(Schema.String),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

export interface ModifierDefinitionEncoded {
  nodeType: "ModifierDefinition";
  id: number;
  src: string;
  name: string;
  nameLocation: string;
  documentation?: OptionalDocEncoded | undefined;
  virtual: boolean;
  parameters: ParameterListEncoded;
  overrides?: readonly AstNodeEncoded[] | undefined;
  body?: AstNodeEncoded | undefined;
}
export const ModifierDefinition = Schema.Struct({
  nodeType: Schema.Literal("ModifierDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: Schema.optional(OptionalDoc),
  virtual: Schema.Boolean,
  parameters: ParameterList,
  overrides: Schema.optional(
    Schema.Array(
      Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
    ),
  ),
  body: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface ModifierInvocationEncoded {
  nodeType: "ModifierInvocation";
  id: number;
  src: string;
  modifierName: AstNodeEncoded;
  arguments?: readonly AstNodeEncoded[] | undefined;
}
export const ModifierInvocation = Schema.Struct({
  nodeType: Schema.Literal("ModifierInvocation"),
  id: Schema.Number,
  src: Schema.String,
  modifierName: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  arguments: Schema.optional(
    Schema.Array(
      Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
    ),
  ),
});

export interface EventDefinitionEncoded {
  nodeType: "EventDefinition";
  id: number;
  src: string;
  name: string;
  nameLocation: string;
  documentation?: OptionalDocEncoded | undefined;
  parameters: ParameterListEncoded;
  anonymous: boolean;
}
export const EventDefinition = Schema.Struct({
  nodeType: Schema.Literal("EventDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: Schema.optional(OptionalDoc),
  parameters: ParameterList,
  anonymous: Schema.Boolean,
});

export interface ErrorDefinitionEncoded {
  nodeType: "ErrorDefinition";
  id: number;
  src: string;
  name: string;
  nameLocation: string;
  documentation?: OptionalDocEncoded | undefined;
  parameters: ParameterListEncoded;
}
export const ErrorDefinition = Schema.Struct({
  nodeType: Schema.Literal("ErrorDefinition"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  nameLocation: Schema.String,
  documentation: Schema.optional(OptionalDoc),
  parameters: ParameterList,
});

// --- Type name nodes ---

export interface ElementaryTypeNameEncoded {
  nodeType: "ElementaryTypeName";
  id: number;
  src: string;
  name: string;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
  stateMutability?: typeof StateMutability.Type | undefined;
}
export const ElementaryTypeName = Schema.Struct({
  nodeType: Schema.Literal("ElementaryTypeName"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  typeDescriptions: Schema.optional(TypeDescriptions),
  stateMutability: Schema.optional(StateMutability),
});

export interface UserDefinedTypeNameEncoded {
  nodeType: "UserDefinedTypeName";
  id: number;
  src: string;
  pathNode: AstNodeEncoded;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
}

export const UserDefinedTypeName = Schema.Struct({
  nodeType: Schema.Literal("UserDefinedTypeName"),
  id: Schema.Number,
  src: Schema.String,
  pathNode: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

export interface FunctionTypeNameEncoded {
  nodeType: "FunctionTypeName";
  id: number;
  src: string;
  parameterTypes: readonly AstNodeEncoded[];
  returnParameterTypes: readonly AstNodeEncoded[];
  visibility: VisibilityEncoded;
  stateMutability: typeof StateMutability.Type;
}

export const FunctionTypeName = Schema.Struct({
  nodeType: Schema.Literal("FunctionTypeName"),
  id: Schema.Number,
  src: Schema.String,
  parameterTypes: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  returnParameterTypes: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  visibility: Visibility,
  stateMutability: StateMutability,
});

export interface MappingEncoded {
  nodeType: "Mapping";
  id: number;
  src: string;
  keyType: AstNodeEncoded;
  keyName: string;
  keyNameLocation: string;
  valueType: AstNodeEncoded;
  valueName: string;
  valueNameLocation: string;
}

export const Mapping = Schema.Struct({
  nodeType: Schema.Literal("Mapping"),
  id: Schema.Number,
  src: Schema.String,
  keyType: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  keyName: Schema.String,
  keyNameLocation: Schema.String,
  valueType: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  valueName: Schema.String,
  valueNameLocation: Schema.String,
});

export interface ArrayTypeNameEncoded {
  nodeType: "ArrayTypeName";
  id: number;
  src: string;
  baseType: AstNodeEncoded;
  length?: number | undefined;
}
export const ArrayTypeName = Schema.Struct({
  nodeType: Schema.Literal("ArrayTypeName"),
  id: Schema.Number,
  src: Schema.String,
  baseType: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  length: Schema.optional(Schema.Number),
});

// --- Statements ---

export interface BlockEncoded {
  nodeType: "Block";
  id: number;
  src: string;
  documentation?: string | undefined;
  statements: readonly AstNodeEncoded[];
}
export const Block = Schema.Struct({
  nodeType: Schema.Literal("Block"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  statements: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface UncheckedBlockEncoded {
  nodeType: "UncheckedBlock";
  id: number;
  src: string;
  documentation?: string | undefined;
  statements: readonly AstNodeEncoded[];
}
export const UncheckedBlock = Schema.Struct({
  nodeType: Schema.Literal("UncheckedBlock"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  statements: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface PlaceholderStatementEncoded {
  nodeType: "PlaceholderStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
}
export const PlaceholderStatement = Schema.Struct({
  nodeType: Schema.Literal("PlaceholderStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
});

export interface IfStatementEncoded {
  nodeType: "IfStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
  condition: AstNodeEncoded;
  trueBody: AstNodeEncoded;
  falseBody?: AstNodeEncoded | undefined;
}
export const IfStatement = Schema.Struct({
  nodeType: Schema.Literal("IfStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  condition: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  trueBody: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  falseBody: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface TryCatchClauseEncoded {
  nodeType: "TryCatchClause";
  id: number;
  src: string;
  errorName: string;
  parameters?: AstNodeEncoded | undefined;
  block: AstNodeEncoded;
}
export const TryCatchClause = Schema.Struct({
  nodeType: Schema.Literal("TryCatchClause"),
  id: Schema.Number,
  src: Schema.String,
  errorName: Schema.String,
  parameters: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  block: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
});

export interface TryStatementEncoded {
  nodeType: "TryStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
  externalCall: AstNodeEncoded;
  clauses: readonly AstNodeEncoded[];
}
export const TryStatement = Schema.Struct({
  nodeType: Schema.Literal("TryStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  externalCall: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  clauses: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface WhileStatementEncoded {
  nodeType: "WhileStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
  condition: AstNodeEncoded;
  body: AstNodeEncoded;
}
export const WhileStatement = Schema.Struct({
  nodeType: Schema.Literal("WhileStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  condition: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  body: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
});

export interface DoWhileStatementEncoded {
  nodeType: "DoWhileStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
  condition: AstNodeEncoded;
  body: AstNodeEncoded;
}
export const DoWhileStatement = Schema.Struct({
  nodeType: Schema.Literal("DoWhileStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  condition: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  body: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
});

export interface ForStatementEncoded {
  nodeType: "ForStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
  initializationExpression?: AstNodeEncoded | undefined;
  condition?: AstNodeEncoded | undefined;
  loopExpression?: AstNodeEncoded | undefined;
  body: AstNodeEncoded;
}
export const ForStatement = Schema.Struct({
  nodeType: Schema.Literal("ForStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  initializationExpression: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  condition: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  loopExpression: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  body: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
});

export interface ContinueEncoded {
  nodeType: "Continue";
  id: number;
  src: string;
  documentation?: string | undefined;
}
export const Continue = Schema.Struct({
  nodeType: Schema.Literal("Continue"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
});

export interface BreakEncoded {
  nodeType: "Break";
  id: number;
  src: string;
  documentation?: string | undefined;
}
export const Break = Schema.Struct({
  nodeType: Schema.Literal("Break"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
});

export interface ReturnEncoded {
  nodeType: "Return";
  id: number;
  src: string;
  documentation?: string | undefined;
  expression?: AstNodeEncoded | undefined;
  functionReturnParameters?: number | undefined;
}
export const Return = Schema.Struct({
  nodeType: Schema.Literal("Return"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  expression: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  functionReturnParameters: Schema.optional(Schema.Number),
});

export interface EmitStatementEncoded {
  nodeType: "EmitStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
  eventCall: AstNodeEncoded;
}
export const EmitStatement = Schema.Struct({
  nodeType: Schema.Literal("EmitStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  eventCall: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
});

export interface RevertStatementEncoded {
  nodeType: "RevertStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
  errorCall: AstNodeEncoded;
}
export const RevertStatement = Schema.Struct({
  nodeType: Schema.Literal("RevertStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  errorCall: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
});

export interface ThrowEncoded {
  nodeType: "Throw";
  id: number;
  src: string;
  documentation?: string | undefined;
}
export const Throw = Schema.Struct({
  nodeType: Schema.Literal("Throw"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
});

export interface VariableDeclarationStatementEncoded {
  nodeType: "VariableDeclarationStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
  declarations: ReadonlyArray<AstNodeEncoded | null>;
  initialValue?: AstNodeEncoded | undefined;
}
export const VariableDeclarationStatement = Schema.Struct({
  nodeType: Schema.Literal("VariableDeclarationStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  declarations: Schema.Array(
    Schema.NullOr(
      Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
    ),
  ),
  initialValue: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
});

export interface ExpressionStatementEncoded {
  nodeType: "ExpressionStatement";
  id: number;
  src: string;
  documentation?: string | undefined;
  expression: AstNodeEncoded;
}
export const ExpressionStatement = Schema.Struct({
  nodeType: Schema.Literal("ExpressionStatement"),
  id: Schema.Number,
  src: Schema.String,
  documentation: Schema.optional(Schema.String),
  expression: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
});

// --- Expressions ---

export interface ConditionalEncoded {
  nodeType: "Conditional";
  id: number;
  src: string;
  condition: AstNodeEncoded;
  trueExpression: AstNodeEncoded;
  falseExpression: AstNodeEncoded;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
}
export const Conditional = Schema.Struct({
  nodeType: Schema.Literal("Conditional"),
  id: Schema.Number,
  src: Schema.String,
  condition: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  trueExpression: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  falseExpression: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

export interface AssignmentEncoded {
  nodeType: "Assignment";
  id: number;
  src: string;
  operator: string;
  leftHandSide: AstNodeEncoded;
  rightHandSide: AstNodeEncoded;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
  isConstant?: boolean | undefined;
  isLValue?: boolean | undefined;
  isPure?: boolean | undefined;
  lValueRequested?: boolean | undefined;
}
export const Assignment = Schema.Struct({
  nodeType: Schema.Literal("Assignment"),
  id: Schema.Number,
  src: Schema.String,
  operator: Schema.String,
  leftHandSide: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  rightHandSide: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
});

export interface TupleExpressionEncoded {
  nodeType: "TupleExpression";
  id: number;
  src: string;
  components: ReadonlyArray<AstNodeEncoded | null>;
  isInlineArray: boolean;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
}
export const TupleExpression = Schema.Struct({
  nodeType: Schema.Literal("TupleExpression"),
  id: Schema.Number,
  src: Schema.String,
  components: Schema.Array(
    Schema.NullOr(
      Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
    ),
  ),
  isInlineArray: Schema.Boolean,
  typeDescriptions: Schema.optional(TypeDescriptions),
});

export interface UnaryOperationEncoded {
  nodeType: "UnaryOperation";
  id: number;
  src: string;
  operator: string;
  prefix: boolean;
  subExpression: AstNodeEncoded;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
}
export const UnaryOperation = Schema.Struct({
  nodeType: Schema.Literal("UnaryOperation"),
  id: Schema.Number,
  src: Schema.String,
  operator: Schema.String,
  prefix: Schema.Boolean,
  subExpression: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

export interface BinaryOperationEncoded {
  nodeType: "BinaryOperation";
  id: number;
  src: string;
  operator: string;
  leftExpression: AstNodeEncoded;
  rightExpression: AstNodeEncoded;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
  isConstant?: boolean | undefined;
  isLValue?: boolean | undefined;
  isPure?: boolean | undefined;
  lValueRequested?: boolean | undefined;
  commonType?: TypeDescriptionsEncoded | undefined;
}
export const BinaryOperation = Schema.Struct({
  nodeType: Schema.Literal("BinaryOperation"),
  id: Schema.Number,
  src: Schema.String,
  operator: Schema.String,
  leftExpression: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  rightExpression: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
  commonType: Schema.optional(TypeDescriptions),
});

export interface FunctionCallEncoded {
  nodeType: "FunctionCall";
  id: number;
  src: string;
  expression: AstNodeEncoded;
  arguments: readonly AstNodeEncoded[];
  names: readonly string[];
  tryCall?: boolean | undefined;
  kind?: string | undefined;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
  isConstant?: boolean | undefined;
  isLValue?: boolean | undefined;
  isPure?: boolean | undefined;
  lValueRequested?: boolean | undefined;
  nameLocations?: readonly string[] | undefined;
}
export const FunctionCall = Schema.Struct({
  nodeType: Schema.Literal("FunctionCall"),
  id: Schema.Number,
  src: Schema.String,
  expression: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  arguments: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
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

export interface FunctionCallOptionsEncoded {
  nodeType: "FunctionCallOptions";
  id: number;
  src: string;
  expression: AstNodeEncoded;
  names: readonly string[];
  options: readonly AstNodeEncoded[];
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
}
export const FunctionCallOptions = Schema.Struct({
  nodeType: Schema.Literal("FunctionCallOptions"),
  id: Schema.Number,
  src: Schema.String,
  expression: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  names: Schema.Array(Schema.String),
  options: Schema.Array(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

export interface NewExpressionEncoded {
  nodeType: "NewExpression";
  id: number;
  src: string;
  typeName: AstNodeEncoded;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
}
export const NewExpression = Schema.Struct({
  nodeType: Schema.Literal("NewExpression"),
  id: Schema.Number,
  src: Schema.String,
  typeName: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

export interface MemberAccessEncoded {
  nodeType: "MemberAccess";
  id: number;
  src: string;
  expression: AstNodeEncoded;
  memberName: string;
  memberLocation?: string | undefined;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
  isConstant?: boolean | undefined;
  isLValue?: boolean | undefined;
  isPure?: boolean | undefined;
  lValueRequested?: boolean | undefined;
  referencedDeclaration?: number | undefined;
}
export const MemberAccess = Schema.Struct({
  nodeType: Schema.Literal("MemberAccess"),
  id: Schema.Number,
  src: Schema.String,
  expression: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  memberName: Schema.String,
  memberLocation: Schema.optional(Schema.String),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
  referencedDeclaration: Schema.optional(Schema.Number),
});

export interface IndexAccessEncoded {
  nodeType: "IndexAccess";
  id: number;
  src: string;
  baseExpression: AstNodeEncoded;
  indexExpression?: AstNodeEncoded | undefined;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
  isConstant?: boolean | undefined;
  isLValue?: boolean | undefined;
  isPure?: boolean | undefined;
  lValueRequested?: boolean | undefined;
}
export const IndexAccess = Schema.Struct({
  nodeType: Schema.Literal("IndexAccess"),
  id: Schema.Number,
  src: Schema.String,
  baseExpression: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  indexExpression: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
});

export interface IndexRangeAccessEncoded {
  nodeType: "IndexRangeAccess";
  id: number;
  src: string;
  baseExpression: AstNodeEncoded;
  startExpression?: AstNodeEncoded | undefined;
  endExpression?: AstNodeEncoded | undefined;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
}
export const IndexRangeAccess = Schema.Struct({
  nodeType: Schema.Literal("IndexRangeAccess"),
  id: Schema.Number,
  src: Schema.String,
  baseExpression: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
  startExpression: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  endExpression: Schema.optional(
    Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  ),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

export interface IdentifierEncoded {
  nodeType: "Identifier";
  id: number;
  src: string;
  name: string;
  overloadedDeclarations?: readonly number[] | undefined;
  referencedDeclaration?: number | undefined;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
}
export const Identifier = Schema.Struct({
  nodeType: Schema.Literal("Identifier"),
  id: Schema.Number,
  src: Schema.String,
  name: Schema.String,
  overloadedDeclarations: Schema.optional(Schema.Array(Schema.Number)),
  referencedDeclaration: Schema.optional(Schema.Number),
  typeDescriptions: Schema.optional(TypeDescriptions),
});

export interface ElementaryTypeNameExpressionEncoded {
  nodeType: "ElementaryTypeNameExpression";
  id: number;
  src: string;
  typeName: AstNodeEncoded;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
  isConstant?: boolean | undefined;
  isLValue?: boolean | undefined;
  isPure?: boolean | undefined;
  lValueRequested?: boolean | undefined;
}
export const ElementaryTypeNameExpression = Schema.Struct({
  nodeType: Schema.Literal("ElementaryTypeNameExpression"),
  id: Schema.Number,
  src: Schema.String,
  typeName: Schema.suspend((): Schema.Codec<AstNodeEncoded> => AstNodeSchema),
  typeDescriptions: Schema.optional(TypeDescriptions),
  isConstant: Schema.optional(Schema.Boolean),
  isLValue: Schema.optional(Schema.Boolean),
  isPure: Schema.optional(Schema.Boolean),
  lValueRequested: Schema.optional(Schema.Boolean),
});

export interface LiteralEncoded {
  nodeType: "Literal";
  id: number;
  src: string;
  kind: LiteralKindEncoded;
  value?: string | undefined;
  hexValue?: string | undefined;
  typeDescriptions?: TypeDescriptionsEncoded | undefined;
  isConstant?: boolean | undefined;
  isLValue?: boolean | undefined;
  isPure?: boolean | undefined;
  lValueRequested?: boolean | undefined;
  subdenomination?: string | undefined;
}
export const Literal = Schema.Struct({
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

export interface StructuredDocumentationEncoded {
  nodeType: "StructuredDocumentation";
  id: number;
  src: string;
  text: string;
}
export const StructuredDocumentation = Schema.Struct({
  nodeType: Schema.Literal("StructuredDocumentation"),
  id: Schema.Number,
  src: Schema.String,
  text: Schema.String,
});

export interface StorageLayoutSpecifierEncoded {
  nodeType: "StorageLayoutSpecifier";
  id: number;
  src: string;
  baseSlotExpression: AstNodeEncoded;
}
export const StorageLayoutSpecifier = Schema.Struct({
  nodeType: Schema.Literal("StorageLayoutSpecifier"),
  id: Schema.Number,
  src: Schema.String,
  baseSlotExpression: Schema.suspend(
    (): Schema.Codec<AstNodeEncoded> => AstNodeSchema,
  ),
});

/** Yul subtree shape varies; keep opaque */
export interface InlineAssemblyEncoded {
  nodeType: "InlineAssembly";
  id: number;
  src: string;
  evmVersion: string;
  eofVersion?: number | undefined;
  documentation?: string | undefined;
  flags?: readonly string[] | undefined;
  AST: YulBlockEncoded;
}
export const InlineAssembly = Schema.Struct({
  nodeType: Schema.Literal("InlineAssembly"),
  id: Schema.Number,
  src: Schema.String,
  evmVersion: Schema.String,
  eofVersion: Schema.optional(Schema.Number),
  documentation: Schema.optional(Schema.String),
  flags: Schema.optional(Schema.Array(Schema.String)),
  AST: YulBlock,
});

/** Grouped unions (for readability); flattened into `AstNodeSchema`. */
export type DeclarationNodeEncoded =
  | PragmaDirectiveEncoded
  | ImportDirectiveEncoded
  | ContractDefinitionEncoded
  | IdentifierPathEncoded
  | InheritanceSpecifierEncoded
  | UsingForDirectiveEncoded
  | StructDefinitionEncoded
  | EnumDefinitionEncoded
  | EnumValueEncoded
  | UserDefinedValueTypeDefinitionEncoded
  | ParameterListEncoded
  | OverrideSpecifierEncoded
  | FunctionDefinitionEncoded
  | VariableDeclarationEncoded
  | ModifierDefinitionEncoded
  | ModifierInvocationEncoded
  | EventDefinitionEncoded
  | ErrorDefinitionEncoded;

export const DeclarationNode = Schema.Union([
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
]);

export type TypeNodeEncoded =
  | ElementaryTypeNameEncoded
  | UserDefinedTypeNameEncoded
  | FunctionTypeNameEncoded
  | MappingEncoded
  | ArrayTypeNameEncoded;
export const TypeNode = Schema.Union([
  ElementaryTypeName,
  UserDefinedTypeName,
  FunctionTypeName,
  Mapping,
  ArrayTypeName,
]);

export type StatementNodeEncoded =
  | BlockEncoded
  | UncheckedBlockEncoded
  | PlaceholderStatementEncoded
  | IfStatementEncoded
  | TryCatchClauseEncoded
  | TryStatementEncoded
  | WhileStatementEncoded
  | DoWhileStatementEncoded
  | ForStatementEncoded
  | ContinueEncoded
  | BreakEncoded
  | ReturnEncoded
  | EmitStatementEncoded
  | RevertStatementEncoded
  | ThrowEncoded
  | VariableDeclarationStatementEncoded
  | ExpressionStatementEncoded;
export const StatementNode = Schema.Union([
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
]);

export type ExpressionNodeEncoded =
  | ConditionalEncoded
  | AssignmentEncoded
  | TupleExpressionEncoded
  | UnaryOperationEncoded
  | BinaryOperationEncoded
  | FunctionCallEncoded
  | FunctionCallOptionsEncoded
  | NewExpressionEncoded
  | MemberAccessEncoded
  | IndexAccessEncoded
  | IndexRangeAccessEncoded
  | IdentifierEncoded
  | ElementaryTypeNameExpressionEncoded
  | LiteralEncoded;

export const ExpressionNode = Schema.Union([
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
]);

export const DocOrMiscNode = Schema.Union([
  StructuredDocumentation,
  StorageLayoutSpecifier,
  InlineAssembly,
]);

export type DocOrMiscNodeEncoded =
  | StructuredDocumentationEncoded
  | StorageLayoutSpecifierEncoded
  | InlineAssemblyEncoded;

export type AstNodeEncoded =
  | DeclarationNodeEncoded
  | TypeNodeEncoded
  | StatementNodeEncoded
  | ExpressionNodeEncoded
  | DocOrMiscNodeEncoded;
export const AstNodeSchema = Schema.Union([
  DeclarationNode,
  TypeNode,
  StatementNode,
  ExpressionNode,
  DocOrMiscNode,
]);

/** Root AST attached under `sources[absolutePath].ast` */
export const SolcAst = Schema.Struct({
  nodeType: Schema.Literal("SourceUnit"),
  id: Schema.Number,
  src: Schema.String,
  absolutePath: Schema.optional(Schema.String),
  exportedSymbols: Schema.optional(
    Schema.Record(Schema.String, Schema.Array(Schema.Number)),
  ),
  license: Schema.optional(Schema.String),
  experimentalSolidity: Schema.optional(Schema.Boolean),
  nodes: Schema.Array(AstNodeSchema),
});

export type SolcAst = typeof SolcAst.Type;

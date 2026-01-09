import {
  Address,
  type AnyBytes,
  Bytes,
  Bytes20,
  fromBeBytes,
} from "@evm-effect/ethereum-types";
import { SchemaAST as AST, Either, type Schema } from "effect";
import type { ParseIssue } from "effect/ParseResult";
import { decode } from "./decode.js";
import { RlpDecodeError } from "./exceptions.js";
import type { Simple } from "./types.js";
import {
  BYTES_CLASSES_BY_TAG,
  getConcretes,
  getIdentifierAnnotation,
  isExtended,
  normalize,
  UINT_CLASSES_BY_TAG,
} from "./utils.js";

const textDecoder = new TextDecoder();
const hydrateDeclaration = (
  ast: AST.Declaration | AST.TypeLiteral,
  input: Simple,
): unknown => {
  const identifier = getIdentifierAnnotation(ast);
  if (identifier?.startsWith("Uint8Array")) {
    assertBytes(input);
    return input.value;
  }

  assertArray(input);
  const signatures = AST.getPropertySignatures(ast);
  const entries: [string | number | symbol, unknown][] = [];
  let i = 0;
  for (const signature of signatures) {
    if (signature.name === "_tag" && AST.isLiteral(signature.type)) {
      entries.push([signature.name, signature.type.literal]);
      continue;
    }
    // Handle missing input elements for optional fields
    // Don't add to entries - leave the field undefined so we know it wasn't in the RLP
    // This is important for correct hash calculation (older forks don't have all header fields)
    if (input[i] === undefined) {
      i++;
      continue;
    }
    const either = hydrateAst(signature.type, input[i]);
    entries.push([signature.name, either]);
    i++;
  }
  if (AST.isTypeLiteral(ast)) {
    return Object.fromEntries(entries);
  }

  const obj = Object.fromEntries(entries);

  // For Declaration types (Schema.TaggedClass), try both encode and decode paths
  // encodeUnknown is the correct direction for TaggedClass since we have actual class instances
  const encParse = ast.encodeUnknown(...ast.typeParameters);
  const encResult = encParse(obj, AST.defaultParseOption, ast) as Either.Either<
    unknown,
    ParseIssue
  >;
  if (Either.isRight(encResult)) {
    return encResult.right;
  }

  // Fallback: try decodeUnknown for compatibility with optionalWith defaults
  const parse = ast.decodeUnknown(...ast.typeParameters);
  const result = parse(obj, AST.defaultParseOption, ast) as Either.Either<
    unknown,
    ParseIssue
  >;
  if (Either.isLeft(result)) {
    throw new RlpDecodeError({ message: "Invalid input", path: [] });
  }
  return result.right;
};

const hydrateExtended = (ast: AST.AST, input: Simple): unknown => {
  assertBytes(input);
  const identifier = AST.getIdentifierAnnotation(ast);
  if (identifier._tag !== "Some") {
    throw new RlpDecodeError({ message: "Unreachable", path: [] });
  }
  const uintClass =
    UINT_CLASSES_BY_TAG[identifier.value as keyof typeof UINT_CLASSES_BY_TAG];
  if (uintClass) {
    const result = fromBeBytes(input, uintClass);
    if (Either.isLeft(result)) {
      throw new RlpDecodeError({ message: "Invalid uint", path: [] });
    }
    return result.right;
  }
  const bytesClass =
    BYTES_CLASSES_BY_TAG[identifier.value as keyof typeof BYTES_CLASSES_BY_TAG];
  if (bytesClass) {
    return new bytesClass({ value: input.value });
  }
  if (identifier.value === "Address") {
    return new Address({ value: new Bytes20({ value: input.value }) });
  }
  throw new RlpDecodeError({ message: "Unreachable", path: [] });
};

function assertBytes(input: Simple): asserts input is Bytes {
  if (Array.isArray(input)) {
    throw new RlpDecodeError({ message: "Input is not a bytes", path: [] });
  }
  // return !Array.isArray(input);
}

function assertArray(input: Simple): asserts input is Simple[] {
  if (!Array.isArray(input)) {
    throw new RlpDecodeError({ message: "Input is not an array", path: [] });
  }
}
const hydrateLiterals = (ast: AST.Literal, input: Simple): unknown => {
  assertBytes(input);
  switch (ast.literal) {
    case null:
    case undefined:
      return new Bytes({ value: new Uint8Array(0) });
    case true:
      return input.value[0] === 1;
    case false:
      return input.value[0] === 0;
    default:
      return ast.literal;
  }
};

const hydrateUnion = (ast: AST.Union, input: Simple): unknown => {
  const concretes = getConcretes(ast);

  // Handle unions with multiple concrete types by discriminating based on input type
  if (concretes.length > 1) {
    const isInputArray = Array.isArray(input);

    // Find a type that matches the input structure
    for (const concreteType of concretes) {
      const normalized = normalize(concreteType);
      const identifier = getIdentifierAnnotation(normalized);

      // If input is bytes (not array), prefer Bytes types
      if (!isInputArray) {
        if (
          identifier &&
          (identifier === "Bytes" || identifier.startsWith("Bytes"))
        ) {
          return hydrateAst(concreteType, input);
        }
      }

      // If input is array, prefer struct/declaration types (not Bytes)
      if (isInputArray) {
        if (AST.isDeclaration(normalized) || AST.isTypeLiteral(normalized)) {
          // Skip Bytes-like types for array input
          if (
            !identifier ||
            (!identifier.startsWith("Bytes") && identifier !== "Address")
          ) {
            return hydrateAst(concreteType, input);
          }
          // Check if it's a struct (has property signatures indicating it expects a list)
          if (!isExtended(normalized)) {
            return hydrateAst(concreteType, input);
          }
        }
      }
    }

    // Fallback: try the first concrete type
    return hydrateAst(concretes[0], input);
  }

  if (ast.types.length !== 2 && concretes.length !== 1) {
    throw new RlpDecodeError({
      message:
        "Unions are not supported for decoding as there is no way to translate the received bytes into the concrete type",
      path: [],
    });
  }
  // if only one is concrete, we treat it as an optional value
  if (input) {
    assertBytes(input);

    if (input.value.length === 0) {
      // For 0-length bytes, we need to check if the concrete type is numeric
      // Numeric types (Uint, U64, etc.) should be decoded as 0, not undefined
      const concreteNormalized = normalize(concretes[0]);
      if (
        (AST.isDeclaration(concreteNormalized) ||
          AST.isTypeLiteral(concreteNormalized)) &&
        isExtended(concreteNormalized)
      ) {
        const identifier = AST.getIdentifierAnnotation(concreteNormalized);
        if (
          identifier._tag === "Some" &&
          UINT_CLASSES_BY_TAG[
            identifier.value as keyof typeof UINT_CLASSES_BY_TAG
          ]
        ) {
          // This is a numeric type - hydrate as 0
          return hydrateAst(concretes[0], input);
        }
      }

      // For non-numeric types, return undefined/null based on the schema
      const notConcrete = ast.types.find(
        (type) => type !== concretes[0],
      ) as AST.AST;
      if (AST.isUndefinedKeyword(notConcrete)) {
        return undefined;
      }
      if (AST.isLiteral(notConcrete)) return notConcrete.literal;
      return undefined;
    }
  }

  return hydrateAst(concretes[0], input);
};

const hydrateTuple = (ast: AST.TupleType, input: Simple): unknown => {
  assertArray(input);
  const elementsTypes = ast.elements;
  const [restType, ...additionalTypes] = ast.rest;
  const elements = input.slice(0, elementsTypes.length);
  const fields: unknown[] = [];
  // const [rest, ...additional] = input.slice(elementsTypes.length);
  const rest = input.slice(
    elementsTypes.length,
    input.length - additionalTypes.length,
  );
  const additional = input.slice(input.length - additionalTypes.length);
  for (let i = 0; i < elementsTypes.length; i++) {
    fields.push(hydrateAst(elementsTypes[i].type, elements[i]));
  }
  for (const restItem of rest) {
    fields.push(hydrateAst(restType.type, restItem));
  }
  for (let i = 0; i < additionalTypes.length; i++) {
    fields.push(hydrateAst(additionalTypes[i].type, additional[i]));
  }
  return fields;
};
const hydrateAst = (ast: AST.AST, input: Simple): unknown => {
  ast = normalize(ast);

  switch (ast._tag) {
    case "StringKeyword":
      assertBytes(input);
      return textDecoder.decode(input.value);
    case "BooleanKeyword":
      assertBytes(input);
      return input.value[0] === 1;
    case "Literal":
      return hydrateLiterals(ast, input);
    case "Declaration":
    case "TypeLiteral": {
      if (isExtended(ast)) {
        return hydrateExtended(ast, input);
      }
      return hydrateDeclaration(ast, input);
    }
    case "Union":
      return hydrateUnion(ast, input);
    case "TupleType":
      return hydrateTuple(ast, input);
    default:
      throw new RlpDecodeError({ message: "Not implemented", path: [] });
  }
};

export const decodeTo = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  input: AnyBytes,
): Either.Either<A, RlpDecodeError> => {
  const decodedEither = decode(input);
  if (Either.isLeft(decodedEither)) {
    return Either.left(decodedEither.left);
  }
  try {
    const result = hydrateAst(schema.ast, decodedEither.right);
    return Either.right(result as A);
  } catch (error) {
    return Either.left(error as RlpDecodeError);
  }
};

import {
  Address,
  type AnyBytes,
  Bytes,
  Bytes0,
  Bytes20,
  fromBeBytes,
} from "@evm-effect/ethereum-types";
import type { AnyUintClass } from "@evm-effect/ethereum-types/numeric";
import { SchemaAST as AST, Result, type Schema } from "effect";
import { decode } from "./decode.js";
import { RlpDecodeError } from "./exceptions.js";
import type { Simple } from "./types.ts";
import {
  BYTES_CLASSES_BY_TAG,
  getConcretes,
  getIdentifierAnnotation,
  isExtended,
  UINT_CLASSES_BY_TAG,
} from "./utils.js";

const textDecoder = new TextDecoder();
const hydrateDeclaration = (
  ast: AST.Objects,
  input: Simple,
  path: string[],
): unknown => {
  const identifier = getIdentifierAnnotation(ast);
  if (identifier?.startsWith("Uint8Array")) {
    assertBytes(input, path);
    return input.value;
  }

  assertArray(input, path);
  const signatures = ast.propertySignatures;
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

    const either = hydrateAst(signature.type, input[i], [
      ...path,
      signature.name.toString(),
    ]);

    entries.push([signature.name, either]);
    i++;
  }
  if (AST.isLiteral(ast)) {
    return Object.fromEntries(entries);
  }

  const obj = Object.fromEntries(entries);

  return obj;

  // throw new RlpDecodeError({ message: "Not implemented", path: [] });
  // For Declaration types (Schema.TaggedClass), try both encode and decode paths
  // encodeUnknown is the correct direction for TaggedClass since we have actual class instances
  // const encParse = Schema.encodeUnknownOption(SchemaAST.);
  // const encResult = encParse(obj, AST.defaultParseOption, ast) as Result.Result<
  //   unknown,
  //   ParseIssue
  // >;
  // if (Result.isSuccess(encResult)) {
  //   return encResult.success;
  // }

  // // Fallback: try decodeUnknown for compatibility with optionalWith defaults
  // const parse = ast.decodeUnknown(...ast.typeParameters);
  // const result = parse(obj, AST.defaultParseOption, ast) as Result.Result<
  //   unknown,
  //   ParseIssue
  // >;
  // if (Result.isFailure(result)) {
  //   throw new RlpDecodeError({ message: "Invalid input", path: [] });
  // }
  // return result.success;
};

const hydrateExtended = (
  ast: AST.AST,
  input: Simple,
  path: string[],
): unknown => {
  assertBytes(input, path);
  // console.log(ast);
  const identifier = AST.resolveIdentifier(ast);
  if (!identifier) {
    throw new RlpDecodeError({ message: "Unreachable", path: path });
  }
  const uintClass = UINT_CLASSES_BY_TAG[
    identifier as keyof typeof UINT_CLASSES_BY_TAG
  ] as AnyUintClass;
  if (uintClass) {
    const result = fromBeBytes(input, uintClass);
    if (Result.isFailure(result)) {
      throw new RlpDecodeError({ message: "Invalid uint", path: path });
    }
    return result.success;
  }
  const bytesClass =
    BYTES_CLASSES_BY_TAG[identifier as keyof typeof BYTES_CLASSES_BY_TAG];
  if (bytesClass) {
    return new bytesClass({ value: input.value });
  }
  if (identifier === "Address") {
    return new Address({ value: new Bytes20({ value: input.value }) });
  }
  throw new RlpDecodeError({ message: "Unreachable", path: path });
};

function assertBytes(input: Simple, path: string[]): asserts input is Bytes {
  if (Array.isArray(input)) {
    throw new RlpDecodeError({ message: "Input is not a bytes", path: path });
  }
  // return !Array.isArray(input);
}

function assertArray(input: Simple, path: string[]): asserts input is Simple[] {
  if (!Array.isArray(input)) {
    throw new RlpDecodeError({ message: "Input is not an array", path: path });
  }
}
const hydrateLiterals = (
  ast: AST.Literal,
  input: Simple,
  path: string[],
): unknown => {
  assertBytes(input, path);
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

const hydrateUnion = (
  ast: AST.Union,
  input: Simple,
  path: string[],
): unknown => {
  const concretes = getConcretes(ast);

  // Handle unions with multiple concrete types by discriminating based on input type
  if (concretes.length > 1) {
    const isInputArray = Array.isArray(input);

    // Find a type that matches the input structure
    for (const concreteType of concretes) {
      const normalized = concreteType;
      const identifier = getIdentifierAnnotation(normalized);

      // If input is bytes (not array), prefer Bytes types
      if (!isInputArray) {
        if (identifier?.startsWith("Bytes")) {
          return hydrateAst(concreteType, input, path);
        }
      }

      // If input is array, prefer struct/declaration types (not Bytes)
      if (isInputArray) {
        // check for structs
        if (AST.isObjects(normalized)) {
          return hydrateDeclaration(normalized, input, path);
        }

        if (AST.isDeclaration(normalized)) {
          // Skip Bytes-like types for array input
          if (
            !identifier ||
            (!identifier.startsWith("Bytes") && identifier !== "Address")
          ) {
            return hydrateAst(concreteType, input, path);
          }
          // Check if it's a struct (has property signatures indicating it expects a list)
          if (!isExtended(normalized)) {
            return hydrateAst(concreteType, input, path);
          }
        }
      }
    }
    // console.log(''concretes[0]);

    return hydrateAst(concretes[0], input, path);
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
    assertBytes(input, path);

    if (input.value.length === 0) {
      const concreteNormalized = concretes[0];
      if (
        AST.isDeclaration(concreteNormalized) &&
        isExtended(concreteNormalized)
      ) {
        const identifier = AST.resolveIdentifier(concreteNormalized);
        if (
          identifier &&
          UINT_CLASSES_BY_TAG[identifier as keyof typeof UINT_CLASSES_BY_TAG]
        ) {
          // This is a numeric type - hydrate as 0
          return hydrateAst(concretes[0], input, path);
        }
      }

      const notConcrete = ast.types.find(
        (type) => type !== concretes[0],
      ) as AST.AST;
      if (AST.isUndefined(notConcrete)) {
        return undefined;
      }
      if (AST.isLiteral(notConcrete)) return notConcrete.literal;
      if (
        AST.isDeclaration(notConcrete) &&
        AST.resolveIdentifier(notConcrete) === "Bytes0"
      ) {
        return Bytes0.empty;
      }
      return undefined;
    }
  }

  return hydrateAst(concretes[0], input, path);
};

const hydrateTuple = (
  ast: AST.Arrays,
  input: Simple,
  path: string[],
): unknown => {
  assertArray(input, path);
  const elementsTypes = ast.elements;
  const [restType, ...additionalTypes] = ast.rest;
  const elements = input.slice(0, elementsTypes.length);
  const fields: unknown[] = [];
  const rest = input.slice(
    elementsTypes.length,
    input.length - additionalTypes.length,
  );
  const additional = input.slice(input.length - additionalTypes.length);
  let j = 0;
  for (let i = 0; i < elementsTypes.length; i++) {
    fields.push(hydrateAst(elementsTypes[i], elements[i], [...path, `[${j}]`]));
    j++;
  }
  for (const restItem of rest) {
    fields.push(hydrateAst(restType, restItem, [...path, `[${j}]`]));
    j++;
  }
  for (let i = 0; i < additionalTypes.length; i++) {
    fields.push(
      hydrateAst(additionalTypes[i], additional[i], [...path, `[${j}]`]),
    );
    j++;
  }
  return fields;
};
const hydrateAst = (ast: AST.AST, input: Simple, path: string[]): unknown => {
  switch (ast._tag) {
    case "String":
      assertBytes(input, path);
      return textDecoder.decode(input.value);
    case "Boolean":
      assertBytes(input, path);
      return input.value[0] === 1;
    case "Literal":
      return hydrateLiterals(ast, input, path);
    // case "BigInt":

    case "Declaration": {
      // case "TypeLiteral": {
      if (isExtended(ast)) {
        return hydrateExtended(ast, input, path);
      }

      if (ast.typeParameters.length > 1) {
        throw new RlpDecodeError({
          message: "Multiple type parameters are not supported",
          path: [],
        });
      }
      const obj = ast.typeParameters[0];

      if (AST.isObjects(obj)) {
        return hydrateDeclaration(obj, input, path);
      }

      throw new RlpDecodeError({
        message: "Declaration type does not contain an object",
        path: [],
      });
      // return hydrateDeclaration(ast, input);
    }
    case "Objects":
      return hydrateDeclaration(ast, input, path);
    case "Union":
      return hydrateUnion(ast, input, path);
    case "Arrays":
      return hydrateTuple(ast, input, path);
    default:
      throw new RlpDecodeError({
        message: `Not implemented: ${ast._tag}`,
        path: [],
      });
  }
};

export const decodeTo = <A>(
  schema: Schema.Schema<A>,
  input: AnyBytes,
): Result.Result<A, RlpDecodeError> => {
  const decodedResult = decode(input);

  if (Result.isFailure(decodedResult)) {
    return Result.fail(decodedResult.failure);
  }
  try {
    const result = hydrateAst(schema.ast, decodedResult.success, []);
    const encoded = schema.make(result);
    return Result.succeed(encoded);
  } catch (error) {
    return Result.fail(error as RlpDecodeError);
  }
};

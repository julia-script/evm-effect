import {
  Address,
  type AnyBytes,
  Bytes,
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
  getIdentifierAnnotation,
  isExtended,
  UINT_CLASSES_BY_TAG,
} from "./utils.js";

const textDecoder = new TextDecoder();
const hydrateDeclaration = (ast: AST.Objects, input: Simple): unknown => {
  const identifier = getIdentifierAnnotation(ast);
  if (identifier?.startsWith("Uint8Array")) {
    assertBytes(input);
    return input.value;
  }

  assertArray(input);
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
    const either = hydrateAst(signature.type, input[i]);
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

const hydrateExtended = (ast: AST.AST, input: Simple): unknown => {
  assertBytes(input);
  const identifier = AST.resolveIdentifier(ast);
  if (!identifier) {
    throw new RlpDecodeError({ message: "Unreachable", path: [] });
  }
  const uintClass = UINT_CLASSES_BY_TAG[
    identifier as keyof typeof UINT_CLASSES_BY_TAG
  ] as AnyUintClass;
  if (uintClass) {
    const result = fromBeBytes(input, uintClass);
    if (Result.isFailure(result)) {
      throw new RlpDecodeError({ message: "Invalid uint", path: [] });
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

// const hydrateUnion = (ast: AST.Union, input: Simple): unknown => {
//   const concretes = getConcretes(ast);

//   // Handle unions with multiple concrete types by discriminating based on input type
//   if (concretes.length > 1) {
//     const isInputArray = Array.isArray(input);

//     // Find a type that matches the input structure
//     for (const concreteType of concretes) {
//       const normalized = normalize(concreteType);
//       const identifier = getIdentifierAnnotation(normalized);

//       // If input is bytes (not array), prefer Bytes types
//       if (!isInputArray) {
//         if (
//           identifier &&
//           (identifier === "Bytes" || identifier.startsWith("Bytes"))
//         ) {
//           return hydrateAst(concreteType, input);
//         }
//       }

//       // If input is array, prefer struct/declaration types (not Bytes)
//       if (isInputArray) {
//         if (AST.isDeclaration(normalized) ) {
//           // Skip Bytes-like types for array input
//           if (
//             !identifier ||
//             (!identifier.startsWith("Bytes") && identifier !== "Address")
//           ) {
//             return hydrateAst(concreteType, input);
//           }
//           // Check if it's a struct (has property signatures indicating it expects a list)
//           if (!isExtended(normalized)) {
//             return hydrateAst(concreteType, input);
//           }
//         }
//       }
//     }

//     return hydrateAst(concretes[0], input);
//   }

//   if (ast.types.length !== 2 && concretes.length !== 1) {
//     throw new RlpDecodeError({
//       message:
//         "Unions are not supported for decoding as there is no way to translate the received bytes into the concrete type",
//       path: [],
//     });
//   }
//   // if only one is concrete, we treat it as an optional value
//   if (input) {
//     assertBytes(input);

//     if (input.value.length === 0) {
//       const concreteNormalized = normalize(concretes[0]);
//       if (
//         AST.isDeclaration(concreteNormalized)  &&
//         isExtended(concreteNormalized)
//       ) {
//         const identifier = AST.resolveIdentifier(concreteNormalized);
//         if (
//           identifier &&
//           UINT_CLASSES_BY_TAG[
//             identifier as keyof typeof UINT_CLASSES_BY_TAG
//           ]
//         ) {
//           // This is a numeric type - hydrate as 0
//           return hydrateAst(concretes[0], input);
//         }
//       }

//       const notConcrete = ast.types.find(
//         (type) => type !== concretes[0],
//       ) as AST.AST;
//       if (AST.isUndefined(notConcrete)) {
//         return undefined;
//       }
//       if (AST.isLiteral(notConcrete)) return notConcrete.literal;
//       return undefined;
//     }
//   }

//   return hydrateAst(concretes[0], input);
// };

const hydrateTuple = (ast: AST.Arrays, input: Simple): unknown => {
  assertArray(input);
  const elementsTypes = ast.elements;
  const [restType, ...additionalTypes] = ast.rest;
  const elements = input.slice(0, elementsTypes.length);
  const fields: unknown[] = [];
  const rest = input.slice(
    elementsTypes.length,
    input.length - additionalTypes.length,
  );
  const additional = input.slice(input.length - additionalTypes.length);
  for (let i = 0; i < elementsTypes.length; i++) {
    fields.push(hydrateAst(elementsTypes[i], elements[i]));
  }
  for (const restItem of rest) {
    fields.push(hydrateAst(restType, restItem));
  }
  for (let i = 0; i < additionalTypes.length; i++) {
    fields.push(hydrateAst(additionalTypes[i], additional[i]));
  }
  return fields;
};
const hydrateAst = (ast: AST.AST, input: Simple): unknown => {
  // ast = normalize(ast);

  switch (ast._tag) {
    case "String":
      assertBytes(input);
      return textDecoder.decode(input.value);
    case "Boolean":
      assertBytes(input);
      return input.value[0] === 1;
    case "Literal":
      return hydrateLiterals(ast, input);
    // case "BigInt":

    case "Declaration": {
      // case "TypeLiteral": {
      if (isExtended(ast)) {
        return hydrateExtended(ast, input);
      }

      if (ast.typeParameters.length > 1) {
        throw new RlpDecodeError({
          message: "Multiple type parameters are not supported",
          path: [],
        });
      }
      const obj = ast.typeParameters[0];

      if (AST.isObjects(obj)) {
        return hydrateDeclaration(obj, input);
      }

      throw new RlpDecodeError({
        message: "Declaration type does not contain an object",
        path: [],
      });
      // return hydrateDeclaration(ast, input);
    }
    case "Arrays":
      return hydrateTuple(ast, input);
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
    const result = hydrateAst(schema.ast, decodedResult.success);
    const encoded = schema.make(result);
    return Result.succeed(encoded);
  } catch (error) {
    return Result.fail(error as RlpDecodeError);
  }
};

import { Bytes, Uint } from "@evm-effect/ethereum-types";
import { SchemaAST as AST, Either, type Schema } from "effect";
import type { RlpEncodeError } from "./exceptions.js";
import { encode } from "./index.js";
import type { Extended } from "./types.js";
import {
  getConcretes,
  getIdentifierAnnotation,
  isExtended,
  normalize,
} from "./utils.js";

function extractExtendedFromDeclarationFields(
  declaration: AST.Declaration | AST.TypeLiteral,
  input: unknown,
): Extended[] {
  const it = AST.getPropertySignatures(declaration);
  const fields: Extended[] = [];
  for (const signature of it) {
    if (signature.name === "_tag") {
      continue;
    }

    fields.push(
      extractExtendedFromAst(
        signature.type,
        (input as Record<string, unknown>)?.[signature.name as string] ??
          undefined,
      ),
    );
  }
  return fields;
}
function extractExtendedFromTuple(
  tuple: AST.TupleType,
  input: unknown,
): Extended[] {
  const elementsTypes = tuple.elements;
  const [restType, ...additionalTypes] = tuple.rest;
  const fields: Extended[] = [];

  if (!Array.isArray(input)) {
    throw new Error(`Expected array, got ${typeof input}`);
  }

  const elements = input.slice(0, elementsTypes.length);
  // const [rest, ...additional] = input.slice(elementsTypes.length);
  const rest = input.slice(
    elementsTypes.length,
    input.length - additionalTypes.length,
  );
  const additional = input.slice(input.length - additionalTypes.length);
  for (let i = 0; i < elementsTypes.length; i++) {
    fields.push(extractExtendedFromAst(elementsTypes[i].type, elements[i]));
  }
  for (const restItem of rest) {
    fields.push(extractExtendedFromAst(restType.type, restItem));
  }
  for (let i = 0; i < additionalTypes.length; i++) {
    fields.push(extractExtendedFromAst(additionalTypes[i].type, additional[i]));
  }
  return fields;
}
function extractFromUnion(union: AST.Union, input: unknown): Extended {
  const concretes = getConcretes(union);
  if (concretes.length !== 1 && union.types.length !== 2) {
    throw new Error("Union is not supported");
  }
  // otherwise we just treat it as an optional field
  if (!input) {
    return new Bytes({ value: new Uint8Array(0) });
  }

  return extractExtendedFromAst(concretes[0], input);
}

function extractLiteral(ast: AST.Literal): Extended {
  switch (ast.literal) {
    case null:
    case undefined:
      return new Bytes({ value: new Uint8Array(0) });
    case true:
      return true;
    case false:
      return false;
  }
  if (typeof ast.literal === "number") {
    if (Number.isSafeInteger(ast.literal) && ast.literal >= 0) {
      return new Uint({ value: BigInt(ast.literal) });
    }
    throw new Error("Only positive integers are supported for type literals");
  }
  if (typeof ast.literal === "bigint") {
    if (ast.literal < 0n) {
      throw new Error("Only positive integers are supported for type literals");
    }
    return new Uint({ value: ast.literal });
  }
  throw new Error(`Unsupported literal value: ${ast.literal}`);
}
function extractExtendedFromAst(ast: AST.AST, input: unknown): Extended {
  // if (AST.isTransformation(ast) && Option.isOption(input)) {
  //   if (Option.isNone(input)) {
  //     return new Bytes({ value: new Uint8Array(0) });
  //   }
  //   if (!AST.isDeclaration(ast.to) || !ast.to.typeParameters[0])
  //     throw new Error("Don't know how to handle this transformation");
  //   return extractExtendedFromAst(ast.to.typeParameters[0], input.value);
  // }

  ast = normalize(ast);
  switch (ast._tag) {
    case "StringKeyword":
      return input as string;
    case "BooleanKeyword":
      return input as boolean;
    case "Literal":
      return extractLiteral(ast);
    case "TypeLiteral":
    case "Declaration": {
      if (isExtended(ast)) {
        return input as Extended;
      }
      const identifier = getIdentifierAnnotation(ast);
      if (identifier?.startsWith("Uint8Array")) {
        return input as Uint8Array;
      }

      return extractExtendedFromDeclarationFields(ast, input);
    }
    case "Union":
      return extractFromUnion(ast, input);
    case "TupleType":
      return extractExtendedFromTuple(ast, input);
    default:
      throw new Error("Don't know how to handle this AST");
  }
}
export function encodeTo<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  input: A,
): Either.Either<Bytes, RlpEncodeError> {
  const extended = extractExtendedFromAst(schema.ast, input);
  return Either.right(encode(extended));
}

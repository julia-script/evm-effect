import {
  Bytes,
  Bytes0,
  Bytes1,
  Bytes4,
  Bytes8,
  Bytes20,
  Bytes32,
  Bytes64,
  Bytes256,
  U8,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import { SchemaAST as AST, Option } from "effect";
export const normalize = (ast: AST.AST): AST.AST => {
  if (AST.isTransformation(ast)) {
    return normalize(ast.to);
  }
  return ast;
};

export const UINT_CLASSES_BY_TAG = {
  [Uint._tag]: Uint,
  [U256._tag]: U256,
  [U64._tag]: U64,
  [U8._tag]: U8,
};

export const BYTES_CLASSES_BY_TAG = {
  [Bytes._tag]: Bytes,
  [Bytes0._tag]: Bytes0,
  [Bytes1._tag]: Bytes1,
  [Bytes4._tag]: Bytes4,
  [Bytes8._tag]: Bytes8,
  [Bytes20._tag]: Bytes20,
  [Bytes32._tag]: Bytes32,
  [Bytes64._tag]: Bytes64,
  [Bytes256._tag]: Bytes256,
};

export const ExtendedTagsRegex = /^Bytes\d+|Address|U(int|\d{1,3})$/;
export function isExtended(type: AST.Declaration | AST.TypeLiteral): boolean {
  const identifier = AST.getIdentifierAnnotation(type);
  if (identifier._tag === "Some") {
    return (
      BYTES_CLASSES_BY_TAG[
        identifier.value as keyof typeof BYTES_CLASSES_BY_TAG
      ] !== undefined ||
      UINT_CLASSES_BY_TAG[
        identifier.value as keyof typeof UINT_CLASSES_BY_TAG
      ] !== undefined ||
      identifier.value === "Address"
    );
    // return ExtendedTagsRegex.test(identifier.value);
  }
  return false;
}
export const getIdentifierAnnotation = (type: AST.AST): string | undefined => {
  const identifier = AST.getIdentifierAnnotation(type);
  return Option.getOrUndefined(identifier);
};
export const getConcretes = (type: AST.Union): AST.AST[] => {
  return type.types.filter((type) => {
    if (AST.isUndefinedKeyword(type)) return false;
    if (
      AST.isLiteral(type) &&
      (type.literal === null || type.literal === undefined)
    )
      return false;
    return true;
  });
};

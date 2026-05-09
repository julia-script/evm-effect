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
  Int,
  U8,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import { SchemaAST as AST } from "effect";

const never = (): never => {
  throw new Error("Never");
};
export const UINT_CLASSES_BY_TAG = {
  [AST.resolveIdentifier(Uint.ast) ?? never()]: Uint,
  [AST.resolveIdentifier(U256.ast) ?? never()]: U256,
  [AST.resolveIdentifier(U64.ast) ?? never()]: U64,
  [AST.resolveIdentifier(U8.ast) ?? never()]: U8,
  [AST.resolveIdentifier(Int.ast) ?? never()]: Int,
};

export const BYTES_CLASSES_BY_TAG = {
  [AST.resolveIdentifier(Bytes.ast) ?? never()]: Bytes,
  [AST.resolveIdentifier(Bytes0.ast) ?? never()]: Bytes0,
  [AST.resolveIdentifier(Bytes1.ast) ?? never()]: Bytes1,
  [AST.resolveIdentifier(Bytes4.ast) ?? never()]: Bytes4,
  [AST.resolveIdentifier(Bytes8.ast) ?? never()]: Bytes8,
  [AST.resolveIdentifier(Bytes20.ast) ?? never()]: Bytes20,
  [AST.resolveIdentifier(Bytes32.ast) ?? never()]: Bytes32,
  [AST.resolveIdentifier(Bytes64.ast) ?? never()]: Bytes64,
  [AST.resolveIdentifier(Bytes256.ast) ?? never()]: Bytes256,
};

export const ExtendedTagsRegex = /^Bytes\d+|Address|U(int|\d{1,3})$/;
export function isExtended(type: AST.Declaration): boolean {
  const identifier = AST.resolveIdentifier(type);
  if (identifier) {
    return (
      BYTES_CLASSES_BY_TAG[identifier as keyof typeof BYTES_CLASSES_BY_TAG] !==
        undefined ||
      UINT_CLASSES_BY_TAG[identifier as keyof typeof UINT_CLASSES_BY_TAG] !==
        undefined ||
      identifier === "Address"
    );
  }
  return false;
}
export const getIdentifierAnnotation = (type: AST.AST): string | undefined => {
  return AST.resolveIdentifier(type);
};
export const getConcretes = (type: AST.Union): AST.AST[] => {
  return type.types.filter((type) => {
    if (AST.isUndefined(type)) return false;
    if (
      AST.isLiteral(type) &&
      (type.literal === null || type.literal === undefined)
    )
      return false;
    return true;
  });
};

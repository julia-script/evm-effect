/**
 * Ethereum Types
 *
 * Numeric and bytes types for Ethereum with Effect-TS
 *
 * @module
 */

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
  isBytes,
} from "./bytes.js";
import { Address } from "./domain.js";
import { isUnsignedInt, U8, U64, U256, Uint } from "./numeric.js";

export type { AnyBytes } from "./bytes.js";
export {
  Bytes,
  Bytes0,
  Bytes1,
  Bytes4,
  Bytes8,
  Bytes20,
  Bytes32,
  Bytes64,
  Bytes256,
  cloneBytes,
  concat,
  equals,
  extractAndPad,
  fromHex,
  isBytes,
  pad,
  slice,
  toHex,
} from "./bytes.js";

export {
  Address,
  type Bloom,
  type Hash32,
  type Root,
  type VersionedHash,
} from "./domain.js";
export { EvmTypeError } from "./exceptions.js";

export {
  type AnyUint,
  // Arithmetic operations
  add,
  addWrap,
  // Bitwise operations
  and,
  // Utility
  bitLength,
  div,
  eq,
  type FixedUnsigned,
  fromBeBytes,
  fromLeBytes,
  gt,
  gte,
  Int,
  isUnsignedInt,
  isZero,
  // Comparison operations
  lt,
  lte,
  mod,
  mul,
  mulWrap,
  not,
  or,
  pow,
  shl,
  shr,
  sub,
  subWrap,
  toBeBytes,
  toBeBytes4,
  toBeBytes8,
  toBeBytes32,
  toBeBytes64,
  // Conversion operations
  toBigInt,
  toBytes1,
  toBytes32,
  toLeBytes4,
  toLeBytes8,
  toNumber,
  toSigned,
  U8,
  U64,
  U256,
  Uint,
  ulen,
  wrappingPow,
  xor,
} from "./numeric.js";

export const isBytesClass = (
  val: unknown,
): val is
  | typeof Bytes
  | typeof Bytes0
  | typeof Bytes1
  | typeof Bytes4
  | typeof Bytes8
  | typeof Bytes20
  | typeof Bytes32
  | typeof Bytes64
  | typeof Bytes256 => {
  return (
    val === Bytes ||
    val === Bytes0 ||
    val === Bytes1 ||
    val === Bytes4 ||
    val === Bytes8 ||
    val === Bytes20 ||
    val === Bytes32 ||
    val === Bytes64 ||
    val === Bytes256
  );
};
export const isUnsignedIntClass = (
  val: unknown,
): val is typeof U256 | typeof U64 | typeof U8 | typeof Uint => {
  return val === U256 || val === U64 || val === U8 || val === Uint;
};
export const isAddressClass = (val: unknown): val is typeof Address => {
  return val === Address;
};
export const isEvmTypeClass = (val: unknown) => {
  return isBytesClass(val) || isUnsignedIntClass(val) || isAddressClass(val);
};
export const isAddress = (val: unknown): val is Address => {
  return val instanceof Address;
};
export const isEvmType = (val: unknown) => {
  return isBytes(val) || isUnsignedInt(val) || isAddress(val);
};

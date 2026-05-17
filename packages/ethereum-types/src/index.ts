/**
 * Ethereum Types
 *
 * Numeric and bytes types for Ethereum with Effect-TS
 *
 * @module
 */

import * as bytes from "./bytes.js";

export * from "./bytes.js";

import { Address } from "./domain.js";
import { isUnsignedInt, U8, U64, U256, Uint } from "./numeric.js";

export type { AnyBytes } from "./bytes.js";

import * as domain from "./domain.js";

export * from "./domain.js";

import * as exceptions from "./exceptions.js";

export * from "./exceptions.js";

import * as numeric from "./numeric.js";

export * from "./numeric.js";

import * as EthBaseTypesSchema from "./schemas/base-types.js";

export * from "./schemas/base-types.js";

export const EthTypes = {
  ...EthBaseTypesSchema,
  ...bytes,
  ...numeric,
  ...domain,
  ...exceptions,
};
export default EthTypes;

export const isBytesClass = (
  val: unknown,
): val is
  | typeof EthTypes.Bytes
  | typeof EthTypes.Bytes0
  | typeof EthTypes.Bytes1
  | typeof EthTypes.Bytes4
  | typeof EthTypes.Bytes8
  | typeof EthTypes.Bytes20
  | typeof EthTypes.Bytes32
  | typeof EthTypes.Bytes64
  | typeof EthTypes.Bytes256 => {
  return (
    val === EthTypes.Bytes ||
    val === EthTypes.Bytes0 ||
    val === EthTypes.Bytes1 ||
    val === EthTypes.Bytes4 ||
    val === EthTypes.Bytes8 ||
    val === EthTypes.Bytes20 ||
    val === EthTypes.Bytes32 ||
    val === EthTypes.Bytes64 ||
    val === EthTypes.Bytes256
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
  return EthTypes.isBytes(val) || isUnsignedInt(val) || isAddress(val);
};

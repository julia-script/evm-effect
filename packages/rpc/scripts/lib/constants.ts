/** Component schemas inlined from @evm-effect/ethereum-types instead of generated. */
export const ignoredSchemas = new Set([
  "address",
  "addresses",
  "byte",
  "bytes",
  "bytes16",
  "bytes256",
  "bytes32",
  "bytes48",
  "bytes65",
  "bytes8",
  "bytes96",
  "bytesMax32",
  "hash32",
  "uint",
  "uint256",
  "uint32",
  "uint64",
  "uintDecimal",
]);

/** Maps OpenRPC $ref paths to ethereum-types schema expressions. */
export const refToEthType: Record<string, string> = {
  "#/components/schemas/address": "EthTypes.HexString",
  "#/components/schemas/bytes": "EthTypes.HexString",
  "#/components/schemas/uintDecimal": "Schema.BigInt",
  "#/components/schemas/hash32": "EthTypes.HexString",
  "#/components/schemas/bytes256": "EthTypes.HexString",
  "#/components/schemas/bytes96": "EthTypes.HexString",
  "#/components/schemas/bytes65": "EthTypes.HexString",
  "#/components/schemas/bytes48": "EthTypes.HexString",
  "#/components/schemas/bytes8": "EthTypes.HexString",
  "#/components/schemas/bytes16": "EthTypes.HexString",
  "#/components/schemas/bytesMax32": "EthTypes.HexString",
  "#/components/schemas/bytes32": "EthTypes.HexString",
  "#/components/schemas/bytes64": "EthTypes.HexString",
  "#/components/schemas/uint": "EthTypes.BigIntFromString",
  "#/components/schemas/uint8": "EthTypes.BigIntFromString",
  "#/components/schemas/uint16": "EthTypes.BigIntFromString",
  "#/components/schemas/uint32": "EthTypes.BigIntFromString",
  "#/components/schemas/uint64": "EthTypes.BigIntFromString",
  "#/components/schemas/uint256": "EthTypes.BigIntFromString",
  "#/components/schemas/int": "EthTypes.BigIntFromString",
  "#/components/schemas/byte": "EthTypes.HexString",
  "#/components/schemas/addresses": "Schema.Array(EthTypes.HexString)",
};

export const COMPONENTS_SCHEMA_PREFIX = "#/components/schemas/";

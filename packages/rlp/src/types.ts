import type {
  Address,
  AnyBytes,
  AnyUint,
  Bytes,
} from "@evm-effect/ethereum-types";

export type Extended =
  | string
  | boolean
  | Uint8Array
  | Address
  | AnyBytes
  | AnyUint
  | Extended[];

export type Simple = Bytes | Simple[];

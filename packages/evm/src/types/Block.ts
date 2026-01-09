/**
 * Block and Header types for Ethereum.
 *
 * @module
 */

import {
  Address,
  Bytes,
  Bytes8,
  Bytes32,
  Bytes256,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import rlp from "@evm-effect/rlp";
import { Effect, Schema } from "effect";
import { LegacyTransaction } from "./Transaction.js";

/**
 * Withdrawal represents a transfer of ETH from the consensus layer
 * (beacon chain) to the execution layer.
 *
 * Introduced in EIP-4895 (Shanghai/Capella).
 */
export const Withdrawal = Schema.TaggedStruct("Withdrawal", {
  index: U64,
  validatorIndex: U64,
  address: Address,
  amount: U256,
});
export type Withdrawal = (typeof Withdrawal)["Type"];

/**
 * Block header containing metadata and cryptographic commitments.
 *
 * The header contains all the metadata about a block including:
 * - Parent hash linkage
 * - State, transaction, and receipt roots
 * - Difficulty, gas, and timestamp
 * - Post-merge PoS fields (prevRandao)
 * - EIP-1559 base fee (London+)
 * - EIP-4895 withdrawals root (Shanghai+)
 * - EIP-4844 blob gas fields (Cancun+)
 * - EIP-4788 beacon block root (Cancun+)
 * - EIP-7685 requests hash (Prague+)
 *
 * Fork-specific fields are optional - undefined means not present in the block's RLP.
 * This is important for correct hash calculation.
 */
export const Header = Schema.TaggedStruct("Header", {
  parentHash: Bytes32, // Hash32
  ommersHash: Bytes32, // Hash32
  coinbase: Address,
  stateRoot: Bytes32, // Root
  transactionsRoot: Bytes32, // Root
  receiptRoot: Bytes32, // Root (note: receiptRoot, not receiptsRoot)
  bloom: Bytes256, // Bloom
  difficulty: Uint,
  number: Uint,
  gasLimit: Uint,
  gasUsed: Uint,
  timestamp: U256,
  extraData: Bytes,
  prevRandao: Bytes32,
  nonce: Bytes8,
  // Fork-specific fields - undefined means not present in RLP (important for hash calculation)
  baseFeePerGas: Schema.optional(Uint), // London+ (EIP-1559)
  withdrawalsRoot: Schema.optional(Bytes32), // Shanghai+ (EIP-4895)
  blobGasUsed: Schema.optional(U64), // Cancun+ (EIP-4844)
  excessBlobGas: Schema.optional(U64), // Cancun+ (EIP-4844)
  parentBeaconBlockRoot: Schema.optional(Bytes32), // Cancun+ (EIP-4788)
  requestsHash: Schema.optional(Bytes32), // Prague+ (EIP-7685)
});
export type Header = (typeof Header)["Type"];

export const decodeHeader = Effect.fn("decodeHeader")(function* (
  header: Bytes,
) {
  return yield* rlp.decodeTo(Header, header);
});

export const decodeBlock = Effect.fn("decodeBlock")(function* (block: Bytes) {
  return yield* rlp.decodeTo(Block, block);
});
export const Block = Schema.TaggedStruct("Block", {
  header: Header,
  transactions: Schema.Array(Schema.Union(Bytes, LegacyTransaction)),
  ommers: Schema.Array(Header),
  withdrawals: Schema.optionalWith(Schema.Array(Withdrawal), {
    default: () => [],
  }),
});

export type Block = (typeof Block)["Type"];

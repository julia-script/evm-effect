/**
 * Transaction receipts and logs.
 *
 * @module
 */

import {
  Address,
  Bytes,
  Bytes32,
  Bytes256,
  Uint,
} from "@evm-effect/ethereum-types";
import { Schema } from "effect";

/**
 * Log entry emitted by a smart contract during transaction execution.
 *
 * Logs are produced by the EVM log opcodes (LOG0-LOG4) and can be
 * efficiently searched using the bloom filter in the block header.
 */
export class Log extends Schema.TaggedClass<Log>("Log")("Log", {
  address: Address,
  topics: Schema.Array(Bytes32),
  data: Bytes,
}) {}

/**
 * Receipt of a transaction execution (Byzantium and later - EIP-658).
 *
 * Contains the result of executing a transaction:
 * - Whether it succeeded or reverted (status code)
 * - Cumulative gas used in the block
 * - Bloom filter for efficient log searching
 * - All logs emitted during execution
 */
export class Receipt extends Schema.TaggedClass<Receipt>("Receipt")("Receipt", {
  succeeded: Schema.Boolean,
  cumulativeGasUsed: Uint,
  bloom: Bytes256,
  logs: Schema.Array(Log),
}) {}

/**
 * Receipt of a transaction execution (pre-Byzantium: Frontier to Spurious Dragon).
 *
 * Contains the result of executing a transaction:
 * - Post-transaction state root (32 bytes)
 * - Cumulative gas used in the block
 * - Bloom filter for efficient log searching
 * - All logs emitted during execution
 *
 * Note: Pre-Byzantium receipts use state root instead of status code.
 */
export class LegacyReceipt extends Schema.TaggedClass<LegacyReceipt>(
  "LegacyReceipt",
)("LegacyReceipt", {
  postState: Bytes32,
  cumulativeGasUsed: Uint,
  bloom: Bytes256,
  logs: Schema.Array(Log),
}) {}

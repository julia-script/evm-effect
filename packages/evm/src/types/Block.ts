/**
 * Block and Header types for Ethereum.
 *
 * @module
 */

import { encodeTransaction } from "@evm-effect/crypto/transactions";
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
import rlp, { type Extended } from "@evm-effect/rlp";
import { Effect, Either, Schema } from "effect";
import type { Transaction } from "./Transaction.js";
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
  parentHash: Bytes32,
  ommersHash: Bytes32,
  coinbase: Address,
  stateRoot: Bytes32,
  transactionsRoot: Bytes32,
  receiptRoot: Bytes32,
  bloom: Bytes256,
  difficulty: Uint,
  number: Uint,
  gasLimit: Uint,
  gasUsed: Uint,
  timestamp: U256,
  extraData: Bytes,
  prevRandao: Bytes32,
  nonce: Bytes8,
  baseFeePerGas: Schema.optional(Uint),
  withdrawalsRoot: Schema.optional(Bytes32),
  blobGasUsed: Schema.optional(U64),
  excessBlobGas: Schema.optional(U64),
  parentBeaconBlockRoot: Schema.optional(Bytes32),
  requestsHash: Schema.optional(Bytes32),
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

/**
 * RLP encode a block header.
 *
 * This function manually encodes the header fields in the correct order
 *
 * Fork-specific fields are only included if they are defined (not undefined).
 * This is critical for correct hash calculation - older forks don't have
 * these fields in their RLP encoding.
 *
 * @param header - The header to encode
 * @returns The RLP-encoded header as Bytes
 */
export const encodeHeader = (header: Header): Bytes => {
  const fields: Extended[] = [
    header.parentHash.value,
    header.ommersHash.value,
    header.coinbase.value,
    header.stateRoot.value,
    header.transactionsRoot.value,
    header.receiptRoot.value,
    header.bloom.value,
    header.difficulty,
    header.number,
    header.gasLimit,
    header.gasUsed,
    header.timestamp,
    header.extraData.value,
    header.prevRandao.value,
    header.nonce.value,
  ];

  if (header.baseFeePerGas !== undefined) {
    fields.push(header.baseFeePerGas);

    if (header.withdrawalsRoot !== undefined) {
      fields.push(header.withdrawalsRoot.value);

      if (
        header.blobGasUsed !== undefined &&
        header.excessBlobGas !== undefined &&
        header.parentBeaconBlockRoot !== undefined
      ) {
        fields.push(header.blobGasUsed);
        fields.push(header.excessBlobGas);
        fields.push(header.parentBeaconBlockRoot.value);

        // Prague+ (EIP-7685): requestsHash
        if (header.requestsHash !== undefined) {
          fields.push(header.requestsHash.value);
        }
      }
    }
  }

  return rlp.encode(fields as Extended);
};

/**
 * Encode a withdrawal for RLP.
 *
 * @param withdrawal - The withdrawal to encode
 * @returns The RLP-encoded withdrawal fields
 */
const encodeWithdrawal = (withdrawal: Withdrawal): Extended[] => {
  return [
    withdrawal.index,
    withdrawal.validatorIndex,
    withdrawal.address.value,
    withdrawal.amount,
  ];
};

/**
 * RLP encode a complete block.
 *
 * A block is encoded as: [header, transactions, ommers, withdrawals?]
 * - header: RLP encoded header fields
 * - transactions: list of encoded transactions (legacy or typed)
 * - ommers: list of encoded ommer headers
 * - withdrawals: list of encoded withdrawals (only present post-Shanghai)
 *
 * `rlp.encode(block)` where block = [header, transactions, ommers, withdrawals]
 *
 * @param block - The block to encode
 * @returns Either the RLP-encoded block as Bytes or an error
 */
export const encodeBlock = (
  block: Block,
): Either.Either<Bytes, { message: string }> => {
  // Encode header fields (as a list, not as bytes)
  const headerFields: Extended[] = [
    block.header.parentHash.value,
    block.header.ommersHash.value,
    block.header.coinbase.value,
    block.header.stateRoot.value,
    block.header.transactionsRoot.value,
    block.header.receiptRoot.value,
    block.header.bloom.value,
    block.header.difficulty,
    block.header.number,
    block.header.gasLimit,
    block.header.gasUsed,
    block.header.timestamp,
    block.header.extraData.value,
    block.header.prevRandao.value,
    block.header.nonce.value,
  ];

  if (block.header.baseFeePerGas !== undefined) {
    headerFields.push(block.header.baseFeePerGas);

    if (block.header.withdrawalsRoot !== undefined) {
      headerFields.push(block.header.withdrawalsRoot.value);

      if (
        block.header.blobGasUsed !== undefined &&
        block.header.excessBlobGas !== undefined &&
        block.header.parentBeaconBlockRoot !== undefined
      ) {
        headerFields.push(block.header.blobGasUsed);
        headerFields.push(block.header.excessBlobGas);
        headerFields.push(block.header.parentBeaconBlockRoot.value);

        if (block.header.requestsHash !== undefined) {
          headerFields.push(block.header.requestsHash.value);
        }
      }
    }
  }

  // Encode transactions
  const encodedTransactions: Extended[] = [];
  for (const tx of block.transactions) {
    if (tx._tag === "Bytes") {
      // Already encoded transaction bytes
      encodedTransactions.push(tx.value);
    } else {
      // Need to encode the transaction
      const encodedResult = encodeTransaction(tx as Transaction);
      if (Either.isLeft(encodedResult)) {
        return Either.left({ message: `Failed to encode transaction` });
      }
      const encoded = encodedResult.right;
      if (encoded._tag === "LegacyTransaction") {
        // Legacy transactions are RLP encoded directly as a list
        const legacyResult = rlp.encodeTo(LegacyTransaction, encoded);
        if (Either.isLeft(legacyResult)) {
          return Either.left({
            message: `Failed to encode legacy transaction`,
          });
        }
        encodedTransactions.push(legacyResult.right.value);
      } else {
        // Typed transactions are already prefixed bytes
        encodedTransactions.push(encoded.value);
      }
    }
  }

  // Encode ommers (uncle block headers)
  const encodedOmmers: Extended[] = block.ommers.map((ommer) => [
    ommer.parentHash.value,
    ommer.ommersHash.value,
    ommer.coinbase.value,
    ommer.stateRoot.value,
    ommer.transactionsRoot.value,
    ommer.receiptRoot.value,
    ommer.bloom.value,
    ommer.difficulty,
    ommer.number,
    ommer.gasLimit,
    ommer.gasUsed,
    ommer.timestamp,
    ommer.extraData.value,
    ommer.prevRandao.value,
    ommer.nonce.value,
    // Ommers are from pre-merge so they don't have post-London fields
  ]);

  // Build the block structure
  // Post-Shanghai blocks include withdrawals
  const hasWithdrawals = block.header.withdrawalsRoot !== undefined;

  const blockFields: Extended[] = [
    headerFields,
    encodedTransactions,
    encodedOmmers,
  ];

  if (hasWithdrawals && block.withdrawals) {
    const encodedWithdrawals = block.withdrawals.map(encodeWithdrawal);
    blockFields.push(encodedWithdrawals);
  }

  return Either.right(rlp.encode(blockFields));
};

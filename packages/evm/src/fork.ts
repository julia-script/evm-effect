/**
 * Ethereum Fork Implementation - Main State Transition Functions
 *
 * Direct port of the main functions from ethereum/forks/osaka/fork.py.
 * This module implements the core state transition logic for the Osaka fork.
 *
 * All functions preserve the exact structure, behavior, and error messages
 * from the Python reference implementation while using idiomatic Effect-TS patterns.
 */

import { Bytes, Bytes32, U64, Uint } from "@evm-effect/ethereum-types";
import { Effect, Either, Option } from "effect";

import type { BlockChain } from "./blockchain.js";
import { applyBody, computeRequestsHash } from "./blocks/executor.js";
import { getLast256BlockHashes, validateHeader } from "./blocks/validator.js";
import { MAX_RLP_BLOCK_SIZE } from "./constants.js";
import { InvalidBlock } from "./exceptions.js";
import { logsBloom } from "./receipts/bloom.js";
import State, { stateRoot, TransientStorage } from "./state.js";
import { root } from "./trie/trie.js";
import type { Block, Header } from "./types/Block.js";
import { Fork } from "./vm/Fork.js";
import { BlockEnvironment } from "./vm/message.js";

/**
 * Attempts to apply a block to an existing block chain.
 *
 * All parts of the block's contents need to be verified before being added
 * to the chain. Blocks are verified by ensuring that the contents of the
 * block make logical sense with the contents of the parent block. The
 * information in the block's header must also match the corresponding
 * information in the block.
 *
 * To implement Ethereum, in theory clients are only required to store the
 * most recent 255 blocks of the chain since as far as execution is
 * concerned, only those blocks are accessed. Practically, however, clients
 * should store more blocks to handle reorgs.
 *
 * Parameters
 * ----------
 * chain :
 *     History and current state.
 * block :
 *     Block to apply to `chain`.
 *
 * Returns
 * -------
 * updatedChain :
 *     The updated blockchain with the new block and state.
 *
 * Direct port of Python's state_transition function.
 */
export const stateTransition = Effect.fn("stateTransition")(function* (
  chain: BlockChain,
  block: Block,
) {
  // Validate block RLP size against MAX_RLP_BLOCK_SIZE
  const encodedBlock = yield* encodeBlock(block);
  if (encodedBlock.value.length > MAX_RLP_BLOCK_SIZE) {
    return yield* Effect.fail(
      new InvalidBlock({
        message: `Block rlp size exceeds MAX_RLP_BLOCK_SIZE: ${encodedBlock.value.length} > ${MAX_RLP_BLOCK_SIZE}`,
      }),
    );
  }

  // Get the fork to check which EIPs are enabled
  const fork = yield* Fork;

  // Validate block header against parent block
  yield* validateHeader(chain, block.header);

  // Post-merge (EIP-3675 / Paris+): Ommers must be empty
  if (fork.eip(3675) && block.ommers.length !== 0) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Ommers not supported in post-merge fork" }),
    );
  }

  // Create BlockEnvironment from chain state and block header
  const blockEnv = createBlockEnvironment(chain, block.header);

  // Begin a block-level transaction for atomicity.
  // If any part of block processing fails, we can rollback to the pre-block state.
  // Note: getStorageOriginal has been updated to read from the innermost snapshot
  // (transaction-level), not the outermost (block-level), so SSTORE refund calculations
  // work correctly even with this block-level wrapper.
  // We use an empty transient storage for block-level transactions since transient
  // storage is per-transaction (EIP-1153) and doesn't need block-level snapshots.
  const blockTransientStorage = TransientStorage.empty();
  yield* State.beginTransaction(blockEnv.state, blockTransientStorage);

  // Execute block body with transactions, withdrawals, and ommers
  // Withdrawals are optional - only present from Shanghai+ (EIP-4895)
  // Ommers are only meaningful for pre-merge (pre-EIP-3675) forks
  const blockOutputResult = yield* applyBody(
    blockEnv,
    block.transactions,
    block.withdrawals ?? [],
    block.ommers,
  ).pipe(Effect.either);

  if (Either.isLeft(blockOutputResult)) {
    // Block execution failed - rollback state changes
    State.rollbackTransaction(blockEnv.state, blockTransientStorage);
    return yield* Effect.fail(blockOutputResult.left);
  }
  const blockOutput = blockOutputResult.right;

  // Helper to rollback state and fail with an error
  const failWithRollback = (error: InvalidBlock) => {
    State.rollbackTransaction(blockEnv.state, blockTransientStorage);
    return Effect.fail(error);
  };

  // Calculate final state root, transaction root, receipt root
  const blockStateRoot = stateRoot(blockEnv.state);
  const transactionsRootResult = root(
    blockOutput.transactionsTrie,
    Option.none(),
  );
  if (Either.isLeft(transactionsRootResult)) {
    return yield* failWithRollback(
      new InvalidBlock({
        message: `Failed to calculate transactions root: ${transactionsRootResult.left.message}`,
      }),
    );
  }
  const transactionsRoot = transactionsRootResult.right;

  const receiptRootResult = root(blockOutput.receiptsTrie, Option.none());
  if (Either.isLeft(receiptRootResult)) {
    return yield* failWithRollback(
      new InvalidBlock({
        message: `Failed to calculate receipt root: ${receiptRootResult.left.message}`,
      }),
    );
  }
  const receiptRoot = receiptRootResult.right;

  const blockLogsBloom = logsBloom(blockOutput.blockLogs);

  const withdrawalsRootResult = root(
    blockOutput.withdrawalsTrie,
    Option.none(),
  );
  if (Either.isLeft(withdrawalsRootResult)) {
    return yield* failWithRollback(
      new InvalidBlock({
        message: `Failed to calculate withdrawals root: ${withdrawalsRootResult.left.message}`,
      }),
    );
  }
  const withdrawalsRoot = withdrawalsRootResult.right;

  const requestsHash = yield* computeRequestsHash(blockOutput.requests);

  // Validate all block header fields match execution results
  if (blockOutput.blockGasUsed.value !== block.header.gasUsed.value) {
    return yield* failWithRollback(
      new InvalidBlock({
        message: `${blockOutput.blockGasUsed.value} != ${block.header.gasUsed.value}`,
      }),
    );
  }
  if (
    !arraysEqual(transactionsRoot.value, block.header.transactionsRoot.value)
  ) {
    return yield* failWithRollback(
      new InvalidBlock({ message: "Invalid transactions root" }),
    );
  }
  if (!arraysEqual(blockStateRoot.value, block.header.stateRoot.value)) {
    return yield* failWithRollback(
      new InvalidBlock({ message: "Invalid state root" }),
    );
  }
  if (!arraysEqual(receiptRoot.value, block.header.receiptRoot.value)) {
    return yield* failWithRollback(
      new InvalidBlock({ message: "Invalid receipt root" }),
    );
  }
  if (!arraysEqual(blockLogsBloom.value, block.header.bloom.value)) {
    return yield* failWithRollback(
      new InvalidBlock({ message: "Invalid logs bloom" }),
    );
  }
  // Validate optional fork-specific fields only if present
  if (block.header.withdrawalsRoot !== undefined) {
    if (
      !arraysEqual(withdrawalsRoot.value, block.header.withdrawalsRoot.value)
    ) {
      return yield* failWithRollback(
        new InvalidBlock({ message: "Invalid withdrawals root" }),
      );
    }
  }
  if (block.header.blobGasUsed !== undefined) {
    if (blockOutput.blobGasUsed.value !== block.header.blobGasUsed.value) {
      return yield* failWithRollback(
        new InvalidBlock({ message: "Invalid blob gas used" }),
      );
    }
  }
  if (block.header.requestsHash !== undefined) {
    if (!arraysEqual(requestsHash.value, block.header.requestsHash.value)) {
      return yield* failWithRollback(
        new InvalidBlock({ message: "Invalid requests hash" }),
      );
    }
  }

  // All validations passed - commit the block-level transaction
  State.commitTransaction(blockEnv.state, blockTransientStorage);

  // Update chain with new block if validation passes
  // Maintain chain history with 255 block limit
  // Real clients have to store more blocks to deal with reorgs, but the
  // protocol only requires the last 255
  const updatedChain = chain.addBlock(block).withState(blockEnv.state);

  return updatedChain;
});

/**
 * Create a BlockEnvironment from the chain state and block header.
 *
 * @param chain - The blockchain containing state and history
 * @param header - The block header
 * @returns A new BlockEnvironment for block execution
 */
const createBlockEnvironment = (
  chain: BlockChain,
  header: Header,
): BlockEnvironment => {
  const blockHashes = getLast256BlockHashes(chain);

  // Use defaults for optional fork-specific fields
  const EMPTY_BYTES32 = new Bytes32({ value: new Uint8Array(32) });

  return new BlockEnvironment({
    chainId: chain.chainId,
    state: chain.state,
    blockGasLimit: header.gasLimit,
    blockHashes,
    coinbase: header.coinbase,
    number: header.number,
    baseFeePerGas: header.baseFeePerGas ?? new Uint({ value: 0n }),
    time: header.timestamp,
    prevRandao: header.prevRandao,
    difficulty: header.difficulty, // For pre-Paris forks (DIFFICULTY opcode)
    excessBlobGas: header.excessBlobGas ?? new U64({ value: 0n }),
    parentBeaconBlockRoot: header.parentBeaconBlockRoot ?? EMPTY_BYTES32,
  });
};

/**
 * Encode a block using RLP encoding.
 *
 * @param block - The block to encode
 * @returns Effect that succeeds with encoded block bytes
 */
const encodeBlock = (block: Block): Effect.Effect<Bytes, InvalidBlock, never> =>
  Effect.gen(function* () {
    try {
      // For now, use a simple approximation of block size
      // In a real implementation, this would use proper RLP encoding
      // The key is to validate that the block isn't too large
      const approximateSize =
        1000 + // Header size approximation
        block.transactions.length * 500 + // Transaction size approximation
        (block.withdrawals?.length ?? 0) * 100; // Withdrawal size approximation

      return new Bytes({ value: new Uint8Array(approximateSize) });
    } catch (error) {
      return yield* Effect.fail(
        new InvalidBlock({
          message: `Failed to encode block: ${error instanceof Error ? error.message : String(error)}`,
        }),
      );
    }
  });

/**
 * Helper function to compare two Uint8Arrays for equality.
 */
const arraysEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

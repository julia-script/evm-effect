import { Bytes32, U64, Uint } from "@evm-effect/ethereum-types";
import { Effect, Either, Option } from "effect";

import type { BlockChain } from "./blockchain.js";
import { applyBody, computeRequestsHash } from "./blocks/executor.js";
import { getLast256BlockHashes, validateHeader } from "./blocks/validator.js";
import { MAX_RLP_BLOCK_SIZE } from "./constants.js";
import {
  IncorrectBlobGasUsedError,
  InvalidBlock,
  InvalidRequestsError,
  InvalidWithdrawalsRootError,
} from "./exceptions.js";
import { logsBloom } from "./receipts/bloom.js";
import State, { stateRoot, TransientStorage } from "./state.js";
import { root } from "./trie/trie.js";
import { type Block, encodeBlock, type Header } from "./types/Block.js";
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
 */
export const stateTransition = Effect.fn("stateTransition")(function* (
  chain: BlockChain,
  block: Block,
) {
  const fork = yield* Fork;

  if (fork.eip(7934)) {
    const encodedBlockResult = encodeBlock(block);
    if (Either.isLeft(encodedBlockResult)) {
      return yield* Effect.fail(
        new InvalidBlock({
          message: `Failed to encode block: ${encodedBlockResult.left.message}`,
        }),
      );
    }
    const encodedBlock = encodedBlockResult.right;
    if (encodedBlock.value.length > MAX_RLP_BLOCK_SIZE) {
      return yield* Effect.fail(
        new InvalidBlock({
          message: "Block rlp size exceeds MAX_RLP_BLOCK_SIZE",
        }),
      );
    }
  }

  yield* validateHeader(chain, block.header);

  if (fork.eip(3675) && block.ommers.length !== 0) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Ommers not supported in post-merge fork" }),
    );
  }

  const blockEnv = createBlockEnvironment(chain, block.header);

  const blockTransientStorage = TransientStorage.empty();
  yield* State.beginTransaction(blockEnv.state, blockTransientStorage);

  const blockOutputResult = yield* applyBody(
    blockEnv,
    block.transactions,
    block.withdrawals ?? [],
    block.ommers,
  ).pipe(Effect.either);

  if (Either.isLeft(blockOutputResult)) {
    State.rollbackTransaction(blockEnv.state, blockTransientStorage);
    return yield* Effect.fail(blockOutputResult.left);
  }
  const blockOutput = blockOutputResult.right;

  const failWithRollback = <E>(error: E) => {
    State.rollbackTransaction(blockEnv.state, blockTransientStorage);
    return Effect.fail(error);
  };

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
  if (block.header.withdrawalsRoot !== undefined) {
    if (
      !arraysEqual(withdrawalsRoot.value, block.header.withdrawalsRoot.value)
    ) {
      return yield* failWithRollback(
        new InvalidWithdrawalsRootError({
          message: "Invalid withdrawals root",
        }),
      );
    }
  }
  if (block.header.blobGasUsed !== undefined) {
    if (blockOutput.blobGasUsed.value !== block.header.blobGasUsed.value) {
      return yield* failWithRollback(
        new IncorrectBlobGasUsedError({
          message: `Invalid blob gas used: expected ${block.header.blobGasUsed.value}, got ${blockOutput.blobGasUsed.value}`,
        }),
      );
    }
  }
  if (block.header.requestsHash !== undefined) {
    if (!arraysEqual(requestsHash.value, block.header.requestsHash.value)) {
      return yield* failWithRollback(
        new InvalidRequestsError({ message: "Invalid requests hash" }),
      );
    }
  }

  State.commitTransaction(blockEnv.state, blockTransientStorage);
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
    difficulty: header.difficulty,
    excessBlobGas: header.excessBlobGas ?? new U64({ value: 0n }),
    parentBeaconBlockRoot: header.parentBeaconBlockRoot ?? EMPTY_BYTES32,
  });
};

const arraysEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

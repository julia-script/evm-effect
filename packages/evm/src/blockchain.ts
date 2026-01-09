/**
 * Blockchain and Block Output types for Ethereum.
 *
 * This module contains the core blockchain data structures that represent
 * the chain state and block execution results.
 *
 * @module
 */

import { type Bytes, U64, Uint } from "@evm-effect/ethereum-types";
import { Data } from "effect";
import { State } from "./state.js";
import { Trie } from "./trie/trie.js";
import type { Block, Withdrawal } from "./types/Block.js";
import type { Log, Receipt } from "./types/Receipt.js";
import type { LegacyTransaction } from "./types/Transaction.js";

/**
 * History and current state of the block chain.
 *
 * This class represents the complete blockchain state including:
 * - Historical blocks (up to 255 recent blocks)
 * - Current world state (accounts, storage, code)
 * - Chain identifier
 *
 * The blockchain maintains only the most recent 255 blocks for BLOCKHASH
 * opcode support, though real clients store more for reorg handling.
 */
export class BlockChain extends Data.TaggedClass("BlockChain")<{
  /**
   * List of blocks in the chain.
   *
   * Only the most recent 255 blocks are kept for protocol compliance,
   * though real clients store more to handle reorganizations.
   */
  readonly blocks: readonly Block[];

  /**
   * Current world state containing all accounts, storage, and code.
   */
  readonly state: State;

  /**
   * Chain identifier used for transaction signing and replay protection.
   */
  readonly chainId: U64;
}> {
  /**
   * Create a new empty blockchain with the given chain ID.
   *
   * @param chainId - The chain identifier (e.g., 1 for mainnet)
   * @returns A new empty blockchain
   */
  static empty(chainId: U64): BlockChain {
    return new BlockChain({
      blocks: [],
      state: State.empty(),
      chainId,
    });
  }

  /**
   * Get the most recent block in the chain.
   *
   * @returns The latest block, or undefined if the chain is empty
   */
  get latestBlock(): Block | undefined {
    return this.blocks[this.blocks.length - 1];
  }

  /**
   * Get the number of blocks in the chain.
   *
   * @returns The chain length
   */
  get length(): number {
    return this.blocks.length;
  }

  /**
   * Add a new block to the chain.
   *
   * This method maintains the 255 block limit by removing older blocks
   * when necessary.
   *
   * @param block - The block to add
   * @returns A new blockchain with the block added
   */
  addBlock(block: Block): BlockChain {
    const newBlocks = [...this.blocks, block];

    // Maintain the 255 block limit as per protocol requirements
    const trimmedBlocks =
      newBlocks.length > 255 ? newBlocks.slice(-255) : newBlocks;

    return new BlockChain({
      blocks: trimmedBlocks,
      state: this.state,
      chainId: this.chainId,
    });
  }

  /**
   * Update the blockchain state.
   *
   * @param newState - The new state
   * @returns A new blockchain with the updated state
   */
  withState(newState: State): BlockChain {
    return new BlockChain({
      blocks: this.blocks,
      state: newState,
      chainId: this.chainId,
    });
  }
}

/**
 * Output from applying the block body to the present state.
 *
 * This class contains all the intermediate results and data structures
 * created during block execution, including tries for transactions,
 * receipts, and withdrawals, as well as gas usage and logs.
 *
 * All fields use immutable data structures to ensure proper Effect-TS
 * patterns and prevent accidental mutations.
 */
export type BlockOutput = {
  readonly _tag: "BlockOutput";
  blockGasUsed: Uint;
  transactionsTrie: Trie<
    Bytes,
    Bytes | LegacyTransaction,
    Bytes | LegacyTransaction | null
  >;
  receiptsTrie: Trie<Bytes, Bytes | Receipt, Bytes | Receipt | null>;
  receiptKeys: Bytes[];
  blockLogs: readonly Log[];
  withdrawalsTrie: Trie<Bytes, Withdrawal, Withdrawal | null>;
  blobGasUsed: U64;
  requests: readonly Bytes[];
};

export const BlockOutput = Data.tagged<BlockOutput>("BlockOutput");

export const emptyBlockOutput = (): BlockOutput => {
  return BlockOutput({
    blockGasUsed: new Uint({ value: 0n }),
    transactionsTrie: Trie.empty(false, null),
    receiptsTrie: Trie.empty(false, null),
    receiptKeys: [],
    blockLogs: [],
    withdrawalsTrie: Trie.empty(false, null),
    blobGasUsed: new U64({ value: 0n }),
    requests: [],
  });
};

/**
 * Ethereum Virtual Machine (EVM) Block Instructions
 *
 * Implementations of the EVM block-related instructions following the
 * Osaka fork specification.
 */

import { U256, Uint } from "@evm-effect/ethereum-types";
import { Effect } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { calculateBlobGasPrice } from "../../transactions/gas.js";
import { Evm } from "../evm.js";
import { Fork } from "../Fork.js";
import * as Gas from "../gas.js";

/**
 * BLOCKHASH: Get block hash
 *
 * Push the hash of one of the 256 most recent complete blocks onto the stack.
 * The block number to hash is present at the top of the stack.
 *
 * Returns 0 if:
 * - The requested block is the current block
 * - The requested block is more than 256 blocks in the past
 * - The requested block is in the future
 *
 * Gas: 20 (GAS_BLOCK_HASH)
 * Stack: [blockNumber, ...] -> [blockHash, ...]
 */
export const blockhash: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const blockNumber = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BLOCK_HASH);

    // OPERATION
    const blockNumberUint = new Uint({ value: blockNumber.value });
    const maxBlockNumber = new Uint({ value: blockNumberUint.value + 256n });
    const currentBlockNumber = evm.message.blockEnv.number;

    let currentBlockHash: U256;
    const blockHashes = evm.message.blockEnv.blockHashes;

    if (
      currentBlockNumber.value <= blockNumberUint.value ||
      currentBlockNumber.value > maxBlockNumber.value
    ) {
      // Default hash to 0 if:
      // - Block of interest is not yet on the chain (including current block)
      // - Block's age is more than 256
      currentBlockHash = new U256({ value: 0n });
    } else {
      // Get block hash from the list
      // blockHashes is ordered by increasing block number
      // Index calculation: convert negative Python-style index to positive
      // The array has hashes for blocks from (currentBlock - blockHashes.length) to (currentBlock - 1)
      const offset = Number(currentBlockNumber.value - blockNumberUint.value);
      const index = blockHashes.length - offset;

      // Bounds check - block might be before the available history
      if (index < 0 || index >= blockHashes.length) {
        currentBlockHash = new U256({ value: 0n });
      } else {
        const hash = blockHashes[index];
        currentBlockHash = U256.fromBeBytes(hash.value);
      }
    }

    yield* evm.stack.push(currentBlockHash);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * COINBASE: Get block beneficiary
 *
 * Push the current block's beneficiary address (address of the block miner)
 * onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [coinbase, ...]
 */
export const coinbase: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const coinbaseValue = U256.fromBeBytes(
      evm.message.blockEnv.coinbase.value.value,
    );
    yield* evm.stack.push(coinbaseValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * TIMESTAMP: Get block timestamp
 *
 * Push the current block's timestamp onto the stack (unix timestamp in seconds).
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [timestamp, ...]
 */
export const timestamp: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    yield* evm.stack.push(evm.message.blockEnv.time);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * NUMBER: Get block number
 *
 * Push the current block's number onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [blockNumber, ...]
 */
export const number: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const blockNumber = new U256({ value: evm.message.blockEnv.number.value });
    yield* evm.stack.push(blockNumber);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * PREVRANDAO / DIFFICULTY: Get previous block's RANDAO value or difficulty
 *
 * For Paris+ (post-merge, EIP-4399):
 * Push the `prev_randao` value onto the stack. This is the random output
 * of the beacon chain's randomness oracle for the previous block.
 *
 * For pre-Paris (pre-merge):
 * Push the block's difficulty onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [prevRandao/difficulty, ...]
 */
export const prevrandao: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;
    const fork = yield* Fork;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    let value: U256;
    if (fork.eip(4399)) {
      // Post-merge: return prevRandao
      value = U256.fromBeBytes(evm.message.blockEnv.prevRandao.value);
    } else {
      // Pre-merge: return difficulty
      value = new U256({ value: evm.message.blockEnv.difficulty.value });
    }
    yield* evm.stack.push(value);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * GASLIMIT: Get block gas limit
 *
 * Push the current block's gas limit onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [gasLimit, ...]
 */
export const gaslimit: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const gasLimit = new U256({
      value: evm.message.blockEnv.blockGasLimit.value,
    });
    yield* evm.stack.push(gasLimit);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * CHAINID: Get chain ID
 *
 * Push the chain id onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [chainId, ...]
 */
export const chainid: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const chainIdValue = new U256({
      value: evm.message.blockEnv.chainId.value,
    });
    yield* evm.stack.push(chainIdValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * SELFBALANCE: Get current contract's balance
 *
 * Push the balance of the currently executing account to the stack.
 *
 * Gas: 5 (GAS_LOW)
 * Stack: [...] -> [balance, ...]
 *
 * TODO: Integrate with State service to actually read account balance
 */
// const _selfbalance: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
//   function* () {
//     const evm = yield* Evm;

//     // GAS
//     yield* Gas.chargeGas(Gas.GAS_LOW);

//     // OPERATION
//     // TODO: Get balance from state
//     // const balance = yield* State.getBalance(evm.message.currentTarget);
//     const balance = new U256({ value: 0n });
//     yield* evm.stack.push(balance);

//     // PROGRAM COUNTER
//     yield* evm.incrementPC(1);
//   },
// );

/**
 * BASEFEE: Get base fee
 *
 * Push the current block's base fee per gas onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [baseFee, ...]
 */
export const basefee: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const baseFeeValue = new U256({
      value: evm.message.blockEnv.baseFeePerGas.value,
    });
    yield* evm.stack.push(baseFeeValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * BLOBBASEFEE: Get blob base fee
 *
 * Push the current block's blob base fee onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [blobBaseFee, ...]
 */
export const blobbasefee: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const excessBlobGas = evm.message.blockEnv.excessBlobGas;
    const blobGasPrice = yield* calculateBlobGasPrice(excessBlobGas);
    const blobBaseFee = new U256({ value: blobGasPrice.value });

    yield* evm.stack.push(blobBaseFee);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * BLOBHASH: Get transaction blob versioned hash
 *
 * Push the versioned hash of the blob at the given index from the current
 * transaction onto the stack.
 *
 * Gas: 3 (GAS_BLOBHASH_OPCODE)
 * Stack: [index, ...] -> [versionedHash, ...]
 */
export const blobhash: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const index = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BLOBHASH_OPCODE);

    // OPERATION
    const indexNum = Number(index.value);
    const blobHashes = evm.message.txEnv.blobVersionedHashes;

    let hash: U256;
    if (indexNum >= blobHashes.length) {
      // Index out of bounds - return 0
      hash = new U256({ value: 0n });
    } else {
      hash = U256.fromBeBytes(blobHashes[indexNum].value);
    }

    yield* evm.stack.push(hash);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

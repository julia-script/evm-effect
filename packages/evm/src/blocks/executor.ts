/**
 * Block Execution Functions
 *
 * Direct port of block execution functions from ethereum/forks/osaka/fork.py.
 * This module implements the apply_body function and related block processing logic.
 */

import { sha256 } from "@evm-effect/crypto";
import {
  type Address,
  Bytes,
  Bytes32,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import rlp from "@evm-effect/rlp";
import { Effect, Either, Equal } from "effect";
import { type BlockOutput, emptyBlockOutput } from "../blockchain.js";
import {
  BEACON_ROOTS_ADDRESS,
  BLOCK_REWARD_BYZANTIUM,
  BLOCK_REWARD_CONSTANTINOPLE,
  BLOCK_REWARD_FRONTIER,
  CONSOLIDATION_REQUEST_PREDEPLOY_ADDRESS,
  CONSOLIDATION_REQUEST_TYPE,
  DEPOSIT_CONTRACT_ADDRESS,
  DEPOSIT_EVENT_SIGNATURE_HASH,
  DEPOSIT_REQUEST_TYPE,
  HISTORY_STORAGE_ADDRESS,
  WITHDRAWAL_REQUEST_PREDEPLOY_ADDRESS,
  WITHDRAWAL_REQUEST_TYPE,
} from "../constants.js";
import { InvalidBlock } from "../exceptions.js";
import * as State from "../state.js";
import { processTransaction } from "../transactions/processor.js";
import type { Header, Withdrawal } from "../types/Block.js";
import { Receipt } from "../types/Receipt.js";
import {
  AccessListTransaction,
  BlobTransaction,
  FeeMarketTransaction,
  LegacyTransaction,
  SetCodeTransaction,
  type Transaction,
} from "../types/Transaction.js";
import { Fork } from "../vm/Fork.js";
import type { BlockEnvironment } from "../vm/message.js";
import {
  processCheckedSystemTransaction,
  processUncheckedSystemTransaction,
} from "./system.js";

/**
 * Executes a block.
 *
 * Many of the contents of a block are stored in data structures called
 * tries. There is a transactions trie which is similar to a ledger of the
 * transactions stored in the current block. There is also a receipts trie
 * which stores the results of executing a transaction, like the post state
 * and gas used. This function creates and executes the block that is to be
 * added to the chain.
 *
 * Parameters
 * ----------
 * blockEnv :
 *     The block scoped environment.
 * transactions :
 *     Transactions included in the block.
 * withdrawals :
 *     Withdrawals to be processed in the current block.
 *
 * Returns
 * -------
 * blockOutput :
 *     The block output for the current block.
 */
export const applyBody = (
  blockEnv: BlockEnvironment,
  transactions: readonly (Transaction | Bytes)[],
  withdrawals: readonly Withdrawal[],
  ommers: readonly Header[] = [],
) =>
  Effect.gen(function* () {
    // Initialize empty BlockOutput structure
    const blockOutput = emptyBlockOutput();

    // Get fork to check which EIPs are enabled
    const fork = yield* Fork;

    // Execute beacon roots system transaction (unchecked) - EIP-4788 (Cancun+)
    if (fork.eip(4788)) {
      yield* processUncheckedSystemTransaction(
        blockEnv,
        BEACON_ROOTS_ADDRESS,
        new Bytes({ value: blockEnv.parentBeaconBlockRoot.value }),
      );
    }

    // Execute history storage system transaction (unchecked) - EIP-2935 (Prague+)
    if (fork.eip(2935)) {
      const parentHash =
        blockEnv.blockHashes.length > 0
          ? new Bytes({
              value:
                blockEnv.blockHashes[blockEnv.blockHashes.length - 1].value,
            })
          : new Bytes({ value: new Uint8Array(32) }); // Default to zero hash if no parent

      yield* processUncheckedSystemTransaction(
        blockEnv,
        HISTORY_STORAGE_ADDRESS,
        parentHash,
      );
    }

    // Process all transactions in sequence with proper indexing
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const index = new Uint({ value: BigInt(i) });

      // Decode transaction if it's raw bytes
      const decodedTx = yield* decodeTransaction(tx);

      // Process the transaction
      yield* processTransaction(blockEnv, blockOutput, decodedTx, index).pipe(
        Effect.mapError(
          (error) =>
            new InvalidBlock({
              message: `Transaction processing failed: ${error}`,
            }),
        ),
      );
    }

    // Process withdrawals and update withdrawals trie
    yield* processWithdrawals(blockEnv, blockOutput, withdrawals);

    // Execute general purpose requests (deposits, withdrawals, consolidations)
    // Only for Prague+ (EIP-6110, EIP-7002, EIP-7251)
    if (fork.eip(6110)) {
      yield* processGeneralPurposeRequests(blockEnv, blockOutput);
    }

    // Pay block rewards for pre-merge (pre-EIP-3675) forks
    if (!fork.eip(3675)) {
      yield* payRewards(
        blockEnv.state,
        blockEnv.number,
        blockEnv.coinbase,
        ommers,
      );
    }

    return blockOutput;
  });

/**
 * Get the block reward for the current fork.
 *
 * Block rewards vary by fork:
 * - Frontier, Homestead, Tangerine Whistle, Spurious Dragon: 5 ETH
 * - Byzantium (EIP-649): 3 ETH
 * - Constantinople and later (EIP-1234): 2 ETH
 */
const getBlockReward = (fork: Fork["Type"]): Uint => {
  if (fork.eip(1234)) {
    // Constantinople and later: 2 ETH
    return BLOCK_REWARD_CONSTANTINOPLE;
  }
  if (fork.eip(649)) {
    // Byzantium: 3 ETH
    return BLOCK_REWARD_BYZANTIUM;
  }
  // Frontier, Homestead, etc.: 5 ETH
  return BLOCK_REWARD_FRONTIER;
};

/**
 * Pay rewards to the block miner as well as the ommer miners.
 *
 * The miner of the canonical block is rewarded with the predetermined
 * block reward (BLOCK_REWARD), plus a variable award based on the
 * number of ommer blocks that were mined around the same time.
 *
 * Parameters
 * ----------
 * state :
 *     Current account state.
 * blockNumber :
 *     Position of the block within the chain.
 * coinbase :
 *     Address of the block miner.
 * ommers :
 *     List of ommers (uncle blocks).
 */
const payRewards = Effect.fn("payRewards")(function* (
  state: State.State,
  blockNumber: Uint,
  coinbase: Address,
  ommers: readonly Header[],
) {
  const fork = yield* Fork;
  const blockReward = getBlockReward(fork);

  const ommerCount = BigInt(ommers.length);
  // Miner reward = BLOCK_REWARD + (ommer_count * (BLOCK_REWARD / 32))
  const minerReward = new U256({
    value: blockReward.value + (ommerCount * blockReward.value) / 32n,
  });
  yield* State.updateAccountBalance(
    state,
    coinbase,
    (balance) => new U256({ value: balance.value + minerReward.value }),
  );

  // Pay each ommer miner
  for (const ommer of ommers) {
    // Ommer age with respect to the current block
    const ommerAge = blockNumber.value - ommer.number.value;
    // Ommer miner reward = ((8 - ommer_age) * BLOCK_REWARD) / 8
    const ommerMinerReward = new U256({
      value: ((8n - ommerAge) * blockReward.value) / 8n,
    });
    yield* State.updateAccountBalance(
      state,
      ommer.coinbase,
      (balance) => new U256({ value: balance.value + ommerMinerReward.value }),
    );
  }
});

/**
 * Process withdrawals and update the withdrawals trie.
 *
 * Increase the balance of the withdrawing account.
 *
 * Parameters
 * ----------
 * blockEnv :
 *     The block scoped environment.
 * blockOutput :
 *     The block output for the current block.
 * withdrawals :
 *     Withdrawals to be processed in the current block.
 *
 * Returns
 * -------
 * blockOutput :
 *     Updated block output with processed withdrawals.
 */
const processWithdrawals = (
  blockEnv: BlockEnvironment,
  blockOutput: BlockOutput,
  withdrawals: readonly Withdrawal[],
): Effect.Effect<void, InvalidBlock, Fork> =>
  Effect.gen(function* () {
    const updatedWithdrawalsTrie = blockOutput.withdrawalsTrie.copy();

    for (let i = 0; i < withdrawals.length; i++) {
      const withdrawal = withdrawals[i];
      const index = new Uint({ value: BigInt(i) });

      // Add withdrawal to withdrawals trie
      const encodedIndex = rlp.encode(index);

      updatedWithdrawalsTrie.set(encodedIndex, withdrawal);

      // Increase recipient balance
      // Withdrawal amount is in Gwei, convert to Wei by multiplying by 10^9
      yield* increaseRecipientBalance(
        blockEnv,
        withdrawal.address,
        withdrawal.amount,
      );
    }

    blockOutput.withdrawalsTrie = updatedWithdrawalsTrie;
  });

/**
 * Process all the requests in the block.
 *
 * Parameters
 * ----------
 * blockEnv :
 *     The execution environment for the Block.
 * blockOutput :
 *     The block output for the current block.
 *
 * Returns
 * -------
 * blockOutput :
 *     Updated block output with processed requests.
 */
const processGeneralPurposeRequests = (
  blockEnv: BlockEnvironment,
  blockOutput: BlockOutput,
): Effect.Effect<void, InvalidBlock, Fork> =>
  Effect.gen(function* () {
    // Requests are to be in ascending order of request type
    // Parse deposit requests from block output
    const depositRequests = yield* parseDepositRequests(blockOutput);
    if (depositRequests.value.length > 0) {
      const depositRequestData = new Bytes({
        value: new Uint8Array([
          ...DEPOSIT_REQUEST_TYPE.value,
          ...depositRequests.value,
        ]),
      });
      blockOutput.requests = [...blockOutput.requests, depositRequestData];
    }

    // Process withdrawal requests
    const systemWithdrawalTxOutput = yield* processCheckedSystemTransaction(
      blockEnv,
      WITHDRAWAL_REQUEST_PREDEPLOY_ADDRESS,
      new Bytes({ value: new Uint8Array(0) }), // Empty data
    );

    if (systemWithdrawalTxOutput.returnData.value.length > 0) {
      const withdrawalRequestData = new Bytes({
        value: new Uint8Array([
          ...WITHDRAWAL_REQUEST_TYPE.value,
          ...systemWithdrawalTxOutput.returnData.value,
        ]),
      });
      blockOutput.requests = [...blockOutput.requests, withdrawalRequestData];
    }

    // Process consolidation requests
    const systemConsolidationTxOutput = yield* processCheckedSystemTransaction(
      blockEnv,
      CONSOLIDATION_REQUEST_PREDEPLOY_ADDRESS,
      new Bytes({ value: new Uint8Array(0) }), // Empty data
    );

    if (systemConsolidationTxOutput.returnData.value.length > 0) {
      const consolidationRequestData = new Bytes({
        value: new Uint8Array([
          ...CONSOLIDATION_REQUEST_TYPE.value,
          ...systemConsolidationTxOutput.returnData.value,
        ]),
      });
      blockOutput.requests = [
        ...blockOutput.requests,
        consolidationRequestData,
      ];
    }
  });

/**
 * Decode a transaction from bytes or return it if already decoded.
 *
 * @param tx - Transaction or raw bytes
 * @returns Effect that succeeds with decoded transaction
 */
const decodeTransaction = (
  tx: Transaction | Bytes,
): Effect.Effect<Transaction, InvalidBlock, never> =>
  Effect.gen(function* () {
    // Use tagged union pattern matching
    switch (tx._tag) {
      case "LegacyTransaction":
      case "AccessListTransaction":
      case "FeeMarketTransaction":
      case "BlobTransaction":
      case "SetCodeTransaction":
        return tx;

      case "Bytes": {
        if (tx.value.length === 0) {
          return yield* Effect.fail(
            new InvalidBlock({ message: "Empty transaction bytes" }),
          );
        }

        // Check first byte to determine transaction type
        const txType = tx.value[0];

        if (txType === 1) {
          const payload = new Bytes({ value: tx.value.slice(1) });
          const decoded = rlp.decodeTo(AccessListTransaction, payload);
          if (Either.isLeft(decoded)) {
            return yield* Effect.fail(
              new InvalidBlock({
                message: `Failed to decode access list transaction: ${decoded.left.message}`,
              }),
            );
          }
          return decoded.right;
        } else if (txType === 2) {
          const payload = new Bytes({ value: tx.value.slice(1) });
          const decoded = rlp.decodeTo(FeeMarketTransaction, payload);
          if (Either.isLeft(decoded)) {
            return yield* Effect.fail(
              new InvalidBlock({
                message: `Failed to decode fee market transaction: ${decoded.left.message}`,
              }),
            );
          }
          return decoded.right;
        } else if (txType === 3) {
          const payload = new Bytes({ value: tx.value.slice(1) });
          const decoded = rlp.decodeTo(BlobTransaction, payload);
          if (Either.isLeft(decoded)) {
            return yield* Effect.fail(
              new InvalidBlock({
                message: `Failed to decode blob transaction: ${decoded.left.message}`,
              }),
            );
          }
          return decoded.right;
        } else if (txType === 4) {
          const payload = new Bytes({ value: tx.value.slice(1) });
          const decoded = rlp.decodeTo(SetCodeTransaction, payload);
          if (Either.isLeft(decoded)) {
            return yield* Effect.fail(
              new InvalidBlock({
                message: `Failed to decode set code transaction: ${decoded.left.message}`,
              }),
            );
          }
          return decoded.right;
        } else {
          // Legacy transaction (no type prefix)
          const decoded = rlp.decodeTo(LegacyTransaction, tx);
          if (Either.isLeft(decoded)) {
            return yield* Effect.fail(
              new InvalidBlock({
                message: `Failed to decode legacy transaction: ${decoded.left.message}`,
              }),
            );
          }
          return decoded.right;
        }
      }
    }
  });

/**
 * Increase the balance of a withdrawal recipient.
 *
 * @param blockEnv - The block environment
 * @param address - The recipient address
 * @param amount - The withdrawal amount in Gwei
 * @returns Effect that succeeds when balance is updated
 */
const increaseRecipientBalance = (
  blockEnv: BlockEnvironment,
  address: Address,
  amount: U256,
): Effect.Effect<void, InvalidBlock, Fork> =>
  Effect.gen(function* () {
    // Convert Gwei to Wei by multiplying by 10^9
    const amountInWei = new U256({
      value: amount.value * 1000000000n,
    });

    yield* State.updateAccountBalance(
      blockEnv.state,
      address,
      (balance) => new U256({ value: balance.value + amountInWei.value }),
    );
  });

/**
 * Parse deposit requests from the block output.
 *
 * This function looks through all receipts in the block output,
 * finds logs from the deposit contract, and extracts deposit request data.
 *
 * @param blockOutput - The current block output
 * @returns Effect that succeeds with deposit request bytes
 */
const parseDepositRequests = (
  blockOutput: BlockOutput,
): Effect.Effect<Bytes, InvalidBlock, never> =>
  Effect.gen(function* () {
    const depositRequestsArray: Uint8Array[] = [];

    // Iterate through all receipt keys
    for (const key of blockOutput.receiptKeys) {
      // Get the receipt from the receipts trie
      const receipt = blockOutput.receiptsTrie.get(key);
      if (receipt === null) {
        continue;
      }

      // Decode the receipt using tagged union pattern matching
      let decodedReceipt: Receipt;
      switch (receipt._tag) {
        case "Receipt":
          decodedReceipt = receipt;
          break;

        case "Bytes": {
          if (receipt.value.length === 0) {
            continue;
          }

          // Check first byte to determine receipt type
          const receiptType = receipt.value[0];

          if (receiptType === 1) {
            const payload = new Bytes({ value: receipt.value.slice(1) });
            const decoded = rlp.decodeTo(Receipt, payload);
            if (Either.isLeft(decoded)) {
              continue; // Skip invalid receipts
            }
            decodedReceipt = decoded.right;
          } else if (receiptType === 2) {
            const payload = new Bytes({ value: receipt.value.slice(1) });
            const decoded = rlp.decodeTo(Receipt, payload);
            if (Either.isLeft(decoded)) {
              continue; // Skip invalid receipts
            }
            decodedReceipt = decoded.right;
          } else if (receiptType === 3) {
            const payload = new Bytes({ value: receipt.value.slice(1) });
            const decoded = rlp.decodeTo(Receipt, payload);
            if (Either.isLeft(decoded)) {
              continue; // Skip invalid receipts
            }
            decodedReceipt = decoded.right;
          } else if (receiptType === 4) {
            const payload = new Bytes({ value: receipt.value.slice(1) });
            const decoded = rlp.decodeTo(Receipt, payload);
            if (Either.isLeft(decoded)) {
              continue; // Skip invalid receipts
            }
            decodedReceipt = decoded.right;
          } else {
            // Legacy transaction receipt (no type prefix)
            const decoded = rlp.decodeTo(Receipt, receipt);
            if (Either.isLeft(decoded)) {
              continue; // Skip invalid receipts
            }
            decodedReceipt = decoded.right;
          }
          break;
        }

        default:
          continue; // Skip unknown receipt types
      }

      // Extract logs from the decoded receipt
      for (const log of decodedReceipt.logs) {
        // Check if log is from deposit contract
        if (Equal.equals(log.address, DEPOSIT_CONTRACT_ADDRESS)) {
          // Check if log has the deposit event signature
          if (
            log.topics.length > 0 &&
            Equal.equals(log.topics[0], DEPOSIT_EVENT_SIGNATURE_HASH)
          ) {
            // Extract deposit data
            const depositData = yield* extractDepositData(log.data);
            depositRequestsArray.push(depositData.value);
          }
        }
      }
    }

    // Concatenate all deposit requests
    const totalLength = depositRequestsArray.reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of depositRequestsArray) {
      result.set(arr, offset);
      offset += arr.length;
    }

    return new Bytes({ value: result });
  });

/**
 * Compute the hash of the requests using the SHA2-256 algorithm.
 *
 * Parameters
 * ----------
 * requests : readonly Bytes[]
 *     The requests to hash.
 *
 * Returns
 * -------
 * requestsHash : Bytes32
 *     The hash of the requests.
 */
export const computeRequestsHash = (
  requests: readonly Bytes[],
): Effect.Effect<Bytes32, InvalidBlock, never> =>
  Effect.gen(function* () {
    // Use Node.js crypto for the main hasher
    const { createHash } = yield* Effect.promise(() => import("node:crypto"));
    const mainHasher = createHash("sha256");

    // For each request, hash it with SHA256 and update the main hasher
    for (const request of requests) {
      const requestHash = sha256(request);
      mainHasher.update(requestHash.value);
    }

    // Return the final digest as Bytes32
    const finalDigest = mainHasher.digest();
    return new Bytes32({ value: finalDigest });
  });

/**
 * Extract deposit data from deposit event log data.
 *
 * @param data - The log data from deposit event
 * @returns Effect that succeeds with extracted deposit data
 */
const extractDepositData = (
  data: Bytes,
): Effect.Effect<Bytes, InvalidBlock, never> =>
  Effect.gen(function* () {
    // Validate deposit event data length (576 bytes)
    const DEPOSIT_EVENT_LENGTH = 576;
    if (data.value.length !== DEPOSIT_EVENT_LENGTH) {
      return yield* Effect.fail(
        new InvalidBlock({
          message: "Invalid deposit event data length",
        }),
      );
    }

    // Extract offsets and validate them
    const PUBKEY_OFFSET = 160;
    const WITHDRAWAL_CREDENTIALS_OFFSET = 256;
    const AMOUNT_OFFSET = 320;
    const SIGNATURE_OFFSET = 384;
    const INDEX_OFFSET = 512;

    // Extract sizes
    const PUBKEY_SIZE = 48;
    const WITHDRAWAL_CREDENTIALS_SIZE = 32;
    const AMOUNT_SIZE = 8;
    const SIGNATURE_SIZE = 96;
    const INDEX_SIZE = 8;

    // Extract the actual data fields
    const pubkey = data.value.slice(
      PUBKEY_OFFSET + 32,
      PUBKEY_OFFSET + 32 + PUBKEY_SIZE,
    );
    const withdrawalCredentials = data.value.slice(
      WITHDRAWAL_CREDENTIALS_OFFSET + 32,
      WITHDRAWAL_CREDENTIALS_OFFSET + 32 + WITHDRAWAL_CREDENTIALS_SIZE,
    );
    const amount = data.value.slice(
      AMOUNT_OFFSET + 32,
      AMOUNT_OFFSET + 32 + AMOUNT_SIZE,
    );
    const signature = data.value.slice(
      SIGNATURE_OFFSET + 32,
      SIGNATURE_OFFSET + 32 + SIGNATURE_SIZE,
    );
    const index = data.value.slice(
      INDEX_OFFSET + 32,
      INDEX_OFFSET + 32 + INDEX_SIZE,
    );

    // Concatenate all fields to create deposit request
    const result = new Uint8Array(
      PUBKEY_SIZE +
        WITHDRAWAL_CREDENTIALS_SIZE +
        AMOUNT_SIZE +
        SIGNATURE_SIZE +
        INDEX_SIZE,
    );
    let offset = 0;
    result.set(pubkey, offset);
    offset += PUBKEY_SIZE;
    result.set(withdrawalCredentials, offset);
    offset += WITHDRAWAL_CREDENTIALS_SIZE;
    result.set(amount, offset);
    offset += AMOUNT_SIZE;
    result.set(signature, offset);
    offset += SIGNATURE_SIZE;
    result.set(index, offset);

    return new Bytes({ value: result });
  });

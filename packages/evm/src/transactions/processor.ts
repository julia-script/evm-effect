import { keccak256 } from "@evm-effect/crypto";
import { encodeTransaction } from "@evm-effect/crypto/transactions";
import {
  type Address,
  Bytes,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import rlp from "@evm-effect/rlp";
import { HashSet } from "@evm-effect/shared/hashset";
import { annotateSafe } from "@evm-effect/shared/traced";
import { Effect, Either, Option, type Schema } from "effect";
import type { BlockOutput } from "../blockchain.js";
import { logsBloom } from "../receipts/bloom.js";
import * as State from "../state.js";
import {
  getAccount,
  incrementNonce,
  stateRoot,
  TransientStorage,
} from "../state.js";
import { LegacyReceipt, Receipt } from "../types/Receipt.js";
import { LegacyTransaction, type Transaction } from "../types/Transaction.js";
import { Fork } from "../vm/Fork.js";
import { processMessageCall } from "../vm/interpreter.js";
import {
  type BlockEnvironment,
  prepareMessage,
  TransactionEnvironment,
} from "../vm/message.js";
import { StorageKey } from "../vm/StorageKey.js";
import { calculateDataFee } from "./gas.js";
import { checkTransaction, validateTransaction } from "./validator.js";

const min = (a: bigint, b: bigint) => (a < b ? a : b);
const max = (a: bigint, b: bigint) => (a > b ? a : b);

/**
 * Execute a transaction against the provided environment.
 *
 * This function processes the actions needed to execute a transaction.
 * It decrements the sender's account balance after calculating the gas fee
 * and refunds them the proper amount after execution. Calling contracts,
 * deploying code, and incrementing nonces are all examples of actions that
 * happen within this function or from a call made within this function.
 *
 * Accounts that are marked for deletion are processed and destroyed after
 * execution.
 *
 * Parameters
 * ----------
 * blockEnv :
 *     Environment for the Ethereum Virtual Machine.
 * blockOutput :
 *     The block output for the current block.
 * tx :
 *     Transaction to execute.
 * index:
 *     Index of the transaction in the block.
 */
export const processTransaction = Effect.fn("processTransaction")(function* (
  blockEnv: BlockEnvironment,
  blockOutput: BlockOutput,
  tx: Transaction,
  index: Uint,
) {
  yield* annotateSafe({
    blockEnv: blockEnv,
    tx: tx,
    index: index.value,
  });

  const encodedIndex = rlp.encode(index);
  const encodedTx = yield* encodeTransaction(tx).pipe(Effect.orDie);

  blockOutput.transactionsTrie.set(encodedIndex, encodedTx);

  const { calldataFloorGasCost, intrinsicGas } = yield* validateTransaction(tx);
  yield* annotateSafe({
    calldataFloorGasCost: calldataFloorGasCost,
    intrinsicGas: intrinsicGas,
  });
  const checkResult = yield* checkTransaction(blockEnv, blockOutput, tx);
  yield* annotateSafe({ checkResult: checkResult });
  const senderAccount = getAccount(blockEnv.state, checkResult.senderAddress);
  yield* annotateSafe({ senderAccount: senderAccount });

  const blobGasFee =
    tx._tag === "BlobTransaction"
      ? yield* calculateDataFee(blockEnv.excessBlobGas, tx)
      : new Uint({ value: 0n });

  const effectiveGasFee = new Uint({
    value: tx.gas.value * checkResult.effectiveGasPrice.value,
  });

  const gas = tx.gas.value - intrinsicGas.value;
  yield* annotateSafe({
    blobGasFee: blobGasFee,
    effectiveGasFee: effectiveGasFee,
    gas: gas,
  });

  yield* incrementNonce(blockEnv.state, checkResult.senderAddress);

  yield* State.updateAccountBalance(
    blockEnv.state,
    checkResult.senderAddress,
    (balance) =>
      new U256({
        value: balance.value - effectiveGasFee.value - blobGasFee.value,
      }),
  );

  const fork = yield* Fork;

  const accessListAddresses = HashSet.empty<Address>();
  const accessListStorageKeys = HashSet.empty<StorageKey>();

  if (fork.eip(3651)) {
    accessListAddresses.add(blockEnv.coinbase);
  }

  if ("accessList" in tx) {
    tx.accessList.forEach((access) => {
      accessListAddresses.add(access.account);
      access.slots.forEach((slot) => {
        accessListStorageKeys.add(
          new StorageKey({ address: access.account, slot }),
        );
      });
    });
  }
  yield* annotateSafe({
    accessListAddresses: accessListAddresses,
    accessListStorageKeys: accessListStorageKeys,
  });

  const authorizations =
    tx._tag === "SetCodeTransaction" ? tx.authorizations : [];

  yield* annotateSafe({ authorizations: authorizations });

  const txEnv = new TransactionEnvironment({
    origin: checkResult.senderAddress,
    gasPrice: checkResult.effectiveGasPrice,
    gas: new Uint({ value: gas }),
    accessListAddresses: accessListAddresses.clone(),
    accessListStorageKeys: accessListStorageKeys.clone(),
    transientStorage: TransientStorage.empty(),
    blobVersionedHashes: checkResult.blobVersionedHashes,
    authorizations: authorizations,
    indexInBlock: Option.some(index),
    txHash: Option.some(yield* getTransactionHash(encodedTx)),
  });

  const message = yield* prepareMessage(blockEnv, txEnv, tx);

  yield* annotateSafe({ message: message });
  const txOutput = yield* processMessageCall(message);

  yield* annotateSafe({ txOutput: txOutput });

  const txGasUsedBeforeRefund = new Uint({
    value: tx.gas.value - txOutput.gasLeft.value,
  });

  const refundDivisor = fork.eipSelect(3529, 5n, 2n);
  const txGasRefund = new Uint({
    value: min(
      txGasUsedBeforeRefund.value / refundDivisor,
      txOutput.refundCounter.value,
    ),
  });

  let txGasUsedAfterRefund = new Uint({
    value: txGasUsedBeforeRefund.value - txGasRefund.value,
  });
  if (fork.eip(7623)) {
    txGasUsedAfterRefund = new Uint({
      value: max(txGasUsedAfterRefund.value, calldataFloorGasCost.value),
    });
  }

  const txGasLeft = new Uint({
    value: tx.gas.value - txGasUsedAfterRefund.value,
  });
  const gasRefundAmount = new Uint({
    value: txGasLeft.value * checkResult.effectiveGasPrice.value,
  });

  const priorityFeePerGas = new Uint({
    value: checkResult.effectiveGasPrice.value - blockEnv.baseFeePerGas.value,
  });
  const transactionFee = new Uint({
    value: txGasUsedAfterRefund.value * priorityFeePerGas.value,
  });

  yield* State.updateAccountBalance(
    blockEnv.state,
    checkResult.senderAddress,
    (balance) => new U256({ value: balance.value + gasRefundAmount.value }),
  );

  yield* State.updateAccountBalance(
    blockEnv.state,
    blockEnv.coinbase,
    (balance) => new U256({ value: balance.value + transactionFee.value }),
  );

  for (const address of txOutput.accountsToDelete) {
    yield* State.destroyAccount(blockEnv.state, address);
  }

  if (fork.eip(161)) {
    yield* State.destroyTouchedEmptyAccounts(
      blockEnv.state,
      txOutput.touchedAccounts,
    );
  }

  blockOutput.blockGasUsed = new Uint({
    value: blockOutput.blockGasUsed.value + txGasUsedAfterRefund.value,
  });
  blockOutput.blobGasUsed = new U64({
    value: blockOutput.blobGasUsed.value + checkResult.txBlobGasUsed.value,
  });

  let encodedReceiptResult: Either.Either<Bytes, unknown>;

  if (fork.eip(658)) {
    const receipt = new Receipt({
      succeeded: Option.isNone(txOutput.error),
      cumulativeGasUsed: blockOutput.blockGasUsed,
      bloom: logsBloom(txOutput.logs),
      logs: txOutput.logs,
    });
    encodedReceiptResult = rlp.encodeTo(Receipt, receipt);
  } else {
    const postState = stateRoot(blockEnv.state);
    const receipt = new LegacyReceipt({
      postState,
      cumulativeGasUsed: blockOutput.blockGasUsed,
      bloom: logsBloom(txOutput.logs),
      logs: txOutput.logs,
    });
    encodedReceiptResult = rlp.encodeTo(LegacyReceipt, receipt);
  }
  if (Either.isLeft(encodedReceiptResult)) {
    return yield* Effect.die(new Error("Failed to encode receipt"));
  }
  const encodedReceiptRlp = encodedReceiptResult.right;

  let encodedReceipt: Bytes;
  switch (tx._tag) {
    case "LegacyTransaction":
      encodedReceipt = encodedReceiptRlp;
      break;
    case "AccessListTransaction":
      encodedReceipt = new Bytes({
        value: new Uint8Array([0x01, ...encodedReceiptRlp.value]),
      });
      break;
    case "FeeMarketTransaction":
      encodedReceipt = new Bytes({
        value: new Uint8Array([0x02, ...encodedReceiptRlp.value]),
      });
      break;
    case "BlobTransaction":
      encodedReceipt = new Bytes({
        value: new Uint8Array([0x03, ...encodedReceiptRlp.value]),
      });
      break;
    case "SetCodeTransaction":
      encodedReceipt = new Bytes({
        value: new Uint8Array([0x04, ...encodedReceiptRlp.value]),
      });
      break;
  }

  const receiptKey = rlp.encode(index);
  blockOutput.receiptKeys.push(receiptKey);

  blockOutput.receiptsTrie.set(receiptKey, encodedReceipt);

  blockOutput.blockLogs = [...blockOutput.blockLogs, ...txOutput.logs];
});

function encodeOrDie<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  input: A,
): Effect.Effect<Bytes, never, never> {
  const encoded = rlp.encodeTo(schema, input);

  if (Either.isLeft(encoded)) {
    return Effect.die(encoded.left);
  }
  return Effect.succeed(encoded.right);
}
/**
 * Get the transaction hash from encoded transaction bytes.
 *
 * @param encodedTx - The encoded transaction bytes
 * @returns The transaction hash
 */
const getTransactionHash = Effect.fn("getTransactionHash")(function* (
  encodedTx: Bytes | LegacyTransaction,
) {
  if (encodedTx._tag === "LegacyTransaction") {
    return yield* encodeOrDie(LegacyTransaction, encodedTx).pipe(
      Effect.map(keccak256),
    );
  }
  return keccak256(encodedTx);
});

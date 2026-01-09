import { recoverSender } from "@evm-effect/crypto/transactions";
import {
  type Address,
  type Bytes,
  type Bytes32,
  U64,
  Uint,
} from "@evm-effect/ethereum-types";
import { annotateSafe } from "@evm-effect/shared/traced";
import { Data, Effect } from "effect";
import type { BlockOutput } from "../blockchain.js";
import {
  BLOB_COUNT_LIMIT,
  MAX_BLOB_GAS_PER_BLOCK,
  TX_MAX_GAS_LIMIT,
  VERSIONED_HASH_VERSION_KZG,
} from "../constants.js";
import {
  BlobCountExceededError,
  BlobGasLimitExceededError,
  EmptyAuthorizationListError,
  GasUsedExceedsLimitError,
  InitCodeTooLargeError,
  InsufficientBalanceError,
  InsufficientMaxFeePerBlobGasError,
  InsufficientMaxFeePerGasError,
  InsufficientTransactionGasError,
  IntrinsicGasBelowFloorGasCostError,
  InvalidBlobVersionedHashError,
  InvalidSenderError,
  NoBlobDataError,
  NonceOverflowError,
  NonceTooHighError,
  NonceTooLowError,
  PriorityFeeGreaterThanMaxFeeError,
  TransactionGasLimitExceededError,
  TransactionTypeContractCreationError,
  Type1TxPreForkError,
  Type2TxPreForkError,
  Type3TxPreForkError,
  Type4TxContractCreationError,
  Type4TxPreForkError,
} from "../exceptions.js";
import State from "../state.js";
import type { Transaction } from "../types/Transaction.js";
import { Fork } from "../vm/Fork.js";
import { MAX_INIT_CODE_SIZE } from "../vm/interpreter.js";
import type { BlockEnvironment } from "../vm/message.js";
import {
  calculateBlobGasPrice,
  calculateIntrinsicGas,
  calculateTotalBlobGas,
} from "./gas.js";

/**
 * Result of transaction validation containing intrinsic gas costs.
 */
class ValidationResult extends Data.TaggedClass("ValidationResult")<{
  readonly intrinsicGas: Uint;
  readonly calldataFloorGasCost: Uint;
}> {}

/**
 * Validates a transaction according to the Osaka fork rules.
 *
 * Verifies:
 * - Transaction has sufficient gas for intrinsic cost
 * - Nonce is within valid range (< 2^64 - 1)
 * - Init code size is within limits for contract creation
 * - Gas limit doesn't exceed maximum
 *
 * @param tx - The transaction to validate
 * @returns Effect that succeeds with ValidationResult or fails with validation errors
 */
export const validateTransaction = Effect.fn("validateTransaction")(function* (
  tx: Transaction,
) {
  const { intrinsicGas, calldataFloorGasCost } =
    yield* calculateIntrinsicGas(tx);

  if (intrinsicGas.value > tx.gas.value) {
    return yield* Effect.fail(
      new InsufficientTransactionGasError({
        message: `Insufficient gas: ${tx.gas.value} < intrinsic ${intrinsicGas.value}`,
      }),
    );
  }

  if (calldataFloorGasCost.value > tx.gas.value) {
    return yield* Effect.fail(
      new IntrinsicGasBelowFloorGasCostError({
        message: `Gas below floor cost: ${tx.gas.value} < floor ${calldataFloorGasCost.value}`,
      }),
    );
  }

  const nonceValue = typeof tx.nonce === "bigint" ? tx.nonce : tx.nonce.value;
  if (nonceValue >= U64.MAX_VALUE) {
    return yield* Effect.fail(
      new NonceOverflowError({ message: "Nonce too high" }),
    );
  }

  const isContractCreation = tx.to === undefined;

  if (isContractCreation) {
    if (tx.data.value.length > MAX_INIT_CODE_SIZE) {
      return yield* Effect.fail(
        new InitCodeTooLargeError({ message: "Code size too large" }),
      );
    }
  }

  const fork = yield* Fork;
  if (fork.eip(7825) && tx.gas.value > TX_MAX_GAS_LIMIT.value) {
    return yield* Effect.fail(
      new TransactionGasLimitExceededError({
        message: `Gas limit too high: ${tx.gas.value} > ${TX_MAX_GAS_LIMIT.value}`,
      }),
    );
  }

  return new ValidationResult({
    intrinsicGas,
    calldataFloorGasCost,
  });
});
/**
 * Result of transaction checking containing sender and gas information.
 */
class TransactionCheckResult extends Data.TaggedClass(
  "TransactionCheckResult",
)<{
  readonly senderAddress: Address;
  readonly effectiveGasPrice: Uint;
  readonly blobVersionedHashes: readonly Bytes32[];
  readonly txBlobGasUsed: U64;
}> {}

const checkGasAvailability = Effect.fn("checkGasAvailability")(function* (
  blockEnv: BlockEnvironment,
  blockOutput: BlockOutput,
  tx: Transaction,
) {
  const gasAvailable = new Uint({
    value: blockEnv.blockGasLimit.value - blockOutput.blockGasUsed.value,
  });
  yield* annotateSafe({
    "gasAvailability.txGas": tx.gas,
    "gasAvailability.gasAvailable": gasAvailable,
  });

  if (tx.gas.value > gasAvailable.value) {
    return yield* Effect.fail(
      new GasUsedExceedsLimitError({ message: "gas used exceeds limit" }),
    );
  }
  return yield* Effect.succeed(undefined);
});
const checkBlobGasAvailability = Effect.fn("checkBlobGasAvailability")(
  function* (blockOutput: BlockOutput, tx: Transaction) {
    const maxBlobGasPerBlock = yield* MAX_BLOB_GAS_PER_BLOCK;

    const blobGasAvailable = new U64({
      value: maxBlobGasPerBlock.value - blockOutput.blobGasUsed.value,
    });

    const txBlobGasUsed = calculateTotalBlobGas(tx);
    yield* annotateSafe({
      "blobGasAvailability.txBlobGasUsed": txBlobGasUsed,
      "blobGasAvailability.blobGasAvailable": blobGasAvailable,
    });
    if (txBlobGasUsed.value > blobGasAvailable.value) {
      return yield* Effect.fail(
        new BlobGasLimitExceededError({
          message: `blob gas limit exceeded: ${txBlobGasUsed.value} > ${blobGasAvailable.value}`,
        }),
      );
    }
    return yield* Effect.succeed(txBlobGasUsed);
  },
);

const min = (a: bigint, b: bigint) => (a < b ? a : b);
/**
 * Checks if a transaction is includable in the block.
 *
 * Validates:
 * - Gas limits against block availability
 * - Blob gas limits against block availability
 * - Transaction signature and sender recovery
 * - Fee market rules (EIP-1559)
 * - Blob transaction rules (EIP-4844)
 * - Set code transaction rules (EIP-7702)
 * - Sender account state (nonce, balance, code)
 *
 * @param blockEnv - The block environment
 * @param blockOutput - The current block output
 * @param tx - The transaction to check
 * @returns Effect that succeeds with TransactionCheckResult or fails with validation errors
 */
export const checkTransaction = Effect.fn("checkTransaction")(function* (
  blockEnv: BlockEnvironment,
  blockOutput: BlockOutput,
  tx: Transaction,
) {
  yield* checkGasAvailability(blockEnv, blockOutput, tx);

  const txBlobGasUsed = yield* checkBlobGasAvailability(blockOutput, tx);

  const senderAddress = yield* recoverSender(tx).pipe(
    Effect.mapError(
      (error) => new InvalidSenderError({ message: error.message }),
    ),
    Effect.tap((senderAddress) =>
      annotateSafe({
        senderAddress: senderAddress,
      }),
    ),
    Effect.withSpan("Recover Sender Address"),
  );

  const senderAccount = State.getAccount(blockEnv.state, senderAddress);

  yield* annotateSafe({
    senderAccount: senderAccount,
    senderAddress: senderAddress,
  });

  let effectiveGasPrice: Uint;
  let maxGasFee: Uint;
  switch (tx._tag) {
    case "FeeMarketTransaction":
    case "BlobTransaction":
    case "SetCodeTransaction": {
      if (tx.maxFeePerGas.value < tx.maxPriorityFeePerGas.value) {
        return yield* Effect.fail(
          new PriorityFeeGreaterThanMaxFeeError({
            message: `priority fee greater than max fee: ${tx.maxFeePerGas.value} < ${tx.maxPriorityFeePerGas.value}`,
          }),
        );
      }
      if (tx.maxFeePerGas.value < blockEnv.baseFeePerGas.value) {
        return yield* Effect.fail(
          new InsufficientMaxFeePerGasError(
            tx.maxFeePerGas,
            blockEnv.baseFeePerGas,
          ),
        );
      }

      const priorityFeePerGas = new Uint({
        value: min(
          tx.maxPriorityFeePerGas.value,
          tx.maxFeePerGas.value - blockEnv.baseFeePerGas.value,
        ),
      });
      yield* annotateSafe({
        priorityFeePerGas: priorityFeePerGas,
      });
      effectiveGasPrice = new Uint({
        value: priorityFeePerGas.value + blockEnv.baseFeePerGas.value,
      });

      maxGasFee = new Uint({
        value: tx.gas.value * tx.maxFeePerGas.value,
      });

      break;
    }
    default: {
      if (tx.gasPrice.value < blockEnv.baseFeePerGas.value) {
        return yield* Effect.fail(
          new InsufficientMaxFeePerGasError(
            tx.gasPrice,
            blockEnv.baseFeePerGas,
          ),
        );
      }
      effectiveGasPrice = tx.gasPrice;
      maxGasFee = new Uint({ value: tx.gas.value * tx.gasPrice.value });
    }
  }
  yield* annotateSafe({
    effectiveGasPrice: effectiveGasPrice,
    maxGasFee: maxGasFee,
  });

  let blobVersionedHashes: readonly Bytes32[] = [];
  if (tx._tag === "BlobTransaction") {
    const blobCount = tx.blobVersionedHashes.length;
    if (blobCount === 0) {
      return yield* Effect.fail(
        new NoBlobDataError({ message: "no blob data in transaction" }),
      );
    }
    const blobCountLimit = yield* BLOB_COUNT_LIMIT;
    if (blobCount > blobCountLimit) {
      return yield* Effect.fail(
        new BlobCountExceededError({
          message: `Tx has ${blobCount} blobs. Max allowed: ${blobCountLimit}`,
        }),
      );
    }
    for (const blobVersionedHash of tx.blobVersionedHashes) {
      if (blobVersionedHash.value[0] !== VERSIONED_HASH_VERSION_KZG[0]) {
        return yield* Effect.fail(
          new InvalidBlobVersionedHashError({
            message: "invalid blob versioned hash",
          }),
        );
      }
    }
    const blobGasPrice = yield* calculateBlobGasPrice(blockEnv.excessBlobGas);
    if (tx.maxFeePerBlobGas.value < blobGasPrice.value) {
      return yield* Effect.fail(
        new InsufficientMaxFeePerBlobGasError({
          message: "insufficient max fee per blob gas",
        }),
      );
    }
    maxGasFee = new Uint({
      value:
        maxGasFee.value +
        tx.maxFeePerBlobGas.value * calculateTotalBlobGas(tx).value,
    });
    blobVersionedHashes = tx.blobVersionedHashes;
  }

  const fork = yield* Fork;

  if (tx._tag === "AccessListTransaction" && !fork.eip(2930)) {
    return yield* Effect.fail(
      new Type1TxPreForkError({
        message:
          "Access list transactions (type 1) are only allowed from Berlin fork onwards",
      }),
    );
  }

  if (tx._tag === "FeeMarketTransaction" && !fork.eip(1559)) {
    return yield* Effect.fail(
      new Type2TxPreForkError({
        message:
          "Fee market transactions (type 2) are only allowed from London fork onwards",
      }),
    );
  }

  if (tx._tag === "BlobTransaction" && !fork.eip(4844)) {
    return yield* Effect.fail(
      new Type3TxPreForkError({
        message:
          "Blob transactions (type 3) are only allowed from Cancun fork onwards",
      }),
    );
  }

  if (tx._tag === "SetCodeTransaction" && !fork.eip(7702)) {
    return yield* Effect.fail(
      new Type4TxPreForkError({
        message:
          "SetCode transactions (type 4) are only allowed from Prague fork onwards",
      }),
    );
  }

  if (tx._tag === "BlobTransaction" && !tx.to) {
    return yield* Effect.fail(new TransactionTypeContractCreationError(tx));
  }
  if (tx._tag === "SetCodeTransaction" && !tx.to) {
    return yield* Effect.fail(
      new Type4TxContractCreationError({
        message: "SetCode transaction (type 4) not allowed to create contracts",
      }),
    );
  }

  if (tx._tag === "SetCodeTransaction" && tx.authorizations.length === 0) {
    return yield* Effect.fail(
      new EmptyAuthorizationListError({ message: "empty authorization list" }),
    );
  }

  if (senderAccount.nonce.value > tx.nonce.value) {
    return yield* Effect.fail(
      new NonceTooLowError({
        message: `nonce too low: account=${senderAccount.nonce.value}, tx=${tx.nonce.value}`,
      }),
    );
  }
  if (senderAccount.nonce.value < tx.nonce.value) {
    return yield* Effect.fail(
      new NonceTooHighError({
        message: `nonce too high: account=${senderAccount.nonce.value}, tx=${tx.nonce.value}`,
      }),
    );
  }

  if (senderAccount.balance.value < maxGasFee.value + tx.value.value) {
    yield* annotateSafe({
      senderAccount: senderAccount,
      maxGasFee: maxGasFee,
      txValue: tx.value,
      requiredBalance: maxGasFee.value + tx.value.value,
      senderBalance: senderAccount.balance,
    });

    return yield* Effect.fail(
      new InsufficientBalanceError({
        message: `0x${senderAddress.toHex()} has insufficient balance: ${
          senderAccount.balance.value
        } < max_gas_fee[${maxGasFee.value}] + tx_value[${tx.value.value}]`,
      }),
    );
  }

  if (
    senderAccount.code.value.length > 0 &&
    !checkValidDelegation(senderAccount.code)
  ) {
    return yield* Effect.fail(new InvalidSenderError({ message: "not EOA" }));
  }
  return yield* Effect.succeed(
    new TransactionCheckResult({
      senderAddress: senderAddress,
      effectiveGasPrice: effectiveGasPrice,
      blobVersionedHashes: blobVersionedHashes,
      txBlobGasUsed: txBlobGasUsed,
    }),
  );
});

const checkValidDelegation = (code: Bytes): boolean => {
  const EOA_DELEGATION_MARKER = new Uint8Array([0xef, 0x01, 0x00]);
  const EOA_DELEGATED_CODE_LENGTH = 23;

  if (code.value.length !== EOA_DELEGATED_CODE_LENGTH) {
    return false;
  }

  const marker = code.value.slice(0, 3);
  return (
    marker[0] === EOA_DELEGATION_MARKER[0] &&
    marker[1] === EOA_DELEGATION_MARKER[1] &&
    marker[2] === EOA_DELEGATION_MARKER[2]
  );
};

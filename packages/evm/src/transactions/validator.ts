/**
 * Transaction validation functions for the Osaka fork.
 *
 * Ports the validation logic from the Python reference implementation
 * in transactions.py and fork.py.
 */

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
  InvalidBlobVersionedHashError,
  InvalidSenderError,
  NoBlobDataError,
  NonceMismatchError,
  NonceOverflowError,
  PriorityFeeGreaterThanMaxFeeError,
  TransactionGasLimitExceededError,
  TransactionTypeContractCreationError,
  Type3TxPreForkError,
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
  // Calculate intrinsic costs
  const { intrinsicGas, calldataFloorGasCost } =
    yield* calculateIntrinsicGas(tx);

  // Check if transaction has enough gas for intrinsic cost
  const maxIntrinsicCost =
    intrinsicGas.value > calldataFloorGasCost.value
      ? intrinsicGas
      : calldataFloorGasCost;

  if (maxIntrinsicCost.value > tx.gas.value) {
    return yield* Effect.fail(
      new InsufficientTransactionGasError({ message: "Insufficient gas" }),
    );
  }

  // Check nonce overflow (must be < 2^64 - 1)
  const nonceValue = typeof tx.nonce === "bigint" ? tx.nonce : tx.nonce.value;
  if (nonceValue >= U64.MAX_VALUE) {
    return yield* Effect.fail(
      new NonceOverflowError({ message: "Nonce too high" }),
    );
  }

  // Check init code size for contract creation
  const isContractCreation = tx.to === undefined;

  if (isContractCreation) {
    if (tx.data.value.length > MAX_INIT_CODE_SIZE) {
      return yield* Effect.fail(
        new InitCodeTooLargeError({ message: "Code size too large" }),
      );
    }
  }

  const fork = yield* Fork;
  // Check gas limit doesn't exceed maximum
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
  // Check gas availability
  yield* checkGasAvailability(blockEnv, blockOutput, tx);

  const txBlobGasUsed = yield* checkBlobGasAvailability(blockOutput, tx);

  // Recover sender address from transaction signature
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
          new InsufficientBalanceError({
            message: `insufficient balance: ${tx.gasPrice.value} < ${blockEnv.baseFeePerGas.value}`,
          }),
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

  // Check that blob transactions (Type 3, EIP-4844) and SetCodeTransaction (Type 4, EIP-7702)
  // are only used in forks that support them
  const fork = yield* Fork;
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
      new InvalidSenderError({ message: "TYPE_4_TX_PRE_FORK" }),
    );
  }

  if (
    (tx._tag === "SetCodeTransaction" || tx._tag === "BlobTransaction") &&
    !tx.to
  ) {
    return yield* Effect.fail(new TransactionTypeContractCreationError(tx));
  }

  if (tx._tag === "SetCodeTransaction" && tx.authorizations.length === 0) {
    return yield* Effect.fail(
      new EmptyAuthorizationListError({ message: "empty authorization list" }),
    );
  }

  if (senderAccount.nonce.value > tx.nonce.value) {
    return yield* Effect.fail(
      new NonceMismatchError({ message: "nonce too low" }),
    );
  }
  if (senderAccount.nonce.value < tx.nonce.value) {
    return yield* Effect.fail(
      new NonceMismatchError({ message: "nonce too high" }),
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
        message: `0x${senderAddress.toHex()} has insufficient balance: ${senderAccount.balance.value} < max_gas_fee[${maxGasFee.value}] + tx_value[${tx.value.value}]`,
      }),
    );
  }

  // Check if sender has non-empty code that is not valid delegation
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

// ============================================================================
// Helper Functions (Placeholders for functions that need to be implemented)
// ============================================================================

/**
 * Checks if account code represents a valid delegation.
 *
 * TODO: This needs to be implemented by porting the is_valid_delegation function
 * from the Python reference implementation.
 */
/**
 * Check if code is valid EIP-7702 delegation designation.
 *
 * Delegation code is exactly 23 bytes: 0xef0100 (3 bytes marker) + 20 bytes address
 */
const checkValidDelegation = (code: Bytes): boolean => {
  const EOA_DELEGATION_MARKER = new Uint8Array([0xef, 0x01, 0x00]);
  const EOA_DELEGATED_CODE_LENGTH = 23;

  // Check if code is exactly 23 bytes
  if (code.value.length !== EOA_DELEGATED_CODE_LENGTH) {
    return false;
  }

  // Check if it starts with 0xef0100
  const marker = code.value.slice(0, 3);
  return (
    marker[0] === EOA_DELEGATION_MARKER[0] &&
    marker[1] === EOA_DELEGATION_MARKER[1] &&
    marker[2] === EOA_DELEGATION_MARKER[2]
  );
};
// ============================================================================
// Transaction-Specific Validation Helpers
// ============================================================================

/**
 * Result of blob transaction validation.
 */
// class BlobValidationResult extends Data.TaggedClass("BlobValidationResult")<{
//   readonly blobCount: number;
//   readonly blobVersionedHashes: readonly Bytes32[];
//   readonly blobGasUsed: U64;
//   readonly blobGasPrice: Uint;
// }> {}

// /**
//  * Validates blob transaction specific rules.
//  *
//  * Validates:
//  * - Blob count is within limits (1 to BLOB_COUNT_LIMIT)
//  * - All versioned hashes have correct version prefix
//  * - Max fee per blob gas is sufficient
//  *
//  * @param tx - The blob transaction to validate
//  * @param excessBlobGas - Current excess blob gas for pricing
//  * @returns Effect that succeeds with BlobValidationResult or fails with validation errors
//  */
// export const validateBlobTransaction = (
//   tx: Transaction,
//   excessBlobGas: U64,
// ): Effect.Effect<
//   BlobValidationResult,
//   | NoBlobDataError
//   | BlobCountExceededError
//   | InvalidBlobVersionedHashError
//   | InsufficientMaxFeePerBlobGasError,
//   never
// > =>
//   Effect.gen(function* () {
//     if (tx._tag !== "BlobTransaction") {
//       return yield* Effect.fail(
//         new NoBlobDataError({
//           message: "Transaction is not a blob transaction",
//         }),
//       );
//     }

//     const blobCount = tx.blobVersionedHashes.length;

//     // Validate blob count
//     if (blobCount === 0) {
//       return yield* Effect.fail(
//         new NoBlobDataError({ message: "no blob data in transaction" }),
//       );
//     }
//     const blobCountLimit = yield* BLOB_COUNT_LIMIT;
//     if (blobCount > blobCountLimit) {
//       return yield* Effect.fail(
//         new BlobCountExceededError({
//           message: `Tx has ${blobCount} blobs. Max allowed: ${blobCountLimit}`,
//         }),
//       );
//     }

//     // Validate versioned hashes
//     for (const blobVersionedHash of tx.blobVersionedHashes) {
//       if (blobVersionedHash.value[0] !== VERSIONED_HASH_VERSION_KZG[0]) {
//         return yield* Effect.fail(
//           new InvalidBlobVersionedHashError({
//             message: "invalid blob versioned hash",
//           }),
//         );
//       }
//     }

//     // Calculate blob gas price and validate max fee per blob gas
//     const blobGasPrice = yield* calculateBlobGasPrice(excessBlobGas);
//     if (tx.maxFeePerBlobGas.value < blobGasPrice.value) {
//       return yield* Effect.fail(
//         new InsufficientMaxFeePerBlobGasError({
//           message: "insufficient max fee per blob gas",
//         }),
//       );
//     }

//     const blobGasUsed = calculateTotalBlobGas(tx);

//     return new BlobValidationResult({
//       blobCount,
//       blobVersionedHashes: tx.blobVersionedHashes,
//       blobGasUsed,
//       blobGasPrice,
//     });
//   });

/**
 * Result of set code transaction validation.
 */
// class SetCodeValidationResult extends Data.TaggedClass(
//   "SetCodeValidationResult",
// )<{
//   readonly authorizationCount: number;
//   readonly authorizations: readonly Authorization[];
//   readonly authorizationGasCost: Uint;
// }> {}

/**
 * Validates set code transaction specific rules.
 *
 * Validates:
 * - Authorization list is not empty
 * - Transaction cannot be used for contract creation (to field must be Address)
 * - Authorization list format and signatures (placeholder for now)
 *
 * @param tx - The set code transaction to validate
 * @returns Effect that succeeds with SetCodeValidationResult or fails with validation errors
 */
// const _validateSetCodeTransaction = (
//   tx: Transaction,
// ): Effect.Effect<
//   SetCodeValidationResult,
//   EmptyAuthorizationListError | TransactionTypeContractCreationError,
//   never
// > =>
//   Effect.gen(function* () {
//     if (tx._tag !== "SetCodeTransaction") {
//       return yield* Effect.fail(
//         new EmptyAuthorizationListError({
//           message: "Transaction is not a set code transaction",
//         }),
//       );
//     }

//     // Validate authorization list is not empty
//     if (tx.authorizations.length === 0) {
//       return yield* Effect.fail(
//         new EmptyAuthorizationListError({
//           message: "empty authorization list",
//         }),
//       );
//     }

//     // Validate cannot be used for contract creation
//     if (!tx.to) {
//       return yield* Effect.fail(new TransactionTypeContractCreationError(tx));
//     }

//     // Calculate authorization gas cost
//     const PER_EMPTY_ACCOUNT_COST = 25000; // From vm/eoa_delegation.py
//     const authorizationGasCost = new Uint({
//       value: BigInt(PER_EMPTY_ACCOUNT_COST * tx.authorizations.length),
//     });

//     return new SetCodeValidationResult({
//       authorizationCount: tx.authorizations.length,
//       authorizations: tx.authorizations,
//       authorizationGasCost,
//     });
//   });

/**
 * Result of access list validation.
//  */
// class AccessListValidationResult extends Data.TaggedClass(
//   "AccessListValidationResult",
// )<{
//   readonly accessListGasCost: Uint;
//   readonly addressCount: number;
//   readonly storageKeyCount: number;
// }> {}

/**
 * Validates access list and calculates gas cost.
 *
 * Calculates:
 * - Gas cost for access list addresses (TX_ACCESS_LIST_ADDRESS_COST per address)
 * - Gas cost for storage keys (TX_ACCESS_LIST_STORAGE_KEY_COST per key)
 * - Total access list gas cost
 *
 * @param tx - The transaction with access list to validate
 * @returns Effect that succeeds with AccessListValidationResult
 */
// const _validateAccessList = (
//   tx: Transaction,
// ): Effect.Effect<AccessListValidationResult, never, never> =>
//   Effect.gen(function* () {
//     // Check if transaction has access list
//     if (
//       tx._tag !== "AccessListTransaction" &&
//       tx._tag !== "FeeMarketTransaction" &&
//       tx._tag !== "BlobTransaction" &&
//       tx._tag !== "SetCodeTransaction"
//     ) {
//       // Legacy transaction - no access list
//       return new AccessListValidationResult({
//         accessListGasCost: new Uint({ value: 0n }),
//         addressCount: 0,
//         storageKeyCount: 0,
//       });
//     }

//     let totalGasCost = 0n;
//     let addressCount = 0;
//     let storageKeyCount = 0;

//     for (const access of tx.accessList) {
//       addressCount += 1;
//       totalGasCost += TX_ACCESS_LIST_ADDRESS_COST.value;

//       storageKeyCount += access.slots.length;
//       totalGasCost +=
//         BigInt(access.slots.length) * TX_ACCESS_LIST_STORAGE_KEY_COST.value;
//     }

//     return new AccessListValidationResult({
//       accessListGasCost: new Uint({ value: totalGasCost }),
//       addressCount,
//       storageKeyCount,
//     });
//   });

// /**
//  * Validates contract creation restrictions for specific transaction types.
//  *
//  * Blob transactions and set code transactions cannot be used for contract creation.
//  * Contract creation is indicated by an empty `to` field (Bytes0).
//  *
//  * @param tx - The transaction to validate
//  * @returns Effect that succeeds or fails with TransactionTypeContractCreationError
//  */
// const _validateContractCreationRestrictions = (
//   tx: Transaction,
// ): Effect.Effect<void, TransactionTypeContractCreationError, never> =>
//   Effect.gen(function* () {
//     if (tx._tag === "BlobTransaction" || tx._tag === "SetCodeTransaction") {
//       if (!tx.to) {
//         return yield* Effect.fail(new TransactionTypeContractCreationError(tx));
//       }
//     }
//   });

// /**
//  * Comprehensive transaction validation that combines all validation rules.
//  *
//  * This function performs all transaction validation checks in the correct order:
//  * 1. Basic transaction validation (validateTransaction)
//  * 2. Block-level checks (checkTransaction)
//  * 3. Transaction-specific validation (blob, set code, access list)
//  *
//  * @param blockEnv - The block environment
//  * @param blockOutput - The current block output
//  * @param tx - The transaction to validate
//  * @returns Effect that succeeds with comprehensive validation results or fails with any validation error
//  */
// export const validateTransactionComprehensive = (
//   blockEnv: BlockEnvironment,
//   blockOutput: BlockOutput,
//   tx: Transaction,
// ) =>
//   Effect.gen(function* () {
//     // Step 1: Basic transaction validation
//     const validation = yield* validateTransaction(tx);

//     // Step 2: Block-level transaction checking
//     const check = yield* checkTransaction(blockEnv, blockOutput, tx);

//     // Step 3: Transaction-specific validation
//     let blob: BlobValidationResult | undefined;
//     if (tx._tag === "BlobTransaction") {
//       blob = yield* validateBlobTransaction(tx, blockEnv.excessBlobGas);
//     }

//     let setCode: SetCodeValidationResult | undefined;
//     if (tx._tag === "SetCodeTransaction") {
//       setCode = yield* validateSetCodeTransaction(tx);
//     }

//     const accessList = yield* validateAccessList(tx);

//     // Step 4: Contract creation restrictions
//     yield* validateContractCreationRestrictions(tx);

//     return {
//       validation,
//       check,
//       ...(blob && { blob }),
//       ...(setCode && { setCode }),
//       accessList,
//     };
//   });

// """
// Error types common across all Ethereum forks.
// """

import type { Uint } from "@evm-effect/ethereum-types";
import { Data } from "effect";
import type { Transaction } from "./transactions.js";

/** Fixture format used by execution-spec-tests (e.g. `TransactionException.INTRINSIC_GAS_TOO_LOW`). */
export interface HasTestTag {
  readonly testTag: string;
}

export class InvalidBlock extends Data.TaggedError(
  "EthereumException/InvalidBlock",
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.INVALID_BLOCK" as const;
}

const InvalidBlockTag = "EthereumException/InvalidBlock" as const;

export class IncorrectExcessBlobGasError extends Data.TaggedError(
  `${InvalidBlockTag}/IncorrectExcessBlobGasError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.INCORRECT_EXCESS_BLOB_GAS" as const;
}

export class IncorrectBlobGasUsedError extends Data.TaggedError(
  `${InvalidBlockTag}/IncorrectBlobGasUsedError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.INCORRECT_BLOB_GAS_USED" as const;
}

export class InvalidGasLimitError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidGasLimitError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.INVALID_GASLIMIT" as const;
}

export class BlobGasUsedAboveLimitError extends Data.TaggedError(
  `${InvalidBlockTag}/BlobGasUsedAboveLimitError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.BLOB_GAS_USED_ABOVE_LIMIT" as const;
}

export class InvalidWithdrawalsRootError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidWithdrawalsRootError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.INVALID_WITHDRAWALS_ROOT" as const;
}

export class IncorrectBlockFormatError extends Data.TaggedError(
  `${InvalidBlockTag}/IncorrectBlockFormatError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.INCORRECT_BLOCK_FORMAT" as const;
}

export class RlpStructuresEncodingError extends Data.TaggedError(
  `${InvalidBlockTag}/RlpStructuresEncodingError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.RLP_STRUCTURES_ENCODING" as const;
}

export class InvalidDepositEventLayoutError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidDepositEventLayoutError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.INVALID_DEPOSIT_EVENT_LAYOUT" as const;
}

export class InvalidRequestsError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidRequestsError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.INVALID_REQUESTS" as const;
}

export class SystemContractEmptyError extends Data.TaggedError(
  `${InvalidBlockTag}/SystemContractEmptyError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.SYSTEM_CONTRACT_EMPTY" as const;
}

export class SystemContractCallFailedError extends Data.TaggedError(
  `${InvalidBlockTag}/SystemContractCallFailedError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.SYSTEM_CONTRACT_CALL_FAILED" as const;
}

export class InvalidBaseFeePerGasError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidBaseFeePerGasError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "BlockException.INVALID_BASEFEE_PER_GAS" as const;
}

export class StateWithEmptyAccount extends Data.TaggedError(
  "EthereumException/StateWithEmptyAccount",
)<{ readonly message?: string | undefined }> {
  readonly testTag = "StateException.STATE_WITH_EMPTY_ACCOUNT" as const;
}

const InvalidTransactionTag = "EthereumException/InvalidTransaction" as const;

export class InvalidSenderError extends Data.TaggedError(
  `${InvalidTransactionTag}/InvalidSenderError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.SENDER_NOT_EOA" as const;
}

class InvalidSignatureError extends Data.TaggedError(
  `${InvalidTransactionTag}/InvalidSignatureError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.INVALID_SIGNATURE_VRS" as const;
}

export class InsufficientBalanceError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientBalanceError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.INSUFFICIENT_ACCOUNT_FUNDS" as const;
}

export class NonceMismatchError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceMismatchError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.NONCE_MISMATCH" as const;
}

export class NonceTooLowError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceTooLowError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.NONCE_MISMATCH_TOO_LOW" as const;
}

export class NonceTooHighError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceTooHighError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.NONCE_MISMATCH_TOO_HIGH" as const;
}

export class GasUsedExceedsLimitError extends Data.TaggedError(
  `${InvalidTransactionTag}/GasUsedExceedsLimitError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.GAS_ALLOWANCE_EXCEEDED" as const;
}

export class InsufficientTransactionGasError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientTransactionGasError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.INTRINSIC_GAS_TOO_LOW" as const;
}

export class IntrinsicGasBelowFloorGasCostError extends Data.TaggedError(
  `${InvalidTransactionTag}/IntrinsicGasBelowFloorGasCostError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.INTRINSIC_GAS_BELOW_FLOOR_GAS_COST" as const;
}

export class NonceOverflowError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceOverflowError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.NONCE_IS_MAX" as const;
}

class TransactionTypeError extends Data.TaggedError(
  `${InvalidTransactionTag}/TransactionTypeError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.TYPE_NOT_SUPPORTED" as const;

  constructor(public readonly transaction_type: number) {
    super({ message: `unknown transaction type ${transaction_type}` });
  }
}

export class TransactionTypeContractCreationError extends Data.TaggedError(
  `${InvalidTransactionTag}/TransactionTypeContractCreationError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.TYPE_3_TX_CONTRACT_CREATION" as const;

  constructor(public readonly transaction: Transaction) {
    super({
      message: `transaction type ${transaction._tag} not allowed to create contracts`,
    });
  }
}

// TYPE_4 (SetCodeTransaction) specific contract creation error
export class Type4TxContractCreationError extends Data.TaggedError(
  `${InvalidTransactionTag}/Type4TxContractCreationError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.TYPE_4_TX_CONTRACT_CREATION" as const;
}

export class Type1TxPreForkError extends Data.TaggedError(
  `${InvalidTransactionTag}/TYPE_1_TX_PRE_FORK`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.TYPE_1_TX_PRE_FORK" as const;
}

export class Type2TxPreForkError extends Data.TaggedError(
  `${InvalidTransactionTag}/TYPE_2_TX_PRE_FORK`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.TYPE_2_TX_PRE_FORK" as const;
}

export class Type3TxPreForkError extends Data.TaggedError(
  `${InvalidTransactionTag}/TYPE_3_TX_PRE_FORK`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.TYPE_3_TX_PRE_FORK" as const;
}

export class Type4TxPreForkError extends Data.TaggedError(
  `${InvalidTransactionTag}/TYPE_4_TX_PRE_FORK`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.TYPE_4_TX_PRE_FORK" as const;
}

export class BlobGasLimitExceededError extends Data.TaggedError(
  `${InvalidTransactionTag}/BlobGasLimitExceededError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.TYPE_3_TX_MAX_BLOB_GAS_ALLOWANCE_EXCEEDED" as const;
}

export class InsufficientMaxFeePerBlobGasError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientMaxFeePerBlobGasError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.INSUFFICIENT_MAX_FEE_PER_BLOB_GAS" as const;
}

export class InsufficientMaxFeePerGasError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientMaxFeePerGasError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.INSUFFICIENT_MAX_FEE_PER_GAS" as const;

  constructor(
    public readonly transaction_max_fee_per_gas: Uint,
    public readonly block_base_fee_per_gas: Uint,
  ) {
    super({
      message: `Insufficient max fee per gas (${transaction_max_fee_per_gas} < ${block_base_fee_per_gas})`,
    });
  }
}

export class InvalidBlobVersionedHashError extends Data.TaggedError(
  `${InvalidTransactionTag}/InvalidBlobVersionedHashError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.TYPE_3_TX_INVALID_BLOB_VERSIONED_HASH" as const;
}

export class NoBlobDataError extends Data.TaggedError(
  `${InvalidTransactionTag}/NoBlobDataError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.TYPE_3_TX_ZERO_BLOBS" as const;
}

export class BlobCountExceededError extends Data.TaggedError(
  `${InvalidTransactionTag}/BlobCountExceededError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.TYPE_3_TX_BLOB_COUNT_EXCEEDED" as const;
}

export class PriorityFeeGreaterThanMaxFeeError extends Data.TaggedError(
  `${InvalidTransactionTag}/PriorityFeeGreaterThanMaxFeeError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.PRIORITY_GREATER_THAN_MAX_FEE_PER_GAS" as const;
}

export class EmptyAuthorizationListError extends Data.TaggedError(
  `${InvalidTransactionTag}/EmptyAuthorizationListError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag =
    "TransactionException.TYPE_4_EMPTY_AUTHORIZATION_LIST" as const;
}

export class InitCodeTooLargeError extends Data.TaggedError(
  `${InvalidTransactionTag}/InitCodeTooLargeError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.INITCODE_SIZE_EXCEEDED" as const;
}

export class TransactionGasLimitExceededError extends Data.TaggedError(
  `${InvalidTransactionTag}/TransactionGasLimitExceededError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "TransactionException.GAS_LIMIT_EXCEEDS_MAXIMUM" as const;
}

export class Revert extends Data.TaggedError(`EthereumException/Revert`)<{
  readonly message?: string | undefined;
}> {
  readonly testTag = "ExceptionalHalt.REVERT" as const;
}

/**
 * Precompile `Run` returned an error after `RequiredGas` was charged (e.g.
 * invalid BN256 input). `RunPrecompiledContract` leaves gas on the budget, but
 * go-ethereum `Call` / `CallCode` then exhausts remaining gas unless the error
 * is `ErrExecutionReverted`; we mirror that by clearing this frame's gas in the
 * interpreter while still tagging the failure for traces.
 */
export class PrecompileFailure extends Data.TaggedError(
  `EthereumException/PrecompileFailure`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.PRECOMPILE_FAILURE" as const;
}

export const ExceptionalHaltTag = "EthereumException/ExceptionalHalt" as const;
export class ExceptionalHaltError extends Data.TaggedError(ExceptionalHaltTag)<{
  readonly message?: string | undefined;
}> {
  readonly testTag = "ExceptionalHalt.EXCEPTIONAL_HALT" as const;
}

export class StackUnderflowError extends Data.TaggedError(
  `${ExceptionalHaltTag}/StackUnderflowError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.STACK_UNDERFLOW" as const;
}

export class StackOverflowError extends Data.TaggedError(
  `${ExceptionalHaltTag}/StackOverflowError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.STACK_OVERFLOW" as const;
}

export class OutOfGasError extends Data.TaggedError(
  `${ExceptionalHaltTag}/OutOfGasError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.OUT_OF_GAS" as const;
}

export class InvalidOpcode extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidOpcode`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.INVALID_OPCODE" as const;

  constructor(public readonly code: number) {
    super({ message: `invalid opcode ${code.toString(16)}` });
  }
}

export class InvalidJumpDestError extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidJumpDestError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.INVALID_JUMP_DEST" as const;

  constructor(public readonly code: number) {
    super({ message: `invalid jump dest ${code}` });
  }
}

export class StackDepthLimitError extends Data.TaggedError(
  `${ExceptionalHaltTag}/StackDepthLimitError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.STACK_DEPTH_LIMIT" as const;
}

export class WriteInStaticContext extends Data.TaggedError(
  `${ExceptionalHaltTag}/WriteInStaticContext`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.WRITE_IN_STATIC_CONTEXT" as const;
}

export class OutOfBoundsReadError extends Data.TaggedError(
  `${ExceptionalHaltTag}/OutOfBoundsReadError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.OUT_OF_BOUNDS_READ" as const;
}

export class InvalidParameterError extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidParameterError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.INVALID_PARAMETER" as const;
}

export class InvalidContractPrefixError extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidContractPrefixError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.INVALID_CONTRACT_PREFIX" as const;
}

export class AddressCollisionError extends Data.TaggedError(
  `${ExceptionalHaltTag}/AddressCollisionError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.ADDRESS_COLLISION" as const;
}

export class KZGProofError extends Data.TaggedError(
  `${ExceptionalHaltTag}/KZGProofError`,
)<{ readonly message?: string | undefined }> {
  readonly testTag = "ExceptionalHalt.KZG_PROOF_ERROR" as const;
}

export type ExceptionalHalt =
  | StackUnderflowError
  | StackOverflowError
  | OutOfGasError
  | InvalidOpcode
  | InvalidJumpDestError
  | StackDepthLimitError
  | WriteInStaticContext
  | OutOfBoundsReadError
  | InvalidParameterError
  | InvalidContractPrefixError
  | AddressCollisionError
  | KZGProofError;

export type VmException =
  | Revert
  | PrecompileFailure
  | ExceptionalHalt
  | ExceptionalHaltError;

export type InvalidTransaction =
  | InvalidSenderError
  | InvalidSignatureError
  | InsufficientBalanceError
  | NonceMismatchError
  | GasUsedExceedsLimitError
  | InsufficientTransactionGasError
  | NonceOverflowError
  | TransactionTypeError
  | TransactionTypeContractCreationError
  | BlobGasLimitExceededError
  | InsufficientMaxFeePerBlobGasError
  | InsufficientMaxFeePerGasError
  | InvalidBlobVersionedHashError
  | NoBlobDataError
  | BlobCountExceededError
  | PriorityFeeGreaterThanMaxFeeError
  | EmptyAuthorizationListError
  | InitCodeTooLargeError
  | TransactionGasLimitExceededError;

export type EthereumException =
  | StateWithEmptyAccount
  | InvalidBlock
  | VmException
  | InvalidTransaction;

/** Read the execution-spec-tests fixture tag from an error, if present. */
export const getTestTag = (error: unknown): string | null =>
  error !== null &&
  typeof error === "object" &&
  "testTag" in error &&
  typeof error.testTag === "string"
    ? error.testTag
    : null;

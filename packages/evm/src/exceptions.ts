// """
// Error types common across all Ethereum forks.
// """

import type { Transaction } from "@evm-effect/crypto/transactions";
import type { Uint } from "@evm-effect/ethereum-types";
import { Data } from "effect";
import { getOpcodeName } from "./vm/opcodes.js";

export class InvalidBlock extends Data.TaggedError(
  "EthereumException/InvalidBlock",
)<{ readonly message?: string | undefined }> {}

const InvalidBlockTag = "EthereumException/InvalidBlock" as const;

export class IncorrectExcessBlobGasError extends Data.TaggedError(
  `${InvalidBlockTag}/IncorrectExcessBlobGasError`,
)<{ readonly message?: string | undefined }> {}

export class IncorrectBlobGasUsedError extends Data.TaggedError(
  `${InvalidBlockTag}/IncorrectBlobGasUsedError`,
)<{ readonly message?: string | undefined }> {}

export class InvalidGasLimitError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidGasLimitError`,
)<{ readonly message?: string | undefined }> {}

export class BlobGasUsedAboveLimitError extends Data.TaggedError(
  `${InvalidBlockTag}/BlobGasUsedAboveLimitError`,
)<{ readonly message?: string | undefined }> {}

export class InvalidWithdrawalsRootError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidWithdrawalsRootError`,
)<{ readonly message?: string | undefined }> {}

export class IncorrectBlockFormatError extends Data.TaggedError(
  `${InvalidBlockTag}/IncorrectBlockFormatError`,
)<{ readonly message?: string | undefined }> {}

export class RlpStructuresEncodingError extends Data.TaggedError(
  `${InvalidBlockTag}/RlpStructuresEncodingError`,
)<{ readonly message?: string | undefined }> {}

export class InvalidDepositEventLayoutError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidDepositEventLayoutError`,
)<{ readonly message?: string | undefined }> {}

export class InvalidRequestsError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidRequestsError`,
)<{ readonly message?: string | undefined }> {}

export class SystemContractEmptyError extends Data.TaggedError(
  `${InvalidBlockTag}/SystemContractEmptyError`,
)<{ readonly message?: string | undefined }> {}

export class SystemContractCallFailedError extends Data.TaggedError(
  `${InvalidBlockTag}/SystemContractCallFailedError`,
)<{ readonly message?: string | undefined }> {}

export class InvalidBaseFeePerGasError extends Data.TaggedError(
  `${InvalidBlockTag}/InvalidBaseFeePerGasError`,
)<{ readonly message?: string | undefined }> {}

export class StateWithEmptyAccount extends Data.TaggedError(
  "EthereumException/StateWithEmptyAccount",
)<{ readonly message?: string | undefined }> {}

const InvalidTransactionTag = "EthereumException/InvalidTransaction" as const;

export class InvalidSenderError extends Data.TaggedError(
  `${InvalidTransactionTag}/InvalidSenderError`,
)<{ readonly message?: string | undefined }> {}

class InvalidSignatureError extends Data.TaggedError(
  `${InvalidTransactionTag}/InvalidSignatureError`,
)<{ readonly message?: string | undefined }> {}

export class InsufficientBalanceError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientBalanceError`,
)<{ readonly message?: string | undefined }> {}

export class NonceMismatchError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceMismatchError`,
)<{ readonly message?: string | undefined }> {}

export class NonceTooLowError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceTooLowError`,
)<{ readonly message?: string | undefined }> {}

export class NonceTooHighError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceTooHighError`,
)<{ readonly message?: string | undefined }> {}

export class GasUsedExceedsLimitError extends Data.TaggedError(
  `${InvalidTransactionTag}/GasUsedExceedsLimitError`,
)<{ readonly message?: string | undefined }> {}

export class InsufficientTransactionGasError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientTransactionGasError`,
)<{ readonly message?: string | undefined }> {}

export class IntrinsicGasBelowFloorGasCostError extends Data.TaggedError(
  `${InvalidTransactionTag}/IntrinsicGasBelowFloorGasCostError`,
)<{ readonly message?: string | undefined }> {}

export class NonceOverflowError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceOverflowError`,
)<{ readonly message?: string | undefined }> {}

class TransactionTypeError extends Data.TaggedError(
  `${InvalidTransactionTag}/TransactionTypeError`,
)<{ readonly message?: string | undefined }> {
  constructor(public readonly transaction_type: number) {
    super({ message: `unknown transaction type ${transaction_type}` });
  }
}

export class TransactionTypeContractCreationError extends Data.TaggedError(
  `${InvalidTransactionTag}/TransactionTypeContractCreationError`,
)<{ readonly message?: string | undefined }> {
  constructor(public readonly transaction: Transaction) {
    super({
      message: `transaction type ${transaction._tag} not allowed to create contracts`,
    });
  }
}

// TYPE_4 (SetCodeTransaction) specific contract creation error
export class Type4TxContractCreationError extends Data.TaggedError(
  `${InvalidTransactionTag}/Type4TxContractCreationError`,
)<{ readonly message?: string | undefined }> {}

export class Type1TxPreForkError extends Data.TaggedError(
  `${InvalidTransactionTag}/TYPE_1_TX_PRE_FORK`,
)<{ readonly message?: string | undefined }> {}

export class Type2TxPreForkError extends Data.TaggedError(
  `${InvalidTransactionTag}/TYPE_2_TX_PRE_FORK`,
)<{ readonly message?: string | undefined }> {}

export class Type3TxPreForkError extends Data.TaggedError(
  `${InvalidTransactionTag}/TYPE_3_TX_PRE_FORK`,
)<{ readonly message?: string | undefined }> {}

export class Type4TxPreForkError extends Data.TaggedError(
  `${InvalidTransactionTag}/TYPE_4_TX_PRE_FORK`,
)<{ readonly message?: string | undefined }> {}

export class BlobGasLimitExceededError extends Data.TaggedError(
  `${InvalidTransactionTag}/BlobGasLimitExceededError`,
)<{ readonly message?: string | undefined }> {}

export class InsufficientMaxFeePerBlobGasError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientMaxFeePerBlobGasError`,
)<{ readonly message?: string | undefined }> {}

export class InsufficientMaxFeePerGasError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientMaxFeePerGasError`,
)<{ readonly message?: string | undefined }> {
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
)<{ readonly message?: string | undefined }> {}

export class NoBlobDataError extends Data.TaggedError(
  `${InvalidTransactionTag}/NoBlobDataError`,
)<{ readonly message?: string | undefined }> {}

export class BlobCountExceededError extends Data.TaggedError(
  `${InvalidTransactionTag}/BlobCountExceededError`,
)<{ readonly message?: string | undefined }> {}

export class PriorityFeeGreaterThanMaxFeeError extends Data.TaggedError(
  `${InvalidTransactionTag}/PriorityFeeGreaterThanMaxFeeError`,
)<{ readonly message?: string | undefined }> {}

export class EmptyAuthorizationListError extends Data.TaggedError(
  `${InvalidTransactionTag}/EmptyAuthorizationListError`,
)<{ readonly message?: string | undefined }> {}

export class InitCodeTooLargeError extends Data.TaggedError(
  `${InvalidTransactionTag}/InitCodeTooLargeError`,
)<{ readonly message?: string | undefined }> {}

export class TransactionGasLimitExceededError extends Data.TaggedError(
  `${InvalidTransactionTag}/TransactionGasLimitExceededError`,
)<{ readonly message?: string | undefined }> {}

export class Revert extends Data.TaggedError(`EthereumException/Revert`)<{
  readonly message?: string | undefined;
}> {}
export const ExceptionalHaltTag = "EthereumException/ExceptionalHalt" as const;
export class ExceptionalHaltError extends Data.TaggedError(ExceptionalHaltTag)<{
  readonly message?: string | undefined;
}> {}

export class StackUnderflowError extends Data.TaggedError(
  `${ExceptionalHaltTag}/StackUnderflowError`,
)<{ readonly message?: string | undefined }> {}

export class StackOverflowError extends Data.TaggedError(
  `${ExceptionalHaltTag}/StackOverflowError`,
)<{ readonly message?: string | undefined }> {}

export class OutOfGasError extends Data.TaggedError(
  `${ExceptionalHaltTag}/OutOfGasError`,
)<{ readonly message?: string | undefined }> {}

export class InvalidOpcode extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidOpcode`,
)<{ readonly message?: string | undefined }> {
  constructor(public readonly code: number) {
    const name = getOpcodeName(code);
    super({ message: `invalid opcode ${code} (${name})` });
  }
}

export class InvalidJumpDestError extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidJumpDestError`,
)<{ readonly message?: string | undefined }> {
  constructor(public readonly code: number) {
    super({ message: `invalid jump dest ${code}` });
  }
}

export class StackDepthLimitError extends Data.TaggedError(
  `${ExceptionalHaltTag}/StackDepthLimitError`,
)<{ readonly message?: string | undefined }> {}

export class WriteInStaticContext extends Data.TaggedError(
  `${ExceptionalHaltTag}/WriteInStaticContext`,
)<{ readonly message?: string | undefined }> {}

export class OutOfBoundsReadError extends Data.TaggedError(
  `${ExceptionalHaltTag}/OutOfBoundsReadError`,
)<{ readonly message?: string | undefined }> {}

export class InvalidParameterError extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidParameterError`,
)<{ readonly message?: string | undefined }> {}

export class InvalidContractPrefixError extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidContractPrefixError`,
)<{ readonly message?: string | undefined }> {}

export class AddressCollisionError extends Data.TaggedError(
  `${ExceptionalHaltTag}/AddressCollisionError`,
)<{ readonly message?: string | undefined }> {}

export class KZGProofError extends Data.TaggedError(
  `${ExceptionalHaltTag}/KZGProofError`,
)<{ readonly message?: string | undefined }> {}

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

export type VmException = Revert | ExceptionalHalt | ExceptionalHaltError;

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

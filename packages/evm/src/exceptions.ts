// """
// Error types common across all Ethereum forks.
// """

import type { Transaction } from "@evm-effect/crypto/transactions";
import type { Uint } from "@evm-effect/ethereum-types";
import { Data } from "effect";
import { getOpcodeName } from "./vm/opcodes.js";

// export abstract class EthereumException {
//   message?: string | undefined;
//   constructor({ message }: { message?: string } = {}) {
//     this.message = message;
//   }
// }

// class EthereumException(Exception):  # noqa N818
//     """
//     Base class for all exceptions _expected_ to be thrown during normal
//     operation.
//     """

// class InvalidBlock(EthereumException):
//     """
//     Thrown when a block being processed is found to be invalid.
//     """

export class InvalidBlock extends Data.TaggedError(
  "EthereumException/InvalidBlock",
)<{ readonly message?: string | undefined }> {}

// class StateWithEmptyAccount(EthereumException):
//     """
//     Thrown when the state has empty account.
//     """

export class StateWithEmptyAccount extends Data.TaggedError(
  "EthereumException/StateWithEmptyAccount",
)<{ readonly message?: string | undefined }> {}

// class InvalidTransaction(EthereumException):
//     """
//     Thrown when a transaction being processed is found to be invalid.
//     """

const InvalidTransactionTag = "EthereumException/InvalidTransaction" as const;

// class InvalidSenderError(InvalidTransaction):
//     """
//     Thrown when a transaction originates from an account that cannot send
//     transactions.
//     """

export class InvalidSenderError extends Data.TaggedError(
  `${InvalidTransactionTag}/InvalidSenderError`,
)<{ readonly message?: string | undefined }> {}

// class InvalidSignatureError(InvalidTransaction):
//     """
//     Thrown when a transaction has an invalid signature.
//     """

class InvalidSignatureError extends Data.TaggedError(
  `${InvalidTransactionTag}/InvalidSignatureError`,
)<{ readonly message?: string | undefined }> {}
// class InsufficientBalanceError(InvalidTransaction):
//     """
//     Thrown when a transaction cannot be executed due to insufficient sender
//     funds.
//     """

export class InsufficientBalanceError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientBalanceError`,
)<{ readonly message?: string | undefined }> {}

// class NonceMismatchError(InvalidTransaction):
//     """
//     Thrown when a transaction's nonce does not match the expected nonce for the
//     sender.
//     """

export class NonceMismatchError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceMismatchError`,
)<{ readonly message?: string | undefined }> {}

// class GasUsedExceedsLimitError(InvalidTransaction):
//     """
//     Thrown when a transaction's gas usage exceeds the gas available in the
//     block.
//     """

export class GasUsedExceedsLimitError extends Data.TaggedError(
  `${InvalidTransactionTag}/GasUsedExceedsLimitError`,
)<{ readonly message?: string | undefined }> {}
// class InsufficientTransactionGasError(InvalidTransaction):
//     """
//     Thrown when a transaction does not provide enough gas to cover its
//     intrinsic cost.
//     """

export class InsufficientTransactionGasError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientTransactionGasError`,
)<{ readonly message?: string | undefined }> {}

// class NonceOverflowError(InvalidTransaction):
//     """
//     Thrown when a transaction's nonce is greater than `2**64 - 2`.
//     """

export class NonceOverflowError extends Data.TaggedError(
  `${InvalidTransactionTag}/NonceOverflowError`,
)<{ readonly message?: string | undefined }> {}

////////FORK SPECIFIC EXCEPTIONS
// """
// Exceptions specific to this fork.
// """

// from typing import TYPE_CHECKING, Final

// from ethereum_types.numeric import Uint

// from ethereum.exceptions import InvalidTransaction

// if TYPE_CHECKING:
//     from .transactions import Transaction

// class TransactionTypeError(InvalidTransaction):
//     """
//     Unknown [EIP-2718] transaction type byte.

//     [EIP-2718]: https://eips.ethereum.org/EIPS/eip-2718
//     """

//     transaction_type: Final[int]
//     """
//     The type byte of the transaction that caused the error.
//     """

//     def __init__(self, transaction_type: int):
//         super().__init__(f"unknown transaction type `{transaction_type}`")
//         self.transaction_type = transaction_type

class TransactionTypeError extends Data.TaggedError(
  `${InvalidTransactionTag}/TransactionTypeError`,
)<{ readonly message?: string | undefined }> {
  constructor(public readonly transaction_type: number) {
    super({ message: `unknown transaction type ${transaction_type}` });
  }
}

// class TransactionTypeContractCreationError(InvalidTransaction):
//     """
//     Contract creation is not allowed for a transaction type.
//     """

//     transaction: "Transaction"
//     """
//     The transaction that caused the error.
//     """

//     def __init__(self, transaction: "Transaction"):
//         super().__init__(
//             f"transaction type `{type(transaction).__name__}` not allowed to "
//             "create contracts"
//         )
//         self.transaction = transaction

export class TransactionTypeContractCreationError extends Data.TaggedError(
  `${InvalidTransactionTag}/TransactionTypeContractCreationError`,
)<{ readonly message?: string | undefined }> {
  constructor(public readonly transaction: Transaction) {
    super({
      message: `transaction type ${transaction._tag} not allowed to create contracts`,
    });
  }
}

// class Type3TxPreForkError(InvalidTransaction):
//     """
//     Transaction type 3 (blob transaction) used before Cancun fork.
//     """

export class Type3TxPreForkError extends Data.TaggedError(
  `${InvalidTransactionTag}/TYPE_3_TX_PRE_FORK`,
)<{ readonly message?: string | undefined }> {}

// class BlobGasLimitExceededError(InvalidTransaction):
//     """
//     The blob gas limit for the transaction exceeds the maximum allowed.
//     """

export class BlobGasLimitExceededError extends Data.TaggedError(
  `${InvalidTransactionTag}/BlobGasLimitExceededError`,
)<{ readonly message?: string | undefined }> {}

// class InsufficientMaxFeePerBlobGasError(InvalidTransaction):
//     """
//     The maximum fee per blob gas is insufficient for the transaction.
//     """

export class InsufficientMaxFeePerBlobGasError extends Data.TaggedError(
  `${InvalidTransactionTag}/InsufficientMaxFeePerBlobGasError`,
)<{ readonly message?: string | undefined }> {}
// class InsufficientMaxFeePerGasError(InvalidTransaction):
//     """
//     The maximum fee per gas is insufficient for the transaction.
//     """

//     transaction_max_fee_per_gas: Final[Uint]
//     """
//     The maximum fee per gas specified in the transaction.
//     """

//     block_base_fee_per_gas: Final[Uint]
//     """
//     The base fee per gas of the block in which the transaction is included.
//     """

//     def __init__(
//         self, transaction_max_fee_per_gas: Uint, block_base_fee_per_gas: Uint
//     ):
//         super().__init__(
//             f"Insufficient max fee per gas "
//             f"({transaction_max_fee_per_gas} < {block_base_fee_per_gas})"
//         )
//         self.transaction_max_fee_per_gas = transaction_max_fee_per_gas
//         self.block_base_fee_per_gas = block_base_fee_per_gas

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
// class InvalidBlobVersionedHashError(InvalidTransaction):
//     """
//     The versioned hash of the blob is invalid.
//     """

export class InvalidBlobVersionedHashError extends Data.TaggedError(
  `${InvalidTransactionTag}/InvalidBlobVersionedHashError`,
)<{ readonly message?: string | undefined }> {}
// class NoBlobDataError(InvalidTransaction):
//     """
//     The transaction does not contain any blob data.
//     """

export class NoBlobDataError extends Data.TaggedError(
  `${InvalidTransactionTag}/NoBlobDataError`,
)<{ readonly message?: string | undefined }> {}
// class BlobCountExceededError(InvalidTransaction):
//     """
//     The transaction has more blobs than the limit.
//     """
export class BlobCountExceededError extends Data.TaggedError(
  `${InvalidTransactionTag}/BlobCountExceededError`,
)<{ readonly message?: string | undefined }> {}
// class PriorityFeeGreaterThanMaxFeeError(InvalidTransaction):
//     """
//     The priority fee is greater than the maximum fee per gas.
//     """
export class PriorityFeeGreaterThanMaxFeeError extends Data.TaggedError(
  `${InvalidTransactionTag}/PriorityFeeGreaterThanMaxFeeError`,
)<{ readonly message?: string | undefined }> {}

// class EmptyAuthorizationListError(InvalidTransaction):
//     """
//     The authorization list in the transaction is empty.
//     """
export class EmptyAuthorizationListError extends Data.TaggedError(
  `${InvalidTransactionTag}/EmptyAuthorizationListError`,
)<{ readonly message?: string | undefined }> {}
// class InitCodeTooLargeError(InvalidTransaction):
//     """
//     The init code of the transaction is too large.
//     """
export class InitCodeTooLargeError extends Data.TaggedError(
  `${InvalidTransactionTag}/InitCodeTooLargeError`,
)<{ readonly message?: string | undefined }> {}

// class TransactionGasLimitExceededError(InvalidTransaction):
//     """
//     The transaction has specified a gas limit that is greater than the allowed
//     maximum.

//     Note that this is _not_ the exception thrown when bytecode execution runs
//     out of gas.
//     """

export class TransactionGasLimitExceededError extends Data.TaggedError(
  `${InvalidTransactionTag}/TransactionGasLimitExceededError`,
)<{ readonly message?: string | undefined }> {}
///// VM EXCEPTIONS

// """
// Ethereum Virtual Machine (EVM) Exceptions.

// .. contents:: Table of Contents
//     :backlinks: none
//     :local:

// Introduction
// ------------

// Exceptions which cause the EVM to halt exceptionally.
// """

// from ethereum.exceptions import EthereumException

// class ExceptionalHalt(EthereumException):
//     """
//     Indicates that the EVM has experienced an exceptional halt. This causes
//     execution to immediately end with all gas being consumed.
//     """

export class Revert extends Data.TaggedError(`EthereumException/Revert`)<{
  readonly message?: string | undefined;
}> {}
export const ExceptionalHaltTag = "EthereumException/ExceptionalHalt" as const;
export class ExceptionalHaltError extends Data.TaggedError(ExceptionalHaltTag)<{
  readonly message?: string | undefined;
}> {}

// export type ExceptionalHalt  = ExceptionalHalt;
// class Revert(EthereumException):
//     """
//     Raised by the `REVERT` opcode.

//     Unlike other EVM exceptions this does not result in the consumption of all
//     gas.
//     """

// class StackUnderflowError(ExceptionalHalt):
//     """
//     Occurs when a pop is executed on an empty stack.
//     """

export class StackUnderflowError extends Data.TaggedError(
  `${ExceptionalHaltTag}/StackUnderflowError`,
)<{ readonly message?: string | undefined }> {}

// class StackOverflowError(ExceptionalHalt):
//     """
//     Occurs when a push is executed on a stack at max capacity.
//     """

export class StackOverflowError extends Data.TaggedError(
  `${ExceptionalHaltTag}/StackOverflowError`,
)<{ readonly message?: string | undefined }> {}

// class OutOfGasError(ExceptionalHalt):
//     """
//     Occurs when an operation costs more than the amount of gas left in the
//     frame.
//     """

export class OutOfGasError extends Data.TaggedError(
  `${ExceptionalHaltTag}/OutOfGasError`,
)<{ readonly message?: string | undefined }> {}

// class InvalidOpcode(ExceptionalHalt):
//     """
//     Raised when an invalid opcode is encountered.
//     """

//     code: int

//     def __init__(self, code: int) -> None:
//         super().__init__(code)
//         self.code = code

export class InvalidOpcode extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidOpcode`,
)<{ readonly message?: string | undefined }> {
  constructor(public readonly code: number) {
    const name = getOpcodeName(code);
    super({ message: `invalid opcode ${code} (${name})` });
  }
}
// class InvalidJumpDestError(ExceptionalHalt):
//     """
//     Occurs when the destination of a jump operation doesn't meet any of the
//     following criteria.

//       * The jump destination is less than the length of the code.
//       * The jump destination should have the `JUMPDEST` opcode (0x5B).
//       * The jump destination shouldn't be part of the data corresponding to
//         `PUSH-N` opcodes.
//     """

export class InvalidJumpDestError extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidJumpDestError`,
)<{ readonly message?: string | undefined }> {
  constructor(public readonly code: number) {
    super({ message: `invalid jump dest ${code}` });
  }
}
// class StackDepthLimitError(ExceptionalHalt):
//     """
//     Raised when the message depth is greater than `1024`.
//     """

export class StackDepthLimitError extends Data.TaggedError(
  `${ExceptionalHaltTag}/StackDepthLimitError`,
)<{ readonly message?: string | undefined }> {}

// class WriteInStaticContext(ExceptionalHalt):
//     """
//     Raised when an attempt is made to modify the state while operating inside
//     of a STATICCALL context.
//     """

export class WriteInStaticContext extends Data.TaggedError(
  `${ExceptionalHaltTag}/WriteInStaticContext`,
)<{ readonly message?: string | undefined }> {}

// class OutOfBoundsRead(ExceptionalHalt):
//     """
//     Raised when an attempt was made to read data beyond the
//     boundaries of the buffer.
//     """

export class OutOfBoundsReadError extends Data.TaggedError(
  `${ExceptionalHaltTag}/OutOfBoundsReadError`,
)<{ readonly message?: string | undefined }> {}

// class InvalidParameter(ExceptionalHalt):
//     """
//     Raised when invalid parameters are passed.
//     """

export class InvalidParameterError extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidParameterError`,
)<{ readonly message?: string | undefined }> {}

// class InvalidContractPrefix(ExceptionalHalt):
//     """
//     Raised when the new contract code starts with 0xEF.
//     """

export class InvalidContractPrefixError extends Data.TaggedError(
  `${ExceptionalHaltTag}/InvalidContractPrefixError`,
)<{ readonly message?: string | undefined }> {}

// class AddressCollision(ExceptionalHalt):
//     """
//     Raised when the new contract address has a collision.
//     """

export class AddressCollisionError extends Data.TaggedError(
  `${ExceptionalHaltTag}/AddressCollisionError`,
)<{ readonly message?: string | undefined }> {}

// class KZGProofError(ExceptionalHalt):
//     """
//     Raised when the point evaluation precompile can't verify a proof.
//     """

//     pass

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

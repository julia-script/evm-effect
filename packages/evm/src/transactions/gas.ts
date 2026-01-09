/**
 * Transaction Gas Calculation Utilities
 *
 * Direct port of gas calculation functions from ethereum/forks/osaka/transactions.py
 * and related gas calculation logic from vm/gas.py.
 *
 * All functions maintain exact parity with Python implementation.
 */

import { U64, Uint } from "@evm-effect/ethereum-types";
import { Data, Effect } from "effect";
import {
  BLOB_BASE_FEE_UPDATE_FRACTION,
  FLOOR_CALLDATA_COST,
  GAS_PER_BLOB,
  MIN_BLOB_GASPRICE,
  STANDARD_CALLDATA_TOKEN_COST,
  TX_ACCESS_LIST_ADDRESS_COST,
  TX_ACCESS_LIST_STORAGE_KEY_COST,
  TX_BASE_COST,
  TX_CREATE_COST,
} from "../constants.js";
import type {
  AccessListTransaction,
  BlobTransaction,
  FeeMarketTransaction,
  SetCodeTransaction,
  Transaction,
} from "../types/Transaction.js";
import { Fork } from "../vm/Fork.js";
import { initCodeCost } from "../vm/gas.js";

// ============================================================================
// Constants from Python implementation
// ============================================================================

/**
 * Gas cost per empty account for authorization in SetCodeTransaction.
 * From vm/eoa_delegation.py: PER_EMPTY_ACCOUNT_COST = 25000
 */
const PER_EMPTY_ACCOUNT_COST = 25000;

// ============================================================================
// Error Types for Gas Calculations
// ============================================================================

/**
 * Thrown when priority fee is greater than max fee per gas.
 */
// export class PriorityFeeGreaterThanMaxFeeError extends Data.TaggedError(
//   "PriorityFeeGreaterThanMaxFeeError",
// )<{
//   readonly message: string;
// }> {}

// /**
//  * Thrown when max fee per gas is insufficient for the transaction.
//  */
// export class InsufficientMaxFeePerGasError extends Data.TaggedError(
//   "InsufficientMaxFeePerGasError",
// )<{
//   readonly message: string;
//   readonly transactionMaxFeePerGas: Uint;
//   readonly blockBaseFeePerGas: Uint;
// }> {
//   constructor(transactionMaxFeePerGas: Uint, blockBaseFeePerGas: Uint) {
//     super({
//       message: `Insufficient max fee per gas (${transactionMaxFeePerGas.value} < ${blockBaseFeePerGas.value})`,
//       transactionMaxFeePerGas,
//       blockBaseFeePerGas,
//     });
//   }
// }

// /**
//  * Thrown when gas price is insufficient for legacy transactions.
//  */
// export class InsufficientGasPriceError extends Data.TaggedError(
//   "InsufficientGasPriceError",
// )<{
//   readonly message: string;
//   readonly transactionGasPrice: Uint;
//   readonly blockBaseFeePerGas: Uint;
// }> {
//   constructor(transactionGasPrice: Uint, blockBaseFeePerGas: Uint) {
//     super({
//       message: `Insufficient gas price (${transactionGasPrice.value} < ${blockBaseFeePerGas.value})`,
//       transactionGasPrice,
//       blockBaseFeePerGas,
//     });
//   }
// }

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of intrinsic gas calculation.
 *
 * Matches the return type of Python's calculate_intrinsic_cost function.
 */
class IntrinsicGasResult extends Data.Class<{
  /**
   * The intrinsic gas cost of the transaction.
   * Includes base cost, data cost, creation cost, access list cost, and authorization cost.
   */
  readonly intrinsicGas: Uint;

  /**
   * The minimum calldata gas cost for EIP-7623 floor pricing.
   * Calculated as tokens_in_calldata * FLOOR_CALLDATA_COST + TX_BASE_COST.
   */
  readonly calldataFloorGasCost: Uint;
}> {}

// ============================================================================
// Gas Calculation Functions
// ============================================================================

/**
 * Calculates the gas that is charged before execution is started.
 *
 * The intrinsic cost of the transaction is charged before execution has
 * begun. Functions/operations in the EVM cost money to execute so this
 * intrinsic cost is for the operations that need to be paid for as part of
 * the transaction. Data transfer, for example, is part of this intrinsic
 * cost. It costs ether to send data over the wire and that ether is
 * accounted for in the intrinsic cost calculated in this function. This
 * intrinsic cost must be calculated and paid for before execution in order
 * for all operations to be implemented.
 *
 * The intrinsic cost includes:
 * 1. Base cost (`TX_BASE_COST`)
 * 2. Cost for data (zero and non-zero bytes)
 * 3. Cost for contract creation (if applicable)
 * 4. Cost for access list entries (if applicable)
 * 5. Cost for authorizations (if applicable)
 *
 * This function takes a transaction as a parameter and returns the intrinsic
 * gas cost of the transaction and the minimum gas cost used by the
 * transaction based on the calldata size.
 *
 * Direct port of Python's calculate_intrinsic_cost function.
 */
const TX_DATA_COST_PER_ZERO = new Uint({ value: 4n });
export const calculateIntrinsicGas = Effect.fn("calculateIntrinsicGas")(
  function* (tx: Transaction) {
    // Count zero bytes in transaction data
    const fork = yield* Fork;
    const TX_DATA_COST_PER_NON_ZERO = new Uint({
      value: fork.eip(2028) ? 16n : 68n,
    });
    let dataCost = 0n;
    let calldataFloorGasCost = 0n;
    if (fork.eip(7623)) {
      let zeroBytes = 0;
      for (const byte of tx.data.value) {
        if (byte === 0) {
          zeroBytes += 1;
        }
      }

      // Calculate tokens in calldata (zero bytes count as 1, non-zero as 4)
      const tokensInCalldata = new Uint({
        value: BigInt(zeroBytes + (tx.data.value.length - zeroBytes) * 4),
      });

      // EIP-7623 floor price (note: no EVM costs)
      calldataFloorGasCost =
        tokensInCalldata.value * FLOOR_CALLDATA_COST.value + TX_BASE_COST.value;

      // Standard calldata cost
      dataCost = tokensInCalldata.value * STANDARD_CALLDATA_TOKEN_COST.value;
    } else {
      for (const byte of tx.data.value) {
        if (byte === 0) {
          dataCost += TX_DATA_COST_PER_ZERO.value;
        } else {
          dataCost += TX_DATA_COST_PER_NON_ZERO.value;
        }
      }
      calldataFloorGasCost = dataCost;
    }

    // Contract creation cost
    // In Frontier, contract creation cost is NOT part of intrinsic gas
    // From Homestead onwards, TX_CREATE_COST (32000) is added to intrinsic cost
    let createCost = new Uint({ value: 0n });
    if (isContractCreation(tx)) {
      const fork = yield* Fork;

      // Homestead and later: add TX_CREATE_COST to intrinsic gas
      if (fork.name !== "frontier") {
        createCost = new Uint({ value: TX_CREATE_COST.value });
      }

      // EIP-3860: Init code cost (introduced in Shanghai)
      if (fork.eip(3860)) {
        const initCost = initCodeCost(
          new Uint({ value: BigInt(tx.data.value.length) }),
        );
        createCost = new Uint({ value: createCost.value + initCost.value });
      }
    }

    // Access list cost
    let accessListCost = new Uint({ value: 0n });
    if (hasAccessList(tx)) {
      for (const access of tx.accessList) {
        accessListCost = new Uint({
          value: accessListCost.value + TX_ACCESS_LIST_ADDRESS_COST.value,
        });
        accessListCost = new Uint({
          value:
            accessListCost.value +
            BigInt(access.slots.length) * TX_ACCESS_LIST_STORAGE_KEY_COST.value,
        });
      }
    }

    // Authorization cost (for SetCodeTransaction)
    let authCost = new Uint({ value: 0n });
    if (isSetCodeTransaction(tx)) {
      authCost = new Uint({
        value: BigInt(PER_EMPTY_ACCOUNT_COST * tx.authorizations.length),
      });
    }

    // Calculate total intrinsic gas
    const intrinsicGas = new Uint({
      value:
        TX_BASE_COST.value +
        dataCost +
        createCost.value +
        accessListCost.value +
        authCost.value,
    });

    return new IntrinsicGasResult({
      intrinsicGas,
      calldataFloorGasCost: new Uint({ value: calldataFloorGasCost }),
    });
  },
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a transaction is a contract creation transaction.
 * Contract creation occurs when `to` field is undefined.
 */
const isContractCreation = (tx: Transaction): boolean => {
  return tx.to === undefined;
};

/**
 * Check if a transaction has an access list.
 * Access lists are present in AccessListTransaction, FeeMarketTransaction,
 * BlobTransaction, and SetCodeTransaction.
 */
const hasAccessList = (
  tx: Transaction,
): tx is
  | AccessListTransaction
  | FeeMarketTransaction
  | BlobTransaction
  | SetCodeTransaction => {
  return (
    tx._tag === "AccessListTransaction" ||
    tx._tag === "FeeMarketTransaction" ||
    tx._tag === "BlobTransaction" ||
    tx._tag === "SetCodeTransaction"
  );
};

/**
 * Check if a transaction is a SetCodeTransaction.
 */
const isSetCodeTransaction = (tx: Transaction): tx is SetCodeTransaction => {
  return tx._tag === "SetCodeTransaction";
};

/**
 * Check if a transaction is a BlobTransaction.
 */
const isBlobTransaction = (tx: Transaction): tx is BlobTransaction => {
  return tx._tag === "BlobTransaction";
};

// ============================================================================
// Blob Gas Calculation Functions
// ============================================================================

/**
 * Calculate the total blob gas for a transaction.
 *
 * Parameters
 * ----------
 * tx :
 *     The transaction for which the blob gas is to be calculated.
 *
 * Returns
 * -------
 * total_blob_gas: `U64`
 *     The total blob gas for the transaction.
 *
 * Direct port of Python's calculate_total_blob_gas function.
 */
export const calculateTotalBlobGas = (tx: Transaction): U64 => {
  if (isBlobTransaction(tx)) {
    return new U64({
      value: GAS_PER_BLOB.value * BigInt(tx.blobVersionedHashes.length),
    });
  } else {
    return new U64({ value: 0n });
  }
};

/**
 * Calculate the blob gasprice for a block.
 *
 * Parameters
 * ----------
 * excess_blob_gas :
 *     The excess blob gas for the block.
 *
 * Returns
 * -------
 * blob_gasprice: `Uint`
 *     The blob gasprice.
 *
 * Direct port of Python's calculate_blob_gas_price function.
 */
export const calculateBlobGasPrice = Effect.fn("calculateBlobGasPrice")(
  function* (excessBlobGas: U64) {
    const blobBaseFeeUpdateFraction = yield* BLOB_BASE_FEE_UPDATE_FRACTION;
    return taylorExponential(
      MIN_BLOB_GASPRICE,
      new Uint({ value: excessBlobGas.value }),
      blobBaseFeeUpdateFraction,
    );
  },
);

/**
 * Calculate the blob data fee for a transaction.
 *
 * Parameters
 * ----------
 * excess_blob_gas :
 *     The excess_blob_gas for the execution.
 * tx :
 *     The transaction for which the blob data fee is to be calculated.
 *
 * Returns
 * -------
 * data_fee: `Uint`
 *     The blob data fee.
 *
 * Direct port of Python's calculate_data_fee function.
 */
export const calculateDataFee = Effect.fn("calculateDataFee")(function* (
  excessBlobGas: U64,
  tx: Transaction,
) {
  const totalBlobGas = calculateTotalBlobGas(tx);
  const blobGasPrice = yield* calculateBlobGasPrice(excessBlobGas);
  return new Uint({ value: totalBlobGas.value * blobGasPrice.value });
});

// ============================================================================
// Helper Functions for Blob Gas
// ============================================================================

/**
 * Approximates factor * e ** (numerator / denominator) using Taylor expansion.
 *
 * Parameters
 * ----------
 * factor :
 *     The factor.
 * numerator :
 *     The numerator of the exponential.
 * denominator :
 *     The denominator of the exponential.
 *
 * Returns
 * -------
 * output : `Uint`
 *     The approximation of factor * e ** (numerator / denominator).
 *
 * Direct port of Python's taylor_exponential function.
 */
const taylorExponential = (
  factor: Uint,
  numerator: Uint,
  denominator: Uint,
): Uint => {
  let i = 1n;
  let output = 0n;
  let numeratorAccumulated = factor.value * denominator.value;

  while (numeratorAccumulated > 0n) {
    output += numeratorAccumulated;
    numeratorAccumulated =
      (numeratorAccumulated * numerator.value) / (denominator.value * i);
    i += 1n;
  }

  return new Uint({ value: output / denominator.value });
};

// ============================================================================
// Effective Gas Price Calculation Functions
// ============================================================================

/**
 * Result of effective gas price calculation.
 */
// class EffectiveGasPriceResult extends Data.Class<{
//   /**
//    * The effective gas price to charge for gas when the transaction is executed.
//    */
//   readonly effectiveGasPrice: Uint;

//   /**
//    * The priority fee per gas (tip to miner).
//    */
//   readonly priorityFeePerGas: Uint;

//   /**
//    * The maximum gas fee for the transaction.
//    */
//   readonly maxGasFee: Uint;
// }> {}

/**
 * Calculate the effective gas price for a transaction.
 *
 * For EIP-1559 transactions (FeeMarketTransaction, BlobTransaction, SetCodeTransaction):
 * - Validates max_fee_per_gas >= max_priority_fee_per_gas
 * - Validates max_fee_per_gas >= base_fee_per_gas
 * - Calculates priority_fee_per_gas = min(max_priority_fee_per_gas, max_fee_per_gas - base_fee_per_gas)
 * - Returns effective_gas_price = priority_fee_per_gas + base_fee_per_gas
 *
 * For legacy transactions:
 * - Validates gas_price >= base_fee_per_gas
 * - Returns effective_gas_price = gas_price
 *
 * Direct port of the effective gas price logic from Python's check_transaction function.
 */
// const _calculateEffectiveGasPrice = Effect.fn("calculateEffectiveGasPrice")(
//   function* (tx: Transaction, baseFeePerGas: Uint) {
//     if (isEip1559Transaction(tx)) {
//       // EIP-1559 transactions: FeeMarketTransaction, BlobTransaction, SetCodeTransaction
//       if (tx.maxFeePerGas.value < tx.maxPriorityFeePerGas.value) {
//         yield* Effect.fail(
//           new PriorityFeeGreaterThanMaxFeeError({
//             message: "priority fee greater than max fee",
//           }),
//         );
//       }

//       if (tx.maxFeePerGas.value < baseFeePerGas.value) {
//         yield* Effect.fail(
//           new InsufficientMaxFeePerGasError(tx.maxFeePerGas, baseFeePerGas),
//         );
//       }

//       const priorityFeePerGas = new Uint({
//         value:
//           tx.maxPriorityFeePerGas.value <
//           tx.maxFeePerGas.value - baseFeePerGas.value
//             ? tx.maxPriorityFeePerGas.value
//             : tx.maxFeePerGas.value - baseFeePerGas.value,
//       });

//       const effectiveGasPrice = new Uint({
//         value: priorityFeePerGas.value + baseFeePerGas.value,
//       });

//       const maxGasFee = new Uint({
//         value: tx.gas.value * tx.maxFeePerGas.value,
//       });

//       return new EffectiveGasPriceResult({
//         effectiveGasPrice,
//         priorityFeePerGas,
//         maxGasFee,
//       });
//     } else {
//       // Legacy transactions: LegacyTransaction, AccessListTransaction
//       const legacyTx = tx as LegacyTransaction | AccessListTransaction;

//       if (legacyTx.gasPrice.value < baseFeePerGas.value) {
//         yield* Effect.fail(
//           // new InsufficientGasPriceError(legacyTx.gasPrice, baseFeePerGas),
//           new InsufficientMaxFeePerGasError(legacyTx.gasPrice, baseFeePerGas),
//         );
//       }

//       const effectiveGasPrice = legacyTx.gasPrice;
//       const priorityFeePerGas = new Uint({
//         value: legacyTx.gasPrice.value - baseFeePerGas.value,
//       });
//       const maxGasFee = new Uint({
//         value: tx.gas.value * legacyTx.gasPrice.value,
//       });

//       return new EffectiveGasPriceResult({
//         effectiveGasPrice,
//         priorityFeePerGas,
//         maxGasFee,
//       });
//     }
//   },
// );

// ============================================================================
// Additional Helper Functions
// ============================================================================

/**
 * Check if a transaction is an EIP-1559 transaction.
 * EIP-1559 transactions include FeeMarketTransaction, BlobTransaction, and SetCodeTransaction.
 */
// const _isEip1559Transaction = (
//   tx: Transaction,
// ): tx is FeeMarketTransaction | BlobTransaction | SetCodeTransaction => {
//   return (
//     tx._tag === "FeeMarketTransaction" ||
//     tx._tag === "BlobTransaction" ||
//     tx._tag === "SetCodeTransaction"
//   );
// };

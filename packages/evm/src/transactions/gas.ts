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

const PER_EMPTY_ACCOUNT_COST = 25000;

class IntrinsicGasResult extends Data.Class<{
  readonly intrinsicGas: Uint;

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
 */
const TX_DATA_COST_PER_ZERO = new Uint({ value: 4n });
export const calculateIntrinsicGas = Effect.fn("calculateIntrinsicGas")(
  function* (tx: Transaction) {
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

      const tokensInCalldata = new Uint({
        value: BigInt(zeroBytes + (tx.data.value.length - zeroBytes) * 4),
      });

      calldataFloorGasCost =
        tokensInCalldata.value * FLOOR_CALLDATA_COST.value + TX_BASE_COST.value;

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

    let createCost = new Uint({ value: 0n });
    if (isContractCreation(tx)) {
      const fork = yield* Fork;

      if (fork.name !== "frontier") {
        createCost = new Uint({ value: TX_CREATE_COST.value });
      }

      if (fork.eip(3860)) {
        const initCost = initCodeCost(
          new Uint({ value: BigInt(tx.data.value.length) }),
        );
        createCost = new Uint({ value: createCost.value + initCost.value });
      }
    }

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

    let authCost = new Uint({ value: 0n });
    if (isSetCodeTransaction(tx)) {
      authCost = new Uint({
        value: BigInt(PER_EMPTY_ACCOUNT_COST * tx.authorizations.length),
      });
    }

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

const isContractCreation = (tx: Transaction): boolean => {
  return tx.to === undefined;
};

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

export const calculateTotalBlobGas = (tx: Transaction): U64 => {
  if (isBlobTransaction(tx)) {
    return new U64({
      value: GAS_PER_BLOB.value * BigInt(tx.blobVersionedHashes.length),
    });
  } else {
    return new U64({ value: 0n });
  }
};

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

export const calculateDataFee = Effect.fn("calculateDataFee")(function* (
  excessBlobGas: U64,
  tx: Transaction,
) {
  const totalBlobGas = calculateTotalBlobGas(tx);
  const blobGasPrice = yield* calculateBlobGasPrice(excessBlobGas);
  return new Uint({ value: totalBlobGas.value * blobGasPrice.value });
});

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

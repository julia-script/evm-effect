/**
 * Ethereum Virtual Machine (EVM) Gas
 *
 * EVM gas constants and calculators.
 */

import type {
  Address,
  AnyUint,
  Uint as UintType,
} from "@evm-effect/ethereum-types";
import { U64, U256, Uint } from "@evm-effect/ethereum-types";
import * as Numeric from "@evm-effect/ethereum-types/numeric";
import { Data, Effect, Ref } from "effect";
import { OutOfGasError } from "../exceptions.js";
import * as State from "../state.js";
import { evmTrace, GasAndRefund } from "../trace.js";
import { Evm } from "./evm.js";
import { Fork } from "./ForkService.js";

// ============================================================================
// Gas Constants
// ============================================================================

export namespace GasCosts {
  export const NEW_ACCOUNT = new Uint({ value: 25000n });
  export const CALL_VALUE = new Uint({ value: 9000n });
  export const CALL_STIPEND = Uint.wrap(2300n);

  export const SLOAD = Effect.gen(function* () {
    const fork = yield* Fork;
    if (fork.eip(1884)) {
      return new Uint({ value: 800n });
    }
    if (fork.eip(150)) {
      return new Uint({ value: 200n });
    }
    return new Uint({ value: 50n });
  });
  export const STORAGE_SET = Uint.wrap(20000n);
  export const COLD_STORAGE_WRITE = Uint.wrap(5000n);
  // export const REFUND_STORAGE_CLEAR = Uint.wrap(4800n);
  export const REFUND_STORAGE_CLEAR = Effect.gen(function* () {
    const fork = yield* Fork;
    if (fork.eip(3529)) {
      return new Uint({ value: 4800n });
    }
    return new Uint({ value: 15000n });
  });

  export const WARM_ACCESS = Uint.wrap(100n);
  export const COLD_ACCOUNT_ACCESS = Uint.wrap(2600n);
  export const COLD_STORAGE_ACCESS = Uint.wrap(2100n);

  export const OPCODE_EXTERNAL_BASE = Effect.gen(function* () {
    const fork = yield* Fork;
    if (fork.eip(150)) {
      return new Uint({ value: 700n });
    }
    return new Uint({ value: 20n });
  });
  export const OPCODE_BALANCE = Effect.gen(function* () {
    const fork = yield* Fork;
    if (fork.eip(1884)) {
      return new Uint({ value: 700n });
    }
    if (fork.eip(150)) {
      return new Uint({ value: 400n });
    }
    return new Uint({ value: 20n });
  });
  export const OPCODE_CALL_BASE = Effect.gen(function* () {
    const fork = yield* Fork;
    if (fork.eip(150)) {
      return new Uint({ value: 700n });
    }
    return new Uint({ value: 40n });
  });
  export const OPCODE_EXTCODEHASH = Effect.gen(function* () {
    const fork = yield* Fork;
    if (fork.eip(1884)) {
      return new Uint({ value: 700n });
    }
    return new Uint({ value: 400n });
  });
  export const OPCODE_ORIGIN = Uint.wrap(2n);
  export const OPCODE_CALLER = Uint.wrap(2n);
  export const OPCODE_CALLDATALOAD = Uint.wrap(3n);
  export const OPCODE_CALLVALUE = Uint.wrap(2n);
  export const OPCODE_CALLDATASIZE = Uint.wrap(2n);
  export const OPCODE_CALLDATACOPY_BASE = Uint.wrap(3n);
  export const OPCODE_COPY_PER_WORD = Uint.wrap(3n);
  export const OPCODE_CODESIZE = Uint.wrap(2n);
  export const OPCODE_CODECOPY_BASE = Uint.wrap(3n);
  export const OPCODE_GASPRICE = Uint.wrap(2n);
  export const OPCODE_RETURNDATACOPY_PER_WORD = Uint.wrap(3n);
  export const OPCODE_RETURNDATACOPY_BASE = Uint.wrap(3n);

  export const FAST_STEP = Uint.wrap(5n);

  // export const PER_BLOB = U64.wrap(2n ** 17n);

  // export const BLOB_SCHEDULE_MAX = Numeric.U64.wrap(9n);
  // export const BLOB_SCHEDULE_TARGET = U64.wrap(6n);
  // export const BLOB_TARGET_GAS_PER_BLOCK = Uint.wrap(
  //   PER_BLOB.value * BLOB_SCHEDULE_TARGET.value,
  // );
  // export const BLOB_BASE_COST = Uint.wrap(2n ** 13n);

  // export const MAX_BLOB_GAS_PER_BLOCK = Effect.gen(function* () {
  //   const fork = yield* Fork;
  //   if (fork.eip(7918)) {
  //     return U64.wrap(BLOB_SCHEDULE_MAX.value * PER_BLOB.value);
  //   }
  //   if (fork.eip(7691)) {
  //     return U64.wrap(1179648n);
  //   }
  //   return U64.wrap(786432n);
  // });
  // export const BLOB_MIN_GASPRICE = Uint.wrap(1n);
  // export const BLOB_BASE_FEE_UPDATE_FRACTION = Uint.wrap(5007716n);

  // Blobs
  export const PER_BLOB = U64.wrap(2n ** 17n);
  export const BLOB_TARGET_GAS_PER_BLOCK = Effect.gen(function* () {
    const fork = yield* Fork;
    if (fork.eip(7918)) {
      return U64.wrap(PER_BLOB.value * BLOB_SCHEDULE_TARGET.value);
    }
    if (fork.eip(7691)) {
      return U64.wrap(786432n);
    }
    return U64.wrap(393216n);
  });
  export const BLOB_MIN_GASPRICE = Uint.one;
  export const BLOB_BASE_FEE_UPDATE_FRACTION = Effect.gen(function* () {
    const fork = yield* Fork;

    if (fork.eip(7691)) {
      return Uint.wrap(5007716n);
    }
    return Uint.wrap(3338477n);
  });

  export const BLOB_SCHEDULE_TARGET = U64.wrap(6n);
  export const BLOB_BASE_COST = Uint.wrap(2n ** 13n);
  export const BLOB_SCHEDULE_MAX = U64.wrap(9n);

  // constants

  export const MAX_BLOB_GAS_PER_BLOCK = Effect.gen(function* () {
    const fork = yield* Fork;
    if (fork.eip(7918)) {
      return U64.wrap(
        GasCosts.BLOB_SCHEDULE_MAX.value * GasCosts.PER_BLOB.value,
      );
    }

    if (fork.eip(7691)) {
      return U64.wrap(1179648n);
    }
    return U64.wrap(786432n);
  });

  export const BLOB_COUNT_LIMIT = 6;
}
export const GAS_JUMPDEST = Uint.one;
export const GAS_BASE = Uint.two;
export const GAS_VERY_LOW = Uint.three;
export const GAS_STORAGE_SET = Uint.wrap(20000n);
export const GAS_STORAGE_UPDATE = Uint.wrap(5000n);
export const SstoreGas = {
  // SstoreSetGas    uint64 = 20000 // Once per SSTORE operation.
  // SstoreResetGas  uint64 = 5000  // Once per SSTORE operation if the zeroness changes from zero.
  // SstoreClearGas  uint64 = 5000  // Once per SSTORE operation if the zeroness doesn't change.
  // SstoreRefundGas uint64 = 15000 // Once per SSTORE operation if the zeroness changes to zero.
  SET_GAS: Uint.wrap(20000n), // Once per SSTORE operation.
  RESET_GAS: Uint.wrap(5000n), // Once per SSTORE operation if the zeroness changes from zero.
  CLEAR_GAS: Uint.wrap(5000n), // Once per SSTORE operation if the zeroness doesn't change.
  REFUND_GAS: Uint.wrap(15000n), // Once per SSTORE operation if the zeroness changes to zero.

  // NetSstoreNoopGas  uint64 = 200   // Once per SSTORE operation if the value doesn't change.
  // NetSstoreInitGas  uint64 = 20000 // Once per SSTORE operation from clean zero.
  // NetSstoreCleanGas uint64 = 5000  // Once per SSTORE operation from clean non-zero.
  // NetSstoreDirtyGas uint64 = 200   // Once per SSTORE operation from dirty.
  NET_NOOP_GAS: Uint.wrap(200n), // Once per SSTORE operation if the value doesn't change.
  NET_INIT_GAS: Uint.wrap(20000n), // Once per SSTORE operation from clean zero.
  NET_CLEAN_GAS: Uint.wrap(5000n), // Once per SSTORE operation from clean non-zero.
  NET_DIRTY_GAS: Uint.wrap(200n), // Once per SSTORE operation from dirty.

  // NetSstoreClearRefund      uint64 = 15000 // Once per SSTORE operation for clearing an originally existing storage slot
  // NetSstoreResetRefund      uint64 = 4800  // Once per SSTORE operation for resetting to the original non-zero value
  // NetSstoreResetClearRefund uint64 = 19800 // Once per SSTORE operation for resetting to the original zero value
  NET_CLEAR_REFUND_GAS: Uint.wrap(15000n), // Once per SSTORE operation for clearing an originally existing storage slot
  NET_RESET_REFUND_GAS: Uint.wrap(4800n), // Once per SSTORE operation for resetting to the original non-zero value
  NET_RESET_CLEAR_REFUND_GAS: Uint.wrap(19800n), // Once per SSTORE operation for resetting to the original zero value

  // SstoreSentryGasEIP2200            uint64 = 2300  // Minimum gas required to be present for an SSTORE call, not consumed
  // SstoreSetGasEIP2200               uint64 = 20000 // Once per SSTORE operation from clean zero to non-zero
  // SstoreResetGasEIP2200             uint64 = 5000  // Once per SSTORE operation from clean non-zero to something else
  // SstoreClearsScheduleRefundEIP2200 uint64 = 15000 // Once per SSTORE operation for clearing an originally existing storage slot
  SENTRY_GAS: Uint.wrap(2300n), // Minimum gas required to be present for an SSTORE call, not consumed
  SET_GAS_EIP2200: Uint.wrap(20000n), // Once per SSTORE operation from clean zero to non-zero
  RESET_GAS_EIP2200: Uint.wrap(5000n), // Once per SSTORE operation from clean non-zero to something else
  CLEARS_SCHEDULE_REFUND_EIP2200: Uint.wrap(15000n), // Once per SSTORE operation for clearing an originally existing storage slot

  SLOAD_GAS_EIP2200: Uint.wrap(800n),
};

export type SStoreGasCost = {
  readonly regularGas: bigint;
  readonly refundDelta: bigint;
};

/**
 * Apply a pre-calculated SSTORE gas cost: OOG check, then refunds, then regular gas.
 */
export const applySStoreGasCost = (
  cost: SStoreGasCost,
  reasons: string[] = [],
): Effect.Effect<void, OutOfGasError, Evm> =>
  Effect.gen(function* () {
    const evm = yield* Evm;
    if (evm.gasLeft < cost.regularGas) {
      return yield* Effect.fail(new OutOfGasError({ message: "Out of gas" }));
    }
    if (cost.refundDelta > 0n) {
      yield* refundGas(Uint.wrap(cost.refundDelta), reasons);
    } else if (cost.refundDelta < 0n) {
      yield* removeRefundGas(Uint.wrap(-cost.refundDelta), reasons);
    }
    yield* chargeGas(Uint.wrap(cost.regularGas), reasons);
  });
// export const GAS_SSTORE_RESET = Uint.wrap( 5000n);
// export const GAS_SSTORE_REFUND = Uint.wrap( 15000n);
// export const GAS_SSTORE_RESET_CLEAR_REFUND = Uint.wrap( 19800n);
// // EIP-1283 (Constantinople) gas constants
// export const GAS_SSTORE_NOOP = Uint.wrap( 200n); // When current == new
// export const GAS_SSTORE_INIT = Uint.wrap( 20000n); // When original == 0 and current != new
// export const GAS_SSTORE_CLEAN = Uint.wrap( 5000n); // When original != 0 and current != new
// export const GAS_SSTORE_CLEAR_REFUND_EIP1283 = Uint.wrap( 15000n); // EIP-1283 refund
export const GAS_LOW = new Uint({ value: 5n });
export const GAS_MID = new Uint({ value: 8n });
export const GAS_HIGH = new Uint({ value: 10n });
export const GAS_EXPONENTIATION = new Uint({ value: 10n });

export const GAS_EXPONENTIATION_PER_BYTE = Effect.gen(function* () {
  const fork = yield* Fork;
  if (fork.eip(160)) {
    return new Uint({ value: 50n });
  }
  return new Uint({ value: 10n });
});

const GAS_MEMORY = new Uint({ value: 3n });
export const GAS_KECCAK256 = new Uint({ value: 30n });
export const GAS_KECCAK256_WORD = new Uint({ value: 6n });

export const GAS_COPY = new Uint({ value: 3n });
export const GAS_BLOCK_HASH = new Uint({ value: 20n });
export const GAS_LOG = new Uint({ value: 375n });
export const GAS_LOG_DATA = new Uint({ value: 8n });
export const GAS_LOG_TOPIC = new Uint({ value: 375n });
export const GAS_CREATE = new Uint({ value: 32000n });
export const GAS_CODE_DEPOSIT = new Uint({ value: 200n });

export const GAS_ZERO = new Uint({ value: 0n });
export const GAS_NEW_ACCOUNT = new Uint({ value: 25000n });

export const GAS_CALL_VALUE = new Uint({ value: 9000n });
export const GAS_CALL_STIPEND = new Uint({ value: 2300n });

export const GAS_CALL = Effect.gen(function* () {
  const fork = yield* Fork;
  if (fork.eip(150)) {
    return new Uint({ value: 700n });
  }
  return new Uint({ value: 40n });
});

export const GAS_BALANCE = Effect.gen(function* () {
  const fork = yield* Fork;
  if (fork.eip(1884)) {
    return new Uint({ value: 700n });
  }
  if (fork.eip(150)) {
    return new Uint({ value: 400n });
  }
  return new Uint({ value: 20n });
});

export const GAS_EXTERNAL = Effect.gen(function* () {
  const fork = yield* Fork;
  if (fork.eip(150)) {
    return new Uint({ value: 700n });
  }
  return new Uint({ value: 20n });
});

export const GAS_CODE_HASH = Effect.gen(function* () {
  const fork = yield* Fork;
  if (fork.eip(1884)) {
    return new Uint({ value: 700n });
  }
  return new Uint({ value: 400n });
});

export const GAS_SELF_DESTRUCT = Effect.gen(function* () {
  const fork = yield* Fork;
  if (fork.eip(150)) {
    return new Uint({ value: 5000n });
  }
  return new Uint({ value: 0n });
});

export const GAS_SELF_DESTRUCT_NEW_ACCOUNT = new Uint({ value: 25000n });

export const GAS_SELF_DESTRUCT_REFUND = new Uint({ value: 24000n });

export const GAS_ECRECOVER = new Uint({ value: 3000n });

export const GAS_SHA256 = new Uint({ value: 60n });
export const GAS_SHA256_WORD = new Uint({ value: 12n });
export const GAS_RIPEMD160 = new Uint({ value: 600n });
export const GAS_RIPEMD160_WORD = new Uint({ value: 120n });

export const GAS_IDENTITY = new Uint({ value: 15n });
export const GAS_IDENTITY_WORD = new Uint({ value: 3n });

export const GAS_RETURN_DATA_COPY = new Uint({ value: 3n });

export const GAS_FAST_STEP = new Uint({ value: 5n });
export const GAS_BLAKE2_PER_ROUND = new Uint({ value: 1n });

export const GAS_COLD_SLOAD = new Uint({ value: 2100n });
export const GAS_SLOAD = Effect.gen(function* () {
  const fork = yield* Fork;
  if (fork.eip(1884)) {
    return new Uint({ value: 800n });
  }
  if (fork.eip(150)) {
    return new Uint({ value: 200n });
  }
  return new Uint({ value: 50n });
});
export const GAS_COLD_ACCOUNT_ACCESS = new Uint({ value: 2600n });

export const GAS_WARM_ACCESS = new Uint({ value: 100n });
const GAS_INIT_CODE_WORD_COST = new Uint({ value: 2n });

export const GAS_BLOBHASH_OPCODE = new Uint({ value: 3n });

export const GAS_POINT_EVALUATION = new Uint({ value: 50000n });

export const GAS_BLS_G1_ADD = new Uint({ value: 375n });
export const GAS_BLS_G1_MUL = new Uint({ value: 12000n });

export const GAS_BLS_G1_MAP = new Uint({ value: 5500n });
export const GAS_BLS_G2_ADD = new Uint({ value: 600n });
export const GAS_BLS_G2_MUL = new Uint({ value: 22500n });
export const GAS_BLS_G2_MAP = new Uint({ value: 23800n });

/**
 * Define the parameters for memory extension in opcodes.
 */
export class ExtendMemory extends Data.Class<{
  readonly cost: UintType;
  readonly expandBy: UintType;
}> {}

export const refundGas = (amount: UintType, _reasons: string[] = []) =>
  Effect.gen(function* () {
    const evm = yield* Evm;
    yield* evmTrace(GasAndRefund({ gasCost: amount.value }));

    yield* Ref.update(
      evm.refundCounter,
      (current) => new U256({ value: current.value + amount.value }),
    );
  });

export const removeRefundGas = (amount: UintType, _reasons: string[] = []) =>
  Effect.gen(function* () {
    const evm = yield* Evm;
    yield* evmTrace(GasAndRefund({ gasCost: -amount.value }));
    yield* Ref.update(
      evm.refundCounter,
      (current) => new U256({ value: current.value - amount.value }),
    );
  });
/**
 * Charge gas from the EVM. Fails with OutOfGasError if insufficient gas.
 */
export const chargeGas = (amount: UintType, _reasons: string[] = []) =>
  Effect.gen(function* () {
    const evm = yield* Evm;
    yield* evmTrace(GasAndRefund({ gasCost: amount.value }));
    if (evm.gasLeft < amount.value) {
      return yield* Effect.fail(new OutOfGasError({ message: "Out of gas" }));
    }
    const newGas = evm.gasLeft - amount.value;
    if (newGas < 0n) {
      return yield* Effect.fail(new OutOfGasError({ message: "Out of gas" }));
    }

    evm.setGasLeft(newGas);
  });

/**
 * Calculate the gas cost for memory of a given size.
 */
const calculateMemoryGasCost = (sizeInBytes: Uint): Uint => {
  const sizeInWords = Numeric.ceil32(sizeInBytes).value / 32n;

  const linearCost = sizeInWords * GAS_MEMORY.value;

  const quadraticCost = (sizeInWords * sizeInWords) / 512n;

  return new Uint({
    value: linearCost + quadraticCost,
  });
};

/**
 * Calculate the gas cost for extending memory from current size to new size.
 */
export const calculateGasExtendMemory = (
  memory: Uint8Array,
  extensions: Array<[AnyUint, AnyUint]>,
): ExtendMemory => {
  let size_to_extend = new Uint({ value: 0n });
  let to_be_paid = new Uint({ value: 0n });
  let current_size = new Uint({ value: BigInt(memory.length) });
  for (const [start_position, size] of extensions) {
    if (size.value === 0n) {
      continue;
    }
    const before_size = Numeric.ceil32(current_size);
    const after_size = Numeric.ceil32(
      new Uint({ value: start_position.value + size.value }),
    );
    if (after_size.value <= before_size.value) {
      continue;
    }
    size_to_extend = new Uint({
      value: size_to_extend.value + (after_size.value - before_size.value),
    });
    const already_paid = calculateMemoryGasCost(before_size);
    const total_cost = calculateMemoryGasCost(after_size);
    to_be_paid = new Uint({
      value: to_be_paid.value + (total_cost.value - already_paid.value),
    });
    current_size = after_size;
  }
  return new ExtendMemory({ cost: to_be_paid, expandBy: size_to_extend });
};

export const calculateMessageCallGasFrontier = Effect.fn(
  "calculateMessageCallGasFrontier",
)(function* (state: State.State, gas: Uint, to: Address, value: U256) {
  //   """
  //   Calculates the gas amount for executing Opcodes `CALL` and `CALLCODE`.

  //   Parameters
  //   ----------
  //   state :
  //       The current state.
  //   gas :
  //       The amount of gas provided to the message-call.
  //   to:
  //       The address of the recipient account.
  //   value:
  //       The amount of `ETH` that needs to be transferred.

  //   Returns
  //   -------

  const createGasCost = (yield* State.accountExists(state, to))
    ? new Uint({ value: 0n })
    : GasCosts.NEW_ACCOUNT;
  const transferGasCost =
    value.value === 0n ? new Uint({ value: 0n }) : GasCosts.CALL_VALUE;

  const cost = new Uint({
    value:
      (yield* GasCosts.OPCODE_CALL_BASE).value +
      gas.value +
      createGasCost.value +
      transferGasCost.value,
  });
  const stipend =
    value.value === 0n
      ? gas
      : new Uint({ value: GasCosts.CALL_STIPEND.value + gas.value });
  return { cost, subcall: stipend };
});

export const calculateMessageCallGas = Effect.fn("calculateMessageCallGas")(
  function* (
    value: Uint,
    gas: Uint,
    gasLeft: Uint,
    memoryCost: Uint,
    extraGas: Uint,
    callStipend: Uint = GasCosts.CALL_STIPEND,
  ) {
    // """
    //   Calculates the MessageCallGas (cost and gas made available to the sub-call)
    //   for executing call Opcodes.

    //   Parameters
    //   ----------
    //   value:
    //       The amount of `ETH` that needs to be transferred.
    //   gas :
    //       The amount of gas provided to the message-call.
    //   gas_left :
    //       The amount of gas left in the current frame.
    //   memory_cost :
    //       The amount needed to extend the memory in the current frame.
    //   extra_gas :
    //       The amount of gas needed for transferring value + creating a new
    //       account inside a message call.
    //   call_stipend :
    //       The amount of stipend provided to a message call to execute code while
    //       transferring value (ETH).

    //   Returns
    //   -------
    //   message_call_gas: `MessageCallGas`

    //   """
    //   call_stipend = Uint(0) if value == 0 else call_stipend
    callStipend = value.value === 0n ? new Uint({ value: 0n }) : callStipend;
    //   if gas_left < extra_gas + memory_cost:
    //       return MessageCallGas(gas + extra_gas, gas + call_stipend)

    if (gasLeft.value < extraGas.value + memoryCost.value) {
      return {
        cost: new Uint({ value: gas.value + extraGas.value }),
        subcall: new Uint({ value: gas.value + callStipend.value }),
      };
    }
    //   gas = min(gas, max_message_call_gas(gas_left - memory_cost - extra_gas))
    gas = Numeric.min(
      gas,
      maxMessageCallGas(
        new Uint({ value: gasLeft.value - memoryCost.value - extraGas.value }),
      ),
    );

    //   return MessageCallGas(gas + extra_gas, gas + call_stipend)
    return {
      cost: new Uint({ value: gas.value + extraGas.value }),
      subcall: new Uint({ value: gas.value + callStipend.value }),
    };
  },
);

export const maxMessageCallGas = (gas: Uint): Uint => {
  return new Uint({ value: gas.value - gas.value / 64n });
};

/**
 * Calculate the gas to be charged for the init code in CREATE* opcodes
 * as well as create transactions.
 *
 * @param initCodeLength - The length of the init code provided to the opcode or a create transaction
 * @returns The gas to be charged for the init code
 */
export const initCodeCost = (initCodeLength: Uint): Uint => {
  return new Uint({
    value:
      (GAS_INIT_CODE_WORD_COST.value * Numeric.ceil32(initCodeLength).value) /
      32n,
  });
};

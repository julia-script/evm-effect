/**
 * Ethereum Virtual Machine (EVM) Gas
 *
 * EVM gas constants and calculators.
 */

import type { AnyUint, Uint as UintType } from "@evm-effect/ethereum-types";
import { Uint } from "@evm-effect/ethereum-types";
import * as Numeric from "@evm-effect/ethereum-types/numeric";
import { Data, Effect } from "effect";
import { OutOfGasError } from "../exceptions.js";
import { evmTrace, GasAndRefund } from "../trace.js";
import { Evm } from "./evm.js";
import { Fork } from "./Fork.js";

// ============================================================================
// Gas Constants
// ============================================================================

export const GAS_JUMPDEST = new Uint({ value: 1n });
export const GAS_BASE = new Uint({ value: 2n });
export const GAS_VERY_LOW = new Uint({ value: 3n });
export const GAS_STORAGE_SET = new Uint({ value: 20000n });
export const GAS_STORAGE_UPDATE = new Uint({ value: 5000n });
// EIP-1283 (Constantinople) gas constants
export const GAS_SSTORE_NOOP = new Uint({ value: 200n }); // When current == new
export const GAS_SSTORE_INIT = new Uint({ value: 20000n }); // When original == 0 and current != new
export const GAS_SSTORE_CLEAN = new Uint({ value: 5000n }); // When original != 0 and current != new
export const GAS_SSTORE_CLEAR_REFUND_EIP1283 = new Uint({ value: 15000n }); // EIP-1283 refund
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

class MessageCallGas extends Data.Class<{
  readonly cost: UintType;
  readonly subCall: UintType;
}> {}

/**
 * Charge gas from the EVM. Fails with OutOfGasError if insufficient gas.
 */
export const chargeGas = (amount: UintType) =>
  Effect.gen(function* () {
    const evm = yield* Evm;
    yield* evmTrace(GasAndRefund({ gasCost: amount.value }));
    if (evm.gasLeft < amount.value) {
      yield* Effect.fail(new OutOfGasError({ message: "Out of gas" }));
      return;
    }
    const newGas = evm.gasLeft - amount.value;
    if (newGas < 0n) {
      yield* Effect.fail(new OutOfGasError({ message: "Out of gas" }));
      return;
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

export const calculateMessageCallGas = (
  value: Uint,
  gas: Uint,
  gasLeft: Uint,
  memoryCost: Uint,
  extraGas: Uint,
  callStipend: Uint = GAS_CALL_STIPEND,
  applyEip150: boolean = true,
): MessageCallGas => {
  const actualStipend =
    value.value === 0n ? new Uint({ value: 0n }) : callStipend;

  if (!applyEip150) {
    return new MessageCallGas({
      cost: new Uint({ value: gas.value + extraGas.value }),
      subCall: new Uint({ value: gas.value + actualStipend.value }),
    });
  }

  if (gasLeft.value < extraGas.value + memoryCost.value) {
    return new MessageCallGas({
      cost: new Uint({ value: gas.value + extraGas.value }),
      subCall: new Uint({ value: gas.value + actualStipend.value }),
    });
  }

  gas = Numeric.min(
    gas,
    maxMessageCallGas(
      new Uint({ value: gasLeft.value - memoryCost.value - extraGas.value }),
    ),
  );

  return new MessageCallGas({
    cost: new Uint({ value: gas.value + extraGas.value }),
    subCall: new Uint({ value: gas.value + actualStipend.value }),
  });
};

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

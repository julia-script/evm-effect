/**
 * Ethereum Virtual Machine (EVM) Environment Instructions
 *
 * Implementations of the EVM Environment instructions following the
 * Osaka fork specification.
 */

import { keccak256 } from "@evm-effect/crypto";
import {
  Address,
  Bytes,
  Bytes20,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import * as Numeric from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import {
  type EthereumException,
  OutOfBoundsReadError,
  OutOfGasError,
} from "../../exceptions.js";
import * as State from "../../state.js";
import { Evm } from "../evm.js";
import { Fork } from "../Fork.js";
import * as Gas from "../gas.js";

/**
 * Helper to read from a buffer with padding
 */
function bufferRead(buffer: Bytes, startIndex: U256, size: U256): Bytes {
  const start = Number(startIndex.value);
  const length = Number(size.value);

  if (start >= buffer.value.length) {
    // Reading beyond buffer - return zeros
    return new Bytes({ value: new Uint8Array(length) });
  }

  const available = Math.min(length, buffer.value.length - start);
  const result = new Uint8Array(length);
  result.set(buffer.value.slice(start, start + available), 0);

  return new Bytes({ value: result });
}

/**
 * Helper to mask U256 to an address (take lower 20 bytes)
 */
function toAddressMasked(value: U256): Address {
  const bytes = value.toBeBytes32().value.slice(12, 32);
  return new Address({ value: new Bytes20({ value: bytes }) });
}

/**
 * ADDRESS: Get executing account address
 *
 * Pushes the address of the current executing account to the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [address, ...]
 */
export const address: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const addressValue = U256.fromBeBytes(
      evm.message.currentTarget.value.value,
    );
    yield* evm.stack.push(addressValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * BALANCE: Get account balance
 *
 * Pushes the balance of the given account onto the stack.
 *
 * Gas: 100 (warm) or 2600 (cold) + tracking in accessed addresses
 * Stack: [address, ...] -> [balance, ...]
 */
export const balance: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const addressU256 = yield* evm.stack.pop();
    const addr = toAddressMasked(addressU256);

    // GAS - fork-dependent (EIP-2929, EIP-1884, and EIP-150)
    const fork = yield* Fork;
    if (fork.eip(2929)) {
      // EIP-2929 (Berlin+): warm/cold account access
      const accessedAddresses = evm.accessedAddresses;
      if (accessedAddresses.has(addr)) {
        yield* Gas.chargeGas(Gas.GAS_WARM_ACCESS); // 100
      } else {
        evm.accessedAddresses.add(addr);
        yield* Gas.chargeGas(Gas.GAS_COLD_ACCOUNT_ACCESS); // 2600
      }
    } else {
      // Pre-EIP-2929: fork-dependent BALANCE cost
      yield* Gas.chargeGas(yield* Gas.GAS_BALANCE);
    }

    // OPERATION
    const account = State.getAccount(evm.message.blockEnv.state, addr);
    yield* evm.stack.push(account.balance);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * ORIGIN: Get transaction origin
 *
 * Pushes the address of the original transaction sender to the stack.
 * The origin address can only be an EOA.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [origin, ...]
 */
export const origin: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const originValue = U256.fromBeBytes(evm.message.txEnv.origin.value.value);
    yield* evm.stack.push(originValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * CALLER: Get caller address
 *
 * Pushes the address of the caller onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [caller, ...]
 */
export const caller: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const callerValue = U256.fromBeBytes(evm.message.caller.value.value);
    yield* evm.stack.push(callerValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * CALLVALUE: Get call value
 *
 * Push the value (in wei) sent with the call onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [value, ...]
 */
export const callvalue: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    yield* evm.stack.push(evm.message.value);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * CALLDATALOAD: Load word from calldata
 *
 * Push a word (32 bytes) of the input data belonging to the current
 * environment onto the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [offset, ...] -> [data, ...]
 */
export const calldataload: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const startIndex = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const value = bufferRead(
      evm.message.data,
      startIndex,
      new U256({ value: 32n }),
    );
    const valueU256 = U256.fromBeBytes(value.value);
    yield* evm.stack.push(valueU256);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * CALLDATASIZE: Get calldata size
 *
 * Push the size of input data in current environment onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [size, ...]
 */
export const calldatasize: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const size = new U256({ value: BigInt(evm.message.data.value.length) });
    yield* evm.stack.push(size);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * CALLDATACOPY: Copy calldata to memory
 *
 * Copy a portion of the input data in current environment to memory.
 * This will also expand the memory, in case that the memory is insufficient
 * to store the data.
 *
 * Gas: 3 + (words * 3) + memory expansion cost
 * Stack: [destOffset, offset, size, ...] -> [...]
 */
export const calldatacopy: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const memoryStartIndex = yield* evm.stack.pop();
    const dataStartIndex = yield* evm.stack.pop();
    const size = yield* evm.stack.pop();

    // GAS
    const words = Numeric.ceil32(new Uint({ value: size.value })).value / 32n;
    const copyGasCost = new Uint({ value: Gas.GAS_COPY.value * words });

    const memory = yield* Ref.get(evm.memory);
    const extension = Gas.calculateGasExtendMemory(memory, [
      [memoryStartIndex, size],
    ]);

    yield* Gas.chargeGas(
      new Uint({
        value:
          Gas.GAS_VERY_LOW.value + copyGasCost.value + extension.cost.value,
      }),
    );

    // OPERATION
    if (size.value === 0n) {
      yield* evm.incrementPC(1);
      return;
    }

    // Expand memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);

    // Read bytes from calldata and write to memory
    const value = bufferRead(evm.message.data, dataStartIndex, size);
    const destStart = Number(memoryStartIndex.value);
    newMemory.set(value.value, destStart);

    yield* Ref.set(evm.memory, newMemory);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * CODESIZE: Get code size
 *
 * Push the size of code running in current environment onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [size, ...]
 */
export const codesize: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const size = new U256({ value: BigInt(evm.code.value.length) });
    yield* evm.stack.push(size);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * CODECOPY: Copy code to memory
 *
 * Copy a portion of the code in current environment to memory.
 * This will also expand the memory, in case that the memory is insufficient
 * to store the data.
 *
 * Gas: 3 + (words * 3) + memory expansion cost
 * Stack: [destOffset, offset, size, ...] -> [...]
 */
export const codecopy: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const memoryStartIndex = yield* evm.stack.pop();
    const codeStartIndex = yield* evm.stack.pop();
    const size = yield* evm.stack.pop();

    // GAS
    const words = Numeric.ceil32(new Uint({ value: size.value })).value / 32n;
    const copyGasCost = new Uint({ value: Gas.GAS_COPY.value * words });

    const memory = yield* Ref.get(evm.memory);
    const extension = Gas.calculateGasExtendMemory(memory, [
      [memoryStartIndex, size],
    ]);

    yield* Gas.chargeGas(
      new Uint({
        value:
          Gas.GAS_VERY_LOW.value + copyGasCost.value + extension.cost.value,
      }),
    );

    // OPERATION
    // Expand memory if needed
    try {
      const newMemory = new Uint8Array(
        memory.length + Number(extension.expandBy.value),
      );
      newMemory.set(memory);

      // Read bytes from code and write to memory
      const value = bufferRead(
        new Bytes({ value: evm.code.value }),
        codeStartIndex,
        size,
      );
      const destStart = Number(memoryStartIndex.value);
      newMemory.set(value.value, destStart);

      yield* Ref.set(evm.memory, newMemory);
    } catch (_error) {
      return yield* Effect.fail(new OutOfGasError({}));
    }

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * GASPRICE: Get gas price
 *
 * Push the gas price used in current environment onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [gasPrice, ...]
 */
export const gasprice: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const gasPriceValue = new U256({ value: evm.message.txEnv.gasPrice.value });
    yield* evm.stack.push(gasPriceValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * EXTCODESIZE: Get external account code size
 *
 * Push the code size of a given account onto the stack.
 *
 * Gas: 100 (warm) or 2600 (cold)
 * Stack: [address, ...] -> [size, ...]
 */
export const extcodesize: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const addressU256 = yield* evm.stack.pop();
    const addr = toAddressMasked(addressU256);

    // GAS - fork-dependent (EIP-2929 and EIP-150)
    const fork = yield* Fork;
    if (fork.eip(2929)) {
      // EIP-2929 (Berlin+): warm/cold account access
      const accessedAddresses = evm.accessedAddresses;
      if (accessedAddresses.has(addr)) {
        yield* Gas.chargeGas(Gas.GAS_WARM_ACCESS); // 100
      } else {
        evm.accessedAddresses.add(addr);
        yield* Gas.chargeGas(Gas.GAS_COLD_ACCOUNT_ACCESS); // 2600
      }
    } else {
      // Pre-EIP-2929: fork-dependent EXTERNAL cost
      yield* Gas.chargeGas(yield* Gas.GAS_EXTERNAL);
    }

    // OPERATION
    const account = State.getAccount(evm.message.blockEnv.state, addr);
    const codeSize = new U256({ value: BigInt(account.code.value.length) });
    yield* evm.stack.push(codeSize);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * EXTCODECOPY: Copy external account code to memory
 *
 * Copy a portion of an account's code to memory.
 *
 * Gas: (100 or 2600) + (words * 3) + memory expansion cost
 * Stack: [address, destOffset, offset, size, ...] -> [...]
 */
export const extcodecopy: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const addressU256 = yield* evm.stack.pop();
    const memoryStartIndex = yield* evm.stack.pop();
    const codeStartIndex = yield* evm.stack.pop();
    const size = yield* evm.stack.pop();

    const addr = toAddressMasked(addressU256);

    // GAS
    const words = Numeric.ceil32(new Uint({ value: size.value })).value / 32n;
    const copyGasCost = new Uint({ value: Gas.GAS_COPY.value * words });

    const memory = yield* Ref.get(evm.memory);
    const extension = Gas.calculateGasExtendMemory(memory, [
      [memoryStartIndex, size],
    ]);

    // Access gas cost - fork-dependent (EIP-2929 and EIP-150)
    const fork = yield* Fork;
    let accessGasCost: Uint;

    if (fork.eip(2929)) {
      // EIP-2929 (Berlin+): warm/cold account access
      const accessedAddresses = evm.accessedAddresses;
      if (accessedAddresses.has(addr)) {
        accessGasCost = Gas.GAS_WARM_ACCESS; // 100
      } else {
        evm.accessedAddresses.add(addr);
        accessGasCost = Gas.GAS_COLD_ACCOUNT_ACCESS; // 2600
      }
    } else {
      // Pre-EIP-2929: fork-dependent EXTERNAL cost
      accessGasCost = yield* Gas.GAS_EXTERNAL;
    }

    yield* Gas.chargeGas(
      new Uint({
        value: accessGasCost.value + copyGasCost.value + extension.cost.value,
      }),
    );

    // OPERATION
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);

    const account = State.getAccount(evm.message.blockEnv.state, addr);
    const value = bufferRead(account.code, codeStartIndex, size);
    const destStart = Number(memoryStartIndex.value);
    newMemory.set(value.value, destStart);

    yield* Ref.set(evm.memory, newMemory);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * RETURNDATASIZE: Get return data size
 *
 * Push the size of the return data from the last external call.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [size, ...]
 */
export const returndatasize: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const returnData = yield* Ref.get(evm.returnData);
    const size = new U256({ value: BigInt(returnData.value.length) });
    yield* evm.stack.push(size);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * RETURNDATACOPY: Copy return data to memory
 *
 * Copy a portion of the return data from the last external call to memory.
 *
 * Gas: 3 + (words * 3) + memory expansion cost
 * Stack: [destOffset, offset, size, ...] -> [...]
 */
export const returndatacopy: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const memoryStartIndex = yield* evm.stack.pop();
    const returnDataStartPosition = yield* evm.stack.pop();
    const size = yield* evm.stack.pop();

    // GAS
    const words = Numeric.ceil32(new Uint({ value: size.value })).value / 32n;
    const copyGasCost = new Uint({
      value: Gas.GAS_RETURN_DATA_COPY.value * words,
    });

    const memory = yield* Ref.get(evm.memory);
    const extension = Gas.calculateGasExtendMemory(memory, [
      [memoryStartIndex, size],
    ]);

    yield* Gas.chargeGas(
      new Uint({
        value:
          Gas.GAS_VERY_LOW.value + copyGasCost.value + extension.cost.value,
      }),
    );

    // Check bounds
    const returnData = yield* Ref.get(evm.returnData);
    const returnDataStart = new Uint({ value: returnDataStartPosition.value });
    const sizeUint = new Uint({ value: size.value });
    if (
      returnDataStart.value + sizeUint.value >
      BigInt(returnData.value.length)
    ) {
      yield* Effect.fail(
        new OutOfBoundsReadError({ message: "Return data copy out of bounds" }),
      );
    }

    // OPERATION
    // Expand memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);

    // Copy from return data to memory
    const start = Number(returnDataStartPosition.value);
    const length = Number(size.value);

    // Only copy if size > 0
    if (length > 0) {
      const value = returnData.value.slice(start, start + length);
      const destStart = Number(memoryStartIndex.value);
      newMemory.set(value, destStart);
    }

    yield* Ref.set(evm.memory, newMemory);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * EXTCODEHASH: Get external account code hash
 *
 * Returns the keccak256 hash of a contract's bytecode.
 *
 * Gas: 100 (warm) or 2600 (cold)
 * Stack: [address, ...] -> [hash, ...]
 */
export const extcodehash: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const addressU256 = yield* evm.stack.pop();
    const addr = toAddressMasked(addressU256);

    // GAS - fork-dependent (EIP-2929, EIP-1884, and EIP-1052)
    const fork = yield* Fork;
    if (fork.eip(2929)) {
      // EIP-2929 (Berlin+): warm/cold account access
      const accessedAddresses = evm.accessedAddresses;
      if (accessedAddresses.has(addr)) {
        yield* Gas.chargeGas(Gas.GAS_WARM_ACCESS); // 100
      } else {
        evm.accessedAddresses.add(addr);
        yield* Gas.chargeGas(Gas.GAS_COLD_ACCOUNT_ACCESS); // 2600
      }
    } else {
      // Pre-EIP-2929: use GAS_CODE_HASH (400 for Constantinople/Petersburg, 700 for Istanbul+)
      yield* Gas.chargeGas(yield* Gas.GAS_CODE_HASH);
    }

    // OPERATION
    const account = State.getAccountOptional(evm.message.blockEnv.state, addr);

    let codehash: U256;
    if (account === null) {
      // Non-existent account (EMPTY_ACCOUNT equivalent)
      codehash = new U256({ value: 0n });
    } else {
      const code = account.code;
      codehash = U256.fromBeBytes(keccak256(code).value);
    }

    yield* evm.stack.push(codehash);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * SELFBALANCE: Get balance of current account
 *
 * Pushes the balance of the current address to the stack.
 *
 * Gas: 5 (GAS_FAST_STEP)
 * Stack: [...] -> [balance, ...]
 */
export const selfbalance: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_FAST_STEP);

    // OPERATION
    const account = State.getAccount(
      evm.message.blockEnv.state,
      evm.message.currentTarget,
    );
    yield* evm.stack.push(account.balance);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

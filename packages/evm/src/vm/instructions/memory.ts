import { U256, Uint } from "@evm-effect/ethereum-types";
import * as Numeric from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

/**
 * MSTORE: Save word to memory
 *
 * Stores a 32-byte word to memory at the given offset.
 * This also expands the memory, if the memory is
 * insufficient to store the word.
 *
 * Gas: 3 + memory expansion cost
 * Stack: [offset, value, ...] -> [...]
 */
export const mstore: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const startPosition = yield* evm.stack.pop();
    const value = yield* evm.stack.pop();
    const valueBytes = value.toBeBytes32().value;

    // GAS
    const memory = yield* evm.memory;
    const size = new Uint({ value: BigInt(valueBytes.length) });
    const extension = Gas.calculateGasExtendMemory(memory, [
      [startPosition, size],
    ]);

    yield* Gas.chargeGas(
      new Uint({ value: Gas.GAS_VERY_LOW.value + extension.cost.value }),
    );

    // OPERATION
    // Expand memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);
    // Write value to memory

    newMemory.set(valueBytes, Number(startPosition.value));
    yield* Ref.set(evm.memory, newMemory);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * MSTORE8: Save byte to memory
 *
 * Stores a single byte to memory at the given offset.
 * This also expands the memory, if the memory is
 * insufficient to store the byte.
 *
 * Gas: 3 + memory expansion cost
 * Stack: [offset, value, ...] -> [...]
 */
export const mstore8: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const startPosition = yield* evm.stack.pop();
    const value = yield* evm.stack.pop();

    // GAS
    const memory = yield* evm.memory;
    const size = new Uint({ value: 1n });
    const extension = Gas.calculateGasExtendMemory(memory, [
      [startPosition, size],
    ]);

    yield* Gas.chargeGas(
      new Uint({ value: Gas.GAS_VERY_LOW.value + extension.cost.value }),
    );

    // OPERATION
    // Expand memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);
    // Write the lowest byte of value to memory
    const normalizedByte = Number(value.value & 0xffn);
    newMemory[Number(startPosition.value)] = normalizedByte;
    yield* Ref.set(evm.memory, newMemory);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * MLOAD: Load word from memory
 *
 * Loads a 32-byte word from memory at the given offset.
 * This also expands the memory, if the memory is
 * insufficient to load the word.
 *
 * Gas: 3 + memory expansion cost
 * Stack: [offset, ...] -> [value, ...]
 */
export const mload: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const startPosition = yield* evm.stack.pop();

    // GAS
    const memory = yield* evm.memory;
    const size = new Uint({ value: 32n });
    const extension = Gas.calculateGasExtendMemory(memory, [
      [startPosition, size],
    ]);

    yield* Gas.chargeGas(
      new Uint({ value: Gas.GAS_VERY_LOW.value + extension.cost.value }),
    );

    // OPERATION
    // Expand memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);
    yield* Ref.set(evm.memory, newMemory);

    // Read 32 bytes from memory
    const start = Number(startPosition.value);
    const slice = newMemory.slice(start, start + 32);
    const value = U256.fromBeBytes(slice);
    yield* evm.stack.push(value);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * MSIZE: Get memory size
 *
 * Push the size of active memory in bytes onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [size, ...]
 */
export const msize: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const memory = yield* evm.memory;
    const size = new U256({ value: BigInt(memory.length) });
    yield* evm.stack.push(size);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * MCOPY: Copy memory area
 *
 * Copy the bytes in memory from one location to another.
 * Both source and destination memory areas are expanded if necessary.
 *
 * Gas: 3 + 3 * words + memory expansion cost
 * Stack: [destination, source, length, ...] -> [...]
 */
export const mcopy: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const destination = yield* evm.stack.pop();
    const source = yield* evm.stack.pop();
    const length = yield* evm.stack.pop();

    // GAS
    const words = Numeric.ceil32(new Uint({ value: length.value })).value / 32n;
    const copyGasCost = new Uint({ value: Gas.GAS_COPY.value * words });

    const memory = yield* evm.memory;
    const extension = Gas.calculateGasExtendMemory(memory, [
      [source, length],
      [destination, length],
    ]);

    yield* Gas.chargeGas(
      new Uint({
        value:
          Gas.GAS_VERY_LOW.value + copyGasCost.value + extension.cost.value,
      }),
    );

    // OPERATION
    // Expand memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);

    // Only perform the copy if length > 0
    const lengthNum = Number(length.value);
    if (lengthNum > 0) {
      // Read bytes from source location
      const sourceStart = Number(source.value);
      const value = newMemory.slice(sourceStart, sourceStart + lengthNum);

      // Write bytes to destination location
      const destStart = Number(destination.value);
      newMemory.set(value, destStart);
    }

    yield* Ref.set(evm.memory, newMemory);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

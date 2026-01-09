/**
 * Ethereum Virtual Machine (EVM) Keccak Instructions
 *
 * Implementations of the EVM keccak/SHA3 instruction following the
 * Osaka fork specification.
 */

import { keccak256 } from "@evm-effect/crypto";
import { U256, Uint } from "@evm-effect/ethereum-types";
import { Effect, Ref } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

/**
 * Helper to calculate ceiling division by 32
 */
function ceil32(value: Uint): Uint {
  return new Uint({ value: (value.value + 31n) / 32n });
}

/**
 * KECCAK256: Compute Keccak-256 hash
 *
 * Pushes to the stack the Keccak-256 hash of a region of memory.
 * This also expands the memory if needed to access the data's memory location.
 *
 * Gas: 30 + 6 * words + memory expansion cost
 * Stack: [offset, size, ...] -> [hash, ...]
 */
export const keccak: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const memoryStartIndex = yield* evm.stack.pop();
    const size = yield* evm.stack.pop();

    // GAS
    const sizeUint = new Uint({ value: size.value });
    const words = ceil32(sizeUint);
    const wordGasCost = new Uint({
      value: Gas.GAS_KECCAK256_WORD.value * words.value,
    });

    const memStartUint = new Uint({ value: memoryStartIndex.value });
    const memory = yield* Ref.get(evm.memory);
    const extension = Gas.calculateGasExtendMemory(memory, [
      [memStartUint, sizeUint],
    ]);

    const gasCost = new Uint({
      value: Gas.GAS_KECCAK256.value + wordGasCost.value + extension.cost.value,
    });

    yield* Gas.chargeGas(gasCost);

    // OPERATION - extend memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);
    yield* Ref.set(evm.memory, newMemory);

    // Read data from memory and hash it
    const start = Number(memStartUint.value);
    const length = Number(sizeUint.value);
    const slice = newMemory.slice(start, start + length);
    const hashed = keccak256(slice);

    // Push hash to stack as U256
    const hashValue = U256.fromBeBytes(hashed.value);
    yield* evm.stack.push(hashValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

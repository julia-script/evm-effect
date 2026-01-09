/**
 * Ethereum Virtual Machine (EVM) Stack and Memory Instructions
 *
 * Implementations of the EVM Stack and Memory instructions following the
 * Osaka fork specification.
 */

import { U256 } from "@evm-effect/ethereum-types";
import { Effect } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { StackUnderflowError } from "../../exceptions.js";
import type * as EvmOps from "../evm.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

// ============================================================================
// Stack Operations
// ============================================================================

/**
 * POP: Remove item from stack
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [x, ...] -> [...]
 */
export const pop: Effect.Effect<void, EthereumException, EvmOps.Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;
    // STACK
    yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * PUSH_N: Push N-byte value onto stack
 *
 * Reads N bytes from code starting at PC+1 and pushes them as a U256 onto the stack.
 *
 * @param numBytes Number of bytes to read (0-32)
 */
function makePush(
  numBytes: number,
): Effect.Effect<void, EthereumException, Evm> {
  return Effect.gen(function* () {
    const evm = yield* Evm;

    // GAS
    if (numBytes === 0) {
      yield* Gas.chargeGas(Gas.GAS_BASE);
    } else {
      yield* Gas.chargeGas(Gas.GAS_VERY_LOW);
    }

    // OPERATION
    const pc = yield* evm.pc;

    const slice = evm.code.value.slice(pc + 1, pc + 1 + numBytes);
    const dataToPush = U256.fromBeBytes(slice);

    yield* evm.stack.push(dataToPush);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1 + numBytes);
  });
}

export const push0 = makePush(0);
export const push1 = makePush(1);
export const push2 = makePush(2);
export const push3 = makePush(3);
export const push4 = makePush(4);
export const push5 = makePush(5);
export const push6 = makePush(6);
export const push7 = makePush(7);
export const push8 = makePush(8);
export const push9 = makePush(9);
export const push10 = makePush(10);
export const push11 = makePush(11);
export const push12 = makePush(12);
export const push13 = makePush(13);
export const push14 = makePush(14);
export const push15 = makePush(15);
export const push16 = makePush(16);
export const push17 = makePush(17);
export const push18 = makePush(18);
export const push19 = makePush(19);
export const push20 = makePush(20);
export const push21 = makePush(21);
export const push22 = makePush(22);
export const push23 = makePush(23);
export const push24 = makePush(24);
export const push25 = makePush(25);
export const push26 = makePush(26);
export const push27 = makePush(27);
export const push28 = makePush(28);
export const push29 = makePush(29);
export const push30 = makePush(30);
export const push31 = makePush(31);
export const push32 = makePush(32);

/**
 * DUP_N: Duplicate Nth stack item to top
 *
 * Duplicates the item at position itemNumber (0-indexed from top) to the top of the stack.
 *
 * @param itemNumber Stack position to duplicate (0 = top, 1 = second, etc.)
 */
function makeDup(
  itemNumber: number,
): Effect.Effect<void, EthereumException, Evm> {
  return Effect.gen(function* () {
    // GAS
    const evm = yield* Evm;
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const stack = yield* evm.stack.value;
    if (itemNumber >= stack.length) {
      yield* Effect.fail(
        new StackUnderflowError({ message: "Stack underflow" }),
      );
      return;
    }

    const dataToDuplicate = stack[stack.length - 1 - itemNumber];
    yield* evm.stack.push(dataToDuplicate);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });
}

export const dup1 = makeDup(0);
export const dup2 = makeDup(1);
export const dup3 = makeDup(2);
export const dup4 = makeDup(3);
export const dup5 = makeDup(4);
export const dup6 = makeDup(5);
export const dup7 = makeDup(6);
export const dup8 = makeDup(7);
export const dup9 = makeDup(8);
export const dup10 = makeDup(9);
export const dup11 = makeDup(10);
export const dup12 = makeDup(11);
export const dup13 = makeDup(12);
export const dup14 = makeDup(13);
export const dup15 = makeDup(14);
export const dup16 = makeDup(15);

/**
 * SWAP_N: Swap top with Nth item
 *
 * Swaps the top stack item with the item at position itemNumber.
 *
 * @param itemNumber Stack position to swap with (1-indexed, so SWAP1 swaps top with second item)
 */
function makeSwap(
  itemNumber: number,
): Effect.Effect<void, EthereumException, EvmOps.Evm> {
  return Effect.gen(function* () {
    const evm = yield* Evm;
    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    yield* evm.stack.swap(itemNumber);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });
}

export const swap1 = makeSwap(1);
export const swap2 = makeSwap(2);
export const swap3 = makeSwap(3);
export const swap4 = makeSwap(4);
export const swap5 = makeSwap(5);
export const swap6 = makeSwap(6);
export const swap7 = makeSwap(7);
export const swap8 = makeSwap(8);
export const swap9 = makeSwap(9);
export const swap10 = makeSwap(10);
export const swap11 = makeSwap(11);
export const swap12 = makeSwap(12);
export const swap13 = makeSwap(13);
export const swap14 = makeSwap(14);
export const swap15 = makeSwap(15);
export const swap16 = makeSwap(16);

// ============================================================================
// Memory Operations
// ============================================================================

/**
 * MSTORE: Store word to memory
 *
 * Stores a 32-byte word to memory at the given offset.
 * Expands memory if necessary.
 *
 * Gas: 3 + memory expansion cost (GAS_VERY_LOW + expansion)
 * Stack: [offset, value, ...] -> [...]
 */
// const _mstore: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
//   function* () {
//     const evm = yield* Evm;
//     // STACK
//     const startPosition = yield* evm.stack.pop();
//     const value = yield* evm.stack.pop();
//     const valueBytes = value.toBeBytes32().value;

//     // GAS
//     const memory = yield* evm.memory;
//     const endPosition = new Uint({
//       value: startPosition.value + BigInt(valueBytes.length),
//     });
//     const extension = Gas.calculateGasExtendMemory(memory, [
//       [startPosition, endPosition],
//     ]);

//     yield* Gas.chargeGas(
//       new Uint({ value: Gas.GAS_VERY_LOW.value + extension.cost.value }),
//     );

//     // OPERATION
//     const newMemory = new Uint8Array(
//       memory.length + Number(extension.expandBy.value),
//     );
//     yield* Ref.set(evm.memory, newMemory);

//     // PROGRAM COUNTER
//     yield* evm.incrementPC(1);
//   },
// );

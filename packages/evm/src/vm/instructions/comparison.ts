/**
 * Ethereum Virtual Machine (EVM) Comparison Instructions
 *
 * Implementations of the EVM Comparison instructions following the
 * Osaka fork specification.
 */

import { U256 } from "@evm-effect/ethereum-types";
import { Effect } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

/**
 * LT: Less than operation
 *
 * Checks if the top element is less than the next top element. Pushes the
 * result back on the stack (1 for true, 0 for false).
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [left, right, ...] -> [(left<right)?1:0, ...]
 */
export const lessThan: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const left = yield* evm.stack.pop();
    const right = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = new U256({ value: left.value < right.value ? 1n : 0n });
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * SLT: Signed less than operation
 *
 * Signed less-than comparison.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [left, right, ...] -> [(left<right)?1:0, ...] (signed)
 */
export const signedLessThan: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const left = (yield* evm.stack.pop()).toSigned();
    const right = (yield* evm.stack.pop()).toSigned();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = new U256({ value: left < right ? 1n : 0n });
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * GT: Greater than operation
 *
 * Checks if the top element is greater than the next top element. Pushes
 * the result back on the stack (1 for true, 0 for false).
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [left, right, ...] -> [(left>right)?1:0, ...]
 */
export const greaterThan: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const left = yield* evm.stack.pop();
    const right = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = new U256({ value: left.value > right.value ? 1n : 0n });
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * SGT: Signed greater than operation
 *
 * Signed greater-than comparison.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [left, right, ...] -> [(left>right)?1:0, ...] (signed)
 */
export const signedGreaterThan: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const left = (yield* evm.stack.pop()).toSigned();
    const right = (yield* evm.stack.pop()).toSigned();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = new U256({ value: left > right ? 1n : 0n });
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * EQ: Equality operation
 *
 * Checks if the top element is equal to the next top element. Pushes
 * the result back on the stack (1 for true, 0 for false).
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [left, right, ...] -> [(left==right)?1:0, ...]
 */
export const equal: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const left = yield* evm.stack.pop();
    const right = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = new U256({ value: left.value === right.value ? 1n : 0n });
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * ISZERO: Is-zero operation
 *
 * Checks if the top element is equal to 0. Pushes the result back on the
 * stack (1 for true, 0 for false).
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [x, ...] -> [(x==0)?1:0, ...]
 */
export const isZero: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const x = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = new U256({ value: x.value === 0n ? 1n : 0n });
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

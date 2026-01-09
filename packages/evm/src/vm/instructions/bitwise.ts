/**
 * Ethereum Virtual Machine (EVM) Bitwise Instructions
 *
 * Implementations of the EVM Bitwise instructions following the
 * Osaka fork specification.
 */

import { U256 } from "@evm-effect/ethereum-types";
import { Effect } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

/**
 * AND: Bitwise AND operation
 *
 * Bitwise AND operation of the top 2 elements of the stack. Pushes the
 * result back on the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [x, y, ...] -> [x&y, ...]
 */
export const bitwiseAnd: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const x = yield* evm.stack.pop();
    const y = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = x.bitwiseAnd(y);
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * OR: Bitwise OR operation
 *
 * Bitwise OR operation of the top 2 elements of the stack. Pushes the
 * result back on the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [x, y, ...] -> [x|y, ...]
 */
export const bitwiseOr: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const x = yield* evm.stack.pop();
    const y = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = x.bitwiseOr(y);
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * XOR: Bitwise XOR operation
 *
 * Bitwise XOR operation of the top 2 elements of the stack. Pushes the
 * result back on the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [x, y, ...] -> [x^y, ...]
 */
export const bitwiseXor: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const x = yield* evm.stack.pop();
    const y = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = x.bitwiseXor(y);
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * NOT: Bitwise NOT operation
 *
 * Bitwise NOT operation of the top element of the stack. Pushes the
 * result back on the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [x, ...] -> [~x, ...]
 */
export const bitwiseNot: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const x = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = x.bitwiseNot();
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * BYTE: Retrieve single byte from word
 *
 * For a word (defined by next top element of the stack), retrieve the
 * Nth byte (0-indexed and defined by top element of stack) from the
 * left (most significant) to right (least significant).
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [byte_index, word, ...] -> [byte, ...]
 */
export const getByte: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const byteIndex = yield* evm.stack.pop();
    const word = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    let result: U256;
    if (byteIndex.value >= 32n) {
      result = new U256({ value: 0n });
    } else {
      // Remove the extra bytes to the right
      const extraBytesToRight = 31n - byteIndex.value;
      const shifted = word.rightShift(extraBytesToRight * 8n);
      // Remove the extra bytes to the left (keep only lowest byte)
      result = shifted.bitwiseAnd(new U256({ value: 0xffn }));
    }
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * SHL: Shift left operation
 *
 * Logical shift left (SHL) operation of the top 2 elements of the stack.
 * Pushes the result back on the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [shift, value, ...] -> [value<<shift, ...]
 */
export const bitwiseShl: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const shift = yield* evm.stack.pop();
    const value = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = value.leftShift(shift.value);
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * SHR: Logical shift right operation
 *
 * Logical shift right (SHR) operation of the top 2 elements of the stack.
 * Pushes the result back on the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [shift, value, ...] -> [value>>shift, ...]
 */
export const bitwiseShr: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const shift = yield* evm.stack.pop();
    const value = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = value.rightShift(shift.value);
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * SAR: Arithmetic shift right operation
 *
 * Arithmetic shift right (SAR) operation of the top 2 elements of the stack.
 * Pushes the result back on the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [shift, value, ...] -> [value>>>shift, ...]
 */
export const bitwiseSar: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const shift = yield* evm.stack.pop();
    const value = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = value.arithmeticRightShift(shift.value);
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * CLZ: Count leading zeros
 *
 * Count the number of leading zero bits in a 256-bit word.
 * Pops one value from the stack and pushes the number of leading zero bits.
 * If the input is zero, pushes 256.
 *
 * Gas: 5 (GAS_LOW)
 * Stack: [x, ...] -> [clz(x), ...]
 */
export const countLeadingZeros: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const x = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_LOW);

    // OPERATION
    const bitLength = x.bitLength();
    const result = new U256({ value: 256n - bitLength });
    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

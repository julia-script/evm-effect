/**
 * Ethereum Virtual Machine (EVM) Arithmetic Instructions
 *
 * Implementations of the EVM Arithmetic instructions following the
 * Osaka fork specification.
 */

import { U256, Uint } from "@evm-effect/ethereum-types";
import { Effect } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { Evm } from "../evm.js";
import type { Fork } from "../Fork.js";
import * as Gas from "../gas.js";

/**
 * ADD: Addition operation
 *
 * Adds the top two elements of the stack together, and pushes the result back
 * on the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [x, y, ...] -> [x+y, ...]
 */
export const add: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // STACK
    const x = yield* evm.stack.pop();
    const y = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = x.wrapping_add(y);

    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * SUB: Subtraction operation
 *
 * Subtracts the top two elements of the stack, and pushes the result back
 * on the stack.
 *
 * Gas: 3 (GAS_VERY_LOW)
 * Stack: [x, y, ...] -> [x-y, ...]
 */
export const sub: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // STACK
    const x = yield* evm.stack.pop();
    const y = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_VERY_LOW);

    // OPERATION
    const result = x.wrapping_sub(y);

    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * MUL: Multiplication operation
 *
 * Multiply the top two elements of the stack, and pushes the result back
 * on the stack.
 *
 * Gas: 5 (GAS_LOW)
 * Stack: [x, y, ...] -> [x*y, ...]
 */
export const mul: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // STACK
    const x = yield* evm.stack.pop();
    const y = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_LOW);

    // OPERATION
    const result = x.wrapping_mul(y);

    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * DIV: Unsigned division operation
 *
 * Integer division of the top two elements of the stack. Pushes the result
 * back on the stack.
 *
 * Gas: 5 (GAS_LOW)
 * Stack: [dividend, divisor, ...] -> [dividend/divisor, ...]
 */
export const div: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // STACK
    const dividend = yield* evm.stack.pop();
    const divisor = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_LOW);

    // OPERATION
    const quotient =
      divisor.value === 0n ? new U256({ value: 0n }) : dividend.div(divisor);

    yield* evm.stack.push(quotient);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

const U255_CEIL_VALUE = 2n ** 255n;

/**
 * Get sign of a signed integer
 */
function getSign(value: bigint): bigint {
  return value < 0n ? -1n : value > 0n ? 1n : 0n;
}

/**
 * SDIV: Signed division operation
 *
 * Signed integer division of the top two elements of the stack. Pushes the
 * result back on the stack.
 *
 * Gas: 5 (GAS_LOW)
 * Stack: [dividend, divisor, ...] -> [dividend/divisor, ...]
 */
export const sdiv: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // STACK
    const dividend = (yield* evm.stack.pop()).toSigned();
    const divisor = (yield* evm.stack.pop()).toSigned();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_LOW);

    // OPERATION
    let quotient: bigint;
    if (divisor === 0n) {
      quotient = 0n;
    } else if (dividend === -U255_CEIL_VALUE && divisor === -1n) {
      // Overflow case
      quotient = -U255_CEIL_VALUE;
    } else {
      const sign = getSign(dividend * divisor);
      const absDividend = dividend < 0n ? -dividend : dividend;
      const absDivisor = divisor < 0n ? -divisor : divisor;
      quotient = sign * (absDividend / absDivisor);
    }

    yield* evm.stack.push(U256.fromSigned(quotient));

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * MOD: Modulo operation
 *
 * Modulo remainder of the top two elements of the stack. Pushes the result
 * back on the stack.
 *
 * Gas: 5 (GAS_LOW)
 * Stack: [x, y, ...] -> [x%y, ...]
 */
export const mod: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // STACK
    const x = yield* evm.stack.pop();
    const y = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_LOW);

    // OPERATION
    const remainder = y.value === 0n ? new U256({ value: 0n }) : x.mod(y);

    yield* evm.stack.push(remainder);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * SMOD: Signed modulo operation
 *
 * Signed modulo remainder of the top two elements of the stack. Pushes the
 * result back on the stack.
 *
 * Gas: 5 (GAS_LOW)
 * Stack: [x, y, ...] -> [x%y, ...]
 */
export const smod: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // STACK
    const x = (yield* evm.stack.pop()).toSigned();
    const y = (yield* evm.stack.pop()).toSigned();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_LOW);

    // OPERATION
    let remainder: bigint;
    if (y === 0n) {
      remainder = 0n;
    } else {
      const absX = x < 0n ? -x : x;
      const absY = y < 0n ? -y : y;
      remainder = getSign(x) * (absX % absY);
    }

    yield* evm.stack.push(U256.fromSigned(remainder));

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * ADDMOD: Modulo addition operation
 *
 * Modulo addition of the top 2 elements with the 3rd element. Pushes the
 * result back on the stack.
 *
 * Gas: 8 (GAS_MID)
 * Stack: [x, y, z, ...] -> [(x+y)%z, ...]
 */
export const addmod: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // STACK
    const x = (yield* evm.stack.pop()).value;
    const y = (yield* evm.stack.pop()).value;
    const z = (yield* evm.stack.pop()).value;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_MID);

    // OPERATION
    const result =
      z === 0n ? new U256({ value: 0n }) : new U256({ value: (x + y) % z });

    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * MULMOD: Modulo multiplication operation
 *
 * Modulo multiplication of the top 2 elements with the 3rd element. Pushes
 * the result back on the stack.
 *
 * Gas: 8 (GAS_MID)
 * Stack: [x, y, z, ...] -> [(x*y)%z, ...]
 */
export const mulmod: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // STACK
    const x = (yield* evm.stack.pop()).value;
    const y = (yield* evm.stack.pop()).value;
    const z = (yield* evm.stack.pop()).value;

    // GAS
    yield* Gas.chargeGas(Gas.GAS_MID);

    // OPERATION
    const result =
      z === 0n ? new U256({ value: 0n }) : new U256({ value: (x * y) % z });

    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * EXP: Exponentiation operation
 *
 * Exponential operation of the top 2 elements. Pushes the result back on
 * the stack.
 *
 * Gas: 10 + 50 * exponent_bytes (GAS_EXPONENTIATION + GAS_EXPONENTIATION_PER_BYTE * exponent_bytes)
 * Stack: [base, exponent, ...] -> [base^exponent, ...]
 */
export const exp: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;
    // STACK
    const base = (yield* evm.stack.pop()).value;
    const exponent = (yield* evm.stack.pop()).value;

    // GAS
    // Calculate number of bytes in exponent
    const exponentBits =
      exponent === 0n ? 0n : BigInt(exponent.toString(2).length);
    const exponentBytes = (exponentBits + 7n) / 8n;

    const expPerByte = yield* Gas.GAS_EXPONENTIATION_PER_BYTE;
    const gasCost = new Uint({
      value: Gas.GAS_EXPONENTIATION.value + expPerByte.value * exponentBytes,
    });
    yield* Gas.chargeGas(gasCost);

    // OPERATION
    // Compute base^exponent mod 2^256
    const modulo = 2n ** 256n;
    const result = new U256({ value: modPow(base, exponent, modulo) });

    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * Modular exponentiation: (base^exp) % modulo
 */
function modPow(base: bigint, exponent: bigint, modulo: bigint): bigint {
  if (modulo === 1n) return 0n;

  let result = 1n;
  base = base % modulo;

  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % modulo;
    }
    exponent = exponent / 2n;
    base = (base * base) % modulo;
  }

  return result;
}

/**
 * SIGNEXTEND: Sign extension operation
 *
 * Sign extend operation. In other words, extend a signed number which
 * fits in N bytes to 32 bytes.
 *
 * Gas: 5 (GAS_LOW)
 * Stack: [byte_num, value, ...] -> [extended_value, ...]
 */
export const signextend: Effect.Effect<void, EthereumException, Evm> =
  Effect.gen(function* () {
    const evm = yield* Evm;
    // STACK
    const byteNum = yield* evm.stack.pop();
    const value = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_LOW);

    // OPERATION
    let result: U256;
    if (byteNum.value > 31n) {
      result = value;
    } else {
      const valueBytes = value.toBeBytes32().value;

      const byteNumInt = Number(byteNum.value);
      const significantBytes = valueBytes.slice(31 - byteNumInt);
      const signBit = significantBytes[0] >> 7;

      if (signBit === 0) {
        result = U256.fromBeBytes(significantBytes);
      } else {
        const numBytesPrepend = 32 - (byteNumInt + 1);
        const extendedBytes = new Uint8Array(32);

        for (let i = 0; i < numBytesPrepend; i++) {
          extendedBytes[i] = 0xff;
        }

        extendedBytes.set(significantBytes, numBytesPrepend);

        result = U256.fromBeBytes(extendedBytes);
      }
    }

    yield* evm.stack.push(result);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

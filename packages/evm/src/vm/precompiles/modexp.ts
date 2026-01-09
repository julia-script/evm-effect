import {
  Bytes,
  extractAndPad,
  U256,
  Uint,
  wrappingPow,
} from "@evm-effect/ethereum-types";
import { Effect, Ref } from "effect";
import { ExceptionalHaltError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import { Fork } from "../Fork.js";
import * as Gas from "../gas.js";

const min = (a: bigint, b: bigint) => (a < b ? a : b);
const max = (a: bigint, b: bigint) => (a > b ? a : b);
const GQUADDIVISOR_BERLIN = 3n;
const GQUADDIVISOR_BYZANTIUM = 20n;

/**
 * Convert bytes to Uint (arbitrary precision, for values > 32 bytes)
 */
function bytesToUint(bytes: Uint8Array): Uint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return new Uint({ value: result });
}

/**
 * Convert Uint to bytes (big-endian, padded to specified length)
 */
function uintToBytes(value: Uint, length: number): Uint8Array {
  if (value.value === 0n) {
    return new Uint8Array(length);
  }

  const hex = value.value.toString(16);
  const paddedHex = hex.length % 2 === 0 ? hex : `0${hex}`;
  const tempBytes = new Uint8Array(paddedHex.length / 2);

  for (let i = 0; i < tempBytes.length; i++) {
    tempBytes[i] = parseInt(paddedHex.slice(i * 2, i * 2 + 2), 16);
  }

  const result = new Uint8Array(length);
  if (tempBytes.length <= length) {
    result.set(tempBytes, length - tempBytes.length);
  } else {
    result.set(tempBytes.slice(tempBytes.length - length), 0);
  }
  return result;
}

export const modexp = Effect.gen(function* () {
  const evm = yield* Evm;
  const fork = yield* Fork;

  // GAS
  const baseLength = U256.fromBeBytes(evm.message.data.value.subarray(0, 32));
  if (fork.eip(7823) && baseLength.value > 1024n) {
    return yield* Effect.fail(
      new ExceptionalHaltError({ message: "ModExp base length too large" }),
    );
  }

  const expLength = U256.fromBeBytes(evm.message.data.value.subarray(32, 64));
  if (fork.eip(7823) && expLength.value > 1024n) {
    return yield* Effect.fail(
      new ExceptionalHaltError({ message: "ModExp exponent length too large" }),
    );
  }
  const modulusLength = U256.fromBeBytes(
    evm.message.data.value.subarray(64, 96),
  );
  if (fork.eip(7823) && modulusLength.value > 1024n) {
    return yield* Effect.fail(
      new ExceptionalHaltError({ message: "ModExp modulus length too large" }),
    );
  }

  const expStart = new U256({ value: 96n + baseLength.value });

  const expHead = U256.fromBeBytes(
    evm.message.data.value.subarray(
      Number(expStart.value),
      Number(expStart.value) + Number(min(32n, expLength.value)),
    ),
  );

  yield* Gas.chargeGas(
    new Uint({
      value: yield* gasCost(baseLength, modulusLength, expLength, expHead),
    }),
  );

  // OPERATION
  if (baseLength.value === 0n && modulusLength.value === 0n) {
    yield* Ref.set(evm.output, new Bytes({ value: new Uint8Array() }));
    return;
  }

  const baseBytes = extractAndPad(
    evm.message.data.value,
    96,
    Number(baseLength.value),
  );
  const base = bytesToUint(baseBytes);

  const expBytes = extractAndPad(
    evm.message.data.value,
    Number(expStart.value),
    Number(expLength.value),
  );
  const exp = bytesToUint(expBytes);

  const modStart = Number(expStart.value) + Number(expLength.value);
  const modBytes = extractAndPad(
    evm.message.data.value,
    modStart,
    Number(modulusLength.value),
  );
  const modulus = bytesToUint(modBytes);

  if (modulus.value === 0n) {
    yield* Ref.set(
      evm.output,
      new Bytes({ value: new Uint8Array(Number(modulusLength.value)) }),
    );
    return;
  }

  const result = wrappingPow(base, exp, modulus);

  const paddedResult = uintToBytes(result, Number(modulusLength.value));

  yield* Ref.set(evm.output, new Bytes({ value: paddedResult }));
}).pipe(Effect.withSpan("modexp-precompile"));

const gasCost = Effect.fn("gasCost")(function* (
  baseLength: U256,
  modulusLength: U256,
  expLength: U256,
  expHead: U256,
) {
  const multiplicationComplexity = yield* complexity(baseLength, modulusLength);
  const iterationCount = yield* iterations(expLength, expHead);
  let cost = multiplicationComplexity * iterationCount;
  const fork = yield* Fork;
  if (!fork.eip(7883)) {
    const divisor = fork.eip(2565)
      ? GQUADDIVISOR_BERLIN
      : GQUADDIVISOR_BYZANTIUM;
    cost = cost / divisor;
    // Berlin adds minimum of 200, but Byzantium has no minimum
    if (fork.eip(2565)) {
      return max(200n, cost);
    }
    return cost;
  }
  return max(500n, cost);
});

const complexity = Effect.fn("complexity")(function* (
  baseLength: U256,
  modulusLength: U256,
) {
  const maxLength = max(baseLength.value, modulusLength.value);
  const fork = yield* Fork;

  if (fork.eip(7883)) {
    const words = (maxLength + 7n) / 8n;
    let complexity = 16n;
    if (maxLength > 32n) {
      complexity = 2n * words ** 2n;
    }
    return complexity;
  } else if (fork.eip(2565)) {
    const words = (maxLength + 7n) / 8n;
    return words ** 2n;
  } else {
    if (maxLength <= 64n) {
      return maxLength ** 2n;
    } else if (maxLength <= 1024n) {
      return maxLength ** 2n / 4n + 96n * maxLength - 3072n;
    } else {
      return maxLength ** 2n / 16n + 480n * maxLength - 199680n;
    }
  }
});

const iterations = Effect.fn("iterations")(function* (
  expLength: U256,
  expHead: U256,
) {
  const fork = yield* Fork;

  if (fork.eip(2565) || fork.eip(7883)) {
    let count = 0n;
    if (expLength.value <= 32n && expHead.value === 0n) {
      count = 0n;
    } else if (expLength.value <= 32n) {
      let bitLen = expHead.bitLength();
      if (bitLen > 0n) {
        bitLen -= 1n;
      }
      count = bitLen;
    } else {
      const lengthPart = fork.eip(7883)
        ? 16n * (expLength.value - 32n)
        : 8n * (expLength.value - 32n);
      let bitsPart = expHead.bitLength();
      if (bitsPart > 0n) {
        bitsPart -= 1n;
      }
      count = lengthPart + bitsPart;
    }
    return max(count, 1n);
  } else {
    let adjustedExpLength: bigint;
    if (expLength.value < 32n) {
      adjustedExpLength = max(0n, expHead.bitLength() - 1n);
    } else {
      adjustedExpLength =
        8n * (expLength.value - 32n) + max(0n, expHead.bitLength() - 1n);
    }
    return max(adjustedExpLength, 1n);
  }
});

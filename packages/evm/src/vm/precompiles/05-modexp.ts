// """
// Ethereum Virtual Machine (EVM) MODEXP PRECOMPILED CONTRACT.

import {
  Bytes,
  max,
  toBeBytes,
  U256,
  Uint,
  wrappingPow,
} from "@evm-effect/ethereum-types";
import { Effect, Ref } from "effect";
import { ExceptionalHaltError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import { Fork } from "../ForkService.js";
import * as Gas from "../gas.js";

// GQUADDIVISOR = Uint(20)
const GQUADDIVISOR = Effect.gen(function* () {
  const fork = yield* Fork;
  if (fork.eip(2565)) {
    return 3n;
  }
  return 20n;
});

export const modexp = Effect.gen(function* () {
  //     Calculates `(base**exp) % modulus` for arbitrary sized `base`, `exp` and
  //     `modulus`. The return value is the same length as the modulus.
  const evm = yield* Evm;
  const fork = yield* Fork;
  const data = evm.message.data;

  // GAS
  const baseLength = U256.fromBeBytes(data.bufferRead(0, 32).value);
  if (fork.eip(7823) && baseLength.value > 1024n) {
    return yield* Effect.fail(
      new ExceptionalHaltError({ message: "Mod-exp base length is too large" }),
    );
  }
  const expLength = U256.fromBeBytes(data.bufferRead(32, 32).value);
  if (fork.eip(7823) && expLength.value > 1024n) {
    return yield* Effect.fail(
      new ExceptionalHaltError({
        message: "Mod-exp exponent length is too large",
      }),
    );
  }
  const modulusLength = U256.fromBeBytes(data.bufferRead(64, 32).value);
  if (fork.eip(7823) && modulusLength.value > 1024n) {
    return yield* Effect.fail(
      new ExceptionalHaltError({
        message: "Mod-exp modulus length is too large",
      }),
    );
  }

  const expStart = new U256({ value: 96n + baseLength.value });
  const expHeadStart = Number(expStart.value);
  const expHeadLength = Math.min(32, Number(expLength.value));
  const expHead = U256.fromBeBytes(
    data.bufferRead(expHeadStart, expHeadLength).value,
  );

  const cost = yield* gasCost(baseLength, modulusLength, expLength, expHead);
  // const cost = new Uint({ value: 1947923n });//tmp
  yield* Gas.chargeGas(Uint.wrap(cost));

  // OPERATION
  if (baseLength.value === 0n && modulusLength.value === 0n) {
    yield* Ref.set(evm.output, new Bytes({ value: new Uint8Array() }));
    return;
  }

  const base = Uint.fromBeBytes(
    data.bufferRead(96, Number(baseLength.value)).value,
  );
  const exp = Uint.fromBeBytes(
    data.bufferRead(Number(expStart.value), Number(expLength.value)).value,
  );
  const modulusStart = new U256({ value: expStart.value + expLength.value });

  const modulus = Uint.fromBeBytes(
    data.bufferRead(Number(modulusStart.value), Number(modulusLength.value))
      .value,
  );

  if (modulus.value === 0n) {
    yield* Ref.set(
      evm.output,
      new Bytes({ value: new Uint8Array(Number(modulusLength.value)) }),
    );
    return;
  }

  const result = wrappingPow(base, exp, modulus);
  const paddedResult = Bytes.leftPad(
    toBeBytes(result).value,
    Number(modulusLength.value),
  );
  yield* Ref.set(evm.output, paddedResult);
});

const complexity = Effect.fn("complexity")(function* (
  baseLength: U256,
  modulusLength: U256,
) {
  const maxLength = max(baseLength.value, modulusLength.value);
  const fork = yield* Fork;
  if (fork.eip(2565)) {
    const words = (maxLength + 7n) / 8n;
    if (fork.eip(7883)) {
      let complexity = 16n;
      if (maxLength > 32n) {
        complexity = 2n * words ** 2n;
      }
      return complexity;
    }
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
  if (fork.eip(2565)) {
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
      let lengthPart = 0n;
      if (fork.eip(7883)) {
        lengthPart = 16n * (expLength.value - 32n);
      } else {
        lengthPart = 8n * (expLength.value - 32n);
      }
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

const gasCost = Effect.fn("gasCost")(function* (
  baseLength: U256,
  modulusLength: U256,
  expLength: U256,
  expHead: U256,
) {
  const fork = yield* Fork;
  const multiplicationComplexity = yield* complexity(baseLength, modulusLength);
  const iterationCount = yield* iterations(expLength, expHead);
  let cost = multiplicationComplexity * iterationCount;

  if (fork.eip(7883)) {
    return max(500n, cost);
  }

  const gquadDivisor = yield* GQUADDIVISOR;
  cost = cost / gquadDivisor;

  if (fork.eip(2565)) {
    return max(200n, cost);
  }
  return cost;
});

/**
 * Ethereum Virtual Machine (EVM) BLS12-381 PAIRING PRECOMPILED CONTRACT
 *
 * Implementation of BLS12-381 pairing check precompile.
 * Address: 0x0f
 *
 * This precompile verifies that the product of pairings equals 1,
 * which is used for BLS signature verification and other cryptographic protocols.
 */

import { Bytes } from "@evm-effect/ethereum-types/bytes";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import { bls12_381 } from "@noble/curves/bls12-381.js";
import { Effect, Ref } from "effect";
import { InvalidParameterError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";
import {
  bytesToG1Point,
  bytesToG2Point,
  G1_ZERO,
  G2_ZERO,
} from "./bls12-utils.js";

const PAIR_LENGTH = 384;
const G1_POINT_BYTE_LENGTH = 128;

const GAS_PAIRING_BASE = 37700n;
const GAS_PAIRING_PER_PAIR = 32600n;

/**
 * BLS12-381 Pairing Check Precompile
 *
 * Verifies that the product of k pairings equals 1:
 * e(G1_1, G2_1) * e(G1_2, G2_2) * ... * e(G1_k, G2_k) == 1
 *
 * Input: k * 384 bytes (k pairs of 128-byte G1 points and 256-byte G2 points)
 * Output: 32 bytes (0x01 if pairing product equals 1, 0x00 otherwise)
 * Gas: 37700 + 32600 * k
 */
export const bls12Pairing = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  if (data.length === 0 || data.length % PAIR_LENGTH !== 0) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12Pairing] Invalid input length: ${data.length}, expected multiple of ${PAIR_LENGTH}`,
      }),
    );
  }

  const k = data.length / PAIR_LENGTH;

  const gasCost = GAS_PAIRING_BASE + GAS_PAIRING_PER_PAIR * BigInt(k);

  // GAS
  yield* Gas.chargeGas(new Uint({ value: gasCost }));

  // OPERATION
  try {
    const g1Points: (typeof G1_ZERO)[] = [];
    const g2Points: (typeof G2_ZERO)[] = [];

    for (let i = 0; i < k; i++) {
      const pairStart = i * PAIR_LENGTH;

      const g1Data = data.slice(pairStart, pairStart + G1_POINT_BYTE_LENGTH);
      const g1Point = bytesToG1Point(g1Data, true); // Enable subgroup check

      const g2Data = data.slice(
        pairStart + G1_POINT_BYTE_LENGTH,
        pairStart + PAIR_LENGTH,
      );
      const g2Point = bytesToG2Point(g2Data, true); // Enable subgroup check

      g1Points.push(g1Point);
      g2Points.push(g2Point);
    }

    let isValid: boolean;

    if (k === 0) {
      isValid = true;
    } else {
      let product = bls12_381.fields.Fp12.ONE;

      for (let i = 0; i < k; i++) {
        if (g1Points[i].equals(G1_ZERO) || g2Points[i].equals(G2_ZERO)) {
          continue;
        }

        const pairing_result = bls12_381.pairing(g1Points[i], g2Points[i]);
        product = bls12_381.fields.Fp12.mul(product, pairing_result);
      }

      isValid = bls12_381.fields.Fp12.eql(product, bls12_381.fields.Fp12.ONE);
    }

    const output = new Uint8Array(32);
    if (isValid) {
      output[31] = 0x01;
    }

    yield* Ref.set(evm.output, new Bytes({ value: output }));
  } catch (error) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12Pairing] Error: ${error}`,
      }),
    );
  }
});

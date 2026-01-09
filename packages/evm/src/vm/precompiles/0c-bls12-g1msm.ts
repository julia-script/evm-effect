/**
 * Ethereum Virtual Machine (EVM) BLS12-381 G1 MSM PRECOMPILED CONTRACT
 *
 * Implementation of BLS12-381 G1 multi-scalar multiplication precompile.
 * Address: 0x0c
 *
 * Note: This uses the naive approach to multi-scalar multiplication
 * which is not suitably optimized for production clients. Clients are
 * required to implement a more efficient algorithm such as the Pippenger
 * algorithm.
 */

import { Bytes } from "@evm-effect/ethereum-types/bytes";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import type { WeierstrassPoint } from "@noble/curves/abstract/weierstrass.js";
import { Effect, Ref } from "effect";
import { InvalidParameterError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";
import {
  BLS_CURVE_ORDER,
  decodeG1ScalarPair,
  G1_ZERO,
  g1PointToBytes,
} from "./bls12-utils.js";

const LENGTH_PER_PAIR = 160; // 128 bytes for G1 point + 32 bytes for scalar

// Discount table for k (number of pairs) from 1 to 128
const G1_K_DISCOUNT = [
  1000, 949, 848, 797, 764, 750, 738, 728, 719, 712, 705, 698, 692, 687, 682,
  677, 673, 669, 665, 661, 658, 654, 651, 648, 645, 642, 640, 637, 635, 632,
  630, 627, 625, 623, 621, 619, 617, 615, 613, 611, 609, 608, 606, 604, 603,
  601, 599, 598, 596, 595, 593, 592, 591, 589, 588, 586, 585, 584, 582, 581,
  580, 579, 577, 576, 575, 574, 573, 572, 570, 569, 568, 567, 566, 565, 564,
  563, 562, 561, 560, 559, 558, 557, 556, 555, 554, 553, 552, 551, 550, 549,
  548, 547, 547, 546, 545, 544, 543, 542, 541, 540, 540, 539, 538, 537, 536,
  536, 535, 534, 533, 532, 532, 531, 530, 529, 528, 528, 527, 526, 525, 525,
  524, 523, 522, 522, 521, 520, 520, 519,
];

const G1_MAX_DISCOUNT = 519;
const MULTIPLIER = 1000n;

/**
 * BLS12-381 G1 Multi-Scalar Multiplication Precompile
 *
 * Computes the sum of scalar multiplications of G1 points:
 * result = p1 * s1 + p2 * s2 + ... + pk * sk
 *
 * Input: k * 160 bytes (k pairs of 128-byte G1 points and 32-byte scalars)
 * Output: 128 bytes (resulting G1 point)
 * Gas: k * GAS_BLS_G1_MUL * discount / 1000
 */
export const bls12G1Msm = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  // Validate input length
  if (data.length === 0 || data.length % LENGTH_PER_PAIR !== 0) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12G1Msm] Invalid input length: ${data.length}, expected multiple of ${LENGTH_PER_PAIR}`,
      }),
    );
  }

  // Calculate number of pairs
  const k = data.length / LENGTH_PER_PAIR;

  // Calculate gas cost with discount
  let discount: bigint;
  if (k <= 128) {
    discount = BigInt(G1_K_DISCOUNT[k - 1]);
  } else {
    discount = BigInt(G1_MAX_DISCOUNT);
  }

  const gasCost =
    (BigInt(k) * Gas.GAS_BLS_G1_MUL.value * discount) / MULTIPLIER;

  // GAS - charge before operation
  yield* Gas.chargeGas(new Uint({ value: gasCost }));

  // OPERATION - naive implementation
  try {
    let result = G1_ZERO;

    for (let i = 0; i < k; i++) {
      const startIndex = i * LENGTH_PER_PAIR;
      const endIndex = startIndex + LENGTH_PER_PAIR;
      const pairData = data.slice(startIndex, endIndex);
      // Decode point and scalar
      const [point, scalar] = decodeG1ScalarPair(pairData);

      // Normalize scalar to be within valid range [0, curve_order)
      const normalizedScalar = scalar % BLS_CURVE_ORDER;

      // Multiply point by scalar
      // Special case: scalar of 0 results in point at infinity
      let product: WeierstrassPoint<bigint>;
      if (normalizedScalar === 0n) {
        product = G1_ZERO;
      } else {
        product = point.multiply(normalizedScalar);
      }

      // Add to accumulator
      result = result.add(product);
    }

    // Convert result to bytes
    const output = g1PointToBytes(result.toAffine());

    yield* Ref.set(evm.output, new Bytes({ value: output }));
  } catch (error) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12G1Msm] Error: ${error}`,
      }),
    );
  }
});

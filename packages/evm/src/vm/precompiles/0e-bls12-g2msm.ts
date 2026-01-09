/**
 * Ethereum Virtual Machine (EVM) BLS12-381 G2 MSM PRECOMPILED CONTRACT
 *
 * Implementation of BLS12-381 G2 multi-scalar multiplication precompile.
 * Address: 0x0e
 *
 * Note: This uses the naive approach to multi-scalar multiplication
 * which is not suitably optimized for production clients. Clients are
 * required to implement a more efficient algorithm such as the Pippenger
 * algorithm.
 */

import { Bytes } from "@evm-effect/ethereum-types/bytes";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import type { Fp2 } from "@noble/curves/abstract/tower.js";
import type { WeierstrassPoint } from "@noble/curves/abstract/weierstrass.js";
import { Effect, Ref } from "effect";
import { InvalidParameterError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";
import {
  BLS_CURVE_ORDER,
  decodeG2ScalarPair,
  G2_ZERO,
  g2PointToBytes,
} from "./bls12-utils.js";

const LENGTH_PER_PAIR = 288;

const G2_K_DISCOUNT = [
  1000, 1000, 923, 884, 855, 832, 812, 796, 782, 770, 759, 749, 740, 732, 724,
  717, 711, 704, 699, 693, 688, 683, 679, 674, 670, 666, 663, 659, 655, 652,
  649, 646, 643, 640, 637, 634, 632, 629, 627, 624, 622, 620, 618, 615, 613,
  611, 609, 607, 606, 604, 602, 600, 598, 597, 595, 593, 592, 590, 589, 587,
  586, 584, 583, 582, 580, 579, 578, 576, 575, 574, 573, 571, 570, 569, 568,
  567, 566, 565, 563, 562, 561, 560, 559, 558, 557, 556, 555, 554, 553, 552,
  552, 551, 550, 549, 548, 547, 546, 545, 545, 544, 543, 542, 541, 541, 540,
  539, 538, 537, 537, 536, 535, 535, 534, 533, 532, 532, 531, 530, 530, 529,
  528, 528, 527, 526, 526, 525, 524, 524,
];

const G2_MAX_DISCOUNT = 524;
const MULTIPLIER = 1000n;

/**
 * BLS12-381 G2 Multi-Scalar Multiplication Precompile
 *
 * Computes the sum of scalar multiplications of G2 points:
 * result = p1 * s1 + p2 * s2 + ... + pk * sk
 *
 * Input: k * 288 bytes (k pairs of 256-byte G2 points and 32-byte scalars)
 * Output: 256 bytes (resulting G2 point)
 * Gas: k * GAS_BLS_G2_MUL * discount / 1000
 */
export const bls12G2Msm = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  if (data.length === 0 || data.length % LENGTH_PER_PAIR !== 0) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12G2Msm] Invalid input length: ${data.length}, expected multiple of ${LENGTH_PER_PAIR}`,
      }),
    );
  }

  const k = data.length / LENGTH_PER_PAIR;

  let discount: bigint;
  if (k <= 128) {
    discount = BigInt(G2_K_DISCOUNT[k - 1]);
  } else {
    discount = BigInt(G2_MAX_DISCOUNT);
  }

  const gasCost =
    (BigInt(k) * Gas.GAS_BLS_G2_MUL.value * discount) / MULTIPLIER;

  // GAS
  yield* Gas.chargeGas(new Uint({ value: gasCost }));

  // OPERATION
  try {
    let result = G2_ZERO;

    for (let i = 0; i < k; i++) {
      const startIndex = i * LENGTH_PER_PAIR;
      const endIndex = startIndex + LENGTH_PER_PAIR;
      const pairData = data.slice(startIndex, endIndex);

      const [point, scalar] = decodeG2ScalarPair(pairData);

      const normalizedScalar = scalar % BLS_CURVE_ORDER;

      let product: WeierstrassPoint<Fp2>;
      if (normalizedScalar === 0n) {
        product = G2_ZERO;
      } else {
        product = point.multiply(normalizedScalar);
      }

      result = result.add(product);
    }

    const output = g2PointToBytes(result.toAffine());

    yield* Ref.set(evm.output, new Bytes({ value: output }));
  } catch (error) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12G2Msm] Error: ${error}`,
      }),
    );
  }
});

/**
 * Ethereum Virtual Machine (EVM) BLS12-381 MAP FP TO G1 PRECOMPILED CONTRACT
 *
 * Precompile to map field element to G1.
 * Address: 0x10
 */

import { Bytes } from "@evm-effect/ethereum-types/bytes";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import { bls12_381 } from "@noble/curves/bls12-381.js";
import { Effect, Ref } from "effect";
import { InvalidParameterError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";
import { BLS_FIELD_MODULUS, g1PointToBytes } from "./bls12-utils.js";

/**
 * BLS12-381 Map Field Element to G1 Precompile
 *
 * Maps a field element to a G1 point using the hash-to-curve algorithm.
 *
 * Input: 64 bytes (field element)
 * Output: 128 bytes (G1 point)
 * Gas: GAS_BLS_G1_MAP (5500)
 */
export const bls12MapFpToG1 = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  if (data.length !== 64) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12MapFpToG1] Invalid input length: ${data.length}, expected 64`,
      }),
    );
  }

  yield* Gas.chargeGas(new Uint({ value: Gas.GAS_BLS_G1_MAP.value }));

  // Read 64 bytes as a bigint
  const fpBn = Uint.fromBeBytes(data);
  if (fpBn.value >= BLS_FIELD_MODULUS) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12MapFpToG1] Field element >= field modulus`,
      }),
    );
  }

  // @ts-expect-error - mapToCurve expects a single bigint for m=1 curves (like G1)
  const g1 = bls12_381.G1.mapToCurve(fpBn.value);

  // convert G1 point to 128 bytes
  const output = g1PointToBytes(g1);

  yield* Ref.set(evm.output, new Bytes({ value: output }));
});

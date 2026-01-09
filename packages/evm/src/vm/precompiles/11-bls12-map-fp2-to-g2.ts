/**
 * Ethereum Virtual Machine (EVM) BLS12-381 MAP FP2 TO G2 PRECOMPILED CONTRACT
 *
 * Precompile to map Fp2 element to G2.
 * Address: 0x11
 */

import { Bytes } from "@evm-effect/ethereum-types/bytes";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import { bls12_381 } from "@noble/curves/bls12-381.js";
import { Effect, Ref } from "effect";
import { InvalidParameterError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";
import { BLS_FIELD_MODULUS, g2PointToBytes } from "./bls12-utils.js";

/**
 * BLS12-381 Map Fp2 Element to G2 Precompile
 *
 * Maps an Fp2 element to a G2 point using the hash-to-curve algorithm.
 *
 * Input: 128 bytes (Fp2 element: 64 bytes c0 + 64 bytes c1)
 * Output: 256 bytes (G2 point)
 * Gas: GAS_BLS_G2_MAP (75000)
 */
export const bls12MapFp2ToG2 = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  if (data.length !== 128) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12MapFp2ToG2] Invalid input length: ${data.length}, expected 128`,
      }),
    );
  }

  yield* Gas.chargeGas(new Uint({ value: Gas.GAS_BLS_G2_MAP.value }));

  const fp2_c0_bytes = data.slice(0, 64);
  const fp2_c1_bytes = data.slice(64, 128);

  const fp2_c0_bn = Uint.fromBeBytes(fp2_c0_bytes);
  const fp2_c1_bn = Uint.fromBeBytes(fp2_c1_bytes);

  if (fp2_c0_bn.value >= BLS_FIELD_MODULUS) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12MapFp2ToG2] Fp2.c0 >= field modulus`,
      }),
    );
  }

  if (fp2_c1_bn.value >= BLS_FIELD_MODULUS) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12MapFp2ToG2] Fp2.c1 >= field modulus`,
      }),
    );
  }

  const g2 = bls12_381.G2.mapToCurve([fp2_c0_bn.value, fp2_c1_bn.value]);

  const output = g2PointToBytes(g2);

  yield* Ref.set(evm.output, new Bytes({ value: output }));
});

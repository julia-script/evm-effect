/**
 * Ethereum Virtual Machine (EVM) BLS12-381 G2 ADD PRECOMPILED CONTRACT
 *
 * Implementation of BLS12-381 G2 point addition precompile.
 * Address: 0x0d
 */

import { Bytes } from "@evm-effect/ethereum-types/bytes";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import { InvalidParameterError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";
import { bytesToG2Point, g2PointToBytes } from "./bls12-utils.js";

const G2_POINT_BYTE_LENGTH = 256;

/**
 * BLS12-381 G2 Point Addition Precompile
 *
 * Adds two G2 points on the BLS12-381 curve.
 *
 * Input: 512 bytes (two 256-byte G2 points)
 * Output: 256 bytes (resulting G2 point)
 * Gas: GAS_BLS_G2_ADD (800)
 */
export const bls12G2Add = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  // Validate input length
  if (data.length !== 512) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12G2Add] Invalid input length: ${data.length}, expected 512`,
      }),
    );
  }

  // GAS - charge before operation
  yield* Gas.chargeGas(new Uint({ value: Gas.GAS_BLS_G2_ADD.value }));

  // OPERATION
  try {
    // Extract the two G2 points
    const p1Data = data.slice(0, G2_POINT_BYTE_LENGTH);
    const p2Data = data.slice(G2_POINT_BYTE_LENGTH, 512);

    // Convert to G2 points (without subgroup check for addition)
    const p1 = bytesToG2Point(p1Data, false);
    const p2 = bytesToG2Point(p2Data, false);

    // Add the points
    const result = p1.add(p2);

    // Convert result to bytes
    const output = g2PointToBytes(result.toAffine());

    yield* Ref.set(evm.output, new Bytes({ value: output }));
  } catch (error) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12G2Add] Error: ${error}`,
      }),
    );
  }
});

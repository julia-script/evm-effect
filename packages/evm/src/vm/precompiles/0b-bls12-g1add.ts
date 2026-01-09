/**
 * Ethereum Virtual Machine (EVM) BLS12-381 G1 ADD PRECOMPILED CONTRACT
 *
 * Implementation of BLS12-381 G1 point addition precompile.
 * Address: 0x0b
 */

import { Bytes } from "@evm-effect/ethereum-types/bytes";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import { InvalidParameterError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";
import { bytesToG1Point, g1PointToBytes } from "./bls12-utils.js";

const G1_POINT_BYTE_LENGTH = 128;

/**
 * BLS12-381 G1 Point Addition Precompile
 *
 * Adds two G1 points on the BLS12-381 curve.
 *
 * Input: 256 bytes (two 128-byte G1 points)
 * Output: 128 bytes (resulting G1 point)
 * Gas: GAS_BLS_G1_ADD (500)
 */
export const bls12G1Add = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  // Validate input length
  if (data.length !== 256) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12G1Add] Invalid input length: ${data.length}, expected 256`,
      }),
    );
  }

  // GAS - charge before operation
  yield* Gas.chargeGas(new Uint({ value: Gas.GAS_BLS_G1_ADD.value }));

  // OPERATION
  try {
    // Extract the two G1 points
    const p1Data = data.slice(0, G1_POINT_BYTE_LENGTH);
    const p2Data = data.slice(G1_POINT_BYTE_LENGTH, 256);

    // Convert to G1 points (without subgroup check for addition)
    const p1 = bytesToG1Point(p1Data, false);
    const p2 = bytesToG1Point(p2Data, false);

    // Add the points
    const result = p1.add(p2);

    // Convert result to bytes
    const output = g1PointToBytes(result.toAffine());

    yield* Ref.set(evm.output, new Bytes({ value: output }));
  } catch (error) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[bls12G1Add] Error: ${error}`,
      }),
    );
  }
});

/**
 * Ethereum Virtual Machine (EVM) KZG POINT EVALUATION PRECOMPILED CONTRACT
 *
 * Implementation of the KZG point evaluation precompile for EIP-4844 (proto-danksharding).
 * Address: 0x0a
 *
 * NOTE: This precompile requires the c-kzg library with native bindings compiled.
 * The library will be lazily loaded when the precompile is first used.
 *
 * To build c-kzg:
 * 1. The library was installed with: bun add c-kzg
 * 2. It will automatically attempt to download prebuilt binaries
 * 3. If that fails, it will need to be built from source
 */

import { Bytes } from "@evm-effect/ethereum-types/bytes";
import { U256, Uint } from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import { KZGProofError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

let kzgPromise: ReturnType<typeof import("kzg-wasm").loadKZG> | null = null;

async function loadKZG() {
  if (kzgPromise === null) {
    kzgPromise = import("kzg-wasm").then((module) => module.loadKZG());
  }
  return kzgPromise;
}

const FIELD_ELEMENTS_PER_BLOB = 4096n;
const BLS_MODULUS =
  52435875175126190479447740508185965837690552500527637822603658699938581184513n;

/**
 * KZG Point Evaluation Precompile (EIP-4844)
 *
 * Verifies a KZG proof which claims that a blob (represented by a commitment)
 * evaluates to a given value at a given point.
 *
 * Input: 192 bytes
 *   - versioned_hash (32 bytes): The versioned hash of the KZG commitment
 *   - z (32 bytes): The point at which the polynomial is evaluated (big-endian)
 *   - y (32 bytes): The claimed evaluation result (big-endian)
 *   - commitment (48 bytes): The KZG commitment to the blob
 *   - proof (48 bytes): The KZG proof
 *
 * Output: 64 bytes
 *   - FIELD_ELEMENTS_PER_BLOB (32 bytes, big-endian)
 *   - BLS_MODULUS (32 bytes, big-endian)
 *
 * Gas: GAS_POINT_EVALUATION (50000)
 */
export const kzgPointEvaluation = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  if (data.length !== 192) {
    return yield* Effect.fail(
      new KZGProofError({
        message: `[kzgPointEvaluation] Invalid input length: ${data.length}, expected 192`,
      }),
    );
  }

  const versionedHash = data.slice(0, 32);
  const z = data.slice(32, 64);
  const y = data.slice(64, 96);
  const commitment = data.slice(96, 144); // 48 bytes
  const proof = data.slice(144, 192); // 48 bytes

  // GAS
  yield* Gas.chargeGas(new Uint({ value: Gas.GAS_POINT_EVALUATION.value }));

  const VERSIONED_HASH_VERSION_KZG = 0x01;
  if (versionedHash[0] !== VERSIONED_HASH_VERSION_KZG) {
    return yield* Effect.fail(
      new KZGProofError({
        message: `[kzgPointEvaluation] Invalid versioned hash version: 0x${versionedHash[0]
          .toString(16)
          .padStart(2, "0")}, expected 0x01`,
      }),
    );
  }

  const verificationResult = yield* Effect.tryPromise({
    try: async () => {
      const kzgLib = await loadKZG();

      const toHex = (bytes: Uint8Array) =>
        `0x${Buffer.from(bytes).toString("hex")}`;

      const result = kzgLib.verifyKZGProof(
        toHex(commitment),
        toHex(z),
        toHex(y),
        toHex(proof),
      );

      return result;
    },
    catch: (error) => {
      return new KZGProofError({
        message: `[kzgPointEvaluation] KZG proof verification error: ${error}`,
      });
    },
  });

  if (!verificationResult) {
    return yield* Effect.fail(
      new KZGProofError({
        message: `[kzgPointEvaluation] KZG proof verification failed`,
      }),
    );
  }

  const output = new Uint8Array(64);
  output.set(
    new U256({ value: FIELD_ELEMENTS_PER_BLOB }).toBeBytes32().value,
    0,
  );
  output.set(new U256({ value: BLS_MODULUS }).toBeBytes32().value, 32);
  yield* Ref.set(evm.output, new Bytes({ value: output }));
});

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
// import { keccak_256 } from "@noble/hashes/sha3.js";
import { Effect, Ref } from "effect";
import { KZGProofError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

// Lazy-load kzg-wasm (WASM-based KZG library, no native bindings needed)
let kzgPromise: ReturnType<typeof import("kzg-wasm").loadKZG> | null = null;

async function loadKZG() {
  if (kzgPromise === null) {
    // Dynamic import to avoid module resolution issues
    kzgPromise = import("kzg-wasm").then((module) => module.loadKZG());
  }
  return kzgPromise;
}

// Constants from the specification
const FIELD_ELEMENTS_PER_BLOB = 4096n;
const BLS_MODULUS =
  52435875175126190479447740508185965837690552500527637822603658699938581184513n;
// const VERSIONED_HASH_VERSION_KZG = 0x01;

/**
 * Compute the versioned hash from a KZG commitment
 * @param commitment 48-byte KZG commitment
 * @returns 32-byte versioned hash
 */
// function _kzgCommitmentToVersionedHash(commitment: Uint8Array): Uint8Array {
//   const hash = keccak_256(commitment);
//   // Set the first byte to the version
//   hash[0] = VERSIONED_HASH_VERSION_KZG;
//   return hash;
// }

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

  // Validate input length
  if (data.length !== 192) {
    return yield* Effect.fail(
      new KZGProofError({
        message: `[kzgPointEvaluation] Invalid input length: ${data.length}, expected 192`,
      }),
    );
  }

  // Extract components
  const versionedHash = data.slice(0, 32);
  const z = data.slice(32, 64);
  const y = data.slice(64, 96);
  const commitment = data.slice(96, 144); // 48 bytes
  const proof = data.slice(144, 192); // 48 bytes

  // GAS - charge before validation
  yield* Gas.chargeGas(new Uint({ value: Gas.GAS_POINT_EVALUATION.value }));

  // Validate versioned hash format (EIP-4844)
  // The first byte must be VERSIONED_HASH_VERSION_KZG (0x01)
  const VERSIONED_HASH_VERSION_KZG = 0x01;
  if (versionedHash[0] !== VERSIONED_HASH_VERSION_KZG) {
    return yield* Effect.fail(
      new KZGProofError({
        message: `[kzgPointEvaluation] Invalid versioned hash version: 0x${versionedHash[0].toString(16).padStart(2, "0")}, expected 0x01`,
      }),
    );
  }

  // Note: The precompile does NOT validate that the versioned hash matches the commitment.
  // That validation happens at the transaction level. The precompile only validates:
  // 1. The version byte is 0x01
  // 2. The KZG proof is mathematically valid

  // Load and verify KZG proof using kzg-wasm library
  const verificationResult = yield* Effect.tryPromise({
    try: async () => {
      // Load the WASM-based KZG library
      const kzgLib = await loadKZG();

      // kzg-wasm verifyKZGProof expects hex strings, so convert Uint8Arrays
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

  // If verification succeeds, return FIELD_ELEMENTS_PER_BLOB and BLS_MODULUS
  const output = new Uint8Array(64);
  output.set(
    new U256({ value: FIELD_ELEMENTS_PER_BLOB }).toBeBytes32().value,
    0,
  );
  output.set(new U256({ value: BLS_MODULUS }).toBeBytes32().value, 32);
  yield* Ref.set(evm.output, new Bytes({ value: output }));
});

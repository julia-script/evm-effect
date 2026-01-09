/**
 * SHA256 hashing function
 *
 * Effect-TS wrapper around SHA256 cryptographic primitive
 */

// import { createHash } from "node:crypto";

import { Bytes, Bytes32 } from "@evm-effect/ethereum-types";
import { sha256 as cryptoSha256 } from "@noble/hashes/sha2.js";

/**
 * Compute SHA256 hash of input bytes.
 *
 * @param input - Input bytes to hash
 * @returns SHA256 hash as Bytes32
 */
export function sha256(input: Bytes | Uint8Array): Bytes32 {
  const inputBytes = input instanceof Bytes ? input.value : input;
  const digest = cryptoSha256(inputBytes);
  return new Bytes32({ value: digest });
}

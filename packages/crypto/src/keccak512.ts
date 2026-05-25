import { Bytes64 } from "@evm-effect/ethereum-types";
import { keccak_512 } from "@noble/hashes/sha3.js";

/**
 * Compute the Keccak512 hash of the input
 *
 * @param input - The data to hash
 * @returns The 64-byte hash
 */

export function keccak512(input: { value: Uint8Array } | Uint8Array): Bytes64 {
  const inputBytes = "value" in input ? input.value : input;
  const hash = keccak_512(inputBytes);
  return new Bytes64({ value: hash });
}

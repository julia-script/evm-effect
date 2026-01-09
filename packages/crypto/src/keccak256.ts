/**
 * Keccak256 hashing for Ethereum
 *
 * Uses @noble/hashes for the underlying implementation
 */

import { Bytes32 } from "@evm-effect/ethereum-types";
import { keccak_256 } from "@noble/hashes/sha3.js";

/**
 * Compute the Keccak256 hash of the input
 *
 * @param input - The data to hash
 * @returns The 32-byte hash
 */
export function keccak256(input: { value: Uint8Array } | Uint8Array): Bytes32 {
  const inputBytes = "value" in input ? input.value : input;
  const hash = keccak_256(inputBytes);
  return new Bytes32({ value: hash });
}

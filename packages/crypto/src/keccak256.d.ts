/**
 * Keccak256 hashing for Ethereum
 *
 * Uses @noble/hashes for the underlying implementation
 */
import { Bytes32 } from "@evm-effect/ethereum-types";
/**
 * Compute the Keccak256 hash of the input
 *
 * @param input - The data to hash
 * @returns The 32-byte hash
 */
export declare function keccak256(
  input:
    | {
        value: Uint8Array;
      }
    | Uint8Array,
): Bytes32;
//# sourceMappingURL=keccak256.d.ts.map

/**
 * Nibble utilities for Merkle Patricia Trie
 *
 * A nibble is a 4-bit value (half a byte), used for indexing in the trie
 */

import { Bytes } from "@evm-effect/ethereum-types";

/**
 * Convert bytes to nibble list (each byte becomes two nibbles)
 *
 * @param bytes - The bytes to convert
 * @returns Bytes where each byte is a nibble (value < 16)
 * @example
 * bytesToNibbleList(0xAB) => [0x0A, 0x0B]
 */
export function bytesToNibbleList(bytes: Bytes): Bytes {
  const nibbleList = new Uint8Array(bytes.value.length * 2);

  for (let byteIndex = 0; byteIndex < bytes.value.length; byteIndex++) {
    const byte = bytes.value[byteIndex];
    nibbleList[byteIndex * 2] = (byte & 0xf0) >> 4; // High nibble
    nibbleList[byteIndex * 2 + 1] = byte & 0x0f; // Low nibble
  }

  return new Bytes({ value: nibbleList });
}

/**
 * Compress nibble list into compact form with flag
 *
 * The flag is encoded in the high nibble of the first byte:
 * - Bit 0: Parity (1 if odd length, 0 if even)
 * - Bit 1: Node type (1 if leaf, 0 if extension)
 * - Bits 2-3: Unused (set to 0)
 *
 * @param nibbles - Array of nibbles (each < 16)
 * @param isLeaf - True for leaf nodes, false for extension nodes
 * @returns Compact byte array
 * @example
 * // Even length:
 * nibbleListToCompact([0x01, 0x02, 0x03, 0x04], false) => [0x00, 0x12, 0x34]
 * // Odd length:
 * nibbleListToCompact([0x01, 0x02, 0x03], false) => [0x11, 0x23]
 */
export function nibbleListToCompact(nibbles: Bytes, isLeaf: boolean): Bytes {
  const compact: number[] = [];
  const nibbleArray = Array.from(nibbles.value);

  if (nibbleArray.length % 2 === 0) {
    // Even length: add flag byte, then pack nibbles
    compact.push(16 * (2 * (isLeaf ? 1 : 0)));
    for (let i = 0; i < nibbleArray.length; i += 2) {
      compact.push(16 * nibbleArray[i] + nibbleArray[i + 1]);
    }
  } else {
    // Odd length: flag + first nibble in first byte
    compact.push(16 * (2 * (isLeaf ? 1 : 0) + 1) + nibbleArray[0]);
    for (let i = 1; i < nibbleArray.length; i += 2) {
      compact.push(16 * nibbleArray[i] + nibbleArray[i + 1]);
    }
  }

  return new Bytes({ value: new Uint8Array(compact) });
}

/**
 * Find the length of the longest common prefix between two sequences
 *
 * @param a - First sequence
 * @param b - Second sequence
 * @returns Length of common prefix
 */
export function commonPrefixLength(a: Bytes, b: Bytes): number {
  const minLen = Math.min(a.value.length, b.value.length);

  for (let i = 0; i < minLen; i++) {
    if (a.value[i] !== b.value[i]) {
      return i;
    }
  }

  return minLen;
}

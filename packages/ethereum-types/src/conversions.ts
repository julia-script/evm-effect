/**
 * Conversions between numeric and bytes types
 * Separated to avoid circular dependencies between numeric.ts and bytes.ts
 */

import { Bytes, Bytes1, Bytes4, Bytes8, Bytes32, Bytes64 } from "./bytes.js";
import type { AnyUint } from "./numeric.js";

/**
 * Convert to 1 byte (little-endian per Python spec)
 */
export function toBytes1<T extends AnyUint>(a: T): Bytes1 {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(a.value & 0xffn);
  return new Bytes1({ value: bytes });
}

/**
 * Convert to 4 bytes, big-endian
 */
export function toBeBytes4<T extends AnyUint>(a: T): Bytes4 {
  const bytes = new Uint8Array(4);
  let v = a.value;
  for (let i = 3; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v = v >> 8n;
  }
  return new Bytes4({ value: bytes });
}

/**
 * Convert to 4 bytes, little-endian
 */
export function toLeBytes4<T extends AnyUint>(a: T): Bytes4 {
  const bytes = new Uint8Array(4);
  let v = a.value;
  for (let i = 0; i < 4; i++) {
    bytes[i] = Number(v & 0xffn);
    v = v >> 8n;
  }
  return new Bytes4({ value: bytes });
}

/**
 * Convert to 8 bytes, big-endian
 */
export function toBeBytes8<T extends AnyUint>(a: T): Bytes8 {
  const bytes = new Uint8Array(8);
  let v = a.value;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v = v >> 8n;
  }
  return new Bytes8({ value: bytes });
}

/**
 * Convert to 8 bytes, little-endian
 */
export function toLeBytes8<T extends AnyUint>(a: T): Bytes8 {
  const bytes = new Uint8Array(8);
  let v = a.value;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(v & 0xffn);
    v = v >> 8n;
  }
  return new Bytes8({ value: bytes });
}

/**
 * Convert to 32 bytes, big-endian (most common for U256)
 */
export function toBeBytes32<T extends AnyUint>(a: T): Bytes32 {
  const bytes = new Uint8Array(32);
  let v = a.value;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v = v >> 8n;
  }
  return new Bytes32({ value: bytes });
}

/**
 * Alias for toBeBytes32 (most common usage)
 */
export function toBytes32<T extends AnyUint>(a: T): Bytes32 {
  return toBeBytes32(a);
}

/**
 * Convert to 64 bytes, big-endian
 */
export function toBeBytes64<T extends AnyUint>(a: T): Bytes64 {
  const bytes = new Uint8Array(64);
  let v = a.value;
  for (let i = 63; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v = v >> 8n;
  }
  return new Bytes64({ value: bytes });
}

/**
 * Convert to variable-length bytes, big-endian, without padding
 *
 * Calculates the minimum number of bytes needed to represent the number.
 * Returns empty Bytes for zero.
 */
export function toBeBytes<T extends AnyUint>(a: T): Bytes {
  // Special case: zero returns empty bytes
  if (a.value === 0n) {
    return new Bytes({ value: new Uint8Array(0) });
  }

  // Calculate the minimum number of bytes needed
  // bit_length = number of bits needed to represent the number
  // byte_length = ceiling(bit_length / 8)
  const bitLength = a.value.toString(2).length;
  const byteLength = Math.ceil(bitLength / 8);

  const bytes = new Uint8Array(byteLength);
  let v = a.value;
  for (let i = byteLength - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v = v >> 8n;
  }
  return new Bytes({ value: bytes });
}

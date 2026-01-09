import { sha256 } from "@noble/hashes/sha2.js";

/**
 * Compare two Uint8Arrays for byte-by-byte equality
 */
export const uint8ArrayEquals = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const bufferToHex = (value: Uint8Array<ArrayBufferLike>): string => {
  // @ts-expect-error - toHex is not typed in the latest version of TypeScript
  return value.toHex();
};

export const bufferFromHex = (hex: string): Uint8Array<ArrayBuffer> => {
  // @ts-expect-error - fromHex is not typed in the latest version of TypeScript
  return Uint8Array.fromHex(hex);
};

export const hash = (value: Uint8Array<ArrayBufferLike>): number => {
  const digest = sha256(value);
  return digest[0] | (digest[1] << 8) | (digest[2] << 16) | (digest[3] << 24);
};
export type Byteish =
  | Uint8Array<ArrayBufferLike>
  | string
  | number[]
  | { value: Uint8Array<ArrayBufferLike> };

export const normalizeToUint8Array = (value: Byteish): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      value = value.slice(2);
    }
    return bufferFromHex(value);
  }
  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }

  return new Uint8Array(value.value);
};

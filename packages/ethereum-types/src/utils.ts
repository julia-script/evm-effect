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
  if ("toHex" in value) {
    // @ts-expect-error - toHex is not typed in the latest version of TypeScript
    return value.toHex();
  }
  let out = "";
  for (let i = 0; i < value.length; ++i) {
    out += value[i].toString(16).padStart(2, "0");
  }
  return out;
};

export const bufferFromHex = (string: string): Uint8Array<ArrayBuffer> => {
  if ("fromHex" in Uint8Array) {
    // @ts-expect-error - fromHex is not typed in the latest version of TypeScript
    return Uint8Array.fromHex(string);
  }
  if (typeof string !== "string") {
    throw new TypeError("expected string to be a string");
  }
  if (string.length % 2 !== 0) {
    throw new SyntaxError("string should be an even number of characters");
  }
  const maxLength = 2 ** 53 - 1;
  const bytes = [];
  let read = 0;
  if (maxLength > 0) {
    while (read < string.length) {
      const hexits = string.slice(read, read + 2);
      if (/[^0-9a-fA-F]/.test(hexits)) {
        throw new SyntaxError("string should only contain hex characters");
      }
      bytes.push(parseInt(hexits, 16));
      read += 2;
      if (bytes.length === maxLength) {
        break;
      }
    }
  }
  return new Uint8Array(bytes);
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

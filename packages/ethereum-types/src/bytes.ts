import { Either, Equal, Hash, Schema } from "effect";
import { EvmTypeError } from "./exceptions.js";
import {
  type Byteish,
  bufferFromHex,
  bufferToHex,
  hash,
  normalizeToUint8Array,
  uint8ArrayEquals,
} from "./utils.js";

/**
 * Variable-length byte array
 */
export class Bytes extends Schema.TaggedClass<Bytes>("Bytes")("Bytes", {
  value: Schema.instanceOf(Uint8Array),
}) {
  constructor({ value }: { value: Uint8Array }) {
    super({ value: padBuffer(value, value.length) });
  }
  clone(): Bytes {
    return new Bytes({ value: new Uint8Array(this.value) });
  }

  get length(): number {
    return this.value.length;
  }
  toHex(): `0x${string}` {
    return `0x${bufferToHex(this.value)}`;
  }
  toUnprefixedHex(): string {
    return bufferToHex(this.value);
  }

  static empty(): Bytes {
    return new Bytes({ value: new Uint8Array(0) });
  }

  static from(value: Uint8Array | number[]): Bytes {
    if (value instanceof Uint8Array) {
      return new Bytes({ value });
    }
    return new Bytes({ value: new Uint8Array(value) });
  }
  static constant(value: Byteish): Bytes {
    return new Bytes({ value: normalizeToUint8Array(value) });
  }

  static fromHex(hex: string): Either.Either<Bytes, EvmTypeError> {
    try {
      if (hex.startsWith("0x")) {
        hex = hex.slice(2);
      }
      const bytes = bufferFromHex(hex);
      return Either.right(new Bytes({ value: bytes }));
    } catch (_) {
      return Either.left(
        new EvmTypeError({ message: "Invalid hex string", input: hex }),
      );
    }
  }

  [Equal.symbol](that: Equal.Equal): boolean {
    if ("value" in that && that.value instanceof Uint8Array) {
      return uint8ArrayEquals(this.value, that.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}

/**
 * Fixed-size byte array of exactly 0 bytes
 */
export class Bytes0 extends Schema.TaggedClass<Bytes0>("Bytes0")("Bytes0", {
  value: Schema.instanceOf(Uint8Array),
}) {
  static readonly LENGTH = 0;

  constructor({ value }: { value?: Uint8Array }) {
    super({ value: padBuffer(value, 0) });
  }
  static empty(): Bytes0 {
    return new Bytes0({ value: new Uint8Array(0) });
  }

  clone(): Bytes0 {
    return new Bytes0({ value: new Uint8Array(0) });
  }
  toHex(): `0x${string}` {
    return `0x${bufferToHex(this.value)}`;
  }
  toUnprefixedHex(): string {
    return bufferToHex(this.value);
  }

  get length(): number {
    return 0;
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    if ("value" in that && that.value instanceof Uint8Array) {
      return uint8ArrayEquals(this.value, that.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}

/**
 * Fixed-size byte array of exactly 1 byte
 */
export class Bytes1 extends Schema.TaggedClass<Bytes1>("Bytes1")("Bytes1", {
  value: Schema.instanceOf(Uint8Array),
}) {
  static readonly LENGTH = 1;

  constructor({ value }: { value: Uint8Array }) {
    super({ value: padBuffer(value, 1) });
  }

  static zero(): Bytes1 {
    return new Bytes1({ value: new Uint8Array(1) });
  }

  clone(): Bytes1 {
    return new Bytes1({ value: new Uint8Array(this.value) });
  }
  toHex(): `0x${string}` {
    return `0x${bufferToHex(this.value)}`;
  }
  toUnprefixedHex(): string {
    return bufferToHex(this.value);
  }

  static constant(value: Byteish): Bytes1 {
    return new Bytes1({ value: normalizeToUint8Array(value) });
  }
  get length(): number {
    return 1;
  }

  [Equal.symbol](that: Equal.Equal): boolean {
    if ("value" in that && that.value instanceof Uint8Array) {
      return uint8ArrayEquals(this.value, that.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}

/**
 * Fixed-size byte array of exactly 4 bytes
 */
export class Bytes4 extends Schema.TaggedClass<Bytes4>("Bytes4")("Bytes4", {
  value: Schema.instanceOf(Uint8Array),
}) {
  static readonly LENGTH = 4;

  constructor({ value }: { value: Uint8Array }) {
    super({ value: padBuffer(value, 4) });
  }

  static zero(): Bytes4 {
    return new Bytes4({ value: new Uint8Array(4) });
  }

  clone(): Bytes4 {
    return new Bytes4({ value: new Uint8Array(this.value) });
  }
  toHex(): `0x${string}` {
    return `0x${bufferToHex(this.value)}`;
  }
  toUnprefixedHex(): string {
    return bufferToHex(this.value);
  }
  static constant(value: Byteish): Bytes4 {
    return new Bytes4({ value: normalizeToUint8Array(value) });
  }

  get length(): number {
    return 4;
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    if ("value" in that && that.value instanceof Uint8Array) {
      return uint8ArrayEquals(this.value, that.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}

/**
 * Fixed-size byte array of exactly 8 bytes
 */
export class Bytes8 extends Schema.TaggedClass<Bytes8>("Bytes8")("Bytes8", {
  value: Schema.instanceOf(Uint8Array),
}) {
  static readonly LENGTH = 8;

  constructor({ value }: { value: Uint8Array }) {
    super({ value: padBuffer(value, 8) });
  }

  static zero(): Bytes8 {
    return new Bytes8({ value: new Uint8Array(8) });
  }

  clone(): Bytes8 {
    return new Bytes8({ value: new Uint8Array(this.value) });
  }
  toHex(): `0x${string}` {
    return `0x${bufferToHex(this.value)}`;
  }
  toUnprefixedHex(): string {
    return bufferToHex(this.value);
  }

  static constant(value: Byteish): Bytes8 {
    return new Bytes8({ value: normalizeToUint8Array(value) });
  }

  get length(): number {
    return 8;
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    if ("value" in that && that.value instanceof Uint8Array) {
      return uint8ArrayEquals(this.value, that.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}

/**
 * Fixed-size byte array of exactly 20 bytes (Ethereum addresses)
 */
export class Bytes20 extends Schema.TaggedClass<Bytes20>("Bytes20")("Bytes20", {
  value: Schema.instanceOf(Uint8Array),
}) {
  static readonly LENGTH = 20;

  constructor({ value }: { value: Uint8Array }) {
    super({ value: padBuffer(value, 20) });
  }

  static zero(): Bytes20 {
    return new Bytes20({ value: new Uint8Array(20) });
  }

  clone(): Bytes20 {
    return new Bytes20({ value: new Uint8Array(this.value) });
  }

  get length(): number {
    return 20;
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    if ("value" in that && that.value instanceof Uint8Array) {
      return uint8ArrayEquals(this.value, that.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}

const padBuffer = (value: Uint8Array | undefined, length: number) => {
  if (!value) {
    return new Uint8Array(length);
  }
  const padded = new Uint8Array(length);
  if (value.length < length) {
    // Left-pad with zeros
    padded.set(value, length - value.length);
    return padded;
  }
  return value.slice(-length);
};

/**
 * Fixed-size byte array of exactly 32 bytes (hashes, storage keys)
 */
export class Bytes32 extends Schema.TaggedClass<Bytes32>("Bytes32")("Bytes32", {
  value: Schema.instanceOf(Uint8Array),
}) {
  static readonly LENGTH = 32;

  constructor({ value }: { value: Uint8Array }) {
    super({ value: padBuffer(value, 32) });
  }

  static zero(): Bytes32 {
    return new Bytes32({ value: new Uint8Array(32) });
  }

  clone(): Bytes32 {
    return new Bytes32({ value: new Uint8Array(this.value) });
  }
  toHex(): `0x${string}` {
    return `0x${bufferToHex(this.value)}`;
  }
  toUnprefixedHex(): string {
    return bufferToHex(this.value);
  }

  get length(): number {
    return 32;
  }

  static constant(value: Byteish): Bytes32 {
    return new Bytes32({ value: normalizeToUint8Array(value) });
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    if ("value" in that && that.value instanceof Uint8Array) {
      return uint8ArrayEquals(this.value, that.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}

/**
 * Fixed-size byte array of exactly 64 bytes
 */
export class Bytes64 extends Schema.TaggedClass<Bytes64>("Bytes64")("Bytes64", {
  value: Schema.instanceOf(Uint8Array),
}) {
  static readonly LENGTH = 64;

  constructor({ value }: { value: Uint8Array }) {
    super({ value: padBuffer(value, 64) });
  }

  static zero(): Bytes64 {
    return new Bytes64({ value: new Uint8Array(64) });
  }

  clone(): Bytes64 {
    return new Bytes64({ value: new Uint8Array(this.value) });
  }
  toHex(): `0x${string}` {
    return `0x${bufferToHex(this.value)}`;
  }
  toUnprefixedHex(): string {
    return bufferToHex(this.value);
  }

  static constant(value: Byteish): Bytes64 {
    return new Bytes64({ value: normalizeToUint8Array(value) });
  }
  get length(): number {
    return 64;
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    if ("value" in that && that.value instanceof Uint8Array) {
      return uint8ArrayEquals(this.value, that.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}

/**
 * Fixed-size byte array of exactly 256 bytes (bloom filters)
 */
export class Bytes256 extends Schema.TaggedClass<Bytes256>("Bytes256")(
  "Bytes256",
  {
    value: Schema.instanceOf(Uint8Array),
  },
) {
  static readonly LENGTH = 256;

  constructor({ value }: { value: Uint8Array }) {
    super({ value: padBuffer(value, 256) });
  }

  static zero(): Bytes256 {
    return new Bytes256({ value: new Uint8Array(256) });
  }

  clone(): Bytes256 {
    return new Bytes256({ value: new Uint8Array(this.value) });
  }

  toHex(): `0x${string}` {
    return `0x${bufferToHex(this.value)}`;
  }
  toUnprefixedHex(): string {
    return bufferToHex(this.value);
  }
  static constant(value: Byteish): Bytes256 {
    return new Bytes256({ value: normalizeToUint8Array(value) });
  }
  get length(): number {
    return 256;
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    if ("value" in that && that.value instanceof Uint8Array) {
      return uint8ArrayEquals(this.value, that.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}

// Type for any bytes type
export type AnyBytes =
  | Bytes
  | Bytes0
  | Bytes1
  | Bytes4
  | Bytes8
  | Bytes20
  | Bytes32
  | Bytes64
  | Bytes256;

// ============================================================================
// BYTES OPERATIONS
// ============================================================================

/**
 * Concatenate two byte arrays
 */
export function concat(a: AnyBytes, b: AnyBytes): Bytes {
  const result = new Uint8Array(a.value.length + b.value.length);
  result.set(a.value, 0);
  result.set(b.value, a.value.length);
  return new Bytes({ value: result });
}

/**
 * Slice bytes
 */
export function slice(bytes: AnyBytes, start: number, end?: number): Bytes {
  return new Bytes({ value: bytes.value.slice(start, end) });
}

/**
 * Parse hex string to bytes
 */
export function fromHex(
  hex: string,
  targetLength?: number,
): Either.Either<Bytes, EvmTypeError> {
  return Either.try({
    try: () => {
      const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;

      if (cleaned.length % 2 !== 0) {
        throw new EvmTypeError({
          message: "Hex string must have even length",
          input: hex,
        });
      }

      if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
        throw new EvmTypeError({
          message: "Invalid hex string: contains non-hex characters",
          input: hex,
        });
      }

      const bytes = new Uint8Array(cleaned.length / 2);
      for (let i = 0; i < cleaned.length; i += 2) {
        bytes[i / 2] = Number.parseInt(cleaned.slice(i, i + 2), 16);
      }

      // Pad if target length specified
      if (targetLength !== undefined) {
        if (bytes.length > targetLength) {
          throw new EvmTypeError({
            message: `Hex string too long: expected ${targetLength} bytes, got ${bytes.length}`,
            input: hex,
          });
        }
        if (bytes.length < targetLength) {
          const padded = new Uint8Array(targetLength);
          padded.set(bytes, targetLength - bytes.length); // left-pad
          return new Bytes({ value: padded });
        }
      }

      return new Bytes({ value: bytes });
    },
    catch: (error) => {
      if (error instanceof EvmTypeError) {
        return error;
      }
      return new EvmTypeError({
        message: `Failed to parse hex string: ${String(error)}`,
        input: hex,
      });
    },
  });
}

/**
 * Convert bytes to hex string with 0x prefix
 */
export function toHex(bytes: AnyBytes): string {
  const hex = Array.from(bytes.value)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}

/**
 * Check if two byte arrays are equal
 */
export function equals(a: AnyBytes, b: AnyBytes): boolean {
  if (a.value.length !== b.value.length) {
    return false;
  }

  for (let i = 0; i < a.value.length; i++) {
    if (a.value[i] !== b.value[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Clone/deep copy bytes (creates a new Uint8Array with the same content)
 */
export function cloneBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

/**
 * Pad bytes to specified length
 * @param bytes - Bytes to pad
 * @param length - Target length
 * @param left - If true, left-pad with zeros; if false, right-pad with zeros
 */
export function pad(bytes: AnyBytes, length: number, left = true): Bytes {
  if (bytes.value.length >= length) {
    return new Bytes({ value: bytes.value.slice(0, length) });
  }

  const padded = new Uint8Array(length);
  if (left) {
    padded.set(bytes.value, length - bytes.value.length);
  } else {
    padded.set(bytes.value, 0);
  }

  return new Bytes({ value: padded });
}

/**
 * Extract a slice from data and pad with zeros on the right if needed.
 *
 * Reading past the end of the input reads virtual zeros (as per EVM spec).
 * This is useful for precompiles and other operations that need to handle
 * input data that may be shorter than expected.
 *
 * @param data - Source data to extract from
 * @param start - Start index
 * @param length - Number of bytes to extract
 * @returns Uint8Array of specified length, zero-padded if necessary
 *
 * @example
 * ```typescript
 * const data = new Uint8Array([1, 2, 3]);
 * extractAndPad(data, 0, 5);  // [1, 2, 3, 0, 0]
 * extractAndPad(data, 2, 3);  // [3, 0, 0]
 * extractAndPad(data, 5, 2);  // [0, 0]
 * ```
 */
export function extractAndPad(
  data: Uint8Array,
  start: number,
  length: number,
): Uint8Array {
  const result = new Uint8Array(length);
  const available = Math.max(0, data.length - start);
  const toCopy = Math.min(length, available);
  if (toCopy > 0) {
    result.set(data.subarray(start, start + toCopy), 0);
  }
  return result;
}

export const isBytes = (value: unknown): value is AnyBytes => {
  return (
    value instanceof Bytes ||
    value instanceof Bytes0 ||
    value instanceof Bytes1 ||
    value instanceof Bytes4 ||
    value instanceof Bytes8 ||
    value instanceof Bytes20 ||
    value instanceof Bytes32 ||
    value instanceof Bytes64 ||
    value instanceof Bytes256
  );
};

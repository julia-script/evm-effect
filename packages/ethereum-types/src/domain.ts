/**
 * Domain types for Ethereum
 *
 * These are the core types specific to Ethereum that are built on top of
 * the primitive types (Bytes, U256, etc.)
 */

import { bufferFromHex, bufferToHex } from "@evm-effect/shared/bytes";
import { Effect, Equal, Hash, Result, Schema } from "effect";
import type { Bytes32 } from "./bytes.js";
import { Bytes, Bytes20, type Bytes256 } from "./bytes.js";
import { EvmTypeError } from "./exceptions.js";
import {
  type Byteish,
  hash,
  normalizeToUint8Array,
  uint8ArrayEquals,
} from "./utils.js";

/**
 * Ethereum address (20 bytes)
 */
export class Address extends Schema.TaggedClass<Address>("Address")("Address", {
  value: Bytes20,
}) {
  constructor(
    value:
      | Bytes20
      | string
      | { value: Uint8Array }
      | { value: Bytes20 }
      | Uint8Array,
  ) {
    if (value instanceof Bytes20) {
      super({ value: value });
      return;
    }
    if (typeof value === "string") {
      super({ value: new Bytes20({ value: bufferFromHex(value) }) });
      return;
    }
    if (value instanceof Uint8Array) {
      super({ value: new Bytes20({ value: value }) });
      return;
    }
    if (value.value instanceof Uint8Array) {
      super({ value: new Bytes20({ value: value.value }) });
      return;
    }

    super({ value: value.value });
  }
  /**
   * Create an address from a Bytes20
   */
  static fromBytes20(bytes: Bytes20): Address {
    return new Address({ value: bytes });
  }

  /**
   * Create an address from raw bytes (must be exactly 20 bytes)
   */
  static fromBytes(bytes: Uint8Array): Result.Result<Address, EvmTypeError> {
    if (bytes.length !== 20) {
      return Result.fail(
        new EvmTypeError({
          message: `Address must be exactly 20 bytes, got ${bytes.length}`,
        }),
      );
    }
    return Result.succeed(
      new Address({ value: new Bytes20({ value: bytes }) }),
    );
  }
  static unsafe(hex: string): Address {
    return new Address({ value: new Bytes20({ value: bufferFromHex(hex) }) });
  }
  get bytes(): Uint8Array {
    return this.value.value;
  }

  /**
   * Create an address from a hex string
   */
  static fromHex(hex: string): Effect.Effect<Address, EvmTypeError> {
    const bytesResult = Bytes.fromHex(hex);
    if (Result.isFailure(bytesResult)) {
      return Effect.fail(bytesResult.failure);
    }
    const bytes = bytesResult.success;
    if (bytes.value.length !== 20) {
      return Effect.fail(
        new EvmTypeError({
          message: `Address must be exactly 20 bytes, got ${bytes.value.length}`,
        }),
      );
    }
    return Effect.succeed(
      new Address({ value: new Bytes20({ value: bytes.value }) }),
    );
  }

  /**
   * Create a zero address (0x0000...0000)
   */
  static zero = new Address({ value: Bytes20.zero });
  toHex(): `0x${string}` {
    return bufferToHex(this.value.value);
  }
  static constant(value: Byteish): Address {
    return new Address({
      value: new Bytes20({ value: normalizeToUint8Array(value) }),
    });
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    if (!(that instanceof Address)) {
      return false;
    }
    if ("value" in that) {
      return uint8ArrayEquals(this.value.value, that.value.value);
    }
    return false;
  }
  [Hash.symbol](): number {
    return hash(this.value.value);
  }
}

/**
 * Merkle tree root hash (32 bytes)
 */
export type Root = Bytes32;

/**
 * Hash32 is a 32-byte hash (keccak256 output)
 */
export type Hash32 = Bytes32;

/**
 * VersionedHash is a 32-byte versioned hash for blobs (EIP-4844)
 */
export type VersionedHash = Bytes32;

/**
 * Bloom is a 256-byte bloom filter for logs
 */
export type Bloom = Bytes256;

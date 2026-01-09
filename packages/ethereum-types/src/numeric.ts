import { Effect, Either, Equal, Hash, Match, Schema } from "effect";
import { EvmTypeError } from "./exceptions.js";

const wrap = (value: bigint, byteLength: bigint) => {
  return (value % 2n ** (byteLength * 8n)) & (2n ** (byteLength * 8n) - 1n);
};
// }
export class U8 extends Schema.TaggedClass<U8>("U8")(
  "U8",
  {
    value: Schema.BigIntFromSelf,
  },
  {
    pretty:
      () =>
      (self: U8): string =>
        `${self._tag}(${self.value})`,
  },
) {
  static MAX_VALUE = 2n ** 8n - 1n;

  constructor({ value }: { value: bigint }) {
    super({ value: wrap(value, 1n) });
  }
  clone(): U8 {
    return new U8({ value: this.value });
  }
  static from(input: Uintish): Either.Either<U8, EvmTypeError> {
    return Either.flatMap(Uint.from(input), (value) =>
      U8.fromBigInt(value.value),
    );
  }
  static fromEffect<E, R>(input: Effect.Effect<Uintish, E, R>) {
    return input.pipe(Effect.flatMap(U8.from));
  }

  static fromNumber(input: number): Either.Either<U8, EvmTypeError> {
    if (input < 0 || input > U8.MAX_VALUE) {
      return Either.left(
        new EvmTypeError({
          message: `U8 value ${input} is out of range`,
          input,
        }),
      );
    }
    return Either.right(new U8({ value: BigInt(input) }));
  }

  static fromBigInt(input: bigint): Either.Either<U8, EvmTypeError> {
    if (input < 0n || input > U8.MAX_VALUE) {
      return Either.left(
        new EvmTypeError({
          message: `U8 value ${input} is out of range`,
          input,
        }),
      );
    }
    return Either.right(new U8({ value: input }));
  }
  static zero = U8.fromBigInt(0n);
}

export class U64 extends Schema.TaggedClass<U64>("U64")(
  "U64",
  {
    value: Schema.BigInt,
  },
  {
    pretty:
      () =>
      (self: U64): string =>
        `${self._tag}(${self.value})`,
  },
) {
  static MAX_VALUE = 2n ** 64n - 1n;
  constructor({ value }: { value: bigint }) {
    super({ value: wrap(value, 8n) });
  }

  clone(): U64 {
    return new U64({ value: this.value });
  }
  static from(input: Uintish): Either.Either<U64, EvmTypeError> {
    return Either.flatMap(Uint.from(input), (value) =>
      U64.fromBigInt(value.value),
    );
  }
  static fromEffect<E, R>(input: Effect.Effect<Uintish, E, R>) {
    return input.pipe(Effect.flatMap(U64.from));
  }
  static fromNumber(input: number): Either.Either<U64, EvmTypeError> {
    if (input < 0 || input > U64.MAX_VALUE) {
      return Either.left(
        new EvmTypeError({
          message: `U64 value ${input} is out of range`,
          input,
        }),
      );
    }
    return Either.right(new U64({ value: BigInt(input) }));
  }
  static fromBigInt(input: bigint): Either.Either<U64, EvmTypeError> {
    if (input < 0n || input > U64.MAX_VALUE) {
      return Either.left(
        new EvmTypeError({
          message: `U64 value ${input} is out of range`,
          input,
        }),
      );
    }
    return Either.right(new U64({ value: input }));
  }
  static zero = U64.fromBigInt(0n);
}

export class U256 extends Schema.TaggedClass<U256>("U256")(
  "U256",
  {
    value: Schema.BigIntFromSelf,
  },
  {
    pretty:
      () =>
      (self: U256): string =>
        `${self._tag}(${self.value})`,
  },
) {
  static MAX_VALUE = 2n ** 256n - 1n;
  constructor(value: { value: bigint } | bigint) {
    const bn = typeof value === "bigint" ? value : value.value;
    super({ value: wrap(bn, 32n) });
  }

  clone(): U256 {
    return new U256({ value: this.value });
  }

  [Equal.symbol](that: Equal.Equal): boolean {
    if (!(that instanceof U256)) {
      return false;
    }
    return this.value === that.value;
  }

  [Hash.symbol](): number {
    return Number(this.value & 0xffffffffn);
  }

  static from(input: Uintish): Either.Either<U256, EvmTypeError> {
    return Either.flatMap(Uint.from(input), (value) =>
      U256.fromBigInt(value.value),
    );
  }
  static fromEffect<E, R>(input: Effect.Effect<Uintish, E, R>) {
    return input.pipe(Effect.flatMap(U256.from));
  }
  static fromNumber(input: number): Either.Either<U256, EvmTypeError> {
    if (input < 0 || input > U256.MAX_VALUE) {
      return Either.left(
        new EvmTypeError({
          message: `U256 value ${input} is out of range`,
          input,
        }),
      );
    }
    return Either.right(new U256({ value: BigInt(input) }));
  }
  static fromBigInt(input: bigint): Either.Either<U256, EvmTypeError> {
    if (input < 0n || input > U256.MAX_VALUE) {
      return Either.left(
        new EvmTypeError({
          message: `U256 value ${input} is out of range`,
          input,
        }),
      );
    }
    return Either.right(new U256({ value: input }));
  }
  static zero = U256.fromBigInt(0n);

  /**
   * Wrapping add - returns (self + right) mod 2^256
   */
  wrapping_add(right: U256): U256 {
    return new U256({ value: (this.value + right.value) & U256.MAX_VALUE });
  }

  /**
   * Wrapping sub - returns (self - right) mod 2^256
   */
  wrapping_sub(right: U256): U256 {
    return new U256({ value: (this.value - right.value) & U256.MAX_VALUE });
  }

  /**
   * Wrapping mul - returns (self * right) mod 2^256
   */
  wrapping_mul(right: U256): U256 {
    return new U256({ value: (this.value * right.value) & U256.MAX_VALUE });
  }

  /**
   * Division - returns self / right (truncated)
   */
  div(right: U256): U256 {
    return new U256({ value: this.value / right.value });
  }

  /**
   * Modulo - returns self % right
   */
  mod(right: U256): U256 {
    return new U256({ value: this.value % right.value });
  }

  /**
   * Convert to signed integer using two's complement
   */
  toSigned(): bigint {
    const bits = 256;
    if (this.value.toString(2).length < bits) {
      // Sign bit is 0, positive number
      return this.value;
    }
    // Negative number: -1 * (2's complement of value)
    return this.value - (U256.MAX_VALUE + 1n);
  }

  /**
   * Create from signed integer using two's complement
   */
  static fromSigned(value: bigint): U256 {
    const halfMax = U256.MAX_VALUE / 2n + 1n;

    if (value >= halfMax) {
      throw new Error(`Signed value ${value} is too large`);
    }

    if (value >= 0n) {
      return new U256({ value });
    }

    if (value < -halfMax) {
      throw new Error(`Signed value ${value} is too small`);
    }

    return new U256({ value: value & U256.MAX_VALUE });
  }

  /**
   * Convert to 32-byte big-endian representation
   */
  toBeBytes32() {
    const bytes = new Uint8Array(32);
    let v = this.value;
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(v & 0xffn);
      v = v >> 8n;
    }
    return new Bytes32({ value: bytes });
  }

  /**
   * Create from big-endian bytes
   */
  static fromBeBytes(bytes: Uint8Array | ArrayLike<number>): U256 {
    let value = 0n;
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) | BigInt(bytes[i]);
    }
    return new U256({ value });
  }

  /**
   * Bitwise AND
   */
  bitwiseAnd(right: U256): U256 {
    return new U256({ value: this.value & right.value });
  }

  /**
   * Bitwise OR
   */
  bitwiseOr(right: U256): U256 {
    return new U256({ value: this.value | right.value });
  }

  /**
   * Bitwise XOR
   */
  bitwiseXor(right: U256): U256 {
    return new U256({ value: this.value ^ right.value });
  }

  /**
   * Bitwise NOT
   */
  bitwiseNot(): U256 {
    return new U256({ value: ~this.value & U256.MAX_VALUE });
  }

  /**
   * Left shift
   */
  leftShift(shift: bigint): U256 {
    if (shift >= 256n) {
      return new U256({ value: 0n });
    }
    return new U256({ value: (this.value << shift) & U256.MAX_VALUE });
  }

  /**
   * Right shift (logical)
   */
  rightShift(shift: bigint): U256 {
    if (shift >= 256n) {
      return new U256({ value: 0n });
    }
    return new U256({ value: this.value >> shift });
  }

  /**
   * Arithmetic right shift (sign-extending)
   */
  arithmeticRightShift(shift: bigint): U256 {
    const signedValue = this.toSigned();

    if (shift >= 256n) {
      if (signedValue >= 0n) {
        return new U256({ value: 0n });
      }
      return new U256({ value: U256.MAX_VALUE });
    }

    return U256.fromSigned(signedValue >> shift);
  }

  /**
   * Get the bit length of the value
   */
  bitLength(): bigint {
    if (this.value === 0n) {
      return 0n;
    }
    return BigInt(this.value.toString(2).length);
  }
}

type Uintish = bigint | number | U256 | U64 | U8 | Uint;
export class Uint extends Schema.TaggedClass<Uint>("Uint")(
  "Uint",
  {
    value: Schema.BigIntFromSelf,
  },
  {
    pretty:
      () =>
      (self: Uint): string =>
        `${self._tag}(${self.value})`,
  },
) {
  constructor({ value }: { value: bigint }) {
    super({ value: value < 0n ? 0n : value });
  }
  clone(): Uint {
    return new Uint({ value: this.value });
  }

  static from(input: Uintish): Either.Either<Uint, EvmTypeError> {
    return Match.value(input).pipe(
      Match.when(Match.number, (value) => Uint.fromNumber(value)),
      Match.when(Match.bigint, (value) => Uint.fromBigInt(value)),
      Match.tag("U256", (value) => Uint.fromBigInt(value.value)),
      Match.tag("U64", (value) => Uint.fromBigInt(value.value)),
      Match.tag("U8", (value) => Uint.fromBigInt(value.value)),
      Match.tag("Uint", (value) => Uint.fromBigInt(value.value)),

      Match.exhaustive,
    );
  }

  static fromEffect<E, R>(input: Effect.Effect<Uintish, E, R>) {
    return input.pipe(Effect.flatMap(Uint.from));
  }
  static fromNumber(input: number): Either.Either<Uint, EvmTypeError> {
    if (input < 0) {
      return Either.left(
        new EvmTypeError({
          message: `Uint value ${input} is out of range`,
          input,
        }),
      );
    }
    return Either.right(new Uint({ value: BigInt(input) }));
  }
  static fromBigInt(input: bigint): Either.Either<Uint, EvmTypeError> {
    if (input < 0n) {
      return Either.left(
        new EvmTypeError({
          message: `Uint value ${input} is out of range`,
          input,
        }),
      );
    }
    return Either.right(new Uint({ value: input }));
  }

  static fromBeBytes(bytes: Uint8Array | ArrayLike<number>): Uint {
    let value = 0n;
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) | BigInt(bytes[i]);
    }
    return new Uint({ value: value });
  }
  static fromLeBytes(bytes: Uint8Array | ArrayLike<number>): Uint {
    let value = 0n;
    for (let i = bytes.length - 1; i >= 0; i--) {
      value = (value << 8n) | BigInt(bytes[i]);
    }
    return new Uint({ value: value });
  }
  static zero = Uint.fromBigInt(0n);
}
export type AnyUintClass = typeof U256 | typeof U64 | typeof U8 | typeof Uint;
export type AnyUint = U256 | U64 | U8 | Uint;
export type FixedUnsigned = U256 | U64 | U8;

const CLASS_BY_TAG = {
  U256: U256,
  U64: U64,
  U8: U8,
  Uint: Uint,
} as const;

// ============================================================================
// ARITHMETIC OPERATIONS
// ============================================================================

/**
 * Checked addition - returns Either.left on overflow
 */
export function add<T extends FixedUnsigned>(
  a: T,
  b: T,
): Either.Either<T, EvmTypeError> {
  const CLASS = CLASS_BY_TAG[a._tag];
  const result = a.value + b.value;

  if (result > CLASS.MAX_VALUE) {
    return Either.left(
      new EvmTypeError({
        message: `${a._tag} addition overflow: ${a.value} + ${b.value}`,
        input: { a: a.value, b: b.value },
      }),
    );
  }

  return Either.right(new CLASS({ value: result }) as T);
}

/**
 * Wrapping addition - wraps on overflow (EVM semantics)
 */
export function addWrap<T extends FixedUnsigned>(a: T, b: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  const MOD = CLASS.MAX_VALUE + 1n;
  const result = (a.value + b.value) % MOD;
  return new CLASS({ value: result }) as T;
}

/**
 * Checked subtraction - returns Either.left on underflow
 */
export function sub<T extends FixedUnsigned>(
  a: T,
  b: T,
): Either.Either<T, EvmTypeError> {
  const CLASS = CLASS_BY_TAG[a._tag];

  if (a.value < b.value) {
    return Either.left(
      new EvmTypeError({
        message: `${a._tag} subtraction underflow: ${a.value} - ${b.value}`,
        input: { a: a.value, b: b.value },
      }),
    );
  }

  return Either.right(new CLASS({ value: a.value - b.value }) as T);
}

/**
 * Wrapping subtraction - wraps on underflow (EVM semantics)
 */
export function subWrap<T extends FixedUnsigned>(a: T, b: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  const MOD = CLASS.MAX_VALUE + 1n;
  const result = (a.value - b.value + MOD) % MOD;
  return new CLASS({ value: result }) as T;
}

/**
 * Checked multiplication - returns Either.left on overflow
 */
export function mul<T extends FixedUnsigned>(
  a: T,
  b: T,
): Either.Either<T, EvmTypeError> {
  const CLASS = CLASS_BY_TAG[a._tag];
  const result = a.value * b.value;

  if (result > CLASS.MAX_VALUE) {
    return Either.left(
      new EvmTypeError({
        message: `${a._tag} multiplication overflow: ${a.value} * ${b.value}`,
        input: { a: a.value, b: b.value },
      }),
    );
  }

  return Either.right(new CLASS({ value: result }) as T);
}

/**
 * Wrapping multiplication - wraps on overflow (EVM semantics)
 */
export function mulWrap<T extends FixedUnsigned>(a: T, b: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  const MOD = CLASS.MAX_VALUE + 1n;
  const result = (a.value * b.value) % MOD;
  return new CLASS({ value: result }) as T;
}

/**
 * Division - returns 0 on division by zero (EVM semantics)
 */
export function div<T extends FixedUnsigned>(a: T, b: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];

  if (b.value === 0n) {
    return new CLASS({ value: 0n }) as T;
  }

  return new CLASS({ value: a.value / b.value }) as T;
}

/**
 * Modulo - returns 0 on modulo by zero (EVM semantics)
 */
export function mod<T extends FixedUnsigned>(a: T, b: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];

  if (b.value === 0n) {
    return new CLASS({ value: 0n }) as T;
  }

  return new CLASS({ value: a.value % b.value }) as T;
}

/**
 * Exponentiation - wraps on overflow
 */
export function _pow<T extends FixedUnsigned>(a: T, b: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  const MOD = CLASS.MAX_VALUE + 1n;

  if (b.value === 0n) {
    // x^0 = 1, but must apply modulo: 1 % MOD
    return new CLASS({ value: 1n % MOD }) as T;
  }

  // Use modular exponentiation to avoid overflow
  let base = a.value;
  let exp = b.value;
  let result = 1n;

  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % MOD;
    }
    base = (base * base) % MOD;
    exp = exp / 2n;
  }

  return new CLASS({ value: result }) as T;
}
export const pow: {
  <T extends FixedUnsigned>(a: T, b: T): T;
  <T extends FixedUnsigned>(b: T): (a: T) => T;
} = function () {
  if (arguments.length === 1) {
    return (a) => _pow(a, arguments[0]);
  }
  return _pow(arguments[0], arguments[1]);
};

/**
 * Wrapping exponentiation with optional modulo (for fixed-size types)
 */
export function wrappingPow<T extends FixedUnsigned>(a: T, b: T, modulo?: T): T;

/**
 * Wrapping exponentiation with required modulo (for arbitrary-precision Uint)
 */
export function wrappingPow(a: Uint, b: Uint, modulo: Uint): Uint;

export function wrappingPow<T extends AnyUint>(a: T, b: T, modulo?: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];

  // For Uint (arbitrary precision), modulo is required
  if (a._tag === "Uint" && !modulo) {
    throw new Error(
      "wrappingPow: modulo is required for Uint (arbitrary precision)",
    );
  }

  let MOD: bigint;
  if (modulo) {
    MOD = modulo.value;
  } else if (a._tag === "Uint") {
    // This should never happen due to check above, but TypeScript needs it
    throw new Error("wrappingPow: modulo is required for Uint");
  } else {
    // For fixed-size types, use their MAX_VALUE
    const FixedClass = CLASS as typeof U256 | typeof U64 | typeof U8;
    MOD = FixedClass.MAX_VALUE + 1n;
  }

  if (b.value === 0n) {
    // x^0 = 1, but must apply modulo: 1 % MOD
    return new CLASS({ value: 1n % MOD }) as T;
  }

  let base = a.value;
  let exp = b.value;
  let result = 1n;

  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % MOD;
    }
    base = (base * base) % MOD;
    exp = exp / 2n;
  }

  return new CLASS({ value: result }) as T;
}

// ============================================================================
// BITWISE OPERATIONS
// ============================================================================

/**
 * Bitwise AND
 */
export function and<T extends FixedUnsigned>(a: T, b: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  return new CLASS({ value: a.value & b.value }) as T;
}

/**
 * Bitwise OR
 */
export function or<T extends FixedUnsigned>(a: T, b: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  return new CLASS({ value: a.value | b.value }) as T;
}

/**
 * Bitwise XOR
 */
export function xor<T extends FixedUnsigned>(a: T, b: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  return new CLASS({ value: a.value ^ b.value }) as T;
}

/**
 * Bitwise NOT
 */
export function not<T extends FixedUnsigned>(a: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  return new CLASS({ value: CLASS.MAX_VALUE - a.value }) as T;
}

/**
 * Left shift - returns 0 if shift >= bit length
 */
export function shl<T extends FixedUnsigned>(a: T, shift: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  const bitLen = BIT_LENGTH_BY_TAG[a._tag];

  if (shift.value >= BigInt(bitLen)) {
    return new CLASS({ value: 0n }) as T;
  }

  const MOD = CLASS.MAX_VALUE + 1n;
  const result = (a.value << shift.value) % MOD;
  return new CLASS({ value: result }) as T;
}

/**
 * Right shift - returns 0 if shift >= bit length
 */
export function shr<T extends FixedUnsigned>(a: T, shift: T): T {
  const CLASS = CLASS_BY_TAG[a._tag];
  const bitLen = BIT_LENGTH_BY_TAG[a._tag];

  if (shift.value >= BigInt(bitLen)) {
    return new CLASS({ value: 0n }) as T;
  }

  const result = a.value >> shift.value;
  return new CLASS({ value: result }) as T;
}

// ============================================================================
// COMPARISON OPERATIONS
// ============================================================================

/**
 * Less than
 */
export function lt<T extends FixedUnsigned>(a: T, b: T): boolean {
  return a.value < b.value;
}

/**
 * Greater than
 */
export function gt<T extends FixedUnsigned>(a: T, b: T): boolean {
  return a.value > b.value;
}

/**
 * Less than or equal
 */
export function lte<T extends FixedUnsigned>(a: T, b: T): boolean {
  return a.value <= b.value;
}

/**
 * Greater than or equal
 */
export function gte<T extends FixedUnsigned>(a: T, b: T): boolean {
  return a.value >= b.value;
}

/**
 * Equal
 */
export function eq<T extends FixedUnsigned>(a: T, b: T): boolean {
  return a.value === b.value;
}

/**
 * Is zero
 */
export function isZero<T extends FixedUnsigned>(a: T): boolean {
  return a.value === 0n;
}

// ============================================================================
// CONVERSION OPERATIONS
// ============================================================================

// Import bytes types (will be available after bytes.ts is created)
import { type AnyBytes, Bytes32 } from "./bytes.js";

/**
 * Convert to native bigint
 */
export function toBigInt<T extends AnyUint>(a: T): bigint {
  return a.value;
}

/**
 * Convert to number - returns Either.left if value exceeds Number.MAX_SAFE_INTEGER
 */
export function toNumber<T extends AnyUint>(
  a: T,
): Either.Either<number, EvmTypeError> {
  if (a.value > BigInt(Number.MAX_SAFE_INTEGER)) {
    return Either.left(
      new EvmTypeError({
        message: `Value ${a.value} exceeds Number.MAX_SAFE_INTEGER`,
        input: a.value,
      }),
    );
  }
  return Either.right(Number(a.value));
}

// ============================================================================
// NUMERIC <-> BYTES CONVERSIONS
// ============================================================================

// Re-export from conversions.ts to avoid circular dependencies
export {
  toBeBytes,
  toBeBytes4,
  toBeBytes8,
  toBeBytes32,
  toBeBytes64,
  toBytes1,
  toBytes32,
  toLeBytes4,
  toLeBytes8,
} from "./conversions.js";

/**
 * Create numeric from big-endian bytes
 */
export function fromBeBytes<T extends AnyUintClass>(
  bytes: AnyBytes,
  targetClass: T,
): Either.Either<InstanceType<T>, EvmTypeError> {
  let result = 0n;
  for (let i = 0; i < bytes.value.length; i++) {
    result = (result << 8n) | BigInt(bytes.value[i]);
  }

  if ("MAX_VALUE" in targetClass) {
    // Validate against target class MAX_VALUE
    const maxValue = targetClass.MAX_VALUE;
    if (maxValue !== undefined && result > maxValue) {
      return Either.left(
        new EvmTypeError({
          message: `Value ${result} exceeds ${targetClass.name}.MAX_VALUE`,
          input: bytes.value,
        }),
      );
    }
  }
  return Either.right(new targetClass({ value: result }) as InstanceType<T>);
}

/**
 * Create numeric from little-endian bytes
 */
export function fromLeBytes<T extends FixedUnsigned>(
  bytes: AnyBytes,
  targetClass: typeof U256 | typeof U64 | typeof U8,
): Either.Either<T, EvmTypeError> {
  let result = 0n;
  for (let i = bytes.value.length - 1; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes.value[i]);
  }
  const maxValue = targetClass.MAX_VALUE;
  if (result > maxValue) {
    return Either.left(
      new EvmTypeError({
        message: `Value ${result} exceeds ${targetClass.name}.MAX_VALUE`,
        input: bytes.value,
      }),
    );
  }

  return Either.right(new targetClass({ value: result }) as T);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export class Int extends Schema.TaggedClass<Int>("Int")(
  "Int",
  {
    value: Schema.BigInt,
  },
  {
    pretty:
      () =>
      (self: Int): string =>
        `${self._tag}(${self.value})`,
  },
) {
  // static fromBytes(bytes: AnyBytes, littleEndian: boolean = false): Int {
  //   let step = littleEndian ? -1 : 1;
  //   let index = littleEndian ? bytes.value.length - 1 : 0;
  //   let result = 0n;
  //   while (index >= 0 && index < bytes.value.length) {
  //     result = (result << 8n) | BigInt(bytes.value[index]);
  //     index += step;
  //   }
  //   return new Int({ value: result });
  // }
}

const BIT_LENGTH_BY_TAG = {
  U256: 256,
  U64: 64,
  U8: 8,
} as const;

/**
 * Get the bit length of a fixed unsigned integer type
 */
export function bitLength<T extends FixedUnsigned>(a: T): number {
  return BIT_LENGTH_BY_TAG[a._tag];
}

/**
 * Convert to signed integer (two's complement)
 * TODO: Implement when needed
 */
export function toSigned<T extends FixedUnsigned>(a: T): bigint {
  const bitLen = bitLength(a);
  const signBit = 1n << BigInt(bitLen - 1);

  if (a.value >= signBit) {
    // Negative in two's complement
    return a.value - (1n << BigInt(bitLen));
  }

  return a.value;
}

/**
 * Get length of array/bytes as Uint
 */
export function ulen(
  value: Uint8Array | unknown[],
): Either.Either<Uint, EvmTypeError> {
  return Uint.fromBigInt(BigInt(value.length));
}

export function isUnsignedInt(value: unknown): value is AnyUint {
  return (
    value instanceof U256 ||
    value instanceof U64 ||
    value instanceof U8 ||
    value instanceof Uint
  );
}

export function ceil32(value: Uint): Uint {
  const ceiling = 32n;
  const remainder = value.value % ceiling;
  if (remainder === 0n) {
    return value;
  }
  return new Uint({ value: value.value + ceiling - remainder });
}

export const min = <T extends AnyUint>(a: T, b: T): T => {
  return a.value < b.value ? a : b;
};

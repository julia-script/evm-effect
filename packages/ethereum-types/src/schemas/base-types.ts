import { bufferFromHex, bufferToHex } from "@evm-effect/shared/bytes";
import {
  Effect,
  Option,
  Result,
  Schema,
  SchemaGetter,
  SchemaIssue,
} from "effect";
import * as HashMap from "effect/HashMap";
import { Transformation } from "effect/SchemaTransformation";
import {
  Bytes,
  Bytes0,
  Bytes1,
  Bytes4,
  Bytes8,
  Bytes20,
  Bytes32,
  Bytes64,
  Bytes256,
} from "../bytes.js";
import { Address } from "../domain.js";
import { Int, U8, U32, U64, U256, Uint } from "../numeric.js";

namespace EthGetters {
  const HexRegex = /^(0x)?[0-9a-fA-F]*$/;
  export const hexFromString = SchemaGetter.transformOrFail<
    `0x${string}`,
    string
  >((v): Effect.Effect<`0x${string}`, SchemaIssue.Issue, never> => {
    const hex = v;
    if (!HexRegex.test(hex)) {
      return Effect.fail(
        new SchemaIssue.InvalidValue(Option.some(hex), {
          message: "Invalid hex string",
        }),
      );
    }
    if (hex.startsWith("0x")) {
      return Effect.succeed(hex as `0x${string}`);
    }
    return Effect.succeed(`0x${hex}` as `0x${string}`);
  });
  export const Uint8ArrayFromHex = SchemaGetter.transformOrFail<
    Uint8Array,
    `0x${string}`
  >((v) => {
    try {
      return Effect.succeed(bufferFromHex(v));
    } catch (error) {
      return Effect.fail(
        new SchemaIssue.InvalidValue(Option.some(v), {
          message: `Invalid hex string: ${error}`,
        }),
      );
    }
  });

  export const Uint8ArrayFromString = hexFromString.compose(Uint8ArrayFromHex);

  export const HexFromUint8Array = SchemaGetter.transform<
    `0x${string}`,
    Uint8Array
  >((v) => bufferToHex(v));

  export const BigIntFromHex = SchemaGetter.transformOrFail<
    bigint,
    `0x${string}`
  >((v) => {
    try {
      return Effect.succeed(BigInt(v));
    } catch (error) {
      return Effect.fail(
        new SchemaIssue.InvalidValue(Option.some(v), {
          message: `Invalid hex string: ${error}`,
        }),
      );
    }
  });
  export const BigIntFromString = hexFromString.compose(BigIntFromHex);
  export const HexFromBigInt = SchemaGetter.transform<`0x${string}`, bigint>(
    (v) => `0x${v.toString(16)}`,
  );

  export const maxLength = (length: number) =>
    SchemaGetter.transformOrFail<Uint8Array, Uint8Array>((v) => {
      if (v.length !== length) {
        return Effect.fail(
          new SchemaIssue.InvalidValue(Option.some(v), {
            message: `Invalid bytes length, expected ${length} bytes, got ${v.length} bytes`,
          }),
        );
      }
      return Effect.succeed(v);
    });

  export const minMaxValue = (min: bigint, max: bigint) =>
    SchemaGetter.transformOrFail<bigint, bigint>((v) => {
      if (v < min || v > max) {
        return Effect.fail(
          new SchemaIssue.InvalidValue(Option.some(v), {
            message: `Invalid value, expected ${min} to ${max}, got ${v.toString()}`,
          }),
        );
      }
      return Effect.succeed(v);
    });
}

// BigInt
export const bigintFromStringTransformation = new Transformation<
  bigint,
  string
>(EthGetters.BigIntFromString, EthGetters.HexFromBigInt);
export interface BigIntFromString
  extends Schema.decodeTo<Schema.BigInt, Schema.String> {
  readonly Rebuild: BigIntFromString;
}
export const BigIntFromString: BigIntFromString = Schema.String.annotate({
  expected: "a string that will be decoded as a bigint",
}).pipe(Schema.decodeTo(Schema.BigInt, bigintFromStringTransformation));

// HexString
export const HexString = Schema.TemplateLiteral([
  "0x",
  Schema.String.pipe(Schema.check(Schema.isPattern(/^[0-9a-fA-F]*$/))),
]);
export type HexString = (typeof HexString)["Type"];

export const hexFromStringTransformation = new Transformation<
  HexString,
  string
>(SchemaGetter.passthrough({ strict: false }), EthGetters.hexFromString);
export interface HexFromString
  extends Schema.decodeTo<typeof HexString, Schema.String> {
  readonly Rebuild: HexFromString;
}
export const HexFromString: HexFromString = Schema.String.annotate({
  expected: "a hex string that will be decoded as a `0x{string}`",
}).pipe(Schema.decodeTo(HexString, hexFromStringTransformation));

export const uint8ArrayFromStringTransformation = new Transformation<
  Uint8Array,
  string
>(EthGetters.Uint8ArrayFromString, EthGetters.HexFromUint8Array);

export interface Uint8ArrayFromString
  extends Schema.decodeTo<Schema.Uint8Array, Schema.String> {
  readonly Rebuild: Uint8ArrayFromString;
}
export const Uint8ArrayFromString: Uint8ArrayFromString =
  Schema.String.annotate({
    expected: "a string that will be decoded as a Uint8Array",
  }).pipe(
    Schema.decodeTo(Schema.Uint8Array, uint8ArrayFromStringTransformation),
  );

export const bytesFromStringTransformation = new Transformation<
  (typeof Bytes)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Bytes, Uint8Array>((v) => new Bytes({ value: v })),
  ),
  SchemaGetter.transform<Uint8Array, Bytes>((v) => v.value).compose(
    EthGetters.HexFromUint8Array,
  ),
);

export interface BytesFromString
  extends Schema.decodeTo<Schema.toType<typeof Bytes>, Schema.String> {
  readonly Rebuild: BytesFromString;
}
export const BytesFromString: BytesFromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Bytes",
}).pipe(Schema.decodeTo(Schema.toType(Bytes), bytesFromStringTransformation));

// Bytes0
export const bytes0FromStringTransformation = new Transformation<
  (typeof Bytes0)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Bytes0, Uint8Array>((v) => new Bytes0({ value: v })),
  ),
  SchemaGetter.transform<Uint8Array, Bytes0>((v) => v.value).compose(
    EthGetters.maxLength(0).compose(EthGetters.HexFromUint8Array),
  ),
);

export interface Bytes0FromString
  extends Schema.decodeTo<Schema.toType<typeof Bytes0>, Schema.String> {
  readonly Rebuild: Bytes0FromString;
}
export const Bytes0FromString: Bytes0FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Bytes0",
}).pipe(Schema.decodeTo(Schema.toType(Bytes0), bytes0FromStringTransformation));

// Bytes1
export const bytes1FromStringTransformation = new Transformation<
  (typeof Bytes1)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Bytes1, Uint8Array>((v) => new Bytes1({ value: v })),
  ),
  SchemaGetter.transform<Uint8Array, Bytes1>((v) => v.value).compose(
    EthGetters.maxLength(1).compose(EthGetters.HexFromUint8Array),
  ),
);

export interface Bytes1FromString
  extends Schema.decodeTo<Schema.toType<typeof Bytes1>, Schema.String> {
  readonly Rebuild: Bytes1FromString;
}
export const Bytes1FromString: Bytes1FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Bytes1",
}).pipe(Schema.decodeTo(Schema.toType(Bytes1), bytes1FromStringTransformation));

// Bytes4
export const bytes4FromStringTransformation = new Transformation<
  (typeof Bytes4)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Bytes4, Uint8Array>((v) => new Bytes4({ value: v })),
  ),
  SchemaGetter.transform<Uint8Array, Bytes4>((v) => v.value).compose(
    EthGetters.maxLength(4).compose(EthGetters.HexFromUint8Array),
  ),
);

export interface Bytes4FromString
  extends Schema.decodeTo<Schema.toType<typeof Bytes4>, Schema.String> {
  readonly Rebuild: Bytes4FromString;
}
export const Bytes4FromString: Bytes4FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Bytes4",
}).pipe(Schema.decodeTo(Schema.toType(Bytes4), bytes4FromStringTransformation));

// Bytes8
export const bytes8FromStringTransformation = new Transformation<
  (typeof Bytes8)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Bytes8, Uint8Array>((v) => new Bytes8({ value: v })),
  ),
  SchemaGetter.transform<Uint8Array, Bytes8>((v) => v.value).compose(
    EthGetters.maxLength(8).compose(EthGetters.HexFromUint8Array),
  ),
);

export interface Bytes8FromString
  extends Schema.decodeTo<Schema.toType<typeof Bytes8>, Schema.String> {
  readonly Rebuild: Bytes8FromString;
}
export const Bytes8FromString: Bytes8FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Bytes8",
}).pipe(Schema.decodeTo(Schema.toType(Bytes8), bytes8FromStringTransformation));

// Bytes20
export const bytes20FromStringTransformation = new Transformation<
  (typeof Bytes20)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Bytes20, Uint8Array>(
      (v) => new Bytes20({ value: v }),
    ),
  ),
  SchemaGetter.transform<Uint8Array, Bytes20>((v) => v.value).compose(
    EthGetters.maxLength(20).compose(EthGetters.HexFromUint8Array),
  ),
);
export interface Bytes20FromString
  extends Schema.decodeTo<Schema.toType<typeof Bytes20>, Schema.String> {
  readonly Rebuild: Bytes20FromString;
}
export const Bytes20FromString: Bytes20FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Bytes20",
}).pipe(
  Schema.decodeTo(Schema.toType(Bytes20), bytes20FromStringTransformation),
);

// Bytes32
export interface Bytes32FromString
  extends Schema.decodeTo<Schema.toType<typeof Bytes32>, Schema.String> {
  readonly Rebuild: Bytes32FromString;
}

const bytes32FromStringTransformation = new Transformation<
  (typeof Bytes32)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Bytes32, Uint8Array>(
      (v) => new Bytes32({ value: v }),
    ),
  ),
  SchemaGetter.transform<Uint8Array, Bytes32>((v) => v.value).compose(
    EthGetters.maxLength(32).compose(EthGetters.HexFromUint8Array),
  ),
);

export const Bytes32FromString: Bytes32FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Bytes32",
}).pipe(
  Schema.decodeTo(Schema.toType(Bytes32), bytes32FromStringTransformation),
);

// Bytes64
export const bytes64FromStringTransformation = new Transformation<
  (typeof Bytes64)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Bytes64, Uint8Array>(
      (v) => new Bytes64({ value: v }),
    ),
  ),
  SchemaGetter.transform<Uint8Array, Bytes64>((v) => v.value).compose(
    EthGetters.maxLength(64).compose(EthGetters.HexFromUint8Array),
  ),
);

export interface Bytes64FromString
  extends Schema.decodeTo<Schema.toType<typeof Bytes64>, Schema.String> {
  readonly Rebuild: Bytes64FromString;
}
export const Bytes64FromString: Bytes64FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Bytes64",
}).pipe(
  Schema.decodeTo(Schema.toType(Bytes64), bytes64FromStringTransformation),
);

// Bytes256
export const bytes256FromStringTransformation = new Transformation<
  (typeof Bytes256)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Bytes256, Uint8Array>(
      (v) => new Bytes256({ value: v }),
    ),
  ),
  SchemaGetter.transform<Uint8Array, Bytes256>((v) => v.value).compose(
    EthGetters.maxLength(256).compose(EthGetters.HexFromUint8Array),
  ),
);

export interface Bytes256FromString
  extends Schema.decodeTo<Schema.toType<typeof Bytes256>, Schema.String> {
  readonly Rebuild: Bytes256FromString;
}
export const Bytes256FromString: Bytes256FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Bytes256",
}).pipe(
  Schema.decodeTo(Schema.toType(Bytes256), bytes256FromStringTransformation),
);

// Address
export const addressFromStringTransformation = new Transformation<
  (typeof Address)["Type"],
  string
>(
  EthGetters.Uint8ArrayFromString.compose(
    SchemaGetter.transform<Address, Uint8Array>(
      (v) => new Address({ value: new Bytes20({ value: v }) }),
    ),
  ),
  SchemaGetter.transform<Uint8Array, Address>((v) => v.value.value).compose(
    EthGetters.maxLength(20).compose(EthGetters.HexFromUint8Array),
  ),
);

export interface AddressFromString
  extends Schema.decodeTo<Schema.toType<typeof Address>, Schema.String> {
  readonly Rebuild: AddressFromString;
}
export const AddressFromString: AddressFromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Address",
}).pipe(
  Schema.decodeTo(Schema.toType(Address), addressFromStringTransformation),
);

// Uint
export const uintFromStringTransformation = new Transformation<
  (typeof Uint)["Type"],
  string
>(
  EthGetters.BigIntFromString.compose(
    SchemaGetter.transform((v) => new Uint({ value: v })),
  ),
  SchemaGetter.transform<bigint, Uint>((v) => v.value).compose(
    EthGetters.HexFromBigInt,
  ),
);

export interface UintFromString
  extends Schema.decodeTo<Schema.toType<typeof Uint>, Schema.String> {
  readonly Rebuild: UintFromString;
}
export const UintFromString: UintFromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Uint",
}).pipe(Schema.decodeTo(Schema.toType(Uint), uintFromStringTransformation));

// U8
export const u8FromStringTransformation = new Transformation<
  (typeof U8)["Type"],
  string
>(
  EthGetters.BigIntFromString.compose(
    EthGetters.minMaxValue(0n, U8.MAX_VALUE),
  ).compose(SchemaGetter.transform((v) => new U8({ value: v }))),
  SchemaGetter.transform<bigint, U8>((v) => v.value).compose(
    EthGetters.HexFromBigInt,
  ),
);

export interface U8FromString
  extends Schema.decodeTo<Schema.toType<typeof U8>, Schema.String> {
  readonly Rebuild: U8FromString;
}
export const U8FromString: U8FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a U8",
}).pipe(Schema.decodeTo(Schema.toType(U8), u8FromStringTransformation));

// U32
export const u32FromStringTransformation = new Transformation<
  (typeof U32)["Type"],
  string
>(
  EthGetters.BigIntFromString.compose(
    EthGetters.minMaxValue(0n, U32.MAX_VALUE),
  ).compose(SchemaGetter.transform((v) => new U32({ value: v }))),
  SchemaGetter.transform<bigint, U32>((v) => v.value).compose(
    EthGetters.HexFromBigInt,
  ),
);

export interface U32FromString
  extends Schema.decodeTo<Schema.toType<typeof U32>, Schema.String> {
  readonly Rebuild: U32FromString;
}
export const U32FromString: U32FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a U32",
}).pipe(Schema.decodeTo(Schema.toType(U32), u32FromStringTransformation));

// U64
export const u64FromStringTransformation = new Transformation<
  (typeof U64)["Type"],
  string
>(
  EthGetters.BigIntFromString.compose(
    EthGetters.minMaxValue(0n, U64.MAX_VALUE),
  ).compose(SchemaGetter.transform((v) => new U64({ value: v }))),
  SchemaGetter.transform<bigint, U64>((v) => v.value).compose(
    EthGetters.HexFromBigInt,
  ),
);

export interface U64FromString
  extends Schema.decodeTo<Schema.toType<typeof U64>, Schema.String> {
  readonly Rebuild: U64FromString;
}
export const U64FromString: U64FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a U64",
}).pipe(Schema.decodeTo(Schema.toType(U64), u64FromStringTransformation));

// U256
export const u256FromStringTransformation = new Transformation<
  (typeof U256)["Type"],
  string
>(
  EthGetters.BigIntFromString.compose(
    EthGetters.minMaxValue(0n, U256.MAX_VALUE),
  ).compose(SchemaGetter.transform((v) => new U256({ value: v }))),
  SchemaGetter.transform<bigint, U256>((v) => v.value).compose(
    EthGetters.HexFromBigInt,
  ),
);

export interface U256FromString
  extends Schema.decodeTo<Schema.toType<typeof U256>, Schema.String> {
  readonly Rebuild: U256FromString;
}
export const U256FromString: U256FromString = Schema.String.annotate({
  expected: "a string that will be decoded as a U256",
}).pipe(Schema.decodeTo(Schema.toType(U256), u256FromStringTransformation));

// Int
export const intFromStringTransformation = new Transformation<
  (typeof Int)["Type"],
  string
>(
  EthGetters.BigIntFromString.compose(
    SchemaGetter.transform((v) => new Int({ value: v })),
  ),
  SchemaGetter.transform<bigint, Int>((v) => v.value).compose(
    EthGetters.HexFromBigInt,
  ),
);

export interface IntFromString
  extends Schema.decodeTo<Schema.toType<typeof Int>, Schema.String> {
  readonly Rebuild: IntFromString;
}
export const IntFromString: IntFromString = Schema.String.annotate({
  expected: "a string that will be decoded as a Int",
}).pipe(Schema.decodeTo(Schema.toType(Int), intFromStringTransformation));

export const EntriesFromRecord = <
  K extends Schema.Codec<unknown, PropertyKey>,
  V extends Schema.Top,
>(
  keySchema: K,
  valueSchema: V,
) =>
  Schema.Record(Schema.toEncoded(keySchema), valueSchema).pipe(
    Schema.decodeTo(
      Schema.Array(
        Schema.Tuple([Schema.toType(keySchema), Schema.toType(valueSchema)]),
      ),
      {
        decode: SchemaGetter.transformOrFail((v, options) =>
          Effect.gen(function* () {
            const decodeKey = Schema.decodeResult(keySchema);
            const result: Array<[K["Type"], V["Type"]]> = [];
            for (const [key, value] of Object.entries(v)) {
              const decodedKey = decodeKey(key, options);
              if (Result.isSuccess(decodedKey)) {
                result.push([decodedKey.success, value]);
              } else {
                return yield* Effect.fail(decodedKey.failure.issue);
              }
            }
            return result;
          }),
        ),
        encode: SchemaGetter.transformOrFail((v) =>
          Effect.gen(function* () {
            const encodeKey = Schema.encodeResult(keySchema);
            const result = {} as Schema.Record.Type<Schema.toEncoded<K>, V>;
            for (const [key, value] of v) {
              const encodedKey = encodeKey(key);
              if (Result.isSuccess(encodedKey)) {
                Object.assign(result, { [encodedKey.success]: value });
              } else {
                return yield* Effect.fail(encodedKey.failure.issue);
              }
            }
            return result;
          }),
        ),
      },
    ),
  );

export const HashMapFromRecord = <
  K extends Schema.Codec<unknown, PropertyKey>,
  V extends Schema.Top,
>(
  keySchema: K,
  valueSchema: V,
) =>
  EntriesFromRecord(keySchema, valueSchema).pipe(
    Schema.decodeTo(
      Schema.HashMap(Schema.toType(keySchema), Schema.toType(valueSchema)),
      {
        decode: SchemaGetter.transform((v) =>
          HashMap.fromIterable(v as Iterable<readonly [K["Type"], V["Type"]]>),
        ),
        encode: SchemaGetter.transform((v) => Array.from(HashMap.entries(v))),
      },
    ),
  );

export const MutableHashMapFromRecord = <
  K extends Schema.Codec<unknown, PropertyKey>,
  V extends Schema.Top,
>(
  keySchema: K,
  valueSchema: V,
) =>
  EntriesFromRecord(keySchema, valueSchema).pipe(
    Schema.decodeTo(
      Schema.HashMap(Schema.toType(keySchema), Schema.toType(valueSchema)),
      {
        decode: SchemaGetter.transform((v) =>
          HashMap.fromIterable(v as Iterable<readonly [K["Type"], V["Type"]]>),
        ),
        encode: SchemaGetter.transform((v) => Array.from(HashMap.entries(v))),
      },
    ),
  );

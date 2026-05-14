import { bufferFromHex, bufferToHex } from "@evm-effect/shared/bytes";
import { Option, Result, Schema, SchemaGetter, SchemaIssue } from "effect";
import { Transformation } from "effect/SchemaTransformation";
import { Bytes, Bytes0, Bytes1, Bytes20, Bytes256, Bytes32, Bytes4, Bytes64, Bytes8 } from "../bytes.js";
import { Int, U256, U64, U8, Uint } from "../numeric.js";
import { Address } from "../domain.js";

const decodeHexFromString: (
  str: Result.Result<string, SchemaIssue.Issue>,
) => Result.Result<`0x${string}`, SchemaIssue.Issue> = (str) => {
  if (Result.isFailure(str)) {
    return Result.fail(str.failure);
  }
  const hex = str.success;
  if (!HexRegex.test(hex)) {
    return Result.fail(
      new SchemaIssue.InvalidValue(Option.some(hex), {
        message: "Invalid hex string",
      }),
    );
  }
  if (hex.startsWith("0x")) {
    return Result.succeed(hex as `0x${string}`);
  }
  return Result.succeed(`0x${hex}` as `0x${string}`);
};


const decodeBigIntFromHex: (
  str: Result.Result<`0x${string}`, SchemaIssue.Issue>,
) => Result.Result<bigint, SchemaIssue.Issue> = (str) => {
  if (Result.isFailure(str)) {
    return Result.fail(str.failure);
  }
  const hex = str.success;
  // console.log("decodeBigIntFromHex", str);
  return Result.succeed(BigInt(hex));
};

const encodeBigIntToHex: (bigint: bigint) => `0x${string}` = (bigint) =>
  `0x${bigint.toString(16)}`;
// const a = Predicate.mapInput( decodeHexFromString)
const bigintFromString = new Transformation<bigint, string>(
  SchemaGetter.transformOrFail((v) =>
    decodeBigIntFromHex(decodeHexFromString(Result.succeed(v))).asEffect(),
  ),
  SchemaGetter.transform((v) => encodeBigIntToHex(v)),
);

const decodeUint8ArrayFromHex: (
  str: Result.Result<`0x${string}`, SchemaIssue.Issue>,
) => Result.Result<Uint8Array, SchemaIssue.Issue> = (str) => {
  if (Result.isFailure(str)) {
    return Result.fail(str.failure);
  }
  const hex = str.success;
  try {
    return Result.succeed(bufferFromHex(hex));
  } catch (error) {
    return Result.fail(
      new SchemaIssue.InvalidValue(Option.some(hex), {
        message: `Invalid hex string: ${error}`,
      }),
    );
  }
};

const encodeUint8ArrayToHex: (uint8Array: Uint8Array) => `0x${string}` = (
  uint8Array,
) => bufferToHex(uint8Array);

export const BigIntFromHex: Schema.Codec<bigint, string> = Schema.String.annotate({
  expected: "a hex string that will be decoded as a bigint",
}).pipe(Schema.decodeTo(Schema.BigInt, bigintFromString));

const HexRegex = /^(0x)?[0-9a-fA-F]*$/;
const HexString = Schema.String.pipe(
  Schema.refine<Schema.String, `0x${string}`>((v): v is `0x${string}` =>
    HexRegex.test(v),
  ),
);

const hexString = new Transformation<`0x${string}`, string>(
  SchemaGetter.transformOrFail((v) =>
    decodeHexFromString(Result.succeed(v)).asEffect(),
  ),
  SchemaGetter.passthrough(),
);

export const HexStringFromString: Schema.Codec<`0x${string}`, string> = Schema.String.annotate({
  expected: "a string that will be decoded as a hex string",
}).pipe(Schema.decodeTo(Schema.toType(HexString), hexString));

const uint8ArrayFromHex = new Transformation<Uint8Array, string>(
  SchemaGetter.transformOrFail((v) =>
    decodeUint8ArrayFromHex(decodeHexFromString(Result.succeed(v))).asEffect(),
  ),
  SchemaGetter.transform((v) => encodeUint8ArrayToHex(v)),
);

export const Uint8ArrayFromHex: Schema.Codec<Uint8Array, string> = Schema.String.annotate({
  expected: "a hex string that will be decoded as a Uint8Array",
}).pipe(Schema.decodeTo(Schema.Uint8Array, uint8ArrayFromHex));

const bytesFromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes>,
  Uint8Array
>(
  SchemaGetter.transform((v) => new Bytes({ value: v })),
  SchemaGetter.transform((v) => v.value),
);
export const BytesFromHex: Schema.Codec<Bytes, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes, bytesFromHex),
);

const ensureLength = (
  value: Uint8Array,
  length: number,
): Result.Result<Uint8Array, SchemaIssue.Issue> => {
  if (value.length !== length) {
    return Result.fail(
      new SchemaIssue.InvalidValue(Option.some(value), {
        message: `Invalid bytes length, expected ${length} bytes, got ${value.length} bytes`,
      }),
    );
  }
  return Result.succeed(value);
};


const bytes0FromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes0>,
  Uint8Array
>(
  SchemaGetter.transformOrFail((v) =>
    ensureLength(v, 0)
      .pipe(Result.map((v) => new Bytes0({ value: v })))
      .asEffect(),
  ),
  SchemaGetter.transformOrFail((v) => ensureLength(v.value, 0).asEffect()),
);


export const Bytes0FromHex: Schema.Codec<Bytes0, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes0, bytes0FromHex),
);



const bytes1FromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes1>,
  Uint8Array
>(
  SchemaGetter.transformOrFail((v) =>
    ensureLength(v, 1)
      .pipe(Result.map((v) => new Bytes1({ value: v })))
      .asEffect(),
  ),
  SchemaGetter.transformOrFail((v) => ensureLength(v.value, 1).asEffect()),
);


export const Bytes1FromHex: Schema.Codec<Bytes1, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes1, bytes1FromHex),
);



const bytes4FromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes4>,
  Uint8Array
>(
  SchemaGetter.transformOrFail((v) =>
    ensureLength(v, 4)
      .pipe(Result.map((v) => new Bytes4({ value: v })))
      .asEffect(),
  ),
  SchemaGetter.transformOrFail((v) => ensureLength(v.value, 4).asEffect()),
);


export const Bytes4FromHex: Schema.Codec<Bytes4, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes4, bytes4FromHex),
);



const bytes8FromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes8>,
  Uint8Array
>(
  SchemaGetter.transformOrFail((v) =>
    ensureLength(v, 8)
      .pipe(Result.map((v) => new Bytes8({ value: v })))
      .asEffect(),
  ),
  SchemaGetter.transformOrFail((v) => ensureLength(v.value, 8).asEffect()),
);


export const Bytes8FromHex: Schema.Codec<Bytes8, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes8, bytes8FromHex),
);




const bytes20FromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes20>,
  Uint8Array
>(
  SchemaGetter.transformOrFail((v) =>
    ensureLength(v, 20)
      .pipe(Result.map((v) => new Bytes20({ value: v })))
      .asEffect(),
  ),
  SchemaGetter.transformOrFail((v) => ensureLength(v.value, 20).asEffect()),
);


export const Bytes20FromHex: Schema.Codec<Bytes20, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes20, bytes20FromHex),
);




const bytes32FromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes32>,
  Uint8Array
>(
  SchemaGetter.transformOrFail((v) =>
    ensureLength(v, 32)
      .pipe(Result.map((v) => new Bytes32({ value: v })))
      .asEffect(),
  ),
  SchemaGetter.transformOrFail((v) => ensureLength(v.value, 32).asEffect()),
);


export const Bytes32FromHex: Schema.Codec<Bytes32, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes32, bytes32FromHex),
);






const bytes64FromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes64>,
  Uint8Array
>(
  SchemaGetter.transformOrFail((v) =>
    ensureLength(v, 64)
      .pipe(Result.map((v) => new Bytes64({ value: v })))
      .asEffect(),
  ),
  SchemaGetter.transformOrFail((v) => ensureLength(v.value, 64).asEffect()),
);

  
export const Bytes64FromHex: Schema.Codec<Bytes64, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes64, bytes64FromHex),
);





const bytes256FromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes256>,
  Uint8Array
>(
  SchemaGetter.transformOrFail((v) =>
    ensureLength(v, 256)
      .pipe(Result.map((v) => new Bytes256({ value: v })))
      .asEffect(),
  ),
  SchemaGetter.transformOrFail((v) => ensureLength(v.value, 256).asEffect()),
);


export const Bytes256FromHex: Schema.Codec<Bytes256, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes256, bytes256FromHex),
);


const addressFromHex = new Transformation<
  Schema.Codec.Encoded<typeof Address>,
  Uint8Array
>(
  SchemaGetter.transformOrFail((v) =>
    ensureLength(v, 20)
      .pipe(Result.map((v) => new Address({ value: new Bytes20({ value: v }) })))
      .asEffect(),
  ),
  SchemaGetter.transformOrFail((v) => ensureLength(v.value.value, 20).asEffect()),
);
export const AddressFromHex: Schema.Codec<Address, string> = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Address, addressFromHex),
);


// ============================================================================
// INT TYPES FROM HEX
// ============================================================================



const uintFromHex = new Transformation<
  Schema.Codec.Encoded<typeof Uint>,
  bigint
>(
  SchemaGetter.transform((v) => new Uint({ value: v })),
  SchemaGetter.transform((v) => v.value),
);


export const UintFromHex: Schema.Codec<Uint, string> = BigIntFromHex.pipe(
  Schema.decodeTo(Uint, uintFromHex),
);


const ensureNotOverflow = (value: bigint, bytes: number): Result.Result<bigint, SchemaIssue.Issue> => {
  const max = BigInt(2 ** (bytes * 8) - 1);
  if (value > max) {
    return Result.fail(new SchemaIssue.InvalidValue(Option.some(value), {
      message: `Value ${value} is out of range for ${bytes} bytes, max is ${max}`,
    }));
  }
  return Result.succeed(value);
};

export const u8FromHex = new Transformation<
  Schema.Codec.Encoded<typeof U8>,
  bigint
>(
  SchemaGetter.transformOrFail((v) => ensureNotOverflow(v, 1).pipe(Result.map((v) => new U8({ value: v }))).asEffect()),
  SchemaGetter.transform((v) => v.value),
);

export const U8FromHex: Schema.Codec<U8, string> = BigIntFromHex.pipe(
  Schema.decodeTo(U8, u8FromHex),
);

const u64FromHex = new Transformation<
  Schema.Codec.Encoded<typeof U64>,
  bigint
>(
  SchemaGetter.transformOrFail((v) => ensureNotOverflow(v, 8).pipe(Result.map((v) => new U64({ value: v }))).asEffect()),
  SchemaGetter.transform((v) => v.value),
);  

export const U64FromHex: Schema.Codec<U64, string> = BigIntFromHex.pipe(
  Schema.decodeTo(U64, u64FromHex),
);

const u256FromHex = new Transformation<
  Schema.Codec.Encoded<typeof U256>,
  bigint
>(
  SchemaGetter.transformOrFail((v) => ensureNotOverflow(v, 32).pipe(Result.map((v) => new U256({ value: v }))).asEffect()),
  SchemaGetter.transform((v) => v.value),
);

export const U256FromHex: Schema.Codec<U256, string> = BigIntFromHex.pipe(
  Schema.decodeTo(U256, u256FromHex),
);


const intFromHex = new Transformation<
  Schema.Codec.Encoded<typeof Int>,
  bigint
>(
  SchemaGetter.transform((v) => new Int({ value: v })),
  SchemaGetter.transform((v) => v.value),
);


export const IntFromHex: Schema.Codec<Int, string> = BigIntFromHex.pipe(
  Schema.decodeTo(Int, intFromHex),
);



export const EthSchema = {
  BigIntFromHex,
  HexStringFromString,
  HexString,
  Uint8ArrayFromHex,

  AddressFromHex,
  BytesFromHex,
  Bytes0FromHex,
  Bytes1FromHex,
  Bytes4FromHex,
  Bytes8FromHex,
  Bytes20FromHex,
  Bytes32FromHex,
  Bytes64FromHex,
  Bytes256FromHex,

  UintFromHex,
  U8FromHex,
  U64FromHex,
  U256FromHex,

  IntFromHex,
};


export default EthSchema;

import { bufferFromHex, bufferToHex } from "@evm-effect/shared/bytes";
import { Option, Result, Schema, SchemaGetter, SchemaIssue } from "effect";
import { Transformation } from "effect/SchemaTransformation";
import { Bytes, Bytes32 } from "../bytes.js";

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

export const BigIntFromHex = Schema.String.annotate({
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

export const HexStringFromString = Schema.String.annotate({
  expected: "a string that will be decoded as a hex string",
}).pipe(Schema.decodeTo(Schema.toType(HexString), hexString));

const uint8ArrayFromHex = new Transformation<Uint8Array, string>(
  SchemaGetter.transformOrFail((v) =>
    decodeUint8ArrayFromHex(decodeHexFromString(Result.succeed(v))).asEffect(),
  ),
  SchemaGetter.transform((v) => encodeUint8ArrayToHex(v)),
);

export const Uint8ArrayFromHex = Schema.String.annotate({
  expected: "a hex string that will be decoded as a Uint8Array",
}).pipe(Schema.decodeTo(Schema.Uint8Array, uint8ArrayFromHex));

const bytesFromHex = new Transformation<
  Schema.Codec.Encoded<typeof Bytes>,
  Uint8Array
>(
  SchemaGetter.transform((v) => new Bytes({ value: v })),
  SchemaGetter.transform((v) => v.value),
);
export const BytesFromHex = Uint8ArrayFromHex.pipe(
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

export const Bytes32FromHex = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes32, bytes32FromHex),
);

export const EthSchema = {
  BigIntFromHex,
  HexStringFromString,
  HexString,
  Uint8ArrayFromHex,
  BytesFromHex,
  Bytes32FromHex,
};

export default EthSchema;

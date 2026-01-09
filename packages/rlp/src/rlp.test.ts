import { describe, expect, it } from "bun:test";
import { BunContext } from "@effect/platform-bun";
import { pythonEval } from "@evm-effect/shared/test/python";
import { Arbitrary, Either, FastCheck, Schema } from "effect";
import { dedent } from "ts-dedent";

FastCheck.configureGlobal({ numRuns: 100, verbose: true });

import {
  Address,
  Bytes,
  Bytes1,
  Bytes4,
  Bytes8,
  Bytes20,
  Bytes32,
  Bytes64,
  Bytes256,
  isAddress,
  isBytes,
  isUnsignedInt,
  U8,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import { Effect } from "effect";
import { decodeTo } from "./decodeTo.js";
import { encodeTo } from "./encodeTo.js";
import { decode, encode } from "./index.js";
import type { Extended } from "./types.js";

const extendedUnion = Schema.Union(
  Uint,
  U8,
  U64,
  U256,
  Bytes,
  Bytes1,
  Bytes20,
  Bytes32,
  Bytes4,
  Bytes8,
  Bytes256,
  Bytes64,
  Address,
  Schema.String,
  Schema.Boolean,
  Schema.Uint8Array,
);
const extendedUnionList = Schema.Array(
  Schema.Union(extendedUnion, Schema.Array(extendedUnion)),
);
const arbExtended = Arbitrary.make(
  Schema.Union(extendedUnion, extendedUnionList),
);

// const arbUint = fc.oneof(fc.string(Uint._tag), fc.string(U8._tag), fc.string(U64._tag), fc.string(U256._tag))
// const arbitrary = Arbitrary
const ellipsis = (str: string) =>
  str.length > 6 ? `${str.slice(0, 6)}…${str.length}+` : str;
const formatTestTitle = (extended: Extended): string => {
  if (extended instanceof Uint8Array)
    return `Uint8Array("${ellipsis(extended.toHex())}")`;
  if (isBytes(extended))
    return `${extended._tag}("${ellipsis(extended.value.toHex())}")`;
  if (isAddress(extended))
    return `${extended._tag}("${ellipsis(extended.value.value.toHex())}")`;
  if (typeof extended === "string") return `"${ellipsis(extended)}"`;
  if (typeof extended === "boolean") return extended ? "True" : "False";
  if (isUnsignedInt(extended))
    return `${extended._tag}(${ellipsis(extended.value.toString())}`;
  return `[${extended.map((e) => formatTestTitle(e)).join(", ")}]`;
};

const layers = BunContext.layer;
describe("encode", async () => {
  const encodeToPython = (extended: Extended): string => {
    if (extended instanceof Uint8Array)
      return `bytes.fromhex("${extended.toHex()}")`;
    if (isBytes(extended)) return `bytes.fromhex("${extended.value.toHex()}")`;
    if (isAddress(extended)) return encodeToPython(extended.value.value);
    if (typeof extended === "string") return JSON.stringify(extended);
    if (typeof extended === "boolean") return extended ? "True" : "False";
    if (Array.isArray(extended)) {
      const lines: string[] = [];
      for (const e of extended) {
        lines.push(encodeToPython(e));
      }
      return `[${lines.join(", ")}]`;
    }
    return `${extended._tag}(${extended.value})`;
  };

  const extended = FastCheck.sample(arbExtended, {
    seed: 1,
    verbose: true,
  }) as Extended[];

  it.each(
    extended.map((e, i) => ({ name: formatTestTitle(e), extended: e, i })),
  )("$i - $name", async ({ extended }) => {
    const program = Effect.gen(function* () {
      const pythonValue = encodeToPython(extended);

      const pythonEncoded = yield* pythonEval(/*python*/ `
        from ethereum_rlp import encode
        from ethereum_types.bytes import Bytes, Bytes1, Bytes20, Bytes32, Bytes4, Bytes8, Bytes256, Bytes64
        from ethereum_types.numeric import U8, U64, U256, Uint
        value = ${dedent(pythonValue)}
        export_value(encode(value).hex())
      `);
      const encoded = encode(extended);
      expect(Uint8Array.fromHex(pythonEncoded.exports[0]?.value)).toEqual(
        new Uint8Array(encoded.value),
      );
    });
    await Effect.runPromise(
      program.pipe(Effect.provide(layers), Effect.scoped),
    );
  });
});

describe("decode", async () => {
  const arbSimple = Schema.Union(Schema.Array(Bytes), Bytes);
  const arbNested = Schema.Union(Schema.Array(arbSimple), arbSimple);

  const simple = Arbitrary.make(arbNested);
  const samples = FastCheck.sample(simple, { seed: 1 }) as (Bytes | Bytes[])[];

  it.each(samples.map((e, i) => ({ name: formatTestTitle(e), simple: e, i })))(
    "$i - $name",
    async ({ simple }) => {
      const encoded = encode(simple);
      const decoded = decode(encoded);
      expect(Either.isRight(decoded)).toBe(true);

      expect(Either.getOrThrow(decoded)).toEqual(simple);
    },
  );
});
describe("encodeTo", async () => {
  const testStruct = Schema.Struct({
    "field-1": Schema.Boolean,
    "field-2": Schema.String,
    "field-3": Schema.Uint8Array,
    "field-4": Address,
    "field-5": Bytes,
    "field-6": Bytes1,
    "field-9": Bytes4,
    "field-10": Bytes8,
    "field-7": Bytes20,
    "field-8": Bytes32,
    "field-12": Bytes64,
    "field-11": Bytes256,
    "field-13": Uint,
    "field-14": U8,
    "field-15": U64,
    "field-16": U256,
    "field-17": Schema.Array(Schema.String),
    "field-18": Schema.Tuple(Schema.String, Schema.Boolean),
    "field-19": Schema.Tuple(
      [Schema.String, Schema.optionalElement(Schema.Boolean)], // elements
      Schema.Boolean, // rest element
    ),
    "field-20": Schema.Tuple(
      [Schema.String, Schema.String], // elements
      Schema.Boolean, // rest element
    ),
    // nested
    "field-21": Schema.Struct({
      a: U8,
      b: U64,
      c: U256,
      d: Bytes,
      e: Bytes1,
      f: Bytes20,
      g: Bytes32,
      h: Bytes4,
      i: Bytes8,
      j: Schema.Struct({
        k: U8,
        l: U64,
        m: U256,
        n: Bytes,
        o: Bytes1,
        p: Bytes20,
        q: Bytes32,
        r: Bytes4,
      }),
    }),
  });
  const arbTestStruct = Arbitrary.make(testStruct);
  const samples = FastCheck.sample(arbTestStruct, { seed: 1 }).map((e, i) => ({
    i,
    e,
  }));
  it.each(samples)("$i", async ({ e }) => {
    await Effect.gen(function* () {
      const encoded = yield* encodeTo(testStruct, e);

      const decoded = yield* decodeTo(testStruct, encoded);
      expect(decoded).toEqual(e);
    }).pipe(Effect.provide(layers), Effect.scoped, Effect.runPromise);
  });
});

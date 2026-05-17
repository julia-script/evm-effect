import { Effect, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { Bytes, Bytes32, padBuffer } from "../bytes.js";
import * as BaseTypes from "./base-types.js";

describe("EthSchema", () => {
  test("HexString", async () =>
    Effect.gen(function* () {
      const encode = Schema.encodeEffect(BaseTypes.HexString);
      const decode = Schema.decodeEffect(BaseTypes.HexString);
      expect(yield* encode("0x010203")).toBe("0x010203");
      expect(yield* decode("0x010203")).toBe("0x010203");
    }).pipe(Effect.runPromise));

  test("BigIntFromString", async () =>
    Effect.gen(function* () {
      const encode = Schema.encodeEffect(BaseTypes.BigIntFromString);
      const decode = Schema.decodeEffect(BaseTypes.BigIntFromString);
      expect(yield* encode(123n)).toBe("0x7b");
      expect(yield* decode("0x7b")).toBe(123n);
      expect(yield* decode("7b")).toBe(123n);
    }).pipe(Effect.runPromise));

  test("Uint8ArrayFromHex", async () =>
    Effect.gen(function* () {
      const encode = Schema.encodeEffect(BaseTypes.Uint8ArrayFromString);
      const decode = Schema.decodeEffect(BaseTypes.Uint8ArrayFromString);
      expect(yield* encode(new Uint8Array([1, 2, 3]))).toBe("0x010203");

      expect(yield* decode("0x010203")).toEqual(new Uint8Array([1, 2, 3]));
      expect(yield* decode("010203")).toEqual(new Uint8Array([1, 2, 3]));
    }).pipe(Effect.runPromise));

  test("Bytes32FromHex", async () =>
    Effect.gen(function* () {
      const encode = Schema.encodeEffect(BaseTypes.Bytes32FromString);
      const decode = Schema.decodeEffect(BaseTypes.Bytes32FromString);

      expect(
        yield* encode(
          new Bytes32({ value: padBuffer(new Uint8Array([1, 2, 3]), 32) }),
        ),
      ).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000010203",
      );
      expect(
        yield* decode(
          "0x0000000000000000000000000000000000000000000000000000000000010203",
        ),
      ).toEqual(new Bytes32({ value: new Uint8Array([1, 2, 3]) }));
      expect(
        yield* decode(
          "0000000000000000000000000000000000000000000000000000000000010203",
        ),
      ).toEqual(new Bytes32({ value: new Uint8Array([1, 2, 3]) }));
    }).pipe(Effect.runPromise));

  test("BytesFromHex", async () =>
    Effect.gen(function* () {
      const encode = Schema.encodeEffect(BaseTypes.BytesFromString);
      const decode = Schema.decodeEffect(BaseTypes.BytesFromString);
      expect(
        yield* encode(new Bytes({ value: new Uint8Array([1, 2, 3]) })),
      ).toBe("0x010203");
      expect(yield* decode("0x010203")).toEqual(
        new Bytes({ value: new Uint8Array([1, 2, 3]) }),
      );
      expect(yield* decode("010203")).toEqual(
        new Bytes({ value: new Uint8Array([1, 2, 3]) }),
      );
      expect(
        yield* decode(
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ),
      ).toEqual(new Bytes({ value: padBuffer(new Uint8Array(0), 32) }));
      expect(yield* decode("")).toEqual(
        new Bytes({ value: new Uint8Array(0) }),
      );
    }).pipe(Effect.runPromise));
});

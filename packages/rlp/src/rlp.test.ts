import {
  Bytes,
  isAddress,
  isBytes,
  isUnsignedInt,
} from "@evm-effect/ethereum-types";
import { bufferToHex } from "@evm-effect/shared/bytes";
import { Result, Schema } from "effect";
import { FastCheck } from "effect/testing";
import { describe, expect, it } from "vitest";
import { decode, encode } from "./index.js";
import type { Extended } from "./types.js";

FastCheck.configureGlobal({ numRuns: 100, verbose: true });

const ellipsis = (str: string) =>
  str.length > 6 ? `${str.slice(0, 6)}…${str.length}+` : str;
const formatTestTitle = (extended: Extended): string => {
  if (extended instanceof Uint8Array)
    return `Uint8Array("${ellipsis(bufferToHex(extended))}")`;
  if (isBytes(extended))
    return `${extended._tag}("${ellipsis(extended.toHex())}")`;
  if (isAddress(extended))
    return `${extended._tag}("${ellipsis(extended.toHex())}")`;
  if (typeof extended === "string") return `"${ellipsis(extended)}"`;
  if (typeof extended === "boolean") return extended ? "True" : "False";
  if (isUnsignedInt(extended))
    return `${extended._tag}(${ellipsis(extended.value.toString())}`;
  return `[${extended.map((e) => formatTestTitle(e)).join(", ")}]`;
};

describe("decode", async () => {
  const arbSimple = Schema.Union([Schema.Array(Bytes), Bytes]);
  const arbNested = Schema.Union([Schema.Array(arbSimple), arbSimple]);

  const simple = Schema.toArbitrary(arbNested);
  const samples = FastCheck.sample(simple, { seed: 1 }) as (Bytes | Bytes[])[];

  it.each(
    samples.map((e, i) => ({ name: formatTestTitle(e), simple: e, i })),
  )("$i - $name", async ({ simple }) => {
    const encoded = encode(simple);
    const decoded = decode(encoded);
    expect(Result.isSuccess(decoded)).toBe(true);

    expect(Result.getOrThrow(decoded)).toEqual(simple);
  });
});

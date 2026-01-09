import { createHash } from "node:crypto";
import { Bytes, Bytes32 } from "@evm-effect/ethereum-types";
import { ceil32, Uint } from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

const cryptoRipemd160 = (data: Uint8Array): Bytes32 => {
  const hash = createHash("ripemd160");
  hash.update(data);
  const digest = hash.digest();
  return new Bytes32({ value: digest });
};
export const ripemd160 = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  const wordCount =
    ceil32(new Uint({ value: BigInt(data.length) })).value / 32n;
  const gasCost = new Uint({
    value: Gas.GAS_RIPEMD160.value + Gas.GAS_RIPEMD160_WORD.value * wordCount,
  });
  yield* Gas.chargeGas(gasCost);

  const hash = cryptoRipemd160(data);
  yield* Ref.set(evm.output, new Bytes({ value: hash.value }));
});

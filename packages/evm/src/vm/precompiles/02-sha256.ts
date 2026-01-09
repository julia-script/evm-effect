import { sha256 as cryptoSha256 } from "@evm-effect/crypto/sha256";
import { Bytes } from "@evm-effect/ethereum-types";
import { ceil32, Uint } from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

export const sha256 = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  const wordCount =
    ceil32(new Uint({ value: BigInt(data.length) })).value / 32n;
  const gasCost = new Uint({
    value: Gas.GAS_SHA256.value + Gas.GAS_SHA256_WORD.value * wordCount,
  });
  yield* Gas.chargeGas(gasCost);

  const hash = cryptoSha256(data);
  yield* Ref.set(evm.output, new Bytes({ value: hash.value }));
});

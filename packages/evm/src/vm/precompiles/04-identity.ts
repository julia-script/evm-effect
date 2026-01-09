import { Bytes } from "@evm-effect/ethereum-types";
import { ceil32, Uint } from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

/**
 * Ethereum Virtual Machine (EVM) IDENTITY PRECOMPILED CONTRACT
 *
 * Implementation of the IDENTITY precompiled contract.
 * This contract simply returns the input data unchanged.
 */

export const identity = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  // GAS
  const wordCount =
    ceil32(new Uint({ value: BigInt(data.length) })).value / 32n;
  const gasCost = new Uint({
    value: Gas.GAS_IDENTITY.value + Gas.GAS_IDENTITY_WORD.value * wordCount,
  });
  yield* Gas.chargeGas(gasCost);

  // OPERATION
  yield* Ref.set(evm.output, new Bytes({ value: data }));
});

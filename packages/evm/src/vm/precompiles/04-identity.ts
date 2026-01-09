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

/**
 * Writes the message data to output.
 *
 * Ported from Python identity precompiled contract:
 * ```python
 * def identity(evm: Evm) -> None:
 *     data = evm.message.data
 *     # GAS
 *     word_count = ceil32(Uint(len(data))) // Uint(32)
 *     charge_gas(evm, GAS_IDENTITY + GAS_IDENTITY_WORD * word_count)
 *     # OPERATION
 *     evm.output = data
 * ```
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

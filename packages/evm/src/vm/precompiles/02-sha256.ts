import { sha256 as cryptoSha256 } from "@evm-effect/crypto/sha256";
import { Bytes } from "@evm-effect/ethereum-types";
import { ceil32, Uint } from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

// """
// Ethereum Virtual Machine (EVM) SHA256 PRECOMPILED CONTRACT.

// .. contents:: Table of Contents
//     :backlinks: none
//     :local:

// Introduction
// ------------

// Implementation of the `SHA256` precompiled contract.
// """

// import hashlib

// from ethereum_types.numeric import Uint

// from ethereum.utils.numeric import ceil32

// from ...vm import Evm
// from ...vm.gas import GAS_SHA256, GAS_SHA256_WORD, charge_gas

// def sha256(evm: Evm) -> None:
//     """
//     Writes the sha256 hash to output.

//     Parameters
//     ----------
//     evm :
//         The current EVM frame.

//     """
//     data = evm.message.data

//     # GAS
//     word_count = ceil32(Uint(len(data))) // Uint(32)
//     charge_gas(evm, GAS_SHA256 + GAS_SHA256_WORD * word_count)

//     # OPERATION
//     evm.output = hashlib.sha256(data).digest()

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

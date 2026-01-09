import { Bytes, U256 } from "@evm-effect/ethereum-types";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import { bn254 } from "@noble/curves/bn254.js";
import { Effect, Ref } from "effect";
import { OutOfGasError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import { Fork } from "../Fork.js";
import * as Gas from "../gas.js";

export const bn254Add = Effect.gen(function* () {
  const evm = yield* Evm;
  const fork = yield* Fork;
  const data = evm.message.data.value;

  // GAS
  yield* Gas.chargeGas(new Uint({ value: fork.eipSelect(1108, 150n, 500n) }));

  // OPERATION
  const paddedData = new Uint8Array(128);
  paddedData.set(data.slice(0, Math.min(data.length, 128)));

  const Ax = U256.fromBeBytes(new Uint8Array(paddedData.slice(0, 32)));
  const Ay = U256.fromBeBytes(new Uint8Array(paddedData.slice(32, 64)));
  const Bx = U256.fromBeBytes(new Uint8Array(paddedData.slice(64, 96)));
  const By = U256.fromBeBytes(new Uint8Array(paddedData.slice(96, 128)));

  try {
    let A = bn254.G1.Point.fromAffine({ x: Ax.value, y: Ay.value });
    A = A.add(bn254.G1.Point.fromAffine({ x: Bx.value, y: By.value }));
    A.assertValidity();
    const res = A.toAffine();
    const output = new Uint8Array(64);
    output.set(new U256({ value: res.x }).toBeBytes32().value, 0);
    output.set(new U256({ value: res.y }).toBeBytes32().value, 32);
    yield* Ref.set(evm.output, new Bytes({ value: output }));
  } catch (error) {
    yield* Effect.fail(
      new OutOfGasError({
        message: `[bn254Add] Error: ${error}`,
      }),
    );
    return;
  }
});

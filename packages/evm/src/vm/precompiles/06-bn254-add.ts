import { Bytes, U256 } from "@evm-effect/ethereum-types";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import { bn254 } from "@noble/curves/bn254.js";
import { Effect, Ref } from "effect";
import { PrecompileFailure } from "../../exceptions.js";
import { Evm } from "../evm.js";
import { Fork } from "../Fork.js";
import * as Gas from "../gas.js";
import { assertBn254G1AffineLikeGeth } from "./bn254-g1-geth-validation.js";

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
    assertBn254G1AffineLikeGeth(Ax.value, Ay.value);
    assertBn254G1AffineLikeGeth(Bx.value, By.value);
    let A = bn254.G1.Point.fromAffine({ x: Ax.value, y: Ay.value });
    A = A.add(bn254.G1.Point.fromAffine({ x: Bx.value, y: By.value }));
    // Do not assertValidity on the sum: P + (-P) is infinity but Noble may use
    // a projective representation where assertValidity throws ("bad point:
    // ZERO") even though toAffine() is (0,0) per EIP-196 / geth Marshal.
    const res = A.toAffine();
    const output = new Uint8Array(64);
    output.set(new U256({ value: res.x }).toBeBytes32().value, 0);
    output.set(new U256({ value: res.y }).toBeBytes32().value, 32);
    yield* Ref.set(evm.output, new Bytes({ value: output }));
  } catch (error) {
    return yield* Effect.fail(
      new PrecompileFailure({
        message: `[bn254Add] Error: ${error}`,
      }),
    );
  }
});

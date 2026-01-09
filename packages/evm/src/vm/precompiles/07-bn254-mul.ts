import { Bytes, U256 } from "@evm-effect/ethereum-types";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import { bn254 } from "@noble/curves/bn254.js";
import { Effect, Ref } from "effect";
import { OutOfGasError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import { Fork } from "../Fork.js";
import * as Gas from "../gas.js";

/**
 * Ethereum Virtual Machine (EVM) ALT_BN128 MUL PRECOMPILED CONTRACT
 *
 * Implementation of the BN254 (alt_bn128) elliptic curve scalar multiplication.
 * Address: 0x07
 * Gas cost: 6000 (reduced from 40000 in Istanbul/EIP-1108)
 */
export const bn254Mul = Effect.gen(function* () {
  const evm = yield* Evm;
  const fork = yield* Fork;
  const data = evm.message.data.value;

  // GAS - Istanbul (EIP-1108) reduced from 40000 to 6000
  yield* Gas.chargeGas(
    new Uint({ value: fork.eipSelect(1108, 6000n, 40000n) }),
  );

  // OPERATION
  // Pad input to 128 bytes to match EthereumJS behavior
  // > 128 bytes: chop off extra bytes
  // < 128 bytes: right-pad with 0-s
  const paddedData = new Uint8Array(128);
  paddedData.set(data.slice(0, Math.min(data.length, 128)));

  // Extract point coordinates and scalar - convert bytes to bigints manually
  const Ax = U256.fromBeBytes(new Uint8Array(paddedData.slice(0, 32)));
  const Ay = U256.fromBeBytes(new Uint8Array(paddedData.slice(32, 64)));
  let scalar = U256.fromBeBytes(new Uint8Array(paddedData.slice(64, 96)));

  try {
    let A: ReturnType<typeof bn254.G1.Point.fromAffine>;
    if (Ax.value === 0n && Ay.value === 0n) {
      A = bn254.G1.Point.ZERO;
    } else {
      A = bn254.G1.Point.fromAffine({ x: Ax.value, y: Ay.value });
      A.assertValidity();
    }

    scalar = new U256({ value: scalar.value % bn254.G1.Point.Fn.ORDER });
    if (scalar.value === 0n) {
      const output = new Uint8Array(64);
      yield* Ref.set(evm.output, new Bytes({ value: output }));
      return;
    }

    A = A.multiply(scalar.value);

    if (A.equals(bn254.G1.Point.ZERO)) {
      const output = new Uint8Array(64);
      yield* Ref.set(evm.output, new Bytes({ value: output }));
    } else {
      const res = A.toAffine();
      const output = new Uint8Array(64);
      output.set(new U256({ value: res.x }).toBeBytes32().value, 0);
      output.set(new U256({ value: res.y }).toBeBytes32().value, 32);
      yield* Ref.set(evm.output, new Bytes({ value: output }));
    }
  } catch (error) {
    yield* Effect.fail(
      new OutOfGasError({
        message: `[bn254Mul] Error: ${error}`,
      }),
    );
    return;
  }
});

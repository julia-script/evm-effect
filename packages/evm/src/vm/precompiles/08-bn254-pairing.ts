import { Bytes, U256 } from "@evm-effect/ethereum-types";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import type { Fp2 } from "@noble/curves/abstract/tower.js";
import type { WeierstrassPoint } from "@noble/curves/abstract/weierstrass.js";
import { bn254 } from "@noble/curves/bn254.js";
import { Effect, Ref } from "effect";
import { OutOfGasError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import { Fork } from "../Fork.js";
import * as Gas from "../gas.js";

/**
 * Ethereum Virtual Machine (EVM) ALT_BN128 PAIRING CHECK PRECOMPILED CONTRACT
 *
 * Implementation of the BN254 (alt_bn128) elliptic curve pairing check.
 * Address: 0x08
 * Gas cost: 34000 * (len(data) // 192) + 45000 (reduced base from 80000 in Istanbul/EIP-1108)
 */
export const bn254Pairing = Effect.gen(function* () {
  const evm = yield* Evm;
  const fork = yield* Fork;
  const data = evm.message.data.value;

  // GAS - Istanbul (EIP-1108) reduced from 80000 + 40000*k to 45000 + 34000*k
  const pairCount = Math.floor(data.length / 192);
  const gasCost = fork.eipSelect(
    1108,
    45000n + 34000n * BigInt(pairCount),
    80000n + 40000n * BigInt(pairCount),
  );
  yield* Gas.chargeGas(new Uint({ value: gasCost }));

  // OPERATION
  // Input must be a multiple of 192 bytes (each pair is 64 + 128 bytes)
  if (data.length % 192 !== 0) {
    yield* Effect.fail(new OutOfGasError({}));
    return;
  }

  const { Fp: FieldFp, Fp2: FieldFp2 } = bn254.fields;
  const { G1, G2 } = bn254;

  const pairs: Array<{
    g1: WeierstrassPoint<bigint>;
    g2: WeierstrassPoint<Fp2>;
  }> = [];

  // Parse each pair from the input
  for (let i = 0; i < pairCount; i++) {
    const offset = i * 192;

    // Parse G1 point (64 bytes): x, y - convert bytes to bigints manually
    const Ax = U256.fromBeBytes(
      new Uint8Array(data.slice(offset, offset + 32)),
    );
    const Ay = U256.fromBeBytes(
      new Uint8Array(data.slice(offset + 32, offset + 64)),
    );

    // Parse G2 point (128 bytes): x_imaginary, x_real, y_imaginary, y_real
    const Bax = U256.fromBeBytes(
      new Uint8Array(data.slice(offset + 96, offset + 128)),
    );
    const Bay = U256.fromBeBytes(
      new Uint8Array(data.slice(offset + 64, offset + 96)),
    );
    const Bbx = U256.fromBeBytes(
      new Uint8Array(data.slice(offset + 160, offset + 192)),
    );
    const Bby = U256.fromBeBytes(
      new Uint8Array(data.slice(offset + 128, offset + 160)),
    );

    // Check if coordinates are valid field elements
    for (const coord of [Ax, Ay, Bax, Bay, Bbx, Bby]) {
      if (FieldFp.create(coord.value) !== coord.value) {
        yield* Effect.fail(new OutOfGasError({}));
        return;
      }
    }

    // Create and validate points - wrap everything in try/catch since fromAffine can throw
    let A: WeierstrassPoint<bigint>;
    let B: WeierstrassPoint<Fp2>;

    try {
      // Create G1 point (or zero if coordinates are both 0)
      A =
        Ax.value === 0n && Ay.value === 0n
          ? G1.Point.ZERO
          : G1.Point.fromAffine({ x: Ax.value, y: Ay.value });

      // Create G2 point (or zero if coordinates are both 0)
      const ba = FieldFp2.fromBigTuple([Bax.value, Bay.value]);
      const bb = FieldFp2.fromBigTuple([Bbx.value, Bby.value]);
      B =
        FieldFp2.is0(ba) && FieldFp2.is0(bb)
          ? G2.Point.ZERO
          : G2.Point.fromAffine({ x: ba, y: bb });

      // Validate points
      A.assertValidity();
      B.assertValidity();
    } catch (_error) {
      yield* Effect.fail(new OutOfGasError({}));
      return;
    }

    // Skip pairs with zero points (they contribute identity to the product)
    if (A.is0() || B.is0()) continue;

    pairs.push({ g1: A, g2: B });
  }

  // Perform pairing check
  const f = bn254.pairingBatch(pairs);

  // Check if result equals 1 (identity element)
  const result = bn254.fields.Fp12.eql(f, bn254.fields.Fp12.ONE) ? 1n : 0n;
  const output = new U256({ value: result }).toBeBytes32();
  yield* Ref.set(evm.output, Bytes.from(output.value));
});

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
 * Gas cost:
 *   - Pre-Istanbul (Byzantium): 100000 + 80000 * k
 *   - Istanbul+ (EIP-1108): 45000 + 34000 * k
 */
export const bn254Pairing = Effect.gen(function* () {
  const evm = yield* Evm;
  const fork = yield* Fork;
  const data = evm.message.data.value;

  const pairCount = Math.floor(data.length / 192);
  const gasCost = fork.eipSelect(
    1108,
    45000n + 34000n * BigInt(pairCount),
    100000n + 80000n * BigInt(pairCount),
  );
  yield* Gas.chargeGas(new Uint({ value: gasCost }));

  // OPERATION
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

  for (let i = 0; i < pairCount; i++) {
    const offset = i * 192;

    const Ax = U256.fromBeBytes(
      new Uint8Array(data.slice(offset, offset + 32)),
    );
    const Ay = U256.fromBeBytes(
      new Uint8Array(data.slice(offset + 32, offset + 64)),
    );

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

    for (const coord of [Ax, Ay, Bax, Bay, Bbx, Bby]) {
      if (FieldFp.create(coord.value) !== coord.value) {
        yield* Effect.fail(new OutOfGasError({}));
        return;
      }
    }

    let A: WeierstrassPoint<bigint>;
    let B: WeierstrassPoint<Fp2>;

    try {
      A =
        Ax.value === 0n && Ay.value === 0n
          ? G1.Point.ZERO
          : G1.Point.fromAffine({ x: Ax.value, y: Ay.value });

      const ba = FieldFp2.fromBigTuple([Bax.value, Bay.value]);
      const bb = FieldFp2.fromBigTuple([Bbx.value, Bby.value]);
      B =
        FieldFp2.is0(ba) && FieldFp2.is0(bb)
          ? G2.Point.ZERO
          : G2.Point.fromAffine({ x: ba, y: bb });

      A.assertValidity();
      B.assertValidity();
    } catch (_error) {
      yield* Effect.fail(new OutOfGasError({}));
      return;
    }

    if (A.is0() || B.is0()) continue;

    pairs.push({ g1: A, g2: B });
  }

  const f = bn254.pairingBatch(pairs);

  const result = bn254.fields.Fp12.eql(f, bn254.fields.Fp12.ONE) ? 1n : 0n;
  const output = new U256({ value: result }).toBeBytes32();
  yield* Ref.set(evm.output, Bytes.from(output.value));
});

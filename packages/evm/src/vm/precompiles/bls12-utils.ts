/**
 * Shared utilities for BLS12-381 precompiles
 */

import * as numeric from "@evm-effect/ethereum-types/numeric";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import type { Fp2 } from "@noble/curves/abstract/tower.js";
import type { AffinePoint } from "@noble/curves/abstract/weierstrass.js";
import { bls12_381 } from "@noble/curves/bls12-381.js";

export const BLS_FIELD_MODULUS = BigInt(
  "0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab",
);

export const BLS_CURVE_ORDER = bls12_381.fields.Fr.ORDER;

export const G1_ZERO = bls12_381.G1.Point.ZERO;
export const G2_ZERO = bls12_381.G2.Point.ZERO;

/**
 * Convert 128 bytes to a BLS12-381 G1 point
 * @param data 128-byte input (64 bytes x + 64 bytes y)
 * @param verifyOrder Whether to verify the point is in the prime-order subgroup
 * @returns G1 Point
 */
export function bytesToG1Point(
  data: Uint8Array,
  verifyOrder: boolean = false,
): typeof G1_ZERO {
  const isZero = data.every((b) => b === 0);
  if (isZero) {
    return G1_ZERO;
  }

  const x = Uint.fromBeBytes(data.slice(0, 64)).value;
  const y = Uint.fromBeBytes(data.slice(64, 128)).value;

  if (x >= BLS_FIELD_MODULUS) {
    throw new Error("x coordinate >= field modulus");
  }
  if (y >= BLS_FIELD_MODULUS) {
    throw new Error("y coordinate >= field modulus");
  }

  const point = bls12_381.G1.Point.fromAffine({ x, y });

  const Fp = bls12_381.fields.Fp;
  const x_fp = Fp.create(x);
  const y_fp = Fp.create(y);
  const y_squared = Fp.mul(y_fp, y_fp);
  const x_cubed = Fp.mul(Fp.mul(x_fp, x_fp), x_fp);
  const x_cubed_plus_4 = Fp.add(x_cubed, Fp.create(4n));

  if (!Fp.eql(y_squared, x_cubed_plus_4)) {
    throw new Error("Point is not on curve");
  }

  if (verifyOrder && !point.isTorsionFree()) {
    throw new Error("Subgroup check failed for G1 point");
  }

  return point;
}

/**
 * Convert a G1 point to 128 bytes
 * @param point G1 Point
 * @returns 128-byte output (64 bytes x + 64 bytes y)
 */
export function g1PointToBytes(affine: AffinePoint<bigint>): Uint8Array {
  const output = new Uint8Array(128);

  const xBytes = numeric.toBeBytes64(new Uint({ value: affine.x }));
  const yBytes = numeric.toBeBytes64(new Uint({ value: affine.y }));

  output.set(xBytes.value, 0);

  output.set(yBytes.value, 64);

  return output;
}

/**
 * Convert 128 bytes to a Fp2 element
 * @param data 128-byte input (64 bytes c0 + 64 bytes c1)
 * @returns Fp2 element
 */
function bytesToFp2(data: Uint8Array) {
  if (data.length !== 128) {
    throw new Error("Fp2 input should be 128 bytes");
  }

  const c0 = Uint.fromBeBytes(data.slice(0, 64)).value;
  const c1 = Uint.fromBeBytes(data.slice(64, 128)).value;

  if (c0 >= BLS_FIELD_MODULUS) {
    throw new Error("c0 >= field modulus");
  }
  if (c1 >= BLS_FIELD_MODULUS) {
    throw new Error("c1 >= field modulus");
  }

  const fp_c0 = bls12_381.fields.Fp.create(c0);
  const fp_c1 = bls12_381.fields.Fp.create(c1);

  return bls12_381.fields.Fp2.fromBigTuple([fp_c0, fp_c1]);
}

/**
 * Convert Fp2 element to 128 bytes
 * @param fp2 Fp2 element
 * @returns 128-byte output (64 bytes c0 + 64 bytes c1)
 */
function fp2ToBytes(fp2: Fp2): Uint8Array {
  const output = new Uint8Array(128);

  const c0Bytes = numeric.toBeBytes64(new Uint({ value: fp2.c0 }));
  const c1Bytes = numeric.toBeBytes64(new Uint({ value: fp2.c1 }));

  output.set(c0Bytes.value, 0);

  output.set(c1Bytes.value, 64);

  return output;
}

/**
 * Convert 256 bytes to a BLS12-381 G2 point
 * @param data 256-byte input (128 bytes x + 128 bytes y, each is Fp2)
 * @param verifyOrder Whether to verify the point is in the prime-order subgroup
 * @returns G2 Point
 */
export function bytesToG2Point(
  data: Uint8Array,
  verifyOrder: boolean = false,
): typeof G2_ZERO {
  if (data.length !== 256) {
    throw new Error("G2 point should be 256 bytes");
  }

  const isZero = data.every((b) => b === 0);
  if (isZero) {
    return G2_ZERO;
  }

  const x = bytesToFp2(data.slice(0, 128));
  const y = bytesToFp2(data.slice(128, 256));

  const point = bls12_381.G2.Point.fromAffine({ x, y });

  const Fp2 = bls12_381.fields.Fp2;
  const y_squared = Fp2.mul(y, y);
  const x_cubed = Fp2.mul(Fp2.mul(x, x), x);
  const b = Fp2.fromBigTuple([4n, 4n]);
  const x_cubed_plus_b = Fp2.add(x_cubed, b);

  if (!Fp2.eql(y_squared, x_cubed_plus_b)) {
    throw new Error("Point is not on curve");
  }

  if (verifyOrder && !point.isTorsionFree()) {
    throw new Error("Subgroup check failed for G2 point");
  }

  return point;
}

/**
 * Convert a G2 point to 256 bytes
 * @param point G2 Point
 * @returns 256-byte output (128 bytes x + 128 bytes y)
 */
export function g2PointToBytes(point: AffinePoint<Fp2>): Uint8Array {
  const output = new Uint8Array(256);

  const xBytes = fp2ToBytes(point.x);
  output.set(xBytes, 0);

  const yBytes = fp2ToBytes(point.y);
  output.set(yBytes, 128);

  return output;
}

/**
 * Decode 160 bytes to a G1 point and a scalar
 * @param data 160-byte input (128 bytes G1 point + 32 bytes scalar)
 * @returns [G1 Point, scalar]
 */
export function decodeG1ScalarPair(data: Uint8Array): [typeof G1_ZERO, bigint] {
  if (data.length !== 160) {
    throw new Error("Input should be 160 bytes long");
  }

  const point = bytesToG1Point(data.slice(0, 128), true);

  const scalar = Uint.fromBeBytes(data.slice(128, 160)).value;

  return [point, scalar];
}

/**
 * Decode 288 bytes to a G2 point and a scalar
 * @param data 288-byte input (256 bytes G2 point + 32 bytes scalar)
 * @returns [G2 Point, scalar]
 */
export function decodeG2ScalarPair(data: Uint8Array): [typeof G2_ZERO, bigint] {
  if (data.length !== 288) {
    throw new Error("Input should be 288 bytes long");
  }

  const point = bytesToG2Point(data.slice(0, 256), true);

  const scalar = Uint.fromBeBytes(data.slice(256, 288)).value;

  return [point, scalar];
}

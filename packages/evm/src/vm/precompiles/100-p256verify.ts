import { Bytes, Bytes32, U256 } from "@evm-effect/ethereum-types";
import type { WeierstrassPoint } from "@noble/curves/abstract/weierstrass.js";
import { p256 } from "@noble/curves/nist.js";
import { Effect, Ref } from "effect";
import { PRECOMPILE_P256VERIFY } from "../../constants.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

const { p: SECP256R1P, n: SECP256R1N } = p256.Point.CURVE();

export const p256verify = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data;

  yield* Gas.chargeGas(PRECOMPILE_P256VERIFY);
  if (data.length !== 160) {
    return;
  }

  const messageHashBytes = data.bufferRead(0, 32).value;
  const messageHash = new Bytes32({ value: messageHashBytes });
  const r = U256.fromBeBytes(data.bufferRead(32, 32).value);
  const s = U256.fromBeBytes(data.bufferRead(64, 32).value);
  const publicKeyX = U256.fromBeBytes(data.bufferRead(96, 32).value);
  const publicKeyY = U256.fromBeBytes(data.bufferRead(128, 32).value);

  // Signature component bounds:
  // Both r and s MUST satisfy 0 < r < n and 0 < s < n
  if (r.value <= 0n || r.value >= SECP256R1N) {
    return;
    // return yield* Effect.fail(
    //   new InvalidParameterError({
    //     message: `[p256verify] Invalid r value: ${r.value}`,
    //   }),
    // );
  }
  if (s.value <= 0n || s.value >= SECP256R1N) {
    return;
    // return yield* Effect.fail(

    //   new InvalidParameterError({
    //     message: `[p256verify] Invalid s value: ${s.value}`,
    //   }),
    // );
  }

  // Public key bounds:
  // Both qx and qy MUST satisfy 0 ≤ qx < p and 0 ≤ qy < p
  if (publicKeyX.value >= SECP256R1P || publicKeyY.value < 0n) {
    return;
    // return yield* Effect.fail(
    //   new InvalidParameterError({
    //     message: `[p256verify] Invalid public key x value: ${publicKeyX.value}`,
    //   }),
    // );
  }
  if (publicKeyY.value >= SECP256R1P || publicKeyY.value < 0n) {
    return;
    // return yield* Effect.fail(
    //   new InvalidParameterError({
    //     message: `[p256verify] Invalid public key y value: ${publicKeyY.value}`,
    //   }),
    // );
  }

  // Point should not be at infinity (represented as (0, 0))
  if (publicKeyX.value === 0n && publicKeyY.value === 0n) {
    return;
    // return yield* Effect.fail(
    //   new InvalidParameterError({
    //     message: `[p256verify] Invalid public key: ${publicKeyX.value}, ${publicKeyY.value}`,
    //   }),
    // );
  }

  // Point validity: The point (qx, qy) MUST satisfy the curve equation
  // qy^2 ≡ qx^3 + a*qx + b (mod p)
  let point: WeierstrassPoint<bigint>;
  try {
    point = p256.Point.fromAffine({
      x: publicKeyX.value,
      y: publicKeyY.value,
    });
    point.assertValidity();
  } catch (_error) {
    return;
  }
  // const isValidPoint = yield* Effect.try({
  //   try: () => {
  //     point.assertValidity();
  //     return true;
  //   },
  //   catch: (error) => {
  //     console.log("invalid public key", error);
  //     return false;
  //   },
  // });
  // if (!isValidPoint) {
  //   console.log("invalid public key", publicKeyX.value, publicKeyY.value);
  //   return;
  // }

  //   /**
  //  * Verify a signature against a message and public key.
  //  * @param signature - Encoded signature bytes.
  //  * @param message - Message bytes.
  //  * @param publicKey - Encoded public key.
  //  * @param opts - Optional verification tweaks. See {@link ECDSAVerifyOpts}.
  //  * @returns Whether the signature is valid.
  //  */
  //   verify: (
  //     signature: TArg<Uint8Array>,
  //     message: TArg<Uint8Array>,
  //     publicKey: TArg<Uint8Array>,
  //     opts?: TArg<ECDSAVerifyOpts>
  //   ) => boolean;

  // const signature = data.slice(32, 96);
  const signature = data.bufferRead(32, 64).value;

  const isValid = p256.verify(
    signature,
    messageHash.value,
    point.toBytes(false),
    {
      // lowS
      prehash: false,
      lowS: false,
    },
  );
  if (!isValid) {
    return;
  }

  yield* Ref.set(evm.output, Bytes.leftPad(new Uint8Array([1]), 32));
});

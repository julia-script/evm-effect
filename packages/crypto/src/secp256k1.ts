// """Elliptic Curves."""

import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import * as secp from "@noble/secp256k1";

secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);
secp.hashes.sha256 = sha256;
// import coincurve
// from Crypto.Util.asn1 import DerSequence
// from cryptography.exceptions import InvalidSignature
// from cryptography.hazmat.backends import default_backend
// from cryptography.hazmat.primitives import hashes
// from cryptography.hazmat.primitives.asymmetric import ec
// from cryptography.hazmat.primitives.asymmetric.utils import Prehashed
// from ethereum_types.bytes import Bytes
// from ethereum_types.numeric import U256

// from ethereum.exceptions import InvalidSignatureError

// from .hash import Hash32

export const SECP256K1B = 7n;

export const SECP256K1P =
  0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
export const SECP256K1N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

// export const secp256k1Recover = (
//   r: U256,
//   s: U256,
//   v: U256,
//   msg_hash: Hash32,
// ): Either.Either<Bytes, InvalidSignatureError> => {
//   // def secp256k1_recover(r: U256, s: U256, v: U256, msg_hash: Hash32) -> Bytes:
//   //     """
//   //     Recovers the public key from a given signature.

//   //     Parameters
//   //     ----------
//   //     r :
//   //         TODO
//   //     s :
//   //         TODO
//   //     v :
//   //         TODO
//   //     msg_hash :
//   //         Hash of the message being recovered.

//   //     Returns
//   //     -------
//   //     public_key : `ethereum.base_types.Bytes`
//   //         Recovered public key.

//   //     """
//   //     is_square = pow(
//   //         pow(r, U256(3), SECP256K1P) + SECP256K1B,
//   //         (SECP256K1P - U256(1)) // U256(2),
//   //         SECP256K1P,
//   //     )
//   const isSquared = numeric.wrappingPow(
//     new U256({
//       value: numeric.pow(r, new U256({ value: 3n })).value + SECP256K1B,
//     }),
//     new U256({ value: (SECP256K1P - 1n) / 2n }),
//     new U256({ value: SECP256K1P }),
//   );
//   if (isSquared.value !== 1n)
//     return Either.left(
//       new InvalidSignatureError({
//         message: "r is not the x-coordinate of a point on the secp256k1 curve",
//       }),
//     );

//   const rBytes = r.toBeBytes32();
//   const sBytes = s.toBeBytes32();

//   const signature = new Uint8Array(65);
//   signature.set(rBytes.value, 32 - rBytes.value.length);
//   signature.set(sBytes.value, 64 - sBytes.value.length);
//   signature[64] = Number(v.value);
//   try {
//     const publicKey = secp.recoverPublicKey(signature, msg_hash.value);

//     return Either.right(
//       new Bytes({ value: new Uint8Array(publicKey.buffer).slice(1) }),
//     );
//   } catch (_) {
//     return Either.left(
//       new InvalidSignatureError({ message: "Invalid signature" }),
//     );
//   }
// };

// SECP256R1N = U256(
//     0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
// )
// SECP256R1P = U256(
//     0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF
// )
// SECP256R1A = U256(
//     0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC
// )
// SECP256R1B = U256(
//     0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
// )

// def secp256r1_verify(
//     r: U256, s: U256, x: U256, y: U256, msg_hash: Hash32
// ) -> None:
//     """
//     Verifies a P-256 signature.

//     Parameters
//     ----------
//     r :
//         the `r` component of the signature
//     s :
//         the `s` component of the signature
//     x :
//         the `x` coordinate of the public key
//     y :
//         the `y` coordinate of the public key
//     msg_hash :
//         Hash of the message being recovered.

//     Raises
//     ------
//     Raises an `InvalidSignatureError` if the signature is not valid.

//     """
//     # Convert U256 to regular integers for DerSequence
//     r_int = int(r)
//     s_int = int(s)
//     x_int = int(x)
//     y_int = int(y)

//     sig = DerSequence([r_int, s_int]).encode()

//     pubnum = ec.EllipticCurvePublicNumbers(x_int, y_int, ec.SECP256R1())
//     pubkey = pubnum.public_key(default_backend())

//     try:
//         pubkey.verify(sig, msg_hash, ec.ECDSA(Prehashed(hashes.SHA256())))
//     except InvalidSignature as e:
//         raise InvalidSignatureError from e

// def is_on_curve_secp256r1(x: U256, y: U256) -> bool:
//     """
//     Checks if a point is on the secp256r1 curve.

//     The point (x, y) must satisfy the curve equation:
//     y^2 ≡ x^3 + a*x + b (mod p)

//     Parameters
//     ----------
//     x : U256
//         The x-coordinate of the point
//     y : U256
//         The y-coordinate of the point

//     Returns
//     -------
//     bool
//         True if the point is on the curve, False otherwise

//     """
//     # Convert U256 to int for calculations
//     x_int = int(x)
//     y_int = int(y)
//     p_int = int(SECP256R1P)
//     a_int = int(SECP256R1A)
//     b_int = int(SECP256R1B)

//     # Calculate y^2 mod p
//     y_squared = (y_int * y_int) % p_int

//     # Calculate x^3 + ax + b mod p
//     x_cubed = (x_int * x_int * x_int) % p_int
//     ax = (a_int * x_int) % p_int
//     right_side = (x_cubed + ax + b_int) % p_int

//     return y_squared == right_side
//

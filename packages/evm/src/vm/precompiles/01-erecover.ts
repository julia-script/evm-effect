import {
  publicKeyToAddress,
  secp256k1Recover,
} from "@evm-effect/crypto/transactions";
import { Bytes, Bytes32, U256 } from "@evm-effect/ethereum-types";
import { Effect, Either, Ref } from "effect";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

// SECP256K1 curve order
const SECP256K1N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

// """
// Ethereum Virtual Machine (EVM) ECRECOVER PRECOMPILED CONTRACT.

// .. contents:: Table of Contents
//     :backlinks: none
//     :local:

// Introduction
// ------------

// Implementation of the ECRECOVER precompiled contract.
// """

// from ethereum_types.numeric import U256

// from ethereum.crypto.elliptic_curve import SECP256K1N, secp256k1_recover
// from ethereum.crypto.hash import Hash32, keccak256
// from ethereum.exceptions import InvalidSignatureError
// from ethereum.utils.byte import left_pad_zero_bytes

// from ...vm import Evm
// from ...vm.gas import GAS_ECRECOVER, charge_gas
// from ...vm.memory import buffer_read

// def ecrecover(evm: Evm) -> None:
//     """
//     Decrypts the address using elliptic curve DSA recovery mechanism and writes
//     the address to output.

//     Parameters
//     ----------
//     evm :
//         The current EVM frame.

//     """
//     data = evm.message.data

//     # GAS
//     charge_gas(evm, GAS_ECRECOVER)

//     # OPERATION
//     message_hash_bytes = buffer_read(data, U256(0), U256(32))
//     message_hash = Hash32(message_hash_bytes)
//     v = U256.from_be_bytes(buffer_read(data, U256(32), U256(32)))
//     r = U256.from_be_bytes(buffer_read(data, U256(64), U256(32)))
//     s = U256.from_be_bytes(buffer_read(data, U256(96), U256(32)))

//     if v != U256(27) and v != U256(28):
//         return
//     if U256(0) >= r or r >= SECP256K1N:
//         return
//     if U256(0) >= s or s >= SECP256K1N:
//         return

//     try:
//         public_key = secp256k1_recover(r, s, v - U256(27), message_hash)
//     except InvalidSignatureError:
//         # unable to extract public key
//         return

//     address = keccak256(public_key)[12:32]
//     padded_address = left_pad_zero_bytes(address, 32)
//     evm.output = padded_address

/**
 * Helper to read from message data with zero-padding for short buffers
 */
function bufferRead(data: Bytes, startIndex: U256, size: U256): Bytes {
  const start = Number(startIndex.value);
  const length = Number(size.value);

  if (start >= data.value.length) {
    // Reading beyond buffer - return zeros
    return new Bytes({ value: new Uint8Array(length) });
  }

  const available = Math.min(length, data.value.length - start);
  const result = new Uint8Array(length);
  result.set(data.value.slice(start, start + available), 0);

  return new Bytes({ value: result });
}

export const erecover = Effect.gen(function* () {
  const evm = yield* Evm;
  yield* Gas.chargeGas(Gas.GAS_ECRECOVER);

  const messageHashBytes = bufferRead(
    evm.message.data,
    new U256({ value: 0n }),
    new U256({ value: 32n }),
  );
  const messageHash = messageHashBytes.value;
  const v = U256.fromBeBytes(
    bufferRead(
      evm.message.data,
      new U256({ value: 32n }),
      new U256({ value: 32n }),
    ).value,
  );
  const r = U256.fromBeBytes(
    bufferRead(
      evm.message.data,
      new U256({ value: 64n }),
      new U256({ value: 32n }),
    ).value,
  );
  const s = U256.fromBeBytes(
    bufferRead(
      evm.message.data,
      new U256({ value: 96n }),
      new U256({ value: 32n }),
    ).value,
  );

  // Validate v (must be 27 or 28)
  if (v.value !== 27n && v.value !== 28n) {
    return;
  }

  // Validate r: 0 < r < SECP256K1N
  if (r.value <= 0n || r.value >= SECP256K1N) {
    return;
  }

  // Validate s: 0 < s < SECP256K1N
  // Note: ecrecover allows s up to SECP256K1N (not just SECP256K1N/2 like EIP-2)
  if (s.value <= 0n || s.value >= SECP256K1N) {
    return;
  }

  const publicKey = yield* secp256k1Recover(
    r,
    s,
    v,
    new Bytes32({ value: messageHash }),
  ).pipe(Effect.either);
  if (Either.isLeft(publicKey)) {
    // Unable to extract public key - return empty output
    return;
  }

  const address = publicKeyToAddress(publicKey.right);

  // Pad address to 32 bytes (address is 20 bytes, need to left-pad with 12 zero bytes)
  const paddedAddress = new Uint8Array(32);
  paddedAddress.set(address.value.value, 12); // Place 20-byte address at offset 12

  yield* Ref.set(evm.output, new Bytes({ value: paddedAddress }));
});

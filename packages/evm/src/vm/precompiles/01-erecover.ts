import {
  publicKeyToAddress,
  secp256k1Recover,
} from "@evm-effect/crypto/transactions";
import { Bytes, Bytes32, U256 } from "@evm-effect/ethereum-types";
import { Effect, Either, Ref } from "effect";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

const SECP256K1N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

/**
 * Helper to read from message data with zero-padding for short buffers
 */
function bufferRead(data: Bytes, startIndex: U256, size: U256): Bytes {
  const start = Number(startIndex.value);
  const length = Number(size.value);

  if (start >= data.value.length) {
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

  if (v.value !== 27n && v.value !== 28n) {
    return;
  }

  if (r.value <= 0n || r.value >= SECP256K1N) {
    return;
  }

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
    return;
  }

  const address = publicKeyToAddress(publicKey.right);

  const paddedAddress = new Uint8Array(32);
  paddedAddress.set(address.value.value, 12); // Place 20-byte address at offset 12

  yield* Ref.set(evm.output, new Bytes({ value: paddedAddress }));
});

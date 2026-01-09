import { Bytes32 } from "@evm-effect/ethereum-types";
import { secp256k1 } from "@noble/curves/secp256k1.js";

export function getRandomPrivateKey(): Bytes32 {
  return new Bytes32({ value: secp256k1.utils.randomSecretKey() });
}

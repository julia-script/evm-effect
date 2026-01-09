import {
  Address,
  type Bytes,
  Bytes20,
  type Bytes32,
  type Uint,
} from "@evm-effect/ethereum-types";
import rlp from "@evm-effect/rlp";
import { keccak256 } from "./keccak256.js";
export const computeContractAddress = (address: Address, nonce: Uint) => {
  const computedAddress = keccak256(rlp.encode([address, nonce]));
  const canonicalAddress = computedAddress.value.slice(-20);
  const paddedAddress = new Uint8Array(20);
  paddedAddress.set(canonicalAddress, 20 - canonicalAddress.length);
  return new Address({ value: new Bytes20({ value: paddedAddress }) });
};

export const computeCreate2ContractAddress = (
  address: Address,
  salt: Bytes32,
  callData: Bytes,
) => {
  const preimage = new Uint8Array([
    0xff,
    ...address.value.value,
    ...salt.value,
    ...keccak256(callData).value,
  ]);
  const computedAddress = keccak256(preimage);
  const canonicalAddress = computedAddress.value.slice(-20);
  const paddedAddress = new Uint8Array(20);
  paddedAddress.set(canonicalAddress, 20 - canonicalAddress.length);
  return new Address({ value: new Bytes20({ value: paddedAddress }) });
};

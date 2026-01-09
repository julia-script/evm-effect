// def compute_contract_address(address: Address, nonce: Uint) -> Address:
//     """
//     Computes address of the new account that needs to be created.

import {
  Address,
  type Bytes,
  Bytes20,
  type Bytes32,
  type Uint,
} from "@evm-effect/ethereum-types";
import rlp from "@evm-effect/rlp";
import { keccak256 } from "./keccak256.js";

//     Parameters
//     ----------
//     address :
//         The address of the account that wants to create the new account.
//     nonce :
//         The transaction count of the account that wants to create the new
//         account.

//     Returns
//     -------
//     address: `Address`
//         The computed address of the new account.

//     """
//     computed_address = keccak256(rlp.encode([address, nonce]))
//     canonical_address = computed_address[-20:]
//     padded_address = left_pad_zero_bytes(canonical_address, 20)
//     return Address(padded_address)

// def compute_create2_contract_address(
//     address: Address, salt: Bytes32, call_data: Bytes
// ) -> Address:
//     """
//     Computes address of the new account that needs to be created, which is
//     based on the sender address, salt and the call data as well.

//     Parameters
//     ----------
//     address :
//         The address of the account that wants to create the new account.
//     salt :
//         Address generation salt.
//     call_data :
//         The code of the new account which is to be created.

//     Returns
//     -------
//     address: `ethereum.forks.osaka.fork_types.Address`
//         The computed address of the new account.

//     """
//     preimage = b"\xff" + address + salt + keccak256(call_data)
//     computed_address = keccak256(preimage)
//     canonical_address = computed_address[-20:]
//     padded_address = left_pad_zero_bytes(canonical_address, 20)

//     return Address(padded_address)

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

/**
 * Address utility functions
 *
 * Ported from ethereum/forks/osaka/utils/address.py
 */

import { keccak256 } from "@evm-effect/crypto";
import {
  Address,
  type Bytes,
  Bytes20,
  type Bytes32,
  U256,
  type Uint,
} from "@evm-effect/ethereum-types";
import rlp from "@evm-effect/rlp";

/**
 * Convert a Uint or U256 value to a valid address (20 bytes).
 *
 * Ported from Python: to_address_masked
 *
 * @param data - The numeric value to be converted to address
 * @returns The obtained address
 */
export function toAddressMasked(data: Uint | U256): Address {
  // Take lower 160 bits (20 bytes) of U256
  const bytes32 =
    data instanceof U256
      ? data.toBeBytes32().value
      : new U256({ value: data.value }).toBeBytes32().value;
  const addressBytes = bytes32.slice(-20); // Take last 20 bytes
  return new Address({ value: new Bytes20({ value: addressBytes }) });
}

/**
 * Computes address of the new account that needs to be created.
 *
 * Ported from Python: compute_contract_address
 *
 * @param address - The address of the account that wants to create the new account
 * @param nonce - The transaction count of the account that wants to create the new account
 * @returns The computed address of the new account
 */
export function computeContractAddress(address: Address, nonce: Uint): Address {
  // Encode [address, nonce] using RLP
  const encoded = rlp.encode([address.value.value, nonce]);

  // Hash the encoded data
  const hash = keccak256(encoded.value);

  // Take the last 20 bytes as the canonical address
  const canonicalAddress = hash.value.slice(-20);

  // Pad to 20 bytes (should already be 20 bytes, but for safety)
  const paddedAddress = new Uint8Array(20);
  paddedAddress.set(canonicalAddress, 20 - canonicalAddress.length);

  return new Address({ value: new Bytes20({ value: paddedAddress }) });
}

/**
 * Computes address of the new account that needs to be created, which is
 * based on the sender address, salt and the call data as well.
 *
 * Ported from Python: compute_create2_contract_address
 *
 * @param address - The address of the account that wants to create the new account
 * @param salt - Address generation salt
 * @param callData - The code of the new account which is to be created
 * @returns The computed address of the new account
 */
export function computeCreate2ContractAddress(
  address: Address,
  salt: Bytes32,
  callData: Bytes,
): Address {
  // Create preimage: 0xff + address + salt + keccak256(callData)
  const preimage = new Uint8Array(1 + 20 + 32 + 32);

  // 0xff prefix
  preimage[0] = 0xff;

  // Address (20 bytes)
  preimage.set(address.value.value, 1);

  // Salt (32 bytes)
  preimage.set(salt.value, 1 + 20);

  // Hash of call data (32 bytes)
  const callDataHash = keccak256(callData.value);
  preimage.set(callDataHash.value, 1 + 20 + 32);

  // Hash the preimage
  const computedAddress = keccak256(preimage);

  // Take the last 20 bytes as the canonical address
  const canonicalAddress = computedAddress.value.slice(-20);

  // Pad to 20 bytes (should already be 20 bytes, but for safety)
  const paddedAddress = new Uint8Array(20);
  paddedAddress.set(canonicalAddress, 20 - canonicalAddress.length);

  return new Address({ value: new Bytes20({ value: paddedAddress }) });
}

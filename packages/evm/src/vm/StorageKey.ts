/**
 * Storage Key for EVM storage operations
 *
 * Represents a unique storage location identified by an address and slot.
 * Uses Data.Class for automatic Equal and Hash trait implementation.
 */

import type { Address, Bytes32 } from "@evm-effect/ethereum-types";
import { hash } from "@evm-effect/ethereum-types/utils";

import { Data, Equal, Hash } from "effect";

/**
 * StorageKey uniquely identifies a storage slot for an address.
 *
 * Automatically implements Equal and Hash traits via Data.Class
 * to work correctly with Effect's MutableHashSet and other data structures.
 */
export class StorageKey extends Data.Class<{
  address: Address;
  slot: Bytes32;
}> {
  [Equal.symbol](that: Equal.Equal): boolean {
    if (!(that instanceof StorageKey)) {
      return false;
    }
    return (
      Equal.equals(this.address, that.address) &&
      Equal.equals(this.slot, that.slot)
    );
  }

  [Hash.symbol](): number {
    const buf = new Uint8Array(
      this.address.value.value.length + this.slot.value.length,
    );
    buf.set(this.address.value.value);
    buf.set(this.slot.value, this.address.value.value.length);
    return hash(buf);
  }
}

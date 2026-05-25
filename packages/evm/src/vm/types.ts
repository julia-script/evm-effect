import { keccak256 } from "@evm-effect/crypto";
import { Bytes, U256, Uint } from "@evm-effect/ethereum-types";
import { uint8ArrayEquals } from "@evm-effect/ethereum-types/utils";
import rlp, { type Extended, type Simple } from "@evm-effect/rlp";
import { Effect, Equal, Hash, Schema } from "effect";
import { Rlp } from "../rlp.js";
import type { Fork } from "./Fork.js";

/**
 * State associated with an Ethereum address
 */
export class Account
  extends Schema.TaggedClass<Account>("Account")("Account", {
    nonce: Uint,
    balance: U256,
    code: Bytes,
  })
  implements Rlp.ToExtendedTag
{
  [Rlp.ToExtendedTag] = Effect.fn("Account.ToExtended")(function* (
    this: Account,
  ): Effect.fn.Return<Readonly<Extended>, Rlp.RlpError, Fork> {
    return [this.nonce, this.balance, this.code];
  });
  static [Rlp.FromSimpleTag] = Effect.fn("Account.FromSimple")(function* (
    simple: Readonly<Simple>,
  ): Effect.fn.Return<Account, Rlp.RlpError, Fork> {
    if (!Array.isArray(simple)) {
      return yield* Effect.fail(Rlp.RlpError.cantDecode("Account", simple));
    }
    return Account.make({
      nonce: yield* Rlp.fromSimple(Uint, simple[0]),
      balance: yield* Rlp.fromSimple(U256, simple[1]),
      code: yield* Rlp.fromSimple(Bytes, simple[2]),
    });
  });
  /**
   * Create a new empty account
   */
  static empty(): Account {
    return new Account({
      nonce: new Uint({ value: 0n }),
      balance: new U256({ value: 0n }),
      code: new Bytes({ value: new Uint8Array(0) }),
    });
  }

  /**
   * Check if this account is empty
   */
  isEmpty(): boolean {
    return (
      this.nonce.value === 0n &&
      this.balance.value === 0n &&
      this.code.value.length === 0
    );
  }

  /**
   * Create a copy with updated fields
   */
  withNonce(nonce: Uint): Account {
    return new Account({
      nonce,
      balance: this.balance,
      code: this.code,
    });
  }

  withBalance(balance: U256): Account {
    return new Account({
      nonce: this.nonce,
      balance,
      code: this.code,
    });
  }

  withCode(code: Bytes): Account {
    return new Account({
      nonce: this.nonce,
      balance: this.balance,
      code,
    });
  }

  encode(storageRoot: Bytes): Bytes {
    const code = keccak256(this.code);
    return rlp.encode([this.nonce, this.balance, storageRoot, code]);
  }

  [Equal.symbol](that: Equal.Equal): boolean {
    if (!(that instanceof Account)) {
      return false;
    }
    const encoded = this.encode(new Bytes({ value: new Uint8Array(0) }));
    const thatEncoded = that.encode(new Bytes({ value: new Uint8Array(0) }));
    return uint8ArrayEquals(encoded.value, thatEncoded.value);
    // return Equal.equals(this.nonce, that.nonce) && Equal.equals(this.balance, that.balance) && Equal.equals(this.code, that.code);
  }
  [Hash.symbol](): number {
    const encoded = this.encode(new Bytes({ value: new Uint8Array(0) }));
    return Hash.hash(encoded.value);
  }
}

/**
 * Empty account constant
 */
export const EMPTY_ACCOUNT = Account.empty();

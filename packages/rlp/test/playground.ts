import { Address, Bytes, U8 } from "@evm-effect/ethereum-types";
import { Int, U64, U256, Uint } from "@evm-effect/ethereum-types/numeric";
import { Result, Schema } from "effect";
import { decodeTo, encodeTo } from "../src/index.ts";

/**
 * Authorization for EIP-7702 set code transactions.
 *
 * Allows EOAs to temporarily set contract code on their account.
 */
export class Authorization extends Schema.TaggedClass<Authorization>(
  "Authorization",
)("Authorization", {
  chainId: U256,
  address: Address,
  abc: Int,
  nonce: U64,
  yParity: U8,
  r: U256,
  s: U256,
}) {}
class Account extends Schema.TaggedClass<Account>("Account")("Account", {
  nonce: Uint,
  balance: U256,
  code: Bytes,
  authorization: Authorization,
}) {}

const authorization = Authorization.make({
  chainId: new U256({ value: 4n }),
  abc: new Int({ value: 2n }),
  address: Result.getOrThrow(
    Address.fromHex("0xffffffffffffffffffffffffffffffffffffffff"),
  ),
  nonce: new U64({ value: 5n }),
  yParity: new U8({ value: 6n }),
  r: new U256({ value: 7n }),
  s: new U256({ value: 8n }),
});
const account = Account.make({
  nonce: new Uint({ value: 1n }),
  balance: new U256({ value: 2n }),
  code: new Bytes({ value: new Uint8Array([1, 2, 3]) }),
  authorization: authorization,
});
const encoded = encodeTo(Account, account);
const decoded = decodeTo(Account, Result.getOrThrow(encoded));
console.log(decoded);
// const _encodedAccount = accounteEncoder(account);

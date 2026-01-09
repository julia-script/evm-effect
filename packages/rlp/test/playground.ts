import { inspect } from "bun:util";
import {
  Address,
  Bytes,
  isAddress,
  isEvmType,
  isEvmTypeClass,
  U8,
} from "@evm-effect/ethereum-types";
import {
  Int,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types/dist/numeric.js";
import { Either, Schema } from "effect";
import { encode, RlpError, type RlpInput } from "../src/index.js";

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

type OrderedKey = string | [string, OrderedKey[]];
function collectOrderedKeys(
  schema: Schema.Schema.All | Schema.Struct<Schema.Struct.Fields>,
  seen: Set<Schema.Schema.All> = new Set(),
) {
  const keys: OrderedKey[] = [];
  if ("fields" in schema && !isEvmTypeClass(schema) && !seen.has(schema)) {
    if (seen.has(schema)) {
      throw new Error(`Cycle detected: ${schema}`);
    }
    seen.add(schema);

    for (const [key, value] of Object.entries(schema.fields)) {
      if ("fields" in value && !isEvmTypeClass(value)) {
        keys.push([
          key,
          collectOrderedKeys(
            value as Schema.Schema.All | Schema.Struct<Schema.Struct.Fields>,
          ),
        ]);
        continue;
      }
      keys.push(key);
    }
    // keys.push(keys)
  }

  return keys;
}
type RlpInputRecord = {
  [key: string]: RlpInput | Address | RlpInputRecord;
};

const makeEncoder = <
  S extends Schema.Schema.All | Schema.Struct<Schema.Struct.Fields>,
>(
  schema: S,
) => {
  const keys = collectOrderedKeys(schema);
  console.log(inspect(keys, { depth: null }));
  const encodeOrderedKeysInner = (
    input: RlpInput | Address | RlpInputRecord,
    keys: OrderedKey[],
  ): Either.Either<RlpInput, RlpError> => {
    if (isEvmType(input) || input instanceof Int) {
      return Either.right(input);
    }
    const rlpInputs: RlpInput[] = [];
    for (const entry of keys) {
      if (typeof entry === "string") {
        if (entry === "_tag") continue;
        const value = input[entry] as unknown;
        if (isEvmType(value)) {
          if (isAddress(value)) {
            rlpInputs.push(value.value);
          } else {
            rlpInputs.push(value);
          }
        } else {
          return Either.left(
            new RlpError({ message: `Expected ${entry} to be a evm type` }),
          );
        }
        continue;
      }
      {
        const [key, fields] = entry;
        const value = input[key] as unknown;
        const encoded = encodeOrderedKeysInner(value, fields);
        if (Either.isLeft(encoded)) {
          return encoded;
        }
        rlpInputs.push(encoded.right);
      }
    }
    return Either.right(rlpInputs);
  };
  return (input: S["Type"]) => {
    const rlpInputs = encodeOrderedKeysInner(input, keys);
    console.log(inspect(rlpInputs, { depth: null, colors: true }));
    if (Either.isLeft(rlpInputs)) {
      return rlpInputs;
    }
    return encode(rlpInputs.right);
  };
};
const authorization = Authorization.make({
  chainId: new U256({ value: 4n }),
  abc: new Int({ value: 2n }),
  address: Either.getOrThrow(
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
const accounteEncoder = makeEncoder(Account);
const _encodedAccount = accounteEncoder(account);

/**
 * Merkle Patricia Trie implementation
 *
 * A persistent, immutable key-value store with cryptographic proof capabilities
 */

import { keccak256 } from "@evm-effect/crypto";
import {
  Address,
  type AnyBytes,
  Bytes,
  Bytes32,
  type Root,
  type U256,
} from "@evm-effect/ethereum-types";
import rlp, { type Extended } from "@evm-effect/rlp";
import { HashMap } from "@evm-effect/shared/hashmap";
import { Data, Either, Equal, Match, Option } from "effect";
import { isTagged } from "effect/Predicate";
import { Withdrawal } from "../types/Block.js";
import { Receipt } from "../types/Receipt.js";
import {
  AccessListTransaction,
  BlobTransaction,
  FeeMarketTransaction,
  LegacyTransaction,
  SetCodeTransaction,
  type Transaction,
} from "../types/Transaction.js";
import { Account } from "../vm/types.js";
import {
  bytesToNibbleList,
  commonPrefixLength,
  nibbleListToCompact,
} from "./nibbles.js";
import { TrieError } from "./TrieError.js";
/**
 * Empty trie root constant
 *
 * keccak256(RLP(b'')) =
 * 56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421
 */
export const EMPTY_TRIE_ROOT = new Bytes32({
  value: new Uint8Array([
    0x56, 0xe8, 0x1f, 0x17, 0x1b, 0xcc, 0x55, 0xa6, 0xff, 0x83, 0x45, 0xe6,
    0x92, 0xc0, 0xf8, 0x6e, 0x5b, 0x48, 0xe0, 0x1b, 0x99, 0x6c, 0xad, 0xc0,
    0x01, 0x62, 0x2f, 0xb5, 0xe3, 0x63, 0xb4, 0x21,
  ]),
});
// Trie[Address, Optional[Account]
// Trie[Bytes32, U256]
// Trie[Bytes, Optional[Bytes | LegacyTransaction]
// Trie[Bytes, Optional[Bytes | Receipt]
// Trie[Bytes, Optional[Transaction]
// Trie[Bytes, Optional[Receipt]
// Trie[Bytes, Optional[Bytes | Withdrawal]
// Trie[Bytes20, Optional[FrontierAccount]
export type TrieKey = AnyBytes | Address;
export type TrieValue =
  | Account
  | Address
  | Bytes
  | LegacyTransaction
  | Receipt
  | Receipt
  | Transaction
  | U256
  | Withdrawal;

export type BranchSubnodes = [
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
  Extended,
];
type LeafNode = {
  _tag: "LeafNode";
  restOfKey: Bytes;
  value: Extended;
};
// const _LeafNode = Data.tagged<LeafNode>("LeafNode");
export type ExtensionNode = {
  _tag: "ExtensionNode";
  keySegment: Bytes;
  subnode: Extended;
};
export const ExtensionNode = Data.tagged<ExtensionNode>("ExtensionNode");

type BranchNode = {
  _tag: "BranchNode";
  subnodes: BranchSubnodes;
  value: Extended;
};
// const _BranchNode = Data.tagged<BranchNode>("BranchNode");

export type InternalNode = LeafNode | ExtensionNode | BranchNode;

function encodeInternalNode(maybeNode: Option.Option<InternalNode>): Extended {
  let unencoded: Extended;
  if (Option.isNone(maybeNode)) {
    unencoded = new Bytes({ value: new Uint8Array(0) });
  } else if (maybeNode.value._tag === "LeafNode") {
    unencoded = [
      nibbleListToCompact(maybeNode.value.restOfKey, true),
      maybeNode.value.value,
    ];
  } else if (maybeNode.value._tag === "ExtensionNode") {
    unencoded = [
      nibbleListToCompact(maybeNode.value.keySegment, false),
      maybeNode.value.subnode,
    ];
  } else if (maybeNode.value._tag === "BranchNode") {
    unencoded = [...maybeNode.value.subnodes, maybeNode.value.value];
  } else {
    throw new Error("Unreachable");
  }

  const encoded = rlp.encode(unencoded);
  if (encoded.value.length < 32) {
    return unencoded;
  }
  return keccak256(encoded);
}

function encodeNode(
  node: TrieValue,
  storageRoot: Option.Option<Bytes> = Option.none(),
) {
  return Match.value(node).pipe(
    Match.tags({
      Account: (account) => {
        if (Option.isNone(storageRoot)) {
          return Either.left(
            new TrieError({
              message: "Storage root is required for account encoding",
            }),
          );
        }
        return Either.right(account.encode(storageRoot.value));
      },
      LegacyTransaction: (legacyTransaction) => {
        return rlp
          .encodeTo(LegacyTransaction, legacyTransaction)
          .pipe(
            Either.mapLeft(
              (error) => new TrieError({ message: error.message }),
            ),
          );
      },
      AccessListTransaction: (accessListTransaction) => {
        return rlp
          .encodeTo(AccessListTransaction, accessListTransaction)
          .pipe(
            Either.mapLeft(
              (error) => new TrieError({ message: error.message }),
            ),
          );
      },
      FeeMarketTransaction: (feeMarketTransaction) => {
        return rlp
          .encodeTo(FeeMarketTransaction, feeMarketTransaction)
          .pipe(
            Either.mapLeft(
              (error) => new TrieError({ message: error.message }),
            ),
          );
      },
      BlobTransaction: (blobTransaction) => {
        return rlp
          .encodeTo(BlobTransaction, blobTransaction)
          .pipe(
            Either.mapLeft(
              (error) => new TrieError({ message: error.message }),
            ),
          );
      },
      SetCodeTransaction: (setCodeTransaction) => {
        return rlp
          .encodeTo(SetCodeTransaction, setCodeTransaction)
          .pipe(
            Either.mapLeft(
              (error) => new TrieError({ message: error.message }),
            ),
          );
      },
      Receipt: (receipt) => {
        return rlp
          .encodeTo(Receipt, receipt)
          .pipe(
            Either.mapLeft(
              (error) => new TrieError({ message: error.message }),
            ),
          );
      },
      Withdrawal: (withdrawal) => {
        return rlp
          .encodeTo(Withdrawal, withdrawal)
          .pipe(
            Either.mapLeft(
              (error) => new TrieError({ message: error.message }),
            ),
          );
      },
      U256: (u256) => {
        return Either.right(rlp.encode(u256));
      },
      Bytes: (bytes) => {
        return Either.right(bytes);
      },
      Address: (address) => {
        return Either.right(new Bytes({ value: address.value.value }));
      },
    }),
    Match.exhaustive,
  );
}

// const test = new Trie<Bytes, Bytes, null>(false, null, MutableHashMap.empty());
// type TrieType = Trie<Bytes, Bytes, Option.Option<Bytes>>;
export class Trie<
  K extends TrieKey,
  V extends TrieValue,
  D extends V | null = V,
> extends Data.TaggedClass("Trie")<{
  readonly secured: boolean;
  readonly default: D;
  readonly _data: HashMap<K, V>;
}> {
  static empty<K extends TrieKey, V extends TrieValue, D extends V | null = V>(
    secured: boolean,
    defaultValue: D,
  ): Trie<K, V, D> {
    return new Trie({
      secured,
      default: defaultValue,
      _data: HashMap.empty(),
    });
  }

  set(key: K, value: V | D) {
    if (Equal.equals(value, this.default)) {
      this._data.remove(key);
    } else {
      this._data.set(key, value as V);
    }
  }

  get(key: K): V | D {
    return this._data.get(key) ?? this.default;
  }

  copy() {
    return new Trie({
      secured: this.secured,
      default: this.default,
      _data: this._data.clone(),
    });
  }
}
function prepareTrie<
  K extends TrieKey,
  V extends TrieValue,
  D extends V | null = V,
>(
  trie: Trie<K, V, D>,
  getStorageRoot: Option.Option<(address: Address) => Root>,
) {
  const mapped = HashMap.empty<Bytes, Bytes>();
  for (const { key: preimage, value } of trie._data.entries()) {
    let encoded: Bytes = new Bytes({ value: new Uint8Array(0) });
    if (value instanceof Account) {
      if (Option.isNone(getStorageRoot)) {
        return Either.left(
          new TrieError({
            message: "Storage root is required for account encoding",
          }),
        );
      }
      if (!isTagged(preimage, Address._tag)) {
        return Either.left(new TrieError({ message: "Key is not an address" }));
      }

      const storageRoot = getStorageRoot.value(preimage);
      const encodedValue = encodeNode(
        value,
        Option.some(new Bytes({ value: storageRoot.value })),
      );
      if (Either.isLeft(encodedValue)) {
        return Either.left(encodedValue.left);
      }
      encoded = encodedValue.right;
    } else {
      const encodedValue = encodeNode(value, Option.none());
      if (Either.isLeft(encodedValue)) {
        return Either.left(encodedValue.left);
      }
      encoded = encodedValue.right;
    }
    if (encoded.value.length === 0) {
      return Either.left(new TrieError({ message: "Encoded value is empty" }));
    }

    // const key = trie.secured ? keccak256({ value: preimage.value }) : preimage;
    const keyAsBytes = new Bytes({
      value: isTagged(preimage, Address._tag)
        ? preimage.value.value
        : preimage.value,
    });
    const key = trie.secured
      ? new Bytes({ value: keccak256(keyAsBytes).value })
      : keyAsBytes;
    const nibbleKey = bytesToNibbleList(key);

    mapped.set(nibbleKey, encoded);
  }
  return Either.right(mapped);
}

const patricialize = (
  mapped: HashMap<Bytes, Bytes>,
  level: number,
): Option.Option<InternalNode> => {
  const keys = [...mapped.keys()];
  const arbitraryKey = keys[0];

  if (!arbitraryKey) {
    return Option.none();
  }

  if (keys.length === 1) {
    const value = mapped.get(arbitraryKey) as Bytes;
    return Option.some({
      _tag: "LeafNode",
      restOfKey: new Bytes({ value: arbitraryKey.value.slice(level) }),
      value: value,
    });
  }

  const substring = arbitraryKey.value.slice(level);
  let prefixLength = substring.length;
  for (const key of keys) {
    prefixLength = Math.min(
      prefixLength,
      commonPrefixLength(
        new Bytes({ value: substring }),
        new Bytes({ value: key.value.slice(level) }),
      ),
    );
    // prefixLength = Math.min(prefixLength, commonPrefixLength(substring, key.value.slice(level)));
    if (prefixLength === 0) {
      break;
    }
  }

  if (prefixLength > 0) {
    const prefix = arbitraryKey.value.slice(level, level + prefixLength);
    return Option.some({
      _tag: "ExtensionNode",
      keySegment: new Bytes({ value: prefix }),
      subnode: encodeInternalNode(patricialize(mapped, level + prefixLength)),
    });
  }

  const branches: Array<HashMap<Bytes, Bytes>> = [];
  for (let i = 0; i < 16; i++) {
    branches.push(HashMap.empty());
  }
  let value = new Bytes({ value: new Uint8Array(0) });
  for (const key of keys) {
    if (key.value.length === level) {
      value = mapped.get(key) as Bytes;
    } else {
      branches[key.value[level]].set(key, mapped.get(key) as Bytes);
    }
  }
  const subnodes = branches.map((branch) =>
    encodeInternalNode(patricialize(branch, level + 1)),
  ) as BranchSubnodes;
  return Option.some({
    _tag: "BranchNode",
    subnodes: subnodes,
    value: value,
  });
};

export const root = <
  K extends TrieKey,
  V extends TrieValue,
  D extends V | null = V,
>(
  trie: Trie<K, V, D>,
  getStorageRoot: Option.Option<(address: Address) => Root>,
): Either.Either<Root, TrieError> => {
  const obj = prepareTrie(trie, getStorageRoot);
  if (Either.isLeft(obj)) {
    return Either.left(obj.left);
  }

  const rootNode = encodeInternalNode(patricialize(obj.right, 0));
  const rlpEncoded = rlp.encode(rootNode);
  if (rlpEncoded.value.length < 32) {
    return Either.right(keccak256(rlpEncoded));
  }
  return Either.right(new Bytes32({ value: rlpEncoded.value }));
};

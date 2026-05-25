/**
 * Transaction types for Ethereum.
 *
 * Osaka fork supports 5 transaction types:
 * - Legacy (pre-EIP-2718)
 * - AccessList (EIP-2930)
 * - FeeMarket (EIP-1559)
 * - Blob (EIP-4844)
 * - SetCode (EIP-7702)
 *
 * @module
 */

import { keccak256 } from "@evm-effect/crypto/keccak256";
import {
  Address,
  Bytes,
  Bytes0,
  Bytes32,
  type Hash32,
  U8,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import rlp, { type Extended, type Simple } from "@evm-effect/rlp";
import { stringify } from "@evm-effect/shared/stringify";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { ECDSASignOpts } from "@noble/secp256k1";
import * as secp256k1 from "@noble/secp256k1";
import { Data, Effect, Equal, Match, Result, Schema } from "effect";
import { Rlp } from "./rlp.js";
import type { Fork } from "./vm/ForkService.js";

secp256k1.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);
secp256k1.hashes.sha256 = sha256;
export const TX_BASE_COST = new Uint({ value: 21000n });

export const FLOOR_CALLDATA_COST = new Uint({ value: 10n });
export const STANDARD_CALLDATA_TOKEN_COST = new Uint({ value: 4n });

export const TX_CREATE_COST = new Uint({ value: 32000n });
export const TX_ACCESS_LIST_ADDRESS_COST = new Uint({ value: 2400n });
export const TX_ACCESS_LIST_STORAGE_KEY_COST = new Uint({ value: 1900n });
export const TX_MAX_GAS_LIMIT = new Uint({ value: 16_777_216n });
const MaybeAddress = Schema.Union([Bytes0, Address]).pipe(
  Schema.withDecodingDefaultTypeKey(Effect.succeed(Bytes0.empty)),
);

const maybeAddressFromSimple = Effect.fn("maybeAddressFromSimple")(function* (
  simple: Readonly<Simple>,
): Effect.fn.Return<(typeof MaybeAddress)["Type"], Rlp.RlpError, Fork> {
  if (simple instanceof Bytes) {
    if (simple.length === 0) {
      return Bytes0.empty;
    }
    return yield* Rlp.fromSimple(Address, simple);
  }
  return yield* Effect.fail(Rlp.RlpError.cantDecode("MaybeAddress", simple));
});
export class Authorization
  extends Schema.TaggedClass<Authorization>("Authorization")("Authorization", {
    chainId: U256,
    address: MaybeAddress,
    nonce: U64,
    yParity: U8,
    r: U256,
    s: U256,
  })
  implements Rlp.ToExtendedTag
{
  [Rlp.ToExtendedTag] = () => {
    return Effect.succeed([
      this.chainId,
      this.address,
      this.nonce,
      this.yParity,
      this.r,
      this.s,
    ]);
  };
  static [Rlp.FromSimpleTag] = Effect.fn("Authorization.FromSimple")(function* (
    simple: Readonly<Simple>,
  ): Effect.fn.Return<Authorization, Rlp.RlpError, Fork> {
    if (!Array.isArray(simple)) {
      return yield* Effect.fail(
        new Rlp.RlpError({
          message: `Authorization can't be decoded from ${stringify(simple)}`,
        }),
      );
    }
    return Authorization.make({
      chainId: yield* Rlp.fromSimple(U256, simple[0]),
      address: yield* Rlp.fromSimple(Address, simple[1]),
      nonce: yield* Rlp.fromSimple(U64, simple[2]),
      yParity: yield* Rlp.fromSimple(U8, simple[3]),
      r: yield* Rlp.fromSimple(U256, simple[4]),
      s: yield* Rlp.fromSimple(U256, simple[5]),
    });
  });
}
/**
 * Access list entry specifying an account and its storage slots.
 *
 */
export class Access
  extends Schema.TaggedClass<Access>()("Access", {
    account: Address,
    slots: Schema.Array(Bytes32),
  })
  implements Rlp.ToExtendedTag
{
  [Rlp.ToExtendedTag] = () => {
    return Effect.succeed([this.account, this.slots.map((slot) => slot.value)]);
  };

  static [Rlp.FromSimpleTag] = Effect.fn("Access.FromSimple")(function* (
    simple: Readonly<Simple>,
  ): Effect.fn.Return<Access, Rlp.RlpError, Fork> {
    if (!Array.isArray(simple)) {
      return yield* Effect.fail(Rlp.RlpError.cantDecode("Access", simple));
    }
    return Access.make({
      account: yield* Rlp.fromSimple(Address, simple[0]),
      slots: yield* Rlp.fromSimpleList(Bytes32, simple[1]),
    });
  });

  [Equal.symbol](that: Equal.Equal): boolean {
    if (!(that instanceof Access)) {
      return false;
    }

    const b = that;
    if (!Equal.equals(this.account, b.account)) {
      return false;
    }
    if (this.slots.length !== b.slots.length) {
      return false;
    }
    for (let i = 0; i < this.slots.length; i++) {
      console.log(this.slots[i].toHex(), b.slots[i].toHex());
      if (!Equal.equals(this.slots[i], b.slots[i])) {
        return false;
      }
    }
    return true;
    // return Equal.equals(a.account, b.account) && Equal.equals(a.slots, b.slots);
  }
}

const defaultU256 = U256.pipe(
  Schema.withConstructorDefault(Effect.succeed(U256.constant(0n))),
);
const defaultU8 = U8.pipe(
  Schema.withConstructorDefault(Effect.succeed(U8.constant(0n))),
);
/**
 * Legacy transaction (pre-EIP-2718).
 *
 */
export class LegacyTransaction
  extends Schema.TaggedClass<LegacyTransaction>()("LegacyTransaction", {
    nonce: U256,
    gasPrice: Uint,
    gas: Uint,
    to: MaybeAddress,
    value: U256,
    data: Bytes,
    v: defaultU256,
    r: defaultU256,
    s: defaultU256,
    chainId: U64.pipe(Schema.optional),
  })
  implements Rlp.ToExtendedTag
{
  [Rlp.ToExtendedTag] = Effect.fn("LegacyTransaction.ToExtended")(function* (
    this: LegacyTransaction,
  ) {
    return [
      this.nonce,
      this.gasPrice,
      this.gas,
      this.to,
      this.value,
      this.data,
      this.v,
      this.r,
      this.s,
    ];
  });

  static [Rlp.FromSimpleTag] = Effect.fn("LegacyTransaction.FromExtended")(
    function* (
      simple: Readonly<Simple>,
    ): Effect.fn.Return<LegacyTransaction, Rlp.RlpError, Fork> {
      if (!Array.isArray(simple)) {
        return yield* Effect.fail(
          Rlp.RlpError.cantDecode("LegacyTransaction", simple),
        );
      }
      const v = yield* Rlp.fromSimple(U256, simple[6]);
      const chainId =
        v.value < 35n ? undefined : new U64({ value: (v.value - 35n) / 2n });

      return LegacyTransaction.make({
        chainId: chainId,
        nonce: yield* Rlp.fromSimple(U256, simple[0]),
        gasPrice: yield* Rlp.fromSimple(Uint, simple[1]),
        gas: yield* Rlp.fromSimple(Uint, simple[2]),
        to: yield* maybeAddressFromSimple(simple[3]),
        value: yield* Rlp.fromSimple(U256, simple[4]),
        data: yield* Rlp.fromSimple(Bytes, simple[5]),
        v: yield* Rlp.fromSimple(U256, simple[6]),
        r: yield* Rlp.fromSimple(U256, simple[7]),
        s: yield* Rlp.fromSimple(U256, simple[8]),
      });
    },
  );
}
/**
 * Access list transaction (EIP-2930).
 *
 * Extends legacy transactions with:
 * - Chain ID for replay protection
 * - Access list for storage pre-warming
 */
export class AccessListTransaction
  extends Schema.TaggedClass<AccessListTransaction>()("AccessListTransaction", {
    chainId: U64,
    nonce: U256,
    gasPrice: Uint,
    gas: Uint,
    to: MaybeAddress,
    value: U256,
    data: Bytes,
    accessList: Schema.Array(Access),
    yParity: defaultU8,
    r: defaultU256,
    s: defaultU256,
  })
  implements Rlp.ToExtendedTag
{
  [Rlp.ToExtendedTag] = Effect.fn("AccessListTransaction.ToExtended")(
    function* (this: AccessListTransaction) {
      const accessList: Extended = yield* Rlp.toExtendedList(this.accessList);
      return [
        this.chainId,
        this.nonce,
        this.gasPrice,
        this.gas,
        this.to,
        this.value,
        this.data,
        accessList,
        this.yParity,
        this.r,
        this.s,
      ];
    },
  );
  static [Rlp.FromSimpleTag] = Effect.fn("AccessListTransaction.FromSimple")(
    function* (
      simple: Readonly<Simple>,
    ): Effect.fn.Return<AccessListTransaction, Rlp.RlpError, Fork> {
      if (!Array.isArray(simple)) {
        return yield* Effect.fail(
          Rlp.RlpError.cantDecode("AccessListTransaction", simple),
        );
      }
      return AccessListTransaction.make({
        chainId: yield* Rlp.fromSimple(U64, simple[0]),
        nonce: yield* Rlp.fromSimple(U256, simple[1]),
        gasPrice: yield* Rlp.fromSimple(Uint, simple[2]),
        gas: yield* Rlp.fromSimple(Uint, simple[3]),
        to: yield* maybeAddressFromSimple(simple[4]),
        value: yield* Rlp.fromSimple(U256, simple[5]),
        data: yield* Rlp.fromSimple(Bytes, simple[6]),
        accessList: yield* Rlp.fromSimpleList(Access, simple[7]),
        yParity: yield* Rlp.fromSimple(U8, simple[8]),
        r: yield* Rlp.fromSimple(U256, simple[9]),
        s: yield* Rlp.fromSimple(U256, simple[10]),
      });
    },
  );
}
/**
 * Fee market transaction (EIP-1559).
 */
export class FeeMarketTransaction
  extends Schema.TaggedClass<FeeMarketTransaction>()("FeeMarketTransaction", {
    chainId: U64,
    nonce: U256,
    maxPriorityFeePerGas: Uint,
    maxFeePerGas: Uint,
    gas: Uint,
    to: MaybeAddress,
    value: U256,
    data: Bytes,
    accessList: Schema.Array(Access),
    yParity: defaultU8,
    r: defaultU256,
    s: defaultU256,
  })
  implements Rlp.ToExtendedTag
{
  [Rlp.ToExtendedTag] = Effect.fn("FeeMarketTransaction.ToExtended")(function* (
    this: FeeMarketTransaction,
  ) {
    const accessList: Extended = yield* Rlp.toExtendedList(this.accessList);
    return [
      this.chainId,
      this.nonce,
      this.maxPriorityFeePerGas,
      this.maxFeePerGas,
      this.gas,
      this.to,
      this.value,
      this.data,
      accessList,
      this.yParity,
      this.r,
      this.s,
    ];
  });

  static [Rlp.FromSimpleTag] = Effect.fn("FeeMarketTransaction.FromSimple")(
    function* (
      simple: Readonly<Simple>,
    ): Effect.fn.Return<FeeMarketTransaction, Rlp.RlpError, Fork> {
      if (!Array.isArray(simple)) {
        return yield* Effect.fail(
          Rlp.RlpError.cantDecode("FeeMarketTransaction", simple),
        );
      }
      return FeeMarketTransaction.make({
        chainId: yield* Rlp.fromSimple(U64, simple[0]),
        nonce: yield* Rlp.fromSimple(U256, simple[1]),
        maxPriorityFeePerGas: yield* Rlp.fromSimple(Uint, simple[2]),
        maxFeePerGas: yield* Rlp.fromSimple(Uint, simple[3]),
        gas: yield* Rlp.fromSimple(Uint, simple[4]),
        to: yield* maybeAddressFromSimple(simple[5]),
        value: yield* Rlp.fromSimple(U256, simple[6]),
        data: yield* Rlp.fromSimple(Bytes, simple[7]),
        accessList: yield* Rlp.fromSimpleList(Access, simple[8]),
        yParity: yield* Rlp.fromSimple(U8, simple[9]),
        r: yield* Rlp.fromSimple(U256, simple[10]),
        s: yield* Rlp.fromSimple(U256, simple[11]),
      });
    },
  );
}
/**
 * Blob transaction (EIP-4844).
 */
export class BlobTransaction
  extends Schema.TaggedClass<BlobTransaction>()("BlobTransaction", {
    chainId: U64,
    nonce: U256,
    maxPriorityFeePerGas: Uint,
    maxFeePerGas: Uint,
    gas: Uint,
    to: Address,
    value: U256,
    data: Bytes,
    accessList: Schema.Array(Access),
    maxFeePerBlobGas: U256,
    blobVersionedHashes: Schema.Array(Bytes32),
    yParity: defaultU8,
    r: defaultU256,
    s: defaultU256,
  })
  implements Rlp.ToExtendedTag
{
  [Rlp.ToExtendedTag] = Effect.fn("BlobTransaction.ToExtended")(function* (
    this: BlobTransaction,
  ) {
    const accessList: Extended = yield* Rlp.toExtendedList(this.accessList);
    return [
      this.chainId,
      this.nonce,
      this.maxPriorityFeePerGas,
      this.maxFeePerGas,
      this.gas,
      this.to,
      this.value,
      this.data,
      accessList,
      this.maxFeePerBlobGas,
      this.blobVersionedHashes,
      this.yParity,
      this.r,
      this.s,
    ];
  });

  static [Rlp.FromSimpleTag] = Effect.fn("BlobTransaction.FromSimple")(
    function* (
      simple: Readonly<Simple>,
    ): Effect.fn.Return<BlobTransaction, Rlp.RlpError, Fork> {
      if (!Array.isArray(simple)) {
        return yield* Effect.fail(
          Rlp.RlpError.cantDecode("BlobTransaction", simple),
        );
      }
      return BlobTransaction.make({
        chainId: yield* Rlp.fromSimple(U64, simple[0]),
        nonce: yield* Rlp.fromSimple(U256, simple[1]),
        maxPriorityFeePerGas: yield* Rlp.fromSimple(Uint, simple[2]),
        maxFeePerGas: yield* Rlp.fromSimple(Uint, simple[3]),
        gas: yield* Rlp.fromSimple(Uint, simple[4]),
        to: yield* Rlp.fromSimple(Address, simple[5]),
        value: yield* Rlp.fromSimple(U256, simple[6]),
        data: yield* Rlp.fromSimple(Bytes, simple[7]),
        accessList: yield* Rlp.fromSimpleList(Access, simple[8]),
        maxFeePerBlobGas: yield* Rlp.fromSimple(U256, simple[9]),
        blobVersionedHashes: yield* Rlp.fromSimpleList(Bytes32, simple[10]),
        yParity: yield* Rlp.fromSimple(U8, simple[11]),
        r: yield* Rlp.fromSimple(U256, simple[12]),
        s: yield* Rlp.fromSimple(U256, simple[13]),
      });
    },
  );
}

/**
 * Set code transaction (EIP-7702).
 */
export class SetCodeTransaction
  extends Schema.TaggedClass<SetCodeTransaction>()("SetCodeTransaction", {
    chainId: U64,
    nonce: U64,
    maxPriorityFeePerGas: Uint,
    maxFeePerGas: Uint,
    gas: Uint,
    to: MaybeAddress,
    value: U256,
    data: Bytes,
    accessList: Schema.Array(Access),
    authorizations: Schema.Array(Authorization),
    yParity: defaultU8,
    r: defaultU256,
    s: defaultU256,
  })
  implements Rlp.ToExtendedTag
{
  [Rlp.ToExtendedTag] = Effect.fn("SetCodeTransaction.ToExtended")(function* (
    this: SetCodeTransaction,
  ) {
    const accessList: Extended = yield* Rlp.toExtendedList(this.accessList);
    const authorizations: Extended = yield* Rlp.toExtendedList(
      this.authorizations,
    );
    return [
      this.chainId,
      this.nonce,
      this.maxPriorityFeePerGas,
      this.maxFeePerGas,
      this.gas,
      this.to,
      this.value,
      this.data,
      accessList,
      authorizations,
      this.yParity,
      this.r,
      this.s,
    ];
  });

  static [Rlp.FromSimpleTag] = Effect.fn("SetCodeTransaction.FromSimple")(
    function* (
      simple: Readonly<Simple>,
    ): Effect.fn.Return<SetCodeTransaction, Rlp.RlpError, Fork> {
      if (!Array.isArray(simple)) {
        return yield* Effect.fail(
          Rlp.RlpError.cantDecode("SetCodeTransaction", simple),
        );
      }
      return SetCodeTransaction.make({
        chainId: yield* Rlp.fromSimple(U64, simple[0]),
        nonce: yield* Rlp.fromSimple(U64, simple[1]),
        maxPriorityFeePerGas: yield* Rlp.fromSimple(Uint, simple[2]),
        maxFeePerGas: yield* Rlp.fromSimple(Uint, simple[3]),
        gas: yield* Rlp.fromSimple(Uint, simple[4]),
        to: yield* maybeAddressFromSimple(simple[5]),
        value: yield* Rlp.fromSimple(U256, simple[6]),
        data: yield* Rlp.fromSimple(Bytes, simple[7]),
        accessList: yield* Rlp.fromSimpleList(Access, simple[8]),
        authorizations: yield* Rlp.fromSimpleList(Authorization, simple[9]),
        yParity: yield* Rlp.fromSimple(U8, simple[10]),
        r: yield* Rlp.fromSimple(U256, simple[11]),
        s: yield* Rlp.fromSimple(U256, simple[12]),
      });
    },
  );
}

export const Transaction = Schema.Union([
  LegacyTransaction,
  AccessListTransaction,
  FeeMarketTransaction,
  BlobTransaction,
  SetCodeTransaction,
]);

export type Transaction = (typeof Transaction)["Type"];

export const encodeTransaction = (
  transaction: Transaction,
): Effect.Effect<Bytes | LegacyTransaction, Rlp.RlpError, Fork> => {
  switch (transaction._tag) {
    case "LegacyTransaction":
      return Effect.succeed(transaction);
    case "AccessListTransaction":
      return Rlp.encode(transaction).pipe(
        Effect.map(
          (bytes) =>
            new Bytes({ value: new Uint8Array([0x01, ...bytes.value]) }),
        ),
      );
    case "FeeMarketTransaction":
      return Rlp.encode(transaction).pipe(
        Effect.map(
          (bytes) =>
            new Bytes({ value: new Uint8Array([0x02, ...bytes.value]) }),
        ),
      );
    case "BlobTransaction":
      return Rlp.encode(transaction).pipe(
        Effect.map(
          (bytes) =>
            new Bytes({ value: new Uint8Array([0x03, ...bytes.value]) }),
        ),
      );
    case "SetCodeTransaction":
      return Rlp.encode(transaction).pipe(
        Effect.map(
          (bytes) =>
            new Bytes({ value: new Uint8Array([0x04, ...bytes.value]) }),
        ),
      );
  }
};

export const decodeTransaction = Effect.fn("decodeTransaction")(function* (
  transaction: LegacyTransaction | Bytes,
): Effect.fn.Return<Transaction, Rlp.RlpError, Fork> {
  if (transaction._tag === "LegacyTransaction") {
    return transaction;
  }
  switch (transaction.value[0]) {
    case 0x01:
      return yield* Rlp.fromSimple(
        AccessListTransaction,
        yield* Rlp.decode(transaction.value.slice(1)),
      );
    case 0x02:
      return yield* Rlp.fromSimple(
        FeeMarketTransaction,
        yield* Rlp.decode(transaction.value.slice(1)),
      );
    case 0x03:
      return yield* Rlp.fromSimple(
        BlobTransaction,
        yield* Rlp.decode(transaction.value.slice(1)),
      );
    case 0x04:
      return yield* Rlp.fromSimple(
        SetCodeTransaction,
        yield* Rlp.decode(transaction.value.slice(1)),
      );
    default:
      return yield* Effect.fail(
        Rlp.RlpError.cantDecode("Transaction", transaction),
      );
  }
});

export const signingHashPre155 = (tx: LegacyTransaction): Hash32 => {
  return keccak256(
    rlp.encode([tx.nonce, tx.gasPrice, tx.gas, tx.to, tx.value, tx.data]),
  );
};

export const signingHash155 = (tx: LegacyTransaction, chainId: U64): Hash32 => {
  return keccak256(
    rlp.encode([
      tx.nonce,
      tx.gasPrice,
      tx.gas,
      tx.to,
      tx.value,
      tx.data,
      chainId,
      new Uint({ value: 0n }),
      new Uint({ value: 0n }),
    ]),
  );
};

export const signingHash2930 = (tx: AccessListTransaction): Hash32 => {
  return keccak256(
    new Uint8Array([
      0x01,
      ...rlp.encode([
        tx.chainId,
        tx.nonce,
        tx.gasPrice,
        tx.gas,
        tx.to,
        tx.value,
        tx.data,
        tx.accessList.map((access) => [access.account, [...access.slots]]),
      ]).value,
    ]),
  );
};

export const signingHash1559 = (tx: FeeMarketTransaction): Hash32 => {
  return keccak256(
    new Uint8Array([
      0x02,
      ...rlp.encode([
        tx.chainId,
        tx.nonce,
        tx.maxPriorityFeePerGas,
        tx.maxFeePerGas,
        tx.gas,
        tx.to,
        tx.value,
        tx.data,
        tx.accessList.map((access) => [access.account, [...access.slots]]),
      ]).value,
    ]),
  );
};

export const signingHash4844 = (tx: BlobTransaction): Hash32 => {
  return keccak256(
    new Uint8Array([
      0x03,
      ...rlp.encode([
        tx.chainId,
        tx.nonce,
        tx.maxPriorityFeePerGas,
        tx.maxFeePerGas,
        tx.gas,
        tx.to,
        tx.value,
        tx.data,
        tx.accessList.map((access) => [access.account, [...access.slots]]),
        tx.maxFeePerBlobGas,
        tx.blobVersionedHashes.map((hash) => hash.value),
      ]).value,
    ]),
  );
};

export const signingHash7702 = (tx: SetCodeTransaction): Hash32 => {
  return keccak256(
    new Uint8Array([
      0x04,
      ...rlp.encode([
        tx.chainId,
        tx.nonce,
        tx.maxPriorityFeePerGas,
        tx.maxFeePerGas,
        tx.gas,
        tx.to,
        tx.value,
        tx.data,
        tx.accessList.map((access) => [access.account, [...access.slots]]),
        tx.authorizations.map((authorization) => [
          authorization.chainId,
          authorization.address,
          authorization.nonce,
          authorization.yParity,
          authorization.r,
          authorization.s,
        ]),
      ]).value,
    ]),
  );
};

export class FailedToRecoverPublicKeyError extends Data.TaggedError(
  "FailedToRecoverPublicKeyError",
)<{
  readonly message?: string;
}> {}
export const recoverFromSignature = ({
  r,
  s,
  recoveryBit,
  hash,
}: {
  r: U256;
  s: U256;
  recoveryBit: number;
  hash: Hash32;
}) =>
  Effect.try({
    try: () => {
      const signature = new secp256k1.Signature(
        r.value,
        s.value,
      ).addRecoveryBit(recoveryBit);
      const compressedPublicKey = secp256k1.recoverPublicKey(
        signature.toBytes("recovered"),
        hash.value,
        {
          prehash: false,
        },
      );
      const point = secp256k1.Point.fromBytes(compressedPublicKey);
      return new Bytes({ value: point.toBytes(false) });
    },
    catch: (error) => {
      return new FailedToRecoverPublicKeyError({
        message: `Failed to recover public key: ${error}`,
      });
    },
  });
export const recoverPublicKey = (
  tx: Transaction,
): Result.Result<Bytes, FailedToRecoverPublicKeyError> => {
  return Result.try({
    try: () => {
      let recoveryBit = 0;
      if (tx._tag === "LegacyTransaction") {
        const v = tx.v.value;
        if (v >= 35n) {
          recoveryBit = Number((v - 35n) % 2n);
        } else {
          recoveryBit = Number(v - 27n);
        }
      } else {
        recoveryBit = Number(tx.yParity.value);
      }

      const signature = new secp256k1.Signature(
        tx.r.value,
        tx.s.value,
      ).addRecoveryBit(recoveryBit);
      const compressedPublicKey = secp256k1.recoverPublicKey(
        signature.toBytes("recovered"),
        getSigningHash(tx).value,
        {
          prehash: false,
        },
      );
      const point = secp256k1.Point.fromBytes(compressedPublicKey);
      return new Bytes({ value: point.toBytes(false) });
    },
    catch: (error) => {
      return new FailedToRecoverPublicKeyError({
        message: `Failed to recover public key: ${error}`,
      });
    },
  });
};
export const getSigningHash = (transaction: Transaction) => {
  return Match.value(transaction).pipe(
    Match.tags({
      LegacyTransaction: (tx) => {
        if (tx.chainId) {
          return signingHash155(tx, tx.chainId);
        }
        const v = tx.v.value;
        if (v >= 35n) {
          const chainId = new U64({ value: (v - 35n) / 2n });
          return signingHash155(tx, chainId);
        }
        return signingHashPre155(tx);
      },
      AccessListTransaction: (tx) => signingHash2930(tx),
      FeeMarketTransaction: (tx) => signingHash1559(tx),
      BlobTransaction: (tx) => signingHash4844(tx),
      SetCodeTransaction: (tx) => signingHash7702(tx),
    }),
    Match.exhaustive,
  );
};
export const getPublicKey = (privateKey: Bytes32) => {
  return new Bytes({ value: secp256k1.getPublicKey(privateKey.value, false) });
};

export const publicKeyToAddress = (publicKey: Bytes) => {
  return new Address({
    value: keccak256(publicKey.value.slice(1)).value.slice(12, 32),
  });
};
export const getAddressFromPrivateKey = (privateKey: Bytes32) => {
  return publicKeyToAddress(getPublicKey(privateKey));
};

export const recoverSender = (tx: Transaction) => {
  return recoverPublicKey(tx).pipe(Result.map(publicKeyToAddress));
};

export const signHash = ({
  hash,
  privateKey,
  extraEntropy = false,
}: {
  hash: Hash32;
  privateKey: Bytes32;
  extraEntropy?: ECDSASignOpts["extraEntropy"];
}) => {
  const bytes = secp256k1.sign(hash.value, privateKey.value, {
    lowS: true,
    extraEntropy,
    format: "recovered",
    prehash: false,
  });

  const signature = secp256k1.Signature.fromBytes(bytes, "recovered");

  // let v = new U256({ value: signature.recovery ? 28n : 27n });
  // if (vInput) {
  //   v = new U256({ value: vInput * 2n + v.value });
  // }
  return {
    r: new U256({ value: signature.r }),
    s: new U256({ value: signature.s }),
    yParity: new U8({ value: BigInt(signature.recovery ?? 0) }),
  };
};

export const signTransaction = <const T extends Transaction>({
  transaction,
  privateKey,
  extraEntropy = false,
}: {
  transaction: T;
  privateKey: Bytes32;
  extraEntropy?: ECDSASignOpts["extraEntropy"];
}): T => {
  const hash = getSigningHash(transaction);
  const signature = signHash({ hash, privateKey, extraEntropy });
  if (transaction._tag === "LegacyTransaction") {
    let v = transaction.chainId ? transaction.chainId.value * 2n + 35n : 27n;
    if (signature.yParity.value === 1n) {
      v += 1n;
    }
    return {
      ...transaction,
      r: signature.r,
      s: signature.s,
      v: new U256({ value: v }),
    };
  }
  return {
    ...transaction,
    r: signature.r,
    s: signature.s,
    yParity: signature.yParity,
  };
};

// export

export const SET_CODE_TX_MAGIC = new Uint8Array([0x05]);

// SECP256K1 curve order
const SECP256K1N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

export const recoverAuthority = (
  authorization: Authorization,
): Effect.Effect<Address, FailedToRecoverPublicKeyError> => {
  const yParity = authorization.yParity;
  const r = authorization.r;
  const s = authorization.s;
  const chainId = authorization.chainId;
  const address = authorization.address;
  const nonce = authorization.nonce;

  const recoveryBit = Number(yParity.value);
  if (recoveryBit !== 0 && recoveryBit !== 1) {
    return Effect.fail(
      new FailedToRecoverPublicKeyError({
        message: "Invalid y_parity in authorization",
      }),
    );
  }

  if (r.value <= 0n || r.value >= SECP256K1N) {
    return Effect.fail(
      new FailedToRecoverPublicKeyError({
        message: "Invalid r value in authorization",
      }),
    );
  }

  if (s.value <= 0n || s.value > SECP256K1N / 2n) {
    return Effect.fail(
      new FailedToRecoverPublicKeyError({
        message: "Invalid s value in authorization",
      }),
    );
  }

  const signingHash = keccak256(
    new Uint8Array([
      ...SET_CODE_TX_MAGIC,
      ...rlp.encode([chainId, address, nonce]).value,
    ]),
  );

  return recoverFromSignature({
    r,
    s,
    recoveryBit: Number(yParity.value),
    hash: signingHash,
  }).pipe(Effect.map(publicKeyToAddress));
};

export const secp256k1Recover = (r: U256, s: U256, v: U256, hash: Hash32) => {
  return recoverFromSignature({
    r,
    s,
    recoveryBit: Number(v.value - 27n),
    hash,
  });
};

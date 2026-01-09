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
import rlp, { RlpDecodeError, type RlpEncodeError } from "@evm-effect/rlp";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { ECDSASignOpts } from "@noble/secp256k1";
import * as secp256k1 from "@noble/secp256k1";
import { Data, Effect, Either, Match, Schema } from "effect";
import { keccak256 } from "./keccak256.js";

secp256k1.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);
secp256k1.hashes.sha256 = sha256;
// import { signingHash4844, signingHash7702 } from "./signature-recovery.js";

// TX_BASE_COST = Uint(21000)
// """
// Base cost of a transaction in gas units. This is the minimum amount of gas
// required to execute a transaction.
// """
export const TX_BASE_COST = new Uint({ value: 21000n });

// FLOOR_CALLDATA_COST = Uint(10)
export const FLOOR_CALLDATA_COST = new Uint({ value: 10n });
// """
// Minimum gas cost per byte of calldata as per [EIP-7623]. Used to calculate
// the minimum gas cost for transactions that include calldata.

// [EIP-7623]: https://eips.ethereum.org/EIPS/eip-7623
// """

export const STANDARD_CALLDATA_TOKEN_COST = new Uint({ value: 4n });
// STANDARD_CALLDATA_TOKEN_COST = Uint(4)
// """
// Gas cost per byte of calldata as per [EIP-7623]. Used to calculate the
// gas cost for transactions that include calldata.

// [EIP-7623]: https://eips.ethereum.org/EIPS/eip-7623
// """

// TX_CREATE_COST = Uint(32000)
export const TX_CREATE_COST = new Uint({ value: 32000n });
// """
// Additional gas cost for creating a new contract.
// """

// TX_ACCESS_LIST_ADDRESS_COST = Uint(2400)
export const TX_ACCESS_LIST_ADDRESS_COST = new Uint({ value: 2400n });
// """
// Gas cost for including an address in the access list of a transaction.
// """

// TX_ACCESS_LIST_STORAGE_KEY_COST = Uint(1900)
export const TX_ACCESS_LIST_STORAGE_KEY_COST = new Uint({ value: 1900n });
// """
// Gas cost for including a storage key in the access list of a transaction.
// """

// TX_MAX_GAS_LIMIT = Uint(16_777_216)
export const TX_MAX_GAS_LIMIT = new Uint({ value: 16_777_216n });
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
  nonce: U64,
  yParity: U8,
  r: U256,
  s: U256,
}) {}

/**
 * Access list entry specifying an account and its storage slots.
 *
 * Used in EIP-2930 and later transactions to pre-warm storage access.
 */
export const Access = Schema.TaggedStruct("Access", {
  account: Address,
  slots: Schema.Array(Bytes32),
});
export type Access = (typeof Access)["Type"];

/**
 * Legacy transaction (pre-EIP-2718).
 *
 * The original Ethereum transaction format with simple gas pricing.
 * Used before EIP-1559, EIP-2930, EIP-4844, and EIP-7702.
 */
export const LegacyTransaction = Schema.TaggedStruct("LegacyTransaction", {
  nonce: U256,
  gasPrice: Uint,
  gas: Uint,
  to: Schema.optional(Address),
  value: U256,
  data: Bytes,
  v: U256,
  r: U256,
  s: U256,
});
export type LegacyTransaction = (typeof LegacyTransaction)["Type"];
/**
 * Access list transaction (EIP-2930).
 *
 * Extends legacy transactions with:
 * - Chain ID for replay protection
 * - Access list for storage pre-warming
 */
export const AccessListTransaction = Schema.TaggedStruct(
  "AccessListTransaction",
  {
    chainId: U64,
    nonce: U256,
    gasPrice: Uint,
    gas: Uint,
    to: Schema.optional(Address),
    value: U256,
    data: Bytes,
    accessList: Schema.Array(Access),
    yParity: U8,
    r: U256,
    s: U256,
  },
);
export type AccessListTransaction = (typeof AccessListTransaction)["Type"];
/**
 * Fee market transaction (EIP-1559).
 *
 * Introduces a new fee market with:
 * - maxPriorityFeePerGas: tip to miner
 * - maxFeePerGas: maximum total fee per gas
 * - Base fee is burned
 */
export const FeeMarketTransaction = Schema.TaggedStruct(
  "FeeMarketTransaction",
  {
    chainId: U64,
    nonce: U256,
    maxPriorityFeePerGas: Uint,
    maxFeePerGas: Uint,
    gas: Uint,
    to: Schema.optional(Address),
    value: U256,
    data: Bytes,
    accessList: Schema.Array(Access),
    yParity: U8,
    r: U256,
    s: U256,
  },
);
export type FeeMarketTransaction = (typeof FeeMarketTransaction)["Type"];
/**
 * Blob transaction (EIP-4844).
 *
 * Extends fee market transactions to support blob-carrying transactions
 * for data availability.
 *
 * Note: `to` cannot be empty (no contract creation with blob txs).
 */
export const BlobTransaction = Schema.TaggedStruct("BlobTransaction", {
  chainId: U64,
  nonce: U256,
  maxPriorityFeePerGas: Uint,
  maxFeePerGas: Uint,
  gas: Uint,
  to: Schema.optional(Address), // Cannot be empty - no contract creation
  value: U256,
  data: Bytes,
  accessList: Schema.Array(Access),
  maxFeePerBlobGas: U256,
  blobVersionedHashes: Schema.Array(Bytes32), // VersionedHash[]
  yParity: U8,
  r: U256,
  s: U256,
});
export type BlobTransaction = (typeof BlobTransaction)["Type"];

/**
 * Set code transaction (EIP-7702).
 *
 * Allows EOAs to temporarily set contract code on their account,
 * enabling them to act as smart contracts.
 */
export const SetCodeTransaction = Schema.TaggedStruct("SetCodeTransaction", {
  chainId: U64,
  nonce: U64, // Note: U64, not U256
  maxPriorityFeePerGas: Uint,
  maxFeePerGas: Uint,
  gas: Uint,
  to: Schema.optional(Address),
  value: U256,
  data: Bytes,
  accessList: Schema.Array(Access),
  authorizations: Schema.Array(Authorization),
  yParity: U8,
  r: U256,
  s: U256,
});
export type SetCodeTransaction = (typeof SetCodeTransaction)["Type"];

export const Transaction = Schema.Union(
  LegacyTransaction,
  AccessListTransaction,
  FeeMarketTransaction,
  BlobTransaction,
  SetCodeTransaction,
);

export type Transaction = (typeof Transaction)["Type"];

/**
 * Union type representing any valid transaction type in the Osaka fork.
 */
// export type Transaction =
//   | LegacyTransaction
//   | AccessListTransaction
//   | FeeMarketTransaction
//   | BlobTransaction
//   | SetCodeTransaction;

export const encodeTransaction = (
  transaction: Transaction,
): Either.Either<Bytes | LegacyTransaction, RlpEncodeError> => {
  switch (transaction._tag) {
    case "LegacyTransaction":
      return Either.right(transaction);
    case "AccessListTransaction":
      return rlp
        .encodeTo(AccessListTransaction, transaction)
        .pipe(
          Either.map(
            (bytes) =>
              new Bytes({ value: new Uint8Array([0x01, ...bytes.value]) }),
          ),
        );
    case "FeeMarketTransaction":
      return rlp
        .encodeTo(FeeMarketTransaction, transaction)
        .pipe(
          Either.map(
            (bytes) =>
              new Bytes({ value: new Uint8Array([0x02, ...bytes.value]) }),
          ),
        );
    case "BlobTransaction":
      return rlp
        .encodeTo(BlobTransaction, transaction)
        .pipe(
          Either.map(
            (bytes) =>
              new Bytes({ value: new Uint8Array([0x03, ...bytes.value]) }),
          ),
        );
    case "SetCodeTransaction":
      return rlp
        .encodeTo(SetCodeTransaction, transaction)
        .pipe(
          Either.map(
            (bytes) =>
              new Bytes({ value: new Uint8Array([0x04, ...bytes.value]) }),
          ),
        );
  }
};

export const decodeTransaction = (
  transaction: LegacyTransaction | Bytes,
): Either.Either<Transaction, RlpDecodeError> => {
  if (transaction._tag === "LegacyTransaction") {
    return Either.right(transaction);
  }
  switch (transaction.value[0]) {
    case 0x01:
      return rlp
        .decodeTo(
          AccessListTransaction,
          new Bytes({ value: transaction.value.slice(1) }),
        )
        .pipe(Either.map((transaction) => transaction));
    case 0x02:
      return rlp
        .decodeTo(
          FeeMarketTransaction,
          new Bytes({ value: transaction.value.slice(1) }),
        )
        .pipe(Either.map((transaction) => transaction));
    case 0x03:
      return rlp
        .decodeTo(
          BlobTransaction,
          new Bytes({ value: transaction.value.slice(1) }),
        )
        .pipe(Either.map((transaction) => transaction));
    case 0x04:
      return rlp
        .decodeTo(
          SetCodeTransaction,
          new Bytes({ value: transaction.value.slice(1) }),
        )
        .pipe(Either.map((transaction) => transaction));
    default:
      return Either.left(
        new RlpDecodeError({ message: "Unknown transaction type", path: [] }),
      );
  }
};

export const signingHashPre155 = (tx: LegacyTransaction): Hash32 => {
  return keccak256(
    rlp.encode([
      tx.nonce,
      tx.gasPrice,
      tx.gas,
      tx.to ?? Bytes0.empty(),
      tx.value,
      tx.data,
    ]),
  );
};
// def signing_hash_pre155(tx: LegacyTransaction) -> Hash32:
//     """
//     Compute the hash of a transaction used in a legacy (pre [EIP-155])
//     signature.

//     This function takes a legacy transaction as a parameter and returns the
//     signing hash of the transaction.

//     [EIP-155]: https://eips.ethereum.org/EIPS/eip-155
//     """
//     return keccak256(
//         rlp.encode(
//             (
//                 tx.nonce,
//                 tx.gas_price,
//                 tx.gas,
//                 tx.to,
//                 tx.value,
//                 tx.data,
//             )
//         )
//     )

// def signing_hash_155(tx: LegacyTransaction, chain_id: U64) -> Hash32:
//     """
//     Compute the hash of a transaction used in a [EIP-155] signature.

//     This function takes a legacy transaction and a chain ID as parameters
//     and returns the hash of the transaction used in an [EIP-155] signature.

//     [EIP-155]: https://eips.ethereum.org/EIPS/eip-155
//     """
//     return keccak256(
//         rlp.encode(
//             (
//                 tx.nonce,
//                 tx.gas_price,
//                 tx.gas,
//                 tx.to,
//                 tx.value,
//                 tx.data,
//                 chain_id,
//                 Uint(0),
//                 Uint(0),
//             )
//         )
//     )

export const signingHash155 = (tx: LegacyTransaction, chainId: U64): Hash32 => {
  return keccak256(
    rlp.encode([
      tx.nonce,
      tx.gasPrice,
      tx.gas,
      tx.to ?? Bytes0.empty(),
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
        tx.to ?? Bytes0.empty(),
        tx.value,
        tx.data,
        tx.accessList.map((access) => [access.account, [...access.slots]]),
      ]).value,
    ]),
  );
};

// def signing_hash_4844(tx: BlobTransaction) -> Hash32:
//     """
//     Compute the hash of a transaction used in an [EIP-4844] signature.

//     This function takes a transaction as a parameter and returns the
//     signing hash of the transaction used in an [EIP-4844] signature.

//     [EIP-4844]: https://eips.ethereum.org/EIPS/eip-4844
//     """
//     return keccak256(
//         b"\x03"
//         + rlp.encode(
//             (
//                 tx.chain_id,
//                 tx.nonce,
//                 tx.max_priority_fee_per_gas,
//                 tx.max_fee_per_gas,
//                 tx.gas,
//                 tx.to,
//                 tx.value,
//                 tx.data,
//                 tx.access_list,
//                 tx.max_fee_per_blob_gas,
//                 tx.blob_versioned_hashes,
//             )
//         )
//     )

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
        tx.to ?? Bytes0.empty(),
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
        tx.to ?? Bytes0.empty(),
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
        tx.to ?? Bytes0.empty(),
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
): Either.Either<Bytes, FailedToRecoverPublicKeyError> => {
  return Either.try({
    try: () => {
      let recoveryBit = 0;
      if (tx._tag === "LegacyTransaction") {
        const v = tx.v.value;
        if (v >= 35n) {
          // EIP-155: v = chainId * 2 + 35 + recovery (0 or 1)
          // recovery = (v - 35) % 2
          recoveryBit = Number((v - 35n) % 2n);
        } else {
          // Pre-EIP-155: v = 27 or 28
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

  // const recoveryBit = getRecoveryBit(tx);

  // const signature = new secp256k1.Signature(
  //   tx.r.value,
  //   tx.s.value,
  // ).addRecoveryBit(recoveryBit);
  // const compressedPublicKey = secp256k1.recoverPublicKey(
  //   signature.toBytes("recovered"),
  //   getSigningHash(tx).value,
  //   {
  //     prehash: false,
  //   },
  // );
  // const point = secp256k1.Point.fromBytes(compressedPublicKey);

  // return Either.right(new Bytes({ value: point.toBytes(false) }));
  // console.log("point", point.toHex(false));
  // console.log("publicKey", publicKey);
  // // return Either.right(new Bytes({ value: new Uint8Array(publicKey.buffer) }));

  // return Match.value(tx).pipe(
  //   Match.tags({
  //     LegacyTransaction: (tx) => {
  //       const v = tx.v;
  //       if (v.value === 27n || v.value === 28n)
  //         return secp256k1Recover(
  //           r,
  //           s,
  //           new U256({ value: v.value - 27n }),
  //           signingHashPre155(tx),
  //         );

  //       const chainIdX2 = new U256({ value: chainId.value * 2n });
  //       if (
  //         v.value !== 35n + chainIdX2.value &&
  //         v.value !== 36n + chainIdX2.value
  //       )
  //         return Either.left(new InvalidSignatureError({ message: "bad v" }));
  //       return secp256k1Recover(
  //         r,
  //         s,
  //         new U256({ value: v.value - 35n - chainIdX2.value }),
  //         signingHash155(tx, chainId),
  //       );
  //     },
  //     AccessListTransaction: (tx) => {
  //       if (tx.yParity.value !== 0n && tx.yParity.value !== 1n)
  //         return Either.left(
  //           new InvalidSignatureError({ message: "bad y_parity" }),
  //         );
  //       return secp256k1Recover(r, s, tx.yParity, signingHash2930(tx));
  //     },
  //     FeeMarketTransaction: (tx) => {
  //       if (tx.yParity.value !== 0n && tx.yParity.value !== 1n)
  //         return Either.left(
  //           new InvalidSignatureError({ message: "bad y_parity" }),
  //         );
  //       return secp256k1Recover(r, s, tx.yParity, signingHash1559(tx));
  //     },
  //     BlobTransaction: (tx) => {
  //       if (tx.yParity.value !== 0n && tx.yParity.value !== 1n)
  //         return Either.left(
  //           new InvalidSignatureError({ message: "bad y_parity" }),
  //         );
  //       return secp256k1Recover(r, s, tx.yParity, signingHash4844(tx));
  //     },
  //     SetCodeTransaction: (tx) => {
  //       if (tx.yParity.value !== 0n && tx.yParity.value !== 1n)
  //         return Either.left(
  //           new InvalidSignatureError({ message: "bad y_parity" }),
  //         );
  //       return secp256k1Recover(r, s, tx.yParity, signingHash7702(tx));
  //     },
  //   }),
  //   Match.exhaustive,
  // );
};
export const getSigningHash = (transaction: Transaction) => {
  return Match.value(transaction).pipe(
    Match.tags({
      LegacyTransaction: (tx) => {
        const v = tx.v.value;
        if (v >= 35n) {
          // EIP-155: derive chainId from v
          // v = chainId * 2 + 35 + recovery (0 or 1)
          // chainId = (v - 35) / 2  (integer division)
          const chainId = new U64({ value: (v - 35n) / 2n });
          return signingHash155(tx, chainId);
        }
        // Pre-EIP-155
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
  return recoverPublicKey(tx).pipe(Either.map(publicKeyToAddress));
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
  return {
    r: new U256({ value: signature.r }),
    s: new U256({ value: signature.s }),
    v: new U256({ value: signature.recovery ? 28n : 27n }),
    yParity: new U8({ value: BigInt(signature.recovery ?? 0) }),
    // signature: new Bytes({ value: bytes }),
  };
};

export const signTransaction = ({
  transaction,
  privateKey,
  extraEntropy = false,
}: {
  transaction: Transaction;
  privateKey: Bytes32;
  extraEntropy?: ECDSASignOpts["extraEntropy"];
}) => {
  const hash = getSigningHash(transaction);
  return signHash({ hash, privateKey, extraEntropy });
};

// export

export const SET_CODE_TX_MAGIC = new Uint8Array([0x05]);

// SECP256K1 curve order
const SECP256K1N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

export const recoverAuthority = (authorization: Authorization) => {
  const yParity = authorization.yParity;
  const r = authorization.r;
  const s = authorization.s;
  const chainId = authorization.chainId;
  const address = authorization.address;
  const nonce = authorization.nonce;

  // Validate y_parity
  const recoveryBit = Number(yParity.value);
  if (recoveryBit !== 0 && recoveryBit !== 1) {
    return Effect.fail(
      new FailedToRecoverPublicKeyError({
        message: "Invalid y_parity in authorization",
      }),
    );
  }

  // Validate r: 0 < r < SECP256K1N
  if (r.value <= 0n || r.value >= SECP256K1N) {
    return Either.left(
      new FailedToRecoverPublicKeyError({
        message: "Invalid r value in authorization",
      }),
    );
  }

  // Validate s: 0 < s <= SECP256K1N / 2 (EIP-2: reject high s values)
  if (s.value <= 0n || s.value > SECP256K1N / 2n) {
    return Either.left(
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

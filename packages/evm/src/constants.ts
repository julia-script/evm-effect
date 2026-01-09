/**
 * Fork Constants and System Addresses
 *
 * Direct port of constants from ethereum/forks/osaka/fork.py and related files.
 * All numeric values must match the Python implementation exactly.
 */

import { keccak256 } from "@evm-effect/crypto";
import { Address, Bytes, Bytes32, U64, Uint } from "@evm-effect/ethereum-types";
import { encode } from "@evm-effect/rlp";
import { Effect, Either } from "effect";
import { Fork } from "./vm/Fork.js";

// ============================================================================
// Block Reward Constants (pre-merge only)
// ============================================================================

/**
 * Block reward for pre-Byzantium forks (Frontier, Homestead, etc.)
 * 5 ETH
 */
export const BLOCK_REWARD_FRONTIER = new Uint({
  value: 5_000_000_000_000_000_000n,
}); // 5 ETH

/**
 * Block reward for Byzantium fork (EIP-649)
 * Reduced from 5 ETH to 3 ETH
 */
export const BLOCK_REWARD_BYZANTIUM = new Uint({
  value: 3_000_000_000_000_000_000n,
}); // 3 ETH

/**
 * Block reward for Constantinople and later forks (EIP-1234)
 * Reduced from 3 ETH to 2 ETH
 */
export const BLOCK_REWARD_CONSTANTINOPLE = new Uint({
  value: 2_000_000_000_000_000_000n,
}); // 2 ETH

// ============================================================================
// Base Fee and Gas Constants (from fork.py)
// ============================================================================

/**
 * Maximum change denominator for base fee adjustments.
 * Used in EIP-1559 base fee calculation.
 */
export const BASE_FEE_MAX_CHANGE_DENOMINATOR = Either.getOrThrow(
  Uint.fromNumber(8),
);

/**
 * Elasticity multiplier for gas limit calculations.
 * Used to determine gas target from gas limit.
 */
export const ELASTICITY_MULTIPLIER = Either.getOrThrow(Uint.fromNumber(2));

/**
 * Gas limit adjustment factor between blocks.
 * Maximum factor by which gas limit can change between blocks.
 */
export const GAS_LIMIT_ADJUSTMENT_FACTOR = Either.getOrThrow(
  Uint.fromNumber(1024),
);

/**
 * Minimum gas limit for any block.
 */
export const GAS_LIMIT_MINIMUM = Either.getOrThrow(Uint.fromNumber(5000));

/**
 * Gas allocated for system transactions.
 * Used for beacon root storage and history storage operations.
 */
export const SYSTEM_TRANSACTION_GAS = Either.getOrThrow(
  Uint.fromNumber(30000000),
);

// ============================================================================
// Block Size and RLP Constants (from fork.py)
// ============================================================================

/**
 * Maximum block size in bytes.
 */
const MAX_BLOCK_SIZE = 10_485_760;

/**
 * Safety margin for block size calculations.
 */
const SAFETY_MARGIN = 2_097_152;

/**
 * Maximum RLP-encoded block size.
 * Calculated as MAX_BLOCK_SIZE - SAFETY_MARGIN.
 */
export const MAX_RLP_BLOCK_SIZE = MAX_BLOCK_SIZE - SAFETY_MARGIN;

// ============================================================================
// Blob Gas Constants (from fork.py and vm/gas.py)
// ============================================================================

/**
 * Maximum blob gas that can be consumed per block.
 * Prague (EIP-7691) increased from 6 blobs (786432) to 9 blobs (1179648).
 * Osaka (EIP-7825) maintains 9 blobs.
 */
export const MAX_BLOB_GAS_PER_BLOCK = Effect.gen(function* () {
  const fork = yield* Fork;
  // EIP-7691 (Prague): Blob throughput increase from 6 to 9 blobs
  // EIP-7825 (Osaka): Transaction Gas Limit Cap (also maintains 9 blobs)
  return new U64({ value: fork.eipSelect(7691, 1179648n, 786432n) });
});

/**
 * Maximum number of blobs allowed per transaction.
 * Prague (EIP-7691) increased from 6 to 9 blobs.
 * Osaka (EIP-7825) maintains 9 blobs.
 */
export const BLOB_COUNT_LIMIT = Effect.gen(function* () {
  const fork = yield* Fork;
  // EIP-7691 (Prague): Blob throughput increase from 6 to 9 blobs
  return fork.eipSelect(7691, 9, 6);
});

/**
 * Version byte for KZG commitment versioned hashes.
 */
export const VERSIONED_HASH_VERSION_KZG = new Uint8Array([0x01]);

/**
 * Gas consumed per blob.
 */
export const GAS_PER_BLOB = Either.getOrThrow(U64.fromNumber(2 ** 17)); // 131072

/**
 * Target number of blobs per block for blob gas pricing.
 */
export const BLOB_SCHEDULE_TARGET = Either.getOrThrow(U64.fromNumber(6));

/**
 * Target blob gas per block for blob gas pricing.
 * EIP-4844 (Cancun): 393216 (131072 * 3)
 * EIP-7691 (Prague): 786432 (131072 * 6)
 */
export const TARGET_BLOB_GAS_PER_BLOCK = Effect.gen(function* () {
  const fork = yield* Fork;
  // EIP-7691 (Prague): Blob throughput increase - target increased to 786432
  // EIP-4844 (Cancun): Original blob implementation - target was 393216
  return new U64({ value: fork.eipSelect(7691, 786432n, 393216n) });
});

/**
 * Base cost for blob gas pricing.
 */
export const BLOB_BASE_COST = Either.getOrThrow(Uint.fromNumber(2 ** 13)); // 8192

/**
 * Maximum blob schedule value for gas pricing.
 */
export const BLOB_SCHEDULE_MAX = Either.getOrThrow(U64.fromNumber(9));

/**
 * Minimum blob gas price.
 */
export const MIN_BLOB_GASPRICE = Either.getOrThrow(Uint.fromNumber(1));

/**
 * Update fraction for blob base fee calculations (denominator in exponential).
 * EIP-4844 (Cancun): 3338477
 * EIP-7691 (Prague): 5007716
 */
export const BLOB_BASE_FEE_UPDATE_FRACTION = Effect.gen(function* () {
  const fork = yield* Fork;
  // EIP-7691 (Prague): Blob throughput increase - update fraction changed to 5007716
  // EIP-4844 (Cancun): Original blob implementation - update fraction was 3338477
  return new Uint({ value: fork.eipSelect(7691, 5007716n, 3338477n) });
});

// ============================================================================
// System Addresses (from fork.py)
// ============================================================================

/**
 * System address used as the caller for system transactions.
 * Address: 0xfffffffffffffffffffffffffffffffffffffffe
 */
export const SYSTEM_ADDRESS = Either.getOrThrow(
  Address.fromHex("0xfffffffffffffffffffffffffffffffffffffffe"),
);

/**
 * Address of the beacon roots contract.
 * Address: 0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02
 */
export const BEACON_ROOTS_ADDRESS = Either.getOrThrow(
  Address.fromHex("0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02"),
);

/**
 * Address of the withdrawal request predeploy contract.
 * Address: 0x00000961Ef480Eb55e80D19ad83579A64c007002
 */
export const WITHDRAWAL_REQUEST_PREDEPLOY_ADDRESS = Either.getOrThrow(
  Address.fromHex("0x00000961Ef480Eb55e80D19ad83579A64c007002"),
);

/**
 * Address of the consolidation request predeploy contract.
 * Address: 0x0000BBdDc7CE488642fb579F8B00f3a590007251
 */
export const CONSOLIDATION_REQUEST_PREDEPLOY_ADDRESS = Either.getOrThrow(
  Address.fromHex("0x0000BBdDc7CE488642fb579F8B00f3a590007251"),
);

/**
 * Address of the history storage contract.
 * Address: 0x0000F90827F1C53a10cb7A02335B175320002935
 */
export const HISTORY_STORAGE_ADDRESS = Either.getOrThrow(
  Address.fromHex("0x0000F90827F1C53a10cb7A02335B175320002935"),
);

// ============================================================================
// Transaction Constants (from transactions.py)
// ============================================================================

/**
 * Base cost of a transaction in gas units.
 * This is the minimum amount of gas required for any transaction.
 */
export const TX_BASE_COST = Either.getOrThrow(Uint.fromNumber(21000));

/**
 * Minimum gas cost per byte of calldata as per EIP-7623.
 * Used to calculate the floor gas cost for transactions.
 */
export const FLOOR_CALLDATA_COST = Either.getOrThrow(Uint.fromNumber(10));

/**
 * Standard gas cost per byte of calldata as per EIP-7623.
 * Used to calculate the standard calldata cost.
 */
export const STANDARD_CALLDATA_TOKEN_COST = Either.getOrThrow(
  Uint.fromNumber(4),
);

/**
 * Additional gas cost for creating a new contract.
 */
export const TX_CREATE_COST = Either.getOrThrow(Uint.fromNumber(32000));

/**
 * Gas cost for including an address in the access list of a transaction.
 */
export const TX_ACCESS_LIST_ADDRESS_COST = Either.getOrThrow(
  Uint.fromNumber(2400),
);

/**
 * Gas cost for including a storage key in the access list of a transaction.
 */
export const TX_ACCESS_LIST_STORAGE_KEY_COST = Either.getOrThrow(
  Uint.fromNumber(1900),
);

/**
 * Maximum gas limit for a single transaction.
 */
export const TX_MAX_GAS_LIMIT = new Uint({ value: 16_777_216n });

// ============================================================================
// Request Type Constants (from requests.py)
// ============================================================================

/**
 * Request type identifier for deposit requests.
 */
export const DEPOSIT_REQUEST_TYPE = new Bytes({
  value: new Uint8Array([0x00]),
});

/**
 * Request type identifier for withdrawal requests.
 */
export const WITHDRAWAL_REQUEST_TYPE = new Bytes({
  value: new Uint8Array([0x01]),
});

/**
 * Request type identifier for consolidation requests.
 */
export const CONSOLIDATION_REQUEST_TYPE = new Bytes({
  value: new Uint8Array([0x02]),
});

// ============================================================================
// Deposit Contract Constants (from requests.py)
// ============================================================================

/**
 * Address of the deposit contract.
 * Address: 0x00000000219ab540356cbb839cbe05303d7705fa
 */
export const DEPOSIT_CONTRACT_ADDRESS = Either.getOrThrow(
  Address.fromHex("0x00000000219ab540356cbb839cbe05303d7705fa"),
);

/**
 * Signature hash for deposit events.
 * Hash: 0x649bbc62d0e31342afea4e5cd82d4049e7e1ee912fc0889aa790803be39038c5
 */
export const DEPOSIT_EVENT_SIGNATURE_HASH = new Bytes32({
  value: new Uint8Array([
    0x64, 0x9b, 0xbc, 0x62, 0xd0, 0xe3, 0x13, 0x42, 0xaf, 0xea, 0x4e, 0x5c,
    0xd8, 0x2d, 0x40, 0x49, 0xe7, 0xe1, 0xee, 0x91, 0x2f, 0xc0, 0x88, 0x9a,
    0xa7, 0x90, 0x80, 0x3b, 0xe3, 0x90, 0x38, 0xc5,
  ]),
});

// ============================================================================
// Computed Constants
// ============================================================================

/**
 * Hash of empty ommers list.
 * Computed as keccak256(rlp.encode([])).
 */
export const EMPTY_OMMER_HASH = keccak256(encode([]));

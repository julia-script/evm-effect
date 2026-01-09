import { keccak256 } from "@evm-effect/crypto";
import { Address, type Hash32 } from "@evm-effect/ethereum-types/domain";
import { U64, Uint } from "@evm-effect/ethereum-types/numeric";
import rlp from "@evm-effect/rlp";
import { Either } from "effect";
import type { BlockChain } from "../blockchain.js";
import { Header } from "../types/Block.js";
export const BASE_FEE_MAX_CHANGE_DENOMINATOR = new Uint({
  value: 8n,
});
export const ELASTICITY_MULTIPLIER = new Uint({
  value: 2n,
});
export const GAS_LIMIT_ADJUSTMENT_FACTOR = new Uint({
  value: 1024n,
});
export const GAS_LIMIT_MINIMUM = new Uint({
  value: 5000n,
});
export const EMPTY_OMMER_HASH = keccak256(rlp.encode([]));
export const SYSTEM_ADDRESS = new Address(
  "0xfffffffffffffffffffffffffffffffffffffffe",
);
export const BEACON_ROOTS_ADDRESS = new Address(
  "0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02",
);
export const SYSTEM_TRANSACTION_GAS = new Uint({
  value: 30000000n,
});
export const MAX_BLOB_GAS_PER_BLOCK = new U64({
  value: 1179648n,
});
export const VERSIONED_HASH_VERSION_KZG = new Uint8Array([0x01]);

export const WITHDRAWAL_REQUEST_PREDEPLOY_ADDRESS = new Address(
  "0x00000961Ef480Eb55e80D19ad83579A64c007002",
);
export const CONSOLIDATION_REQUEST_PREDEPLOY_ADDRESS = new Address(
  "0x0000BBdDc7CE488642fb579F8B00f3a590007251",
);
export const HISTORY_STORAGE_ADDRESS = new Address(
  "0x0000F90827F1C53a10cb7A02335B175320002935",
);
export const MAX_BLOCK_SIZE = 10_485_760;
export const SAFETY_MARGIN = 2_097_152;
export const MAX_RLP_BLOCK_SIZE = MAX_BLOCK_SIZE - SAFETY_MARGIN;
export const BLOB_COUNT_LIMIT = 6;

export const getLast256BlockHashes = (chain: BlockChain) => {
  const recentBlocks = chain.blocks.slice(-255);
  if (recentBlocks.length === 0) {
    return [];
  }
  const recentBlockHashes: Hash32[] = [];
  for (const block of recentBlocks) {
    recentBlockHashes.push(block.header.parentHash);
  }
  const encodedHeader = rlp.encodeTo(
    Header,
    recentBlocks[recentBlocks.length - 1].header,
  );
  if (Either.isLeft(encodedHeader)) {
    throw new Error("unreachable");
  }
  const mostRecentBlockHash = keccak256(encodedHeader.right);
  recentBlockHashes.push(mostRecentBlockHash);
  return recentBlockHashes;
};
export const checkGasLimit = (gasLimit: Uint, parentGasLimit: Uint) => {
  const maxAdjustmentDelta = new Uint({
    value: parentGasLimit.value / GAS_LIMIT_ADJUSTMENT_FACTOR.value,
  });

  if (gasLimit.value >= parentGasLimit.value + maxAdjustmentDelta.value) {
    return false;
  }
  if (gasLimit.value <= parentGasLimit.value - maxAdjustmentDelta.value) {
    return false;
  }
  if (gasLimit.value < GAS_LIMIT_MINIMUM.value) {
    return false;
  }
  return true;
};

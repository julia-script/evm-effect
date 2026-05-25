/**
 * Cryptographic functions for Ethereum
 *
 * Effect-TS wrappers around cryptographic primitives
 *
 * @packageDocumentation
 */

export {
  CACHE_EPOCH_GROWTH_SIZE,
  CACHE_ROUNDS,
  cacheSize,
  DATASET_EPOCH_GROWTH_SIZE,
  DATASET_PARENTS,
  datasetSize,
  EPOCH_SIZE,
  type EthashCache,
  epoch,
  type FetchDatasetItem,
  fnv,
  fnvHash,
  generateCache,
  generateDataset,
  generateDatasetItem,
  generateSeed,
  HASH_BYTES,
  HASHIMOTO_ACCESSES,
  hashimoto,
  hashimotoLight,
  INITIAL_CACHE_SIZE,
  INITIAL_DATASET_SIZE,
  MIX_BYTES,
} from "./ethash.js";
export { keccak256 } from "./keccak256.js";
export { keccak512 } from "./keccak512.js";

export { sha256 } from "./sha256.js";

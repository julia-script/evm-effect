/**
 * Ethash Functions
 *
 * @module
 *
 * ## Introduction
 *
 * Ethash algorithm related functionalities.
 */

import {
  type Bytes8,
  Bytes32,
  Bytes64,
  U32,
  Uint,
} from "@evm-effect/ethereum-types";
import { keccak256 } from "./keccak256.js";
import { keccak512 } from "./keccak512.js";

export const EPOCH_SIZE = 30_000;
export const INITIAL_CACHE_SIZE = 2 ** 24;
export const CACHE_EPOCH_GROWTH_SIZE = 2 ** 17;
export const INITIAL_DATASET_SIZE = 2 ** 30;
export const DATASET_EPOCH_GROWTH_SIZE = 2 ** 23;
export const HASH_BYTES = 64;
export const MIX_BYTES = 128;
export const CACHE_ROUNDS = 3;
export const DATASET_PARENTS = 256;
export const HASHIMOTO_ACCESSES = 64;

/** Cache represented as little-endian `U32` words per 64-byte hash item. */
export type EthashCache = ReadonlyArray<ReadonlyArray<U32>>;

/**
 * Checks if `number` is a prime number.
 *
 * @param number - The number to check for primality.
 * @returns Boolean indicating if `number` is prime or not.
 */
const isPrime = (number: bigint | number): boolean => {
  const n = Number(number);
  if (n <= 1) {
    return false;
  }

  // number ** 0.5 is faster than math.sqrt(number)
  for (let x = 2; x <= Math.floor(n ** 0.5); x++) {
    // Return false if number is divisible by x
    if (n % x === 0) {
      return false;
    }
  }

  return true;
};

/**
 * Convert little endian byte stream `data` to a little endian U32
 * sequence i.e., the first U32 number of the sequence is the least
 * significant U32 number.
 *
 * @param data - The byte stream (little endian) which is to be converted to a U32 stream.
 * @returns Sequence of U32 numbers obtained from the little endian byte stream.
 */
const leBytesToUint32Sequence = (data: Uint8Array): ReadonlyArray<U32> => {
  const sequence: U32[] = [];
  for (let i = 0; i < data.length; i += 4) {
    sequence.push(U32.wrap(Uint.fromLeBytes(data.subarray(i, i + 4)).value));
  }
  return sequence;
};

/**
 * Obtain little endian byte stream from a little endian U32 sequence
 * i.e., the first U32 number of the sequence is the least significant
 * U32 number.
 *
 * Note - In this conversion, the most significant byte (byte at the end of
 * the little endian stream) may have leading zeroes. This function doesn't
 * take care of removing these leading zeroes.
 *
 * @param sequence - The U32 stream (little endian) which is to be converted to a little endian byte stream.
 * @returns The byte stream obtained from the little endian U32 stream.
 */
const leUint32SequenceToBytes = (sequence: ReadonlyArray<U32>): Uint8Array => {
  const resultBytes = new Uint8Array(sequence.length * 4);
  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i];
    let v = item.value;
    for (let j = 0; j < 4; j++) {
      resultBytes[i * 4 + j] = Number(v & 0xffn);
      v >>= 8n;
    }
  }
  return resultBytes;
};

/**
 * Obtain Uint from a U32 sequence assuming that this sequence is little
 * endian i.e., the first U32 number of the sequence is the least
 * significant U32 number.
 *
 * @param sequence - The U32 stream (little endian) which is to be converted to a Uint.
 * @returns The Uint number obtained from the conversion of the little endian U32 stream.
 */
const leUint32SequenceToUint = (sequence: ReadonlyArray<U32>): Uint => {
  return Uint.fromLeBytes(leUint32SequenceToBytes(sequence));
};

const toLeBytesFixed = (value: bigint, byteLength: number): Uint8Array => {
  const bytes = new Uint8Array(byteLength);
  let v = value;
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
};

const xorBytes = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
};

const concatBytes = (...parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

/**
 * Obtain the epoch number to which the block identified by `blockNumber`
 * belongs.
 *
 * @param blockNumber - The number of the block of interest.
 * @returns The epoch number to which the passed in block belongs.
 */
export const epoch = (blockNumber: Uint): Uint => {
  return Uint.wrap(blockNumber.value / BigInt(EPOCH_SIZE));
};

/**
 * Obtain the cache size (in bytes) of the epoch to which `blockNumber`
 * belongs.
 *
 * @param blockNumber - The number of the block of interest.
 * @returns The cache size in bytes for the passed in block.
 */
export const cacheSize = (blockNumber: Uint): Uint => {
  let size =
    BigInt(INITIAL_CACHE_SIZE) +
    BigInt(CACHE_EPOCH_GROWTH_SIZE) * epoch(blockNumber).value;
  size -= BigInt(HASH_BYTES);
  while (!isPrime(size / BigInt(HASH_BYTES))) {
    size -= BigInt(2 * HASH_BYTES);
  }

  return Uint.wrap(size);
};

/**
 * Obtain the dataset size (in bytes) of the epoch to which `blockNumber`
 * belongs.
 *
 * @param blockNumber - The number of the block of interest.
 * @returns The dataset size in bytes for the passed in block.
 */
export const datasetSize = (blockNumber: Uint): Uint => {
  let size =
    BigInt(INITIAL_DATASET_SIZE) +
    BigInt(DATASET_EPOCH_GROWTH_SIZE) * epoch(blockNumber).value;
  size -= BigInt(MIX_BYTES);
  while (!isPrime(size / BigInt(MIX_BYTES))) {
    size -= BigInt(2 * MIX_BYTES);
  }

  return Uint.wrap(size);
};

/**
 * Obtain the cache generation seed for the block identified by
 * `blockNumber`.
 *
 * @param blockNumber - The number of the block of interest.
 * @returns The cache generation seed for the passed in block.
 */
export const generateSeed = (blockNumber: Uint): Bytes32 => {
  let epochNumber = epoch(blockNumber).value;

  let seed = new Uint8Array(32);
  while (epochNumber !== 0n) {
    seed = new Uint8Array(keccak256(seed).value);
    epochNumber -= 1n;
  }

  return new Bytes32({ value: seed });
};

/**
 * Generate the cache for the block identified by `blockNumber`. This cache
 * would later be used to generate the full dataset.
 *
 * @param blockNumber - The number of the block of interest.
 * @returns The cache generated for the passed in block.
 */
export const generateCache = (blockNumber: Uint): EthashCache => {
  const seed = generateSeed(blockNumber);
  const cacheSizeBytes = cacheSize(blockNumber);

  const cacheSizeWords = cacheSizeBytes.value / BigInt(HASH_BYTES);
  const cache: Uint8Array[] = [keccak512(seed).value];

  let previousCacheItem = cache[0];
  for (let i = 1n; i < cacheSizeWords; i++) {
    const cacheItem = keccak512(previousCacheItem).value;
    cache.push(cacheItem);
    previousCacheItem = cacheItem;
  }

  const cacheSizeWordsNumber = Number(cacheSizeWords);
  for (let round = 0; round < CACHE_ROUNDS; round++) {
    for (let index = 0; index < cacheSizeWordsNumber; index++) {
      // Converting `cache_size_words` to int as `-1 + Uint(5)` is an error.
      const firstCacheItem =
        cache[(index - 1 + cacheSizeWordsNumber) % cacheSizeWordsNumber];
      const secondCacheItem =
        cache[
          Number(
            U32.wrap(Uint.fromLeBytes(cache[index]?.subarray(0, 4)).value)
              .value % cacheSizeWords,
          )
        ];
      const result = xorBytes(firstCacheItem, secondCacheItem);
      cache[index] = keccak512(result).value;
    }
  }

  return cache.map((cacheItem) => leBytesToUint32Sequence(cacheItem));
};

/**
 * FNV algorithm is inspired by the FNV hash, which in some cases is used
 * as a non-associative substitute for XOR.
 *
 * Note that here we multiply the prime with the full 32-bit input, in
 * contrast with the FNV-1 spec which multiplies the prime with
 * one byte (octet) in turn.
 *
 * @param a - The first data point.
 * @param b - The second data point.
 * @returns The result of performing fnv on the passed in data points.
 */
export const fnv = (a: Uint | U32, b: Uint | U32): U32 => {
  // This is a faster way of doing [number % (2 ** 32)]
  const aValue = a instanceof U32 ? a.value : a.value;
  const bValue = b instanceof U32 ? b.value : b.value;
  const result = ((aValue * 0x0100_0193n) ^ bValue) & U32.MAX_VALUE;
  return U32.wrap(result);
};

/**
 * FNV Hash mixes in data into mix using the ethash fnv method.
 *
 * @param mixIntegers - Mix data in the form of a sequence of Uint32.
 * @param data - The data (sequence of Uint32) to be hashed into the mix.
 * @returns The result of performing the fnv hash on the mix and the passed in data.
 */
export const fnvHash = (
  mixIntegers: ReadonlyArray<U32>,
  data: ReadonlyArray<U32>,
): ReadonlyArray<U32> => {
  return mixIntegers.map((value, i) => fnv(value, data[i]));
};

/**
 * Generate a particular dataset item 0-indexed by `index` using `cache`.
 * Each dataset item is a byte stream of 64 bytes or a stream of 16 uint32
 * numbers.
 *
 * @param cache - The cache from which a subset of items will be used to generate the dataset item.
 * @param index - The index of the dataset item to generate.
 * @returns The generated dataset item for passed index.
 */
export const generateDatasetItem = (
  cache: EthashCache,
  index: Uint,
): Bytes64 => {
  const cacheIndex = Number(index.value % BigInt(cache.length));
  const cacheWords = cache[cacheIndex];
  if (cacheWords === undefined) {
    throw new Error(`Ethash cache index ${cacheIndex} is out of bounds`);
  }

  const mix = keccak512(
    toLeBytesFixed(
      leUint32SequenceToUint(cacheWords).value ^ index.value,
      HASH_BYTES,
    ),
  );

  let mixIntegers = leBytesToUint32Sequence(mix.value);

  for (let j = 0; j < DATASET_PARENTS; j++) {
    const mixWord = mixIntegers[j % 16];
    const cacheIndex =
      fnv(Uint.wrap(index.value ^ BigInt(j)), mixWord).value %
      BigInt(cache.length);
    const parent = cache[Number(cacheIndex)];
    mixIntegers = fnvHash(mixIntegers, parent);
  }

  return keccak512(
    new Bytes64({ value: leUint32SequenceToBytes(mixIntegers) }),
  );
};

/**
 * Generate the full dataset for the block identified by `blockNumber`.
 *
 * This function is present only for demonstration purposes, as it will take
 * a long time to execute.
 *
 * @param blockNumber - The number of the block of interest.
 * @returns The dataset generated for the passed in block.
 */
export const generateDataset = (blockNumber: Uint): ReadonlyArray<Bytes64> => {
  const datasetSizeBytes = datasetSize(blockNumber);
  const cache = generateCache(blockNumber);

  const itemCount = datasetSizeBytes.value / BigInt(HASH_BYTES);
  const dataset: Bytes64[] = [];
  for (let index = 0n; index < itemCount; index++) {
    dataset.push(generateDatasetItem(cache, Uint.wrap(index)));
  }
  return dataset;
};

export type FetchDatasetItem = (index: Uint) => ReadonlyArray<U32>;

/**
 * Obtain the mix digest and the final value for a header, by aggregating
 * data from the full dataset.
 *
 * @param headerHash - The PoW valid rlp hash of a header.
 * @param nonce - The propogated nonce for the given block.
 * @param datasetSizeBytes - Dataset size for the epoch to which the current block belongs to.
 * @param fetchDatasetItem - The function which will be used to obtain a specific dataset item from an index.
 * @returns The mix digest and final result hash.
 */
export const hashimoto = (
  headerHash: Bytes32,
  nonce: Bytes8,
  datasetSizeBytes: Uint,
  fetchDatasetItem: FetchDatasetItem,
): { mixDigest: Uint8Array; result: Bytes32 } => {
  const nonceLe = new Uint8Array(nonce.value);
  nonceLe.reverse();
  const seedHash = keccak512(concatBytes(headerHash.value, nonceLe));
  const seedHead = U32.wrap(
    Uint.fromLeBytes(seedHash.value.subarray(0, 4)).value,
  );

  const rows = datasetSizeBytes.value / BigInt(MIX_BYTES);
  let mix = [
    ...leBytesToUint32Sequence(seedHash.value),
    ...leBytesToUint32Sequence(seedHash.value),
  ];

  for (let i = 0; i < HASHIMOTO_ACCESSES; i++) {
    let newData: U32[] = [];
    const parent =
      fnv(Uint.wrap(BigInt(i) ^ seedHead.value), mix[i % mix.length]).value %
      rows;
    for (let j = 0; j < MIX_BYTES / HASH_BYTES; j++) {
      // Typecasting `parent` from Uint32 to Uint as 2*parent + j may overflow Uint32.
      newData = [
        ...newData,
        ...fetchDatasetItem(Uint.wrap(2n * parent + BigInt(j))),
      ];
    }

    mix = [...fnvHash(mix, newData)];
  }

  const compressedMix: U32[] = [];
  for (let i = 0; i < mix.length; i += 4) {
    compressedMix.push(
      fnv(fnv(fnv(mix[i], mix[i + 1]), mix[i + 2]), mix[i + 3]),
    );
  }

  const mixDigest = leUint32SequenceToBytes(compressedMix);
  const result = keccak256(concatBytes(seedHash.value, mixDigest));

  return { mixDigest, result };
};

/**
 * Generate dataset item (as tuple of Uint32 numbers) from cache.
 *
 * @param index - The index of the dataset item to generate.
 * @param cache - The cache from which the dataset item is generated.
 * @returns The generated dataset item for passed index.
 */
const fetchDatasetItemFromCache =
  (cache: EthashCache) =>
  (index: Uint): ReadonlyArray<U32> => {
    const item = generateDatasetItem(cache, index);
    return leBytesToUint32Sequence(item.value);
  };

/**
 * Run the hashimoto algorithm by generating dataset item using the cache
 * instead of loading the full dataset into main memory.
 *
 * @param headerHash - The PoW valid rlp hash of a header.
 * @param nonce - The propogated nonce for the given block.
 * @param cache - The generated cache for the epoch to which the current block belongs to.
 * @param datasetSizeBytes - Dataset size for the epoch to which the current block belongs to.
 * @returns The mix digest and final result hash.
 */
export const hashimotoLight = (
  headerHash: Bytes32,
  nonce: Bytes8,
  cache: EthashCache,
  datasetSizeBytes: Uint,
): { mixDigest: Uint8Array; result: Bytes32 } => {
  return hashimoto(
    headerHash,
    nonce,
    datasetSizeBytes,
    fetchDatasetItemFromCache(cache),
  );
};

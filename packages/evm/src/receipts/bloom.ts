/**
 * Ethereum Logs Bloom.
 *
 * This module defines functions for calculating bloom filters of logs. For the
 * general theory of bloom filters see e.g. Wikipedia
 * https://en.wikipedia.org/wiki/Bloom_filter. Bloom filters are used to allow
 * for efficient searching of logs by address and/or topic, by rapidly
 * eliminating blocks and receipts from their search.
 */

import { keccak256 } from "@evm-effect/crypto";
import { Bytes, Bytes256, fromBeBytes, Uint } from "@evm-effect/ethereum-types";
import { Either } from "effect";
import type { Log } from "../types/Receipt.js";

/**
 * Add a bloom entry to the bloom filter (`bloom`).
 *
 * The number of hash functions used is 3. They are calculated by taking the
 * least significant 11 bits from the first 3 16-bit words of the
 * `keccak_256()` hash of `bloom_entry`.
 *
 * Parameters
 * ----------
 * bloom :
 *     The bloom filter.
 * bloom_entry :
 *     An entry which is to be added to bloom filter.
 */
export const addToBloom = (bloom: Uint8Array, bloomEntry: Bytes): void => {
  const hashed = keccak256(bloomEntry);

  for (const idx of [0, 2, 4]) {
    // Obtain the least significant 11 bits from the pair of bytes
    // (16 bits), and set this bit in bloom bytearray.
    // The obtained bit is 0-indexed in the bloom filter from the least
    // significant bit to the most significant bit.
    const bitToSet =
      Either.getOrThrow(
        fromBeBytes(
          new Bytes({ value: hashed.value.slice(idx, idx + 2) }),
          Uint,
        ),
      ).value & 0x07ffn;

    // Below is the index of the bit in the bytearray (where 0-indexed
    // byte is the most significant byte)
    const bitIndex = 0x07ff - Number(bitToSet);

    const byteIndex = Math.floor(bitIndex / 8);
    const bitValue = 1 << (7 - (bitIndex % 8));
    bloom[byteIndex] = bloom[byteIndex] | bitValue;
  }
};

/**
 * Obtain the logs bloom from a list of log entries.
 *
 * The address and each topic of a log are added to the bloom filter.
 *
 * Parameters
 * ----------
 * logs :
 *     List of logs for which the logs bloom is to be obtained.
 *
 * Returns
 * -------
 * logs_bloom : `Bloom`
 *     The logs bloom obtained which is 256 bytes with some bits set as per
 *     the caller address and the log topics.
 */
export const logsBloom = (logs: readonly Log[]): Bytes256 => {
  const bloom = new Uint8Array(256); // Initialize with zeros

  for (const log of logs) {
    // Add the log address to the bloom filter
    addToBloom(bloom, new Bytes({ value: log.address.value.value }));

    // Add each topic to the bloom filter
    for (const topic of log.topics) {
      addToBloom(bloom, new Bytes({ value: topic.value }));
    }
  }

  return new Bytes256({ value: bloom });
};

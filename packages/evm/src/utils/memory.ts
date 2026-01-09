/**
 * Memory utility functions
 *
 * Ported from ethereum/forks/osaka/vm/memory.py
 */

import { Bytes, type U256 } from "@evm-effect/ethereum-types";

/**
 * Read bytes from memory.
 *
 * Ported from Python: memory_read_bytes
 *
 * @param memory - Memory contents of the EVM
 * @param startPosition - Starting pointer to the memory
 * @param size - Size of the data that needs to be read from startPosition
 * @returns Data read from memory
 */
export function memoryReadBytes(
  memory: Uint8Array,
  startPosition: U256,
  size: U256,
): Bytes {
  const start = Number(startPosition.value);
  const length = Number(size.value);
  const slice = memory.slice(start, start + length);
  return new Bytes({ value: slice });
}

/**
 * Write bytes to memory.
 *
 * Ported from Python: memory_write
 *
 * @param memory - Memory contents of the EVM
 * @param startPosition - Starting pointer to the memory
 * @param value - Data to write to memory
 */
export function memoryWrite(
  memory: Uint8Array,
  startPosition: U256,
  value: Bytes,
): void {
  const start = Number(startPosition.value);
  memory.set(value.value, start);
}

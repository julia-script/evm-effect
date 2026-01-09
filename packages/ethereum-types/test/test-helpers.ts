/**
 * Ethereum-types specific test helpers and arbitraries
 *
 * @module
 */

import * as fc from "fast-check";

export {
  createComparisonTest,
  fc,
  PythonEvalError,
  type PythonResult,
  pythonEval,
  type TestAgainstPythonConfig,
  testAgainstPython,
} from "@evm-effect/shared/test/python";

// ============================================================================
// ETHEREUM-TYPES SPECIFIC FAST-CHECK ARBITRARIES
// ============================================================================

/**
 * Arbitrary for U8 values (0 to 255)
 */
export const arbU8 = () => fc.bigInt({ min: 0n, max: 255n });

/**
 * Arbitrary for U64 values
 */
export const arbU64 = () => fc.bigInt({ min: 0n, max: 2n ** 64n - 1n });

/**
 * Arbitrary for U256 values
 */
export const arbU256 = () => fc.bigInt({ min: 0n, max: 2n ** 256n - 1n });

/**
 * Arbitrary for Uint values (arbitrary precision, but limited for practical testing)
 */
export const arbUint = (maxBits = 512) =>
  fc.bigInt({ min: 0n, max: 2n ** BigInt(maxBits) - 1n });

/**
 * Arbitrary for variable-length byte arrays
 */
export const arbBytes = (minLength = 0, maxLength = 100) =>
  fc.uint8Array({ minLength, maxLength });

/**
 * Arbitrary for Bytes1 (1 byte)
 */
export const arbBytes1 = () => fc.uint8Array({ minLength: 1, maxLength: 1 });

/**
 * Arbitrary for Bytes4 (4 bytes)
 */
export const arbBytes4 = () => fc.uint8Array({ minLength: 4, maxLength: 4 });

/**
 * Arbitrary for Bytes8 (8 bytes)
 */
export const arbBytes8 = () => fc.uint8Array({ minLength: 8, maxLength: 8 });

/**
 * Arbitrary for Bytes20 (20 bytes - Ethereum addresses)
 */
export const arbBytes20 = () => fc.uint8Array({ minLength: 20, maxLength: 20 });

/**
 * Arbitrary for Bytes32 (32 bytes - hashes)
 */
export const arbBytes32 = () => fc.uint8Array({ minLength: 32, maxLength: 32 });

/**
 * Arbitrary for Bytes64 (64 bytes)
 */
export const arbBytes64 = () => fc.uint8Array({ minLength: 64, maxLength: 64 });

/**
 * Arbitrary for Bytes256 (256 bytes - bloom filters)
 */
export const arbBytes256 = () =>
  fc.uint8Array({ minLength: 256, maxLength: 256 });

/**
 * Arbitrary for hex strings (even length)
 */
export const arbHexString = (minLength = 2, maxLength = 64) =>
  fc.hexaString({ minLength, maxLength }).map((s) => {
    // Ensure even length
    return s.length % 2 === 0 ? s : `${s}0`;
  });

import { keccak256 } from "@evm-effect/crypto";
import { type Hash32, U64, Uint } from "@evm-effect/ethereum-types";
import { Effect } from "effect";
import type { BlockChain } from "../blockchain.js";
import {
  BASE_FEE_MAX_CHANGE_DENOMINATOR,
  ELASTICITY_MULTIPLIER,
  EMPTY_OMMER_HASH,
  GAS_LIMIT_ADJUSTMENT_FACTOR,
  GAS_LIMIT_MINIMUM,
  TARGET_BLOB_GAS_PER_BLOCK,
} from "../constants.js";
import {
  IncorrectBlockFormatError,
  IncorrectExcessBlobGasError,
  InvalidBaseFeePerGasError,
  InvalidBlock,
  InvalidGasLimitError,
} from "../exceptions.js";
import { encodeHeader, type Header } from "../types/Block.js";
import { Fork } from "../vm/Fork.js";

/**
 * Verifies a block header.
 *
 * In order to consider a block's header valid, the logic for the
 * quantities in the header should match the logic for the block itself.
 * For example the header timestamp should be greater than the block's parent
 * timestamp because the block was created *after* the parent block.
 * Additionally, the block's number should be directly following the parent
 * block's number since it is the next block in the sequence.
 *
 * Parameters
 * ----------
 * chain :
 *     History and current state.
 * header :
 *     Header to check for correctness.
 *
 */
export const validateHeader = Effect.fn("validateHeader")(function* (
  chain: BlockChain,
  header: Header,
) {
  if (header.number.value < 1n) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Block number must be at least 1" }),
    );
  }

  const latestBlock = chain.latestBlock;
  if (!latestBlock) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "No parent block found" }),
    );
  }
  const parentHeader = latestBlock.header;

  if (header.excessBlobGas !== undefined) {
    const excessBlobGas = yield* calculateExcessBlobGas(parentHeader);
    if (header.excessBlobGas.value !== excessBlobGas.value) {
      return yield* Effect.fail(
        new IncorrectExcessBlobGasError({
          message: `Invalid excess blob gas: expected ${excessBlobGas.value}, got ${header.excessBlobGas.value}`,
        }),
      );
    }
  }

  if (header.gasUsed.value > header.gasLimit.value) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Gas used exceeds gas limit" }),
    );
  }

  if (!(yield* checkGasLimit(header.gasLimit, parentHeader.gasLimit))) {
    return yield* Effect.fail(
      new InvalidGasLimitError({ message: "Invalid gas limit" }),
    );
  }

  if (
    header.baseFeePerGas !== undefined &&
    parentHeader.baseFeePerGas !== undefined
  ) {
    const expectedBaseFeePerGas = yield* calculateBaseFeePerGas(
      header.gasLimit,
      parentHeader.gasLimit,
      parentHeader.gasUsed,
      parentHeader.baseFeePerGas,
    );
    if (expectedBaseFeePerGas.value !== header.baseFeePerGas.value) {
      return yield* Effect.fail(
        new InvalidBaseFeePerGasError({ message: "Invalid base fee per gas" }),
      );
    }
  }

  if (header.timestamp.value <= parentHeader.timestamp.value) {
    return yield* Effect.fail(
      new InvalidBlock({
        message: "Timestamp must be greater than parent timestamp",
      }),
    );
  }

  if (header.number.value !== parentHeader.number.value + 1n) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Block number must be parent number + 1" }),
    );
  }

  if (header.extraData.value.length > 32) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Extra data length exceeds 32 bytes" }),
    );
  }

  const fork = yield* Fork;

  const hasBlobGasUsed = header.blobGasUsed !== undefined;
  const hasExcessBlobGas = header.excessBlobGas !== undefined;
  const hasParentBeaconBlockRoot = header.parentBeaconBlockRoot !== undefined;

  if (fork.eip(4844)) {
    if (!hasBlobGasUsed || !hasExcessBlobGas || !hasParentBeaconBlockRoot) {
      return yield* Effect.fail(
        new IncorrectBlockFormatError({
          message: "Missing blob fields for Cancun+ block",
        }),
      );
    }
  } else {
    if (hasBlobGasUsed || hasExcessBlobGas || hasParentBeaconBlockRoot) {
      return yield* Effect.fail(
        new IncorrectBlockFormatError({
          message: "Blob fields present in pre-Cancun block",
        }),
      );
    }
  }

  if (fork.eip(3675)) {
    if (header.difficulty.value !== 0n) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Difficulty must be 0" }),
      );
    }

    const expectedNonce = new Uint8Array(8);
    if (!arraysEqual(header.nonce.value, expectedNonce)) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Nonce must be zero" }),
      );
    }

    if (!arraysEqual(header.ommersHash.value, EMPTY_OMMER_HASH.value)) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Ommers hash must be empty" }),
      );
    }
  }

  const encodedParentHeader = encodeHeader(parentHeader);
  const blockParentHash = keccak256(encodedParentHeader);
  if (!arraysEqual(header.parentHash.value, blockParentHash.value)) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Invalid parent hash" }),
    );
  }
});

/**
 * Calculates the base fee per gas for the block.
 *
 * Parameters
 * ----------
 * block_gas_limit :
 *     Gas limit of the block for which the base fee is being calculated.
 * parent_gas_limit :
 *     Gas limit of the parent block.
 * parent_gas_used :
 *     Gas used in the parent block.
 * parent_base_fee_per_gas :
 *     Base fee per gas of the parent block.
 *
 * Returns
 * -------
 * base_fee_per_gas : `Uint`
 *     Base fee per gas for the block.
 *
 */
const calculateBaseFeePerGas = (
  blockGasLimit: Uint,
  parentGasLimit: Uint,
  parentGasUsed: Uint,
  parentBaseFeePerGas: Uint,
): Effect.Effect<Uint, InvalidBlock, never> =>
  Effect.gen(function* () {
    const parentGasTarget = new Uint({
      value: parentGasLimit.value / ELASTICITY_MULTIPLIER.value,
    });

    if (!(yield* checkGasLimit(blockGasLimit, parentGasLimit))) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Invalid gas limit" }),
      );
    }

    let expectedBaseFeePerGas: Uint;

    if (parentGasUsed.value === parentGasTarget.value) {
      expectedBaseFeePerGas = parentBaseFeePerGas;
    } else if (parentGasUsed.value > parentGasTarget.value) {
      const gasUsedDelta = new Uint({
        value: parentGasUsed.value - parentGasTarget.value,
      });

      const parentFeeGasDelta = new Uint({
        value: parentBaseFeePerGas.value * gasUsedDelta.value,
      });
      const targetFeeGasDelta = new Uint({
        value: parentFeeGasDelta.value / parentGasTarget.value,
      });

      const baseFeePerGasDelta = new Uint({
        value:
          targetFeeGasDelta.value / BASE_FEE_MAX_CHANGE_DENOMINATOR.value >= 1n
            ? targetFeeGasDelta.value / BASE_FEE_MAX_CHANGE_DENOMINATOR.value
            : 1n,
      });

      expectedBaseFeePerGas = new Uint({
        value: parentBaseFeePerGas.value + baseFeePerGasDelta.value,
      });
    } else {
      const gasUsedDelta = new Uint({
        value: parentGasTarget.value - parentGasUsed.value,
      });

      const parentFeeGasDelta = new Uint({
        value: parentBaseFeePerGas.value * gasUsedDelta.value,
      });
      const targetFeeGasDelta = new Uint({
        value: parentFeeGasDelta.value / parentGasTarget.value,
      });

      const baseFeePerGasDelta = new Uint({
        value: targetFeeGasDelta.value / BASE_FEE_MAX_CHANGE_DENOMINATOR.value,
      });

      expectedBaseFeePerGas = new Uint({
        value: parentBaseFeePerGas.value - baseFeePerGasDelta.value,
      });
    }

    return expectedBaseFeePerGas;
  });

/**
 * Obtain the list of hashes of the previous 256 blocks in order of
 * increasing block number.
 *
 * This function will return less hashes for the first 256 blocks.
 *
 * The ``BLOCKHASH`` opcode needs to access the latest hashes on the chain,
 * therefore this function retrieves them.
 *
 * Parameters
 * ----------
 * chain :
 *     History and current state.
 *
 * Returns
 * -------
 * recent_block_hashes : `List[Hash32]`
 *     Hashes of the recent 256 blocks in order of increasing block number.
 *
 */
export const getLast256BlockHashes = (chain: BlockChain): Hash32[] => {
  const recentBlocks = chain.blocks.slice(-255);

  if (recentBlocks.length === 0) {
    return [];
  }

  const recentBlockHashes: Hash32[] = [];

  for (const block of recentBlocks) {
    const prevBlockHash = block.header.parentHash;
    recentBlockHashes.push(prevBlockHash);
  }

  const encodedHeader = encodeHeader(
    recentBlocks[recentBlocks.length - 1].header,
  );
  const mostRecentBlockHash = keccak256(encodedHeader);
  recentBlockHashes.push(mostRecentBlockHash);

  return recentBlockHashes;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates the gas limit for a block.
 *
 * The bounds of the gas limit, ``max_adjustment_delta``, is set as the
 * quotient of the parent block's gas limit and the
 * ``GAS_LIMIT_ADJUSTMENT_FACTOR``. Therefore, if the gas limit that is
 * passed through as a parameter is greater than or equal to the *sum* of
 * the parent's gas and the adjustment delta then the limit for gas is too
 * high and fails this function's check. Similarly, if the limit is less
 * than or equal to the *difference* of the parent's gas and the adjustment
 * delta *or* the predefined ``GAS_LIMIT_MINIMUM`` then this function's
 * check fails because the gas limit doesn't allow for a sufficient or
 * reasonable amount of gas to be used on a block.
 *
 * Parameters
 * ----------
 * gas_limit :
 *     Gas limit to validate.
 * parent_gas_limit :
 *     Gas limit of the parent block.
 *
 * Returns
 * -------
 * check : `bool`
 *     True if gas limit constraints are satisfied, False otherwise.
 *
 */
const checkGasLimit = (
  gasLimit: Uint,
  parentGasLimit: Uint,
): Effect.Effect<boolean, never, never> =>
  Effect.gen(function* () {
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
  });

/**
 * Calculate the excess blob gas for the current block based
 * on the gas used in the parent block.
 *
 * Parameters
 * ----------
 * parent_header :
 *     The parent block of the current block.
 *
 * Returns
 * -------
 * excess_blob_gas: `U64`
 *     The excess blob gas for the current block.
 *
 */
const calculateExcessBlobGas = Effect.fn("calculateExcessBlobGas")(function* (
  parentHeader: Header,
) {
  const excessBlobGas =
    parentHeader.excessBlobGas !== undefined
      ? parentHeader.excessBlobGas
      : new U64({ value: 0n });
  const blobGasUsed =
    parentHeader.blobGasUsed !== undefined
      ? parentHeader.blobGasUsed
      : new U64({ value: 0n });

  const parentBlobGas = new U64({
    value: excessBlobGas.value + blobGasUsed.value,
  });

  const targetBlobGasPerBlock = yield* TARGET_BLOB_GAS_PER_BLOCK;
  if (parentBlobGas.value < targetBlobGasPerBlock.value) {
    return new U64({ value: 0n });
  }

  return new U64({
    value: parentBlobGas.value - targetBlobGasPerBlock.value,
  });
});

/**
 * Helper function to compare two Uint8Arrays for equality.
 */
const arraysEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/**
 * Compute the hash of a block header.
 *
 * The block hash is the Keccak-256 hash of the RLP-encoded header.
 *
 * @param header - The block header to hash
 * @returns The 32-byte hash of the header
 */
export const computeBlockHash = (header: Header): Hash32 => {
  return keccak256(encodeHeader(header));
};

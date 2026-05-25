import {
  datasetSize,
  generateCache,
  hashimotoLight,
  keccak256,
} from "@evm-effect/crypto";
import { type Hash32, max, U64, U256, Uint } from "@evm-effect/ethereum-types";
import { encode, encodeTo } from "@evm-effect/rlp";
import { Effect, Result } from "effect";
import { dedent } from "ts-dedent";
import type { BlockChain } from "../blockchain.js";
import {
  BASE_FEE_MAX_CHANGE_DENOMINATOR,
  BOMB_DELAY_BLOCKS,
  ELASTICITY_MULTIPLIER,
  EMPTY_OMMER_HASH,
  INITIAL_BASE_FEE,
  LIMIT_ADJUSTMENT_FACTOR,
  LIMIT_MINIMUM,
  MINIMUM_DIFFICULTY,
} from "../constants.js";
import { InvalidBlock } from "../exceptions.js";
import { calculateBlobGasPrice } from "../transactions/gas.js";
import { Header } from "../types/Block.js";
import { Fork } from "../vm/ForkService.js";
import { GasCosts } from "../vm/gas.js";

/**
 * Verifies a block header.
 *
 * In order to consider a block's header valid, the logic for the
 * quantities in the header should match the logic for the block itself.
 * For example, the header timestamp should be greater than the block's parent
 * timestamp because the block was created *after* the parent block.
 * Additionally, the block's number should be directly following the parent
 * block's number since it is the next block in the sequence.
 *
 * @param chain - History and current state.
 * @param header - Header to check for correctness.
 */
export const validateHeader = Effect.fn("validateHeader")(function* (
  chain: BlockChain,
  header: Header,
) {
  const fork = yield* Fork;
  if (fork.eip(3675)) {
    // Proof of Stake

    if (header.number.value < 1n) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Block number must be at least 1" }),
      );
    }
    const parentHeader = chain.blocks[chain.blocks.length - 1]?.header;
    if (!parentHeader) {
      return yield* Effect.die(new Error("Parent header not found"));
    }

    if (fork.eip(4844)) {
      const excessBlobGas = yield* calculateExcessBlobGas(parentHeader);
      if (excessBlobGas.value !== header.excessBlobGas?.value) {
        return yield* Effect.fail(
          new InvalidBlock({
            message: dedent`
            excess blob gas mismatch
            header excess blob gas: ${header.excessBlobGas?.value}
            calculated excess blob gas: ${excessBlobGas.value}
            `,
          }),
        );
      }
    }

    if (header.gasUsed.value > header.gasLimit.value) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Gas used exceeds gas limit" }),
      );
    }

    if (!parentHeader.baseFeePerGas) {
      return yield* Effect.die(new Error("Parent base fee per gas not found"));
    }
    const expectedBaseFeePerGas = yield* calculateBaseFeePerGas(
      header.gasLimit,
      parentHeader.gasLimit,
      parentHeader.gasUsed,
      parentHeader.baseFeePerGas,
    );

    if (expectedBaseFeePerGas.value !== header.baseFeePerGas?.value) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Invalid base fee per gas" }),
      );
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

    if (header.difficulty.value !== 0n) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Difficulty must be 0" }),
      );
    }

    if (!arraysEqual(header.nonce.value, new Uint8Array(8))) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Nonce must be zero" }),
      );
    }

    if (!arraysEqual(header.ommersHash.value, EMPTY_OMMER_HASH.value)) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Ommers hash must be empty" }),
      );
    }

    const encodedParentHeader = yield* parentHeader.encode();
    const blockParentHash = keccak256(encodedParentHeader.value);

    if (!arraysEqual(header.parentHash.value, blockParentHash.value)) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Invalid parent hash" }),
      );
    }
    return;
  }

  // Proof of Work

  if (header.number.value < 1n) {
    return yield* Effect.die(
      new InvalidBlock({ message: "Block number must be at least 1" }),
    );
  }
  if (chain.blocks.length === 0) {
    return yield* Effect.die(new Error("No blocks in chain"));
  }

  const parentHeaderNumber = Number(header.number.value - 1n);
  const firstBlockNumber = Number(chain.blocks[0]?.header.number.value ?? 1n);
  const lastBlockNumber = Number(
    chain.blocks[chain.blocks.length - 1]?.header.number.value ?? 1n,
  );

  if (
    parentHeaderNumber < firstBlockNumber ||
    parentHeaderNumber > lastBlockNumber
  ) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Invalid block number" }),
    );
  }

  const parentHeader =
    chain.blocks[parentHeaderNumber - firstBlockNumber]?.header;
  if (!parentHeader) {
    return yield* Effect.die(new Error("Parent header not found"));
  }

  const parentHasOmmers =
    fork.eip(649) &&
    !arraysEqual(parentHeader.ommersHash.value, EMPTY_OMMER_HASH.value);

  // assert isinstance(FORK_CRITERIA, ByBlockNumber)
  if (fork.eip(1559)) {
    const isFirstBlock =
      fork.forkCriteria?._tag === "byBlockNumber" &&
      fork.forkCriteria.blockNumber === header.number.value;
    const isLondonBlock = fork.name === "london";
    const isLondonTransitionBlock = isFirstBlock && isLondonBlock;
    // expected_base_fee_per_gas = INITIAL_BASE_FEE
    let expectedBaseFeePerGas = INITIAL_BASE_FEE;
    if (!isLondonTransitionBlock) {
      if (!parentHeader.baseFeePerGas) {
        return yield* Effect.die(
          new Error("Parent base fee per gas not found"),
        );
      }
      expectedBaseFeePerGas = yield* calculateBaseFeePerGas(
        header.gasLimit,
        parentHeader.gasLimit,
        parentHeader.gasUsed,
        parentHeader.baseFeePerGas,
      ).pipe(Effect.map((v) => v.value));
    }
    if (expectedBaseFeePerGas !== header.baseFeePerGas?.value) {
      return yield* Effect.fail(
        new InvalidBlock({ message: "Invalid base fee per gas" }),
      );
    }
  }

  if (header.gasUsed.value > header.gasLimit.value) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Gas used exceeds gas limit" }),
    );
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

  if (!(yield* checkGasLimit(header.gasLimit, parentHeader.gasLimit))) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Invalid gas limit" }),
    );
  }

  if (header.extraData.value.length > 32) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Extra data length exceeds 32 bytes" }),
    );
  }

  const blockDifficulty = yield* calculateBlockDifficulty(
    header.number,
    header.timestamp,
    parentHeader.timestamp,
    parentHeader.difficulty,
    parentHasOmmers,
  );

  if (header.difficulty.value !== blockDifficulty) {
    return yield* Effect.fail(
      new InvalidBlock({
        message: `Invalid difficulty: ${header.difficulty.value} !== ${blockDifficulty}`,
      }),
    );
  }

  const encodedParentHeader = yield* parentHeader.encode();
  const blockParentHash = keccak256(encodedParentHeader.value);
  if (!arraysEqual(header.parentHash.value, blockParentHash.value)) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Invalid parent hash" }),
    );
  }
  if (!validateProofOfWork(header)) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Invalid proof of work" }),
    );
  }
  // todo:apply dao changes
});

export const validateProofOfWork = Effect.fn("validateProofOfWork")(function* (
  header: Header,
): Effect.fn.Return<void, InvalidBlock, Fork> {
  const headerHash = yield* generateHeaderHashForPow(header);
  //     # TODO: Memoize this somewhere and read from that data instead of
  //     # calculating cache for every block validation.
  const cache = generateCache(header.number);

  const { mixDigest, result } = hashimotoLight(
    headerHash,
    header.nonce,
    cache,
    datasetSize(header.number),
  );
  const mixDigestBytes = header.prevRandao;
  if (!arraysEqual(mixDigest, mixDigestBytes.value)) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Invalid mix digest" }),
    );
  }
  const limit = U256.MAX_VALUE + 1n;
  if (U256.fromBeBytes(result.value).value > limit / header.difficulty.value) {
    return yield* Effect.fail(new InvalidBlock({ message: "Invalid result" }));
  }
});
/**
 * Generates the RLP hash of the header to be used for Proof-of-Work verification.
 *
 * The PoW artefacts `mix_digest` and `nonce` are ignored while calculating this hash.
 * A particular PoW is valid for a single hash, and that hash is computed by this function.
 * The `nonce` and `mix_digest` are omitted because they are changed by miners during
 * their search for a sufficient proof-of-work.
 *
 * @param header - The header object for which the hash is to be generated.
 * @returns The PoW-valid RLP hash of the passed-in header as a `Hash32`.
 */
export const generateHeaderHashForPow = Effect.fn("generateHeaderHashForPow")(
  function* (header: Header): Effect.fn.Return<Hash32, InvalidBlock, Fork> {
    const fork = yield* Fork;
    const headerDataWithoutPowArtefacts = [
      header.parentHash,
      header.ommersHash,
      header.coinbase,
      header.stateRoot,
      header.transactionsRoot,
      header.receiptRoot,
      header.bloom,
      header.difficulty,
      header.number,
      header.gasLimit,
      header.gasUsed,
      header.timestamp,
      header.extraData,
    ];
    if (fork.eip(1559)) {
      if (!header.baseFeePerGas) {
        return yield* Effect.die(new Error("Base fee per gas not found"));
      }
      headerDataWithoutPowArtefacts.push(header.baseFeePerGas);
    }

    return keccak256(encode(headerDataWithoutPowArtefacts));
  },
);

/**
 * Computes the difficulty of a block using its header and parent header.
 *

 * @param blockNumber - Block number of the block.
 * @param blockTimestamp - Timestamp of the block.
 * @param parentTimestamp - Timestamp of the parent block.
 * @param parentDifficulty - Difficulty of the parent block.
 * @returns The computed difficulty as a bigint.
 */
const calculateBlockDifficulty = Effect.fn("calculateBlockDifficulty")(
  function* (
    blockNumber: Uint,
    blockTimestamp: U256,
    parentTimestamp: U256,
    parentDifficulty: Uint,
    parentHasOmmers: boolean,
  ): Effect.fn.Return<bigint, InvalidBlock, Fork> {
    const fork = yield* Fork;

    let difficulty: bigint;
    if (fork.eip(649)) {
      // Byzantium

      const offset =
        (parentDifficulty.value / 2048n) *
        max(
          (parentHasOmmers ? 2n : 1n) -
            (blockTimestamp.value - parentTimestamp.value) / 9n,
          -99n,
        );
      difficulty = parentDifficulty.value + offset;
    } else if (fork.eip(2)) {
      // Homestead
      //
      // The difficulty is determined by the time the block was created after its
      // parent. The ``offset`` is calculated using the parent block's difficulty,
      // ``parent_difficulty``, and the timestamp between blocks. This offset is
      // then added to the parent difficulty and is stored as the ``difficulty``
      // variable. If the time between the block and its parent is too short, the
      // offset will result in a positive number thus making the sum of
      // ``parent_difficulty`` and ``offset`` to be a greater value in order to
      // avoid mass forking. But, if the time is long enough, then the offset
      // results in a negative value making the block less difficult than
      // its parent.

      // The base standard for a block's difficulty is the predefined value
      // set for the genesis block since it has no parent. So, a block
      // can't be less difficult than the genesis block, therefore each block's
      // difficulty is set to the maximum value between the calculated
      // difficulty and the ``MINIMUM_DIFFICULTY``.
      const offset =
        (parentDifficulty.value / 2048n) *
        max(1n - (blockTimestamp.value - parentTimestamp.value) / 10n, -99n);
      difficulty = parentDifficulty.value + offset;
    } else {
      const maxAdjustmentDelta = parentDifficulty.value / 2048n;
      difficulty = parentDifficulty.value + maxAdjustmentDelta;
      if (blockTimestamp.value >= parentTimestamp.value + 13n) {
        // Frontier
        // The difficulty of a block is determined by the time the block was created after its parent.
        // If a block's timestamp is more than 13 seconds after its parent block, then its difficulty
        // is set as the difference between the parent's difficulty and the `max_adjustment_delta`.
        // Otherwise, if the time between parent and child blocks is too small (under 13 seconds),
        // then, to avoid mass forking, the block's difficulty is set to the sum of the delta and the parent's difficulty.
        difficulty = parentDifficulty.value - maxAdjustmentDelta;
      }
    }

    //
    //  Historical Note: The difficulty bomb was not present in Ethereum at the
    //  start of Frontier, but was added shortly after launch. However since the
    //  bomb has no effect prior to block 200000 we pretend it existed from
    //  genesis.
    //  See https://github.com/ethereum/go-ethereum/pull/1588

    let numBombPeriods: bigint;
    if (fork.eip(649)) {
      numBombPeriods =
        (blockNumber.value - (yield* BOMB_DELAY_BLOCKS)) / 100000n - 2n;
    } else {
      numBombPeriods = blockNumber.value / 100000n - 2n;
    }
    if (numBombPeriods >= 0) {
      difficulty += 2n ** numBombPeriods;
    }
    //  Some clients raise the difficulty to `MINIMUM_DIFFICULTY` prior to adding
    //  the bomb. This bug does not matter because the difficulty is always much
    //  greater than `MINIMUM_DIFFICULTY` on Mainnet.
    return max(difficulty, MINIMUM_DIFFICULTY);
  },
);

const calculateBaseFeePerGas = Effect.fn("calculateBaseFeePerGas")(function* (
  blockGasLimit: Uint,
  parentGasLimit: Uint,
  parentGasUsed: Uint,
  parentBaseFeePerGas: Uint,
): Effect.fn.Return<Uint, InvalidBlock, never> {
  const parentGasTarget = parentGasLimit.value / ELASTICITY_MULTIPLIER;
  if (!(yield* checkGasLimit(blockGasLimit, parentGasLimit))) {
    return yield* Effect.fail(
      new InvalidBlock({ message: "Invalid gas limit" }),
    );
  }

  let expectedBaseFeePerGas: bigint;
  if (parentGasUsed.value === parentGasTarget) {
    expectedBaseFeePerGas = parentBaseFeePerGas.value;
  } else if (parentGasUsed.value > parentGasTarget) {
    const gasUsedDelta = parentGasUsed.value - parentGasTarget;

    const parentFeeGasDelta = parentBaseFeePerGas.value * gasUsedDelta;
    const targetFeeGasDelta = parentFeeGasDelta / parentGasTarget;

    const baseFeePerGasDelta = max(
      targetFeeGasDelta / BASE_FEE_MAX_CHANGE_DENOMINATOR,
      1n,
    );

    expectedBaseFeePerGas = parentBaseFeePerGas.value + baseFeePerGasDelta;
  } else {
    const gasUsedDelta = parentGasTarget - parentGasUsed.value;

    const parentFeeGasDelta = parentBaseFeePerGas.value * gasUsedDelta;
    const targetFeeGasDelta = parentFeeGasDelta / parentGasTarget;
    const baseFeePerGasDelta =
      targetFeeGasDelta / BASE_FEE_MAX_CHANGE_DENOMINATOR;

    expectedBaseFeePerGas = parentBaseFeePerGas.value - baseFeePerGasDelta;
  }
  return Uint.wrap(expectedBaseFeePerGas);
});

const checkGasLimit = (
  gasLimit: Uint,
  parentGasLimit: Uint,
): Effect.Effect<boolean, never, never> =>
  Effect.gen(function* () {
    const maxAdjustmentDelta = new Uint({
      value: parentGasLimit.value / LIMIT_ADJUSTMENT_FACTOR.value,
    });

    if (gasLimit.value >= parentGasLimit.value + maxAdjustmentDelta.value) {
      return false;
    }
    if (gasLimit.value <= parentGasLimit.value - maxAdjustmentDelta.value) {
      return false;
    }
    if (gasLimit.value < LIMIT_MINIMUM.value) {
      return false;
    }

    return true;
  });

export const calculateExcessBlobGas = Effect.fn("calculateExcessBlobGas")(
  function* (parentHeader: Header): Effect.fn.Return<U64, never, Fork> {
    let excessBlobGas = 0n;
    let blobGasUsed = 0n;
    let baseFeePerGas = 0n;
    if (
      parentHeader.excessBlobGas !== undefined &&
      parentHeader.blobGasUsed !== undefined
    ) {
      excessBlobGas = parentHeader.excessBlobGas?.value ?? 0n;
      blobGasUsed = parentHeader.blobGasUsed?.value ?? 0n;
    }
    const fork = yield* Fork;
    if (fork.eip(7918) && parentHeader.baseFeePerGas !== undefined) {
      baseFeePerGas = parentHeader.baseFeePerGas.value;
    }

    const parentBlobGas = excessBlobGas + blobGasUsed;
    const blobTargetGasPerBlock = yield* GasCosts.BLOB_TARGET_GAS_PER_BLOCK;
    if (parentBlobGas < blobTargetGasPerBlock.value) {
      return U64.wrap(0n);
    }

    if (fork.eip(4844)) {
      let targetBlobGasPrice = GasCosts.PER_BLOB.value;
      targetBlobGasPrice *= yield* calculateBlobGasPrice(
        U64.wrap(excessBlobGas),
      ).pipe(Effect.map((blobGasPrice) => blobGasPrice.value));

      const baseBlobTxPrice = GasCosts.BLOB_BASE_COST.value * baseFeePerGas;
      if (baseBlobTxPrice > targetBlobGasPrice) {
        const blobScheduleDelta =
          GasCosts.BLOB_SCHEDULE_MAX.value -
          GasCosts.BLOB_SCHEDULE_TARGET.value;
        return U64.wrap(
          excessBlobGas +
            (blobGasUsed * blobScheduleDelta) /
              GasCosts.BLOB_SCHEDULE_MAX.value,
        );
      }
    }
    return U64.wrap(parentBlobGas - blobTargetGasPerBlock.value);
  },
);

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
export const computeBlockHash = (header: Header) => {
  return encodeTo(Header, header).pipe(Result.map(keccak256));
};

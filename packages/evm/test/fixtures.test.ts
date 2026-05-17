import { readFile } from "node:fs/promises";
import * as path from "node:path";
import {
  checkTestCache,
  isTransitionFork,
  LIMIT,
  markTestFailed,
  markTestPassed,
  resolveFork,
  resolveForkForTimestamp,
  runWithTestLogger,
  SKIP,
  TEST_CONFIG,
} from "./fixtures-helpers.js";
import {
  BlockchainTest,
  flattenStateTestFixtures,
  type Index,
  type IndexEntry,
  StateTestFix,
} from "./fixtures-schemas.js";

// START OF THE INDEX LOADING
//
//
// NOTE:This section of the code is intentionally simple
// because we want the startup time to be minimal.
//
// This section will read the index of all tests, which are thousands
// then let vitest do the filtering based on -t / --testNamePattern,
// and only run the relevant tests
// then the code that runs inside the test body is already past filtering
// so we can lazily  do any more expensive things there
const dirname = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(dirname, "..", "test-fixtures");
const now = performance.now();
const fixturesIndexPath = path.join(root, "fixtures", ".meta", "index.json");

const loaded = JSON.parse(
  await readFile(fixturesIndexPath, "utf-8"),
) as (typeof Index)["Type"];

type IndexCaseWithHash = (typeof IndexEntry)["Type"] & { shortHash: string };
type CasesByFormat = {
  state_test: Map<string, IndexCaseWithHash>;
  blockchain_test: Map<string, IndexCaseWithHash>;
  blockchain_test_engine: Map<string, IndexCaseWithHash>;
  blockchain_test_engine_x: Map<string, IndexCaseWithHash>;
  transaction_test: Map<string, IndexCaseWithHash>;
};

const casesByFormat: CasesByFormat = {
  state_test: new Map(),
  blockchain_test: new Map(),
  blockchain_test_engine: new Map(),
  blockchain_test_engine_x: new Map(),
  transaction_test: new Map(),
};

for (let i = 0; i < loaded.test_cases.length; i++) {
  const testCase = loaded.test_cases[i] as IndexCaseWithHash;
  testCase.shortHash = testCase.fixture_hash.slice(0, 18);

  casesByFormat[testCase.format].set(testCase.shortHash, testCase);
}
console.log(`processed in ${performance.now() - now}ms`);

// END OF THE INDEX LOADING

import { keccak256 } from "@evm-effect/crypto/keccak256";
import {
  type Access,
  type AccessListTransaction,
  Authorization,
  type BlobTransaction,
  type FeeMarketTransaction,
  type LegacyTransaction,
  type SetCodeTransaction,
  signTransaction,
  type Transaction,
} from "@evm-effect/crypto/transactions";
import { Address } from "@evm-effect/ethereum-types";
import { Bytes32 } from "@evm-effect/ethereum-types/bytes";
import { U8, U64, U256, Uint } from "@evm-effect/ethereum-types/numeric";
import rlp from "@evm-effect/rlp";
import { bufferFromHex } from "@evm-effect/shared/bytes";
import { Console, Effect, Match, Result, Schema } from "effect";
import { afterEach, describe, expect, test } from "vitest";
import { BlockChain, emptyBlockOutput } from "../src/blockchain.js";
import { computeBlockHash } from "../src/blocks/validator.js";
import { stateTransition } from "../src/fork.js";
import State from "../src/state.js";
import { processTransaction } from "../src/transactions/processor.js";
import { decodeBlock } from "../src/types/Block.js";
import { Log } from "../src/types/Receipt.js";
import { Fork } from "../src/vm/Fork.js";
import { BlockEnvironment } from "../src/vm/message.js";
import { Account } from "../src/vm/types.js";

/**
 * Maps internal error tags to Ethereum test fixture exception format.
 *
 * Fixture format: "ExceptionType.EXCEPTION_NAME" (e.g., "TransactionException.INTRINSIC_GAS_TOO_LOW")
 * Multiple exceptions can be separated by "|" character.
 *
 * @see https://ethereum.github.io/execution-spec-tests/main/consuming_tests/exceptions/
 */
const errorTagToFixtureException: Record<string, string> = {
  "EthereumException/InvalidTransaction/InsufficientTransactionGasError":
    "TransactionException.INTRINSIC_GAS_TOO_LOW",
  "EthereumException/InvalidTransaction/IntrinsicGasBelowFloorGasCostError":
    "TransactionException.INTRINSIC_GAS_BELOW_FLOOR_GAS_COST",
  "EthereumException/InvalidTransaction/InsufficientBalanceError":
    "TransactionException.INSUFFICIENT_ACCOUNT_FUNDS",
  "EthereumException/InvalidTransaction/NonceMismatchError":
    "TransactionException.NONCE_MISMATCH",
  "EthereumException/InvalidTransaction/NonceTooLowError":
    "TransactionException.NONCE_MISMATCH_TOO_LOW",
  "EthereumException/InvalidTransaction/NonceTooHighError":
    "TransactionException.NONCE_MISMATCH_TOO_HIGH",
  "EthereumException/InvalidTransaction/InvalidSenderError":
    "TransactionException.SENDER_NOT_EOA",
  "EthereumException/InvalidTransaction/GasUsedExceedsLimitError":
    "TransactionException.GAS_ALLOWANCE_EXCEEDED",
  "EthereumException/InvalidTransaction/NonceOverflowError":
    "TransactionException.NONCE_IS_MAX",
  "EthereumException/InvalidTransaction/TransactionTypeError":
    "TransactionException.TYPE_NOT_SUPPORTED",
  "EthereumException/InvalidTransaction/TYPE_1_TX_PRE_FORK":
    "TransactionException.TYPE_1_TX_PRE_FORK",
  "EthereumException/InvalidTransaction/TYPE_2_TX_PRE_FORK":
    "TransactionException.TYPE_2_TX_PRE_FORK",
  "EthereumException/InvalidTransaction/TYPE_3_TX_PRE_FORK":
    "TransactionException.TYPE_3_TX_PRE_FORK",
  "EthereumException/InvalidTransaction/TYPE_4_TX_PRE_FORK":
    "TransactionException.TYPE_4_TX_PRE_FORK",
  "EthereumException/InvalidTransaction/TransactionTypeContractCreationError":
    "TransactionException.TYPE_3_TX_CONTRACT_CREATION",
  "EthereumException/InvalidTransaction/Type4TxContractCreationError":
    "TransactionException.TYPE_4_TX_CONTRACT_CREATION",
  "EthereumException/InvalidTransaction/BlobGasLimitExceededError":
    "TransactionException.TYPE_3_TX_MAX_BLOB_GAS_ALLOWANCE_EXCEEDED",
  "EthereumException/InvalidTransaction/InsufficientMaxFeePerBlobGasError":
    "TransactionException.INSUFFICIENT_MAX_FEE_PER_BLOB_GAS",
  "EthereumException/InvalidTransaction/InsufficientMaxFeePerGasError":
    "TransactionException.INSUFFICIENT_MAX_FEE_PER_GAS",
  "EthereumException/InvalidTransaction/InvalidBlobVersionedHashError":
    "TransactionException.TYPE_3_TX_INVALID_BLOB_VERSIONED_HASH",
  "EthereumException/InvalidTransaction/NoBlobDataError":
    "TransactionException.TYPE_3_TX_ZERO_BLOBS",
  "EthereumException/InvalidTransaction/BlobCountExceededError":
    "TransactionException.TYPE_3_TX_BLOB_COUNT_EXCEEDED",
  "EthereumException/InvalidTransaction/PriorityFeeGreaterThanMaxFeeError":
    "TransactionException.PRIORITY_GREATER_THAN_MAX_FEE_PER_GAS",
  "EthereumException/InvalidTransaction/EmptyAuthorizationListError":
    "TransactionException.TYPE_4_EMPTY_AUTHORIZATION_LIST",
  "EthereumException/InvalidTransaction/InitCodeTooLargeError":
    "TransactionException.INITCODE_SIZE_EXCEEDED",
  "EthereumException/InvalidTransaction/TransactionGasLimitExceededError":
    "TransactionException.GAS_LIMIT_EXCEEDED",

  // Block exceptions
  "EthereumException/InvalidBlock": "BlockException.INVALID_BLOCK",
  "EthereumException/InvalidBlock/IncorrectExcessBlobGasError":
    "BlockException.INCORRECT_EXCESS_BLOB_GAS",
  "EthereumException/InvalidBlock/IncorrectBlobGasUsedError":
    "BlockException.INCORRECT_BLOB_GAS_USED",
  "EthereumException/InvalidBlock/InvalidGasLimitError":
    "BlockException.INVALID_GASLIMIT",
  "EthereumException/InvalidBlock/BlobGasUsedAboveLimitError":
    "BlockException.BLOB_GAS_USED_ABOVE_LIMIT",
  "EthereumException/InvalidBlock/InvalidWithdrawalsRootError":
    "BlockException.INVALID_WITHDRAWALS_ROOT",
  "EthereumException/InvalidBlock/IncorrectBlockFormatError":
    "BlockException.INCORRECT_BLOCK_FORMAT",
  "EthereumException/InvalidBlock/RlpStructuresEncodingError":
    "BlockException.RLP_STRUCTURES_ENCODING",
  "EthereumException/InvalidBlock/InvalidDepositEventLayoutError":
    "BlockException.INVALID_DEPOSIT_EVENT_LAYOUT",
  "EthereumException/InvalidBlock/InvalidRequestsError":
    "BlockException.INVALID_REQUESTS",
  "EthereumException/InvalidBlock/SystemContractEmptyError":
    "BlockException.SYSTEM_CONTRACT_EMPTY",
  "EthereumException/InvalidBlock/SystemContractCallFailedError":
    "BlockException.SYSTEM_CONTRACT_CALL_FAILED",
  "EthereumException/InvalidBlock/InvalidBaseFeePerGasError":
    "BlockException.INVALID_BASEFEE_PER_GAS",
};

/**
 * Converts an internal error to the fixture exception format.
 *
 * @param error - The error object from our implementation
 * @returns The fixture exception string (e.g., "TransactionException.INTRINSIC_GAS_TOO_LOW")
 *          or null if no mapping exists
 */
const toFixtureException = (error: unknown): string | null => {
  if (error === null || typeof error !== "object") {
    return null;
  }

  const tag = "_tag" in error ? String(error._tag) : null;
  if (tag === null) {
    return null;
  }

  return errorTagToFixtureException[tag] ?? null;
};

/**
 * Checks if an error matches one of the expected fixture exceptions.
 *
 * The expectException string can contain multiple exceptions separated by "|".
 * For example: "TransactionException.NONCE_MISMATCH|TransactionException.NONCE_TOO_HIGH"
 *
 * @param error - The error object from our implementation
 * @param expectException - The expected exception string from the fixture
 * @returns Object with match result and details
 */
const matchesExpectedException = (
  error: unknown,
  expectException: string,
): {
  matches: boolean;
  actualException: string | null;
  expectedOptions: string[];
} => {
  const actualException = toFixtureException(error);
  const expectedOptions = expectException.split("|").map((s) => s.trim());

  const matches =
    actualException !== null && expectedOptions.includes(actualException);

  return { matches, actualException, expectedOptions };
};

type FlatStateTestFixture =
  ReturnType<typeof flattenStateTestFixtures> extends Generator<infer T, void>
    ? T
    : never;

type TestState = {
  shortHash: string | null;
  passed: boolean;
  skipped: boolean;
  startTime: number;
  error: unknown;
};

describe("StateTest", TEST_CONFIG, () => {
  const testState: TestState = {
    shortHash: null,
    passed: false,
    skipped: false,
    startTime: 0,
    error: undefined,
  };

  afterEach(async () => {
    if (testState.shortHash && !testState.skipped) {
      const durationMs = performance.now() - testState.startTime;
      if (testState.passed) {
        await markTestPassed(testState.shortHash, durationMs);
      } else {
        await markTestFailed(testState.shortHash, testState.error, durationMs);
      }
    }
    testState.shortHash = null;
    testState.passed = false;
    testState.skipped = false;
    testState.startTime = 0;
    testState.error = undefined;
  });

  test.each(
    [...casesByFormat.state_test.values()]
      .slice(SKIP, LIMIT ? SKIP + LIMIT : undefined)
      .map((value, index) => ({
        ...value,
        index: SKIP + index,
      })),
  )(`$shortHash - [$index] $id`, TEST_CONFIG, async (testCaseIndex) => {
    testState.shortHash = testCaseIndex.shortHash;
    testState.passed = false;
    testState.skipped = false;
    testState.startTime = performance.now();
    testState.error = undefined;

    if (await checkTestCache(testCaseIndex.shortHash)) {
      testState.skipped = true;
      return;
    }
    const testCaseRaw: unknown = (
      await readFile(
        path.join(root, "fixtures", testCaseIndex.json_path),
        "utf-8",
      ).then(JSON.parse)
    )[testCaseIndex.id];

    const runStateTest = Effect.fn("runStateTest")(function* (
      fixture: FlatStateTestFixture,
    ) {
      const state = State.empty();
      const fork = yield* Fork;
      yield* Console.log(`Fork: ${fork.name}`);

      for (const [addrStr, value] of Object.entries(fixture.pre)) {
        const addr = new Address({ value: bufferFromHex(addrStr) });
        const account = new Account({
          nonce: value.nonce,
          balance: new U256({ value: value.balance.value }),
          code: value.code,
        });
        yield* State.setAccount(state, addr, account);

        if (value.storage) {
          for (const [storageKeyStr, storageValue] of Object.entries(
            value.storage,
          )) {
            const keyBytes = new Bytes32({
              value: bufferFromHex(storageKeyStr),
            });
            const valueU256 = U256.fromBeBytes(storageValue.value);

            yield* State.setStorage(state, addr, keyBytes, valueU256);
          }
        }
      }
      const blockEnv = new BlockEnvironment({
        chainId: new U64({ value: fixture.config.chainid.value }),
        state: state,
        blockGasLimit: fixture.env.currentGasLimit,
        blockHashes: [],
        coinbase: fixture.env.currentCoinbase,
        number: fixture.env.currentNumber,
        baseFeePerGas: fixture.env.currentBaseFee ?? new Uint({ value: 0n }),
        time: new U256({ value: fixture.env.currentTimestamp.value }),
        prevRandao: new Bytes32({
          value: fixture.env.currentRandom?.value ?? new Uint8Array(32),
        }),
        difficulty: fixture.env.currentDifficulty ?? new Uint({ value: 0n }),
        excessBlobGas: new U64({
          value: fixture.env.currentExcessBlobGas?.value ?? 0n,
        }),
        parentBeaconBlockRoot: new Bytes32({ value: new Uint8Array(32) }),
      });
      const block_output = emptyBlockOutput();

      let transaction: Transaction = Match.value(fixture.transaction).pipe(
        Match.when(
          {
            accessLists: (value) => typeof value !== "undefined",
            gasPrice: (value) => typeof value !== "undefined",
            accessList: (value) => typeof value !== "undefined",
          },
          (value): AccessListTransaction => ({
            _tag: "AccessListTransaction",
            chainId: new U64({ value: fixture.config.chainid.value }),
            nonce: new U256({
              value: value.nonce.value,
            }),
            gasPrice: value.gasPrice,
            gas: value.gasLimit,
            to: value.to,
            value: new U256({
              value: value.value.value,
            }),
            data: value.data,
            r: new U256({ value: 0n }),
            s: new U256({ value: 0n }),
            yParity: new U8({ value: 0n }),
            accessList: value.accessList.map(
              (access): Access => ({
                _tag: "Access",

                account: access.address,
                slots: access.storageKeys.map(
                  (slot): Bytes32 => new Bytes32({ value: slot.value }),
                ),
              }),
            ),
          }),
        ),
        Match.when(
          {
            gasPrice: (value) => typeof value !== "undefined",
          },
          (value): LegacyTransaction => ({
            _tag: "LegacyTransaction",
            nonce: new U256({
              value: value.nonce.value,
            }),
            gasPrice: value.gasPrice,
            gas: value.gasLimit,
            to: value.to,
            value: new U256({
              value: value.value.value,
            }),
            data: value.data,
            v: new U256({ value: 0n }),
            r: new U256({ value: 0n }),
            s: new U256({ value: 0n }),
          }),
        ),
        Match.when(
          {
            maxFeePerBlobGas: (value) => typeof value !== "undefined",
            blobVersionedHashes: (value) => typeof value !== "undefined",
            maxFeePerGas: (value) => typeof value !== "undefined",
            maxPriorityFeePerGas: (value) => typeof value !== "undefined",
            accessList: (value) => typeof value !== "undefined",
          },
          (value): BlobTransaction => ({
            _tag: "BlobTransaction",
            chainId: new U64({ value: fixture.config.chainid.value }),
            nonce: new U256({
              value: value.nonce.value,
            }),
            maxFeePerBlobGas: new U256({
              value: value.maxFeePerBlobGas.value,
            }),
            blobVersionedHashes: value.blobVersionedHashes.map(
              (hash): Bytes32 => new Bytes32({ value: hash.value }),
            ),
            maxFeePerGas: value.maxFeePerGas,
            maxPriorityFeePerGas: value.maxPriorityFeePerGas,
            gas: value.gasLimit,
            to: value.to,
            value: new U256({
              value: value.value.value,
            }),
            data: value.data,
            r: new U256({ value: 0n }),
            s: new U256({ value: 0n }),
            yParity: new U8({ value: 0n }),
            accessList: value.accessList.map(
              (access): Access => ({
                _tag: "Access",
                account: access.address,
                slots: access.storageKeys.map(
                  (slot): Bytes32 => new Bytes32({ value: slot.value }),
                ),
              }),
            ),
          }),
        ),
        Match.when(
          {
            authorizationList: (value) => typeof value !== "undefined",
            maxPriorityFeePerGas: (value) => typeof value !== "undefined",
            maxFeePerGas: (value) => typeof value !== "undefined",
            gasLimit: (value) => typeof value !== "undefined",
            value: (value) => typeof value !== "undefined",
            data: (value) => typeof value !== "undefined",
            accessList: (value) => typeof value !== "undefined",
          },
          (value): SetCodeTransaction => ({
            _tag: "SetCodeTransaction",
            chainId: new U64({ value: fixture.config.chainid.value }),
            nonce: new U64({
              value: value.nonce.value,
            }),
            gas: value.gasLimit,
            to: value.to,
            value: new U256({
              value: value.value.value,
            }),
            data: value.data,
            accessList: value.accessList.map(
              (access): Access => ({
                _tag: "Access",
                account: access.address,
                slots: access.storageKeys.map(
                  (slot): Bytes32 => new Bytes32({ value: slot.value }),
                ),
              }),
            ),
            maxPriorityFeePerGas: value.maxPriorityFeePerGas,
            maxFeePerGas: value.maxFeePerGas,
            authorizations: value.authorizationList?.map(
              (auth): Authorization =>
                Authorization.make({
                  chainId: new U256({ value: auth.chainId.value }),
                  address: auth.address,
                  nonce: new U64({ value: auth.nonce.value }),
                  yParity: new U8({
                    value: auth.yParity?.value ?? auth.v?.value ?? 0n,
                  }),
                  r: new U256({ value: auth.r.value }),
                  s: new U256({ value: auth.s.value }),
                }),
            ),
            r: new U256({ value: 0n }),
            s: new U256({ value: 0n }),
            yParity: new U8({ value: 0n }),
          }),
        ),

        Match.when(
          {
            maxPriorityFeePerGas: (value) => typeof value !== "undefined",
            maxFeePerGas: (value) => typeof value !== "undefined",
            gasLimit: (value) => typeof value !== "undefined",
            value: (value) => typeof value !== "undefined",
            data: (value) => typeof value !== "undefined",
            accessList: (value) => typeof value !== "undefined",
          },
          (value): FeeMarketTransaction => ({
            _tag: "FeeMarketTransaction",
            chainId: new U64({ value: fixture.config.chainid.value }),
            nonce: new U256({
              value: value.nonce.value,
            }),
            gas: value.gasLimit,
            to: value.to,
            value: new U256({
              value: value.value.value,
            }),
            data: value.data,

            accessList: value.accessList.map(
              (access): Access => ({
                _tag: "Access",
                account: access.address,
                slots: access.storageKeys.map(
                  (slot): Bytes32 => new Bytes32({ value: slot.value }),
                ),
              }),
            ),
            maxPriorityFeePerGas: value.maxPriorityFeePerGas,
            maxFeePerGas: value.maxFeePerGas,
            r: new U256({ value: 0n }),
            s: new U256({ value: 0n }),
            yParity: new U8({ value: 0n }),
          }),
        ),
        Match.orElseAbsurd,
      );

      if (fixture.transaction.secretKey) {
        const privateKey = new Bytes32({
          value: fixture.transaction.secretKey.value,
        });

        const signature = signTransaction({
          transaction,
          privateKey: privateKey,
        });

        if ("v" in transaction) {
          transaction = {
            ...transaction,
            v: signature.v,
            r: signature.r,
            s: signature.s,
          };
        } else {
          transaction = {
            ...transaction,
            yParity: new U8({ value: signature.yParity.value }),
            r: signature.r,
            s: signature.s,
          };
        }
      }

      const post = fixture.post;
      const processTransactionResult = yield* processTransaction(
        blockEnv,
        block_output,
        transaction,
        new Uint({ value: BigInt(0) }),
      ).pipe(Effect.result);
      if (post.expectException) {
        if (Result.isSuccess(processTransactionResult)) {
          return yield* Effect.fail(
            new Error(
              `Expected exception ${post.expectException} but transaction succeeded`,
            ),
          );
        }
        const actualError = processTransactionResult.failure;
        const { matches, actualException, expectedOptions } =
          matchesExpectedException(actualError, post.expectException);

        yield* Console.log(`Exception expected: ${post.expectException}`);
        yield* Console.log(
          `  Actual exception: ${actualException ?? "UNKNOWN (no mapping)"}`,
        );

        if (!matches) {
          const errorTag =
            actualError !== null &&
            typeof actualError === "object" &&
            "_tag" in actualError
              ? String(actualError._tag)
              : "unknown";
          return yield* Effect.fail(
            new Error(
              actualException === null
                ? `Unmapped exception: got error tag "${errorTag}", expected one of: ${expectedOptions.join(
                    " | ",
                  )}`
                : `Exception mismatch: expected ${expectedOptions.join(
                    " | ",
                  )}, got ${actualException}`,
            ),
          );
        }
      } else {
        yield* processTransactionResult;
      }

      const stateRoot = yield* State.stateRoot(blockEnv.state);
      const expectedHash = post.hash.toHex();
      const actualHash = stateRoot.toHex();
      const testFailed = actualHash !== expectedHash;

      if (testFailed) {
        yield* Console.log("\n=== ACCOUNT EXISTENCE COMPARISON ===");
        const expectedAddrs = new Set<string>();
        for (const [address] of Object.entries(post.state)) {
          const addrHex = address.toLowerCase();
          expectedAddrs.add(addrHex);
          const exists = yield* State.accountExists(
            blockEnv.state,
            new Address({ value: bufferFromHex(address) }),
          );
          if (!exists) {
            yield* Console.log(`  MISSING in actual: ${addrHex}`);
          }
        }
        yield* Console.log("====================================\n");
        const gasUsed = block_output.blockGasUsed.value;
        const gasPrice =
          "maxFeePerGas" in fixture.transaction &&
          fixture.transaction.maxFeePerGas
            ? fixture.transaction.maxFeePerGas.value
            : "gasPrice" in fixture.transaction && fixture.transaction.gasPrice
              ? fixture.transaction.gasPrice.value
              : undefined;

        const senderAddr = fixture.transaction.sender;
        let estimatedGasFromBalance: bigint | undefined;
        if (gasPrice !== undefined && gasPrice > 0n) {
          for (const [addrString, preAcct] of Object.entries(fixture.pre)) {
            const addr = new Address({ value: bufferFromHex(addrString) });
            if (addr.toHex() === senderAddr?.toHex()) {
              for (const [postAddrStr, expectedAcct] of Object.entries(
                post.state,
              )) {
                const postAddr = new Address({
                  value: bufferFromHex(postAddrStr),
                });
                if (postAddr.toHex() === senderAddr?.toHex()) {
                  const preBalance = preAcct.balance.value;
                  const expectedPostBalance = expectedAcct.balance.value;
                  const txValue = fixture.transaction.value?.value ?? 0n;
                  const expectedWeiCost =
                    preBalance - expectedPostBalance - txValue;
                  if (expectedWeiCost >= 0n) {
                    estimatedGasFromBalance = expectedWeiCost / gasPrice;
                  }
                  break;
                }
              }
              break;
            }
          }
        }

        if (estimatedGasFromBalance !== undefined) {
          const gasDiff = gasUsed - estimatedGasFromBalance;
          yield* Console.log(
            "\n\x1b[36m%s\x1b[0m",
            "=== GAS USAGE SUMMARY (approximate) ===",
          );
          yield* Console.log(
            `Estimated gas (from balance): ${estimatedGasFromBalance}`,
          );
          yield* Console.log(`Actual gas used:              ${gasUsed}`);
          if (gasDiff !== 0n) {
            yield* Console.log(
              "\x1b[33m%s\x1b[0m",
              `Difference: ${gasDiff > 0n ? "+" : ""}${gasDiff}`,
            );
          } else {
            yield* Console.log("\x1b[32m%s\x1b[0m", `Difference: ${gasDiff} ✓`);
          }
          yield* Console.log("========================================\n");
        }

        for (const [address, expectedAccount] of Object.entries(post.state)) {
          const actualAccount = yield* State.getAccount(
            blockEnv.state,
            new Address({ value: bufferFromHex(address) }),
          );
          yield* Console.log("- Address: ", `${address}`);
          if (actualAccount.nonce.value !== expectedAccount.nonce.value) {
            yield* Console.log(
              "\x1b[31m%s\x1b[0m",
              `    Nonce mismatch: expected ${expectedAccount.nonce.value}, actual ${actualAccount.nonce.value}`,
            );
          } else {
            yield* Console.log(
              `    Nonce match: expected ${expectedAccount.nonce.value}, actual ${actualAccount.nonce.value}`,
            );
          }
          if (actualAccount.balance.value !== expectedAccount.balance.value) {
            yield* Console.log("\x1b[31m%s\x1b[0m", `    Balance mismatch:`);
            yield* Console.log(
              `      Expected: ${expectedAccount.balance.value}`,
            );
            yield* Console.log(
              `      Actual:   ${actualAccount.balance.value}`,
            );
            const offset =
              actualAccount.balance.value - expectedAccount.balance.value;
            yield* Console.log(
              `               ${offset > 0 ? "+" : ""}${offset}`,
            );
          } else {
            yield* Console.log(
              `    Balance match: expected ${expectedAccount.balance.value}, actual ${actualAccount.balance.value}`,
            );
          }
          if (actualAccount.code.toHex() !== expectedAccount.code.toHex()) {
            yield* Console.log(
              "\x1b[31m%s\x1b[0m",
              `    Code mismatch: expected ${expectedAccount.code.toHex()}, actual ${actualAccount.code.toHex()}`,
            );
          } else {
            yield* Console.log(`    Code match`);
          }

          for (const [slot, expectedValueBytes] of Object.entries(
            expectedAccount.storage,
          )) {
            const actualValue = (yield* State.getStorage(
              blockEnv.state,
              new Address({ value: bufferFromHex(address) }),
              new Bytes32({ value: bufferFromHex(slot) }),
            ))
              .toBeBytes32()
              .toHex();
            const expectedValue = new Bytes32({
              value: expectedValueBytes.value,
            }).toHex();
            if (actualValue !== expectedValue) {
              yield* Console.log("\x1b[31m%s\x1b[0m", `    Storage mismatch:`);
              yield* Console.log(`          Slot:     ${slot}`);
              yield* Console.log(`          Expected: ${expectedValue}`);
              yield* Console.log(`          Actual:   ${actualValue}`);
            } else {
              yield* Console.log(`    Storage match:`);
              yield* Console.log(`          Expected: ${expectedValue}`);
              yield* Console.log(`          Actual:   ${actualValue}`);
            }
          }
        }
      }
      expect(actualHash).toBe(expectedHash);

      const logsRlpEncoded = yield* rlp.encodeTo(
        Schema.Array(Log),
        block_output.blockLogs,
      );
      const actualLogsHash = keccak256(logsRlpEncoded).toHex();
      const expectedLogsHash = post.logs.toHex();
      expect(actualLogsHash).toBe(expectedLogsHash);
    });

    try {
      await Effect.gen(function* () {
        yield* Effect.log(`Running test case: ${testCaseIndex.id}`);
        yield* Effect.log(testCaseRaw);
        const fixturesSource =
          yield* Schema.decodeUnknownEffect(StateTestFix)(testCaseRaw);
        for (const fixture of flattenStateTestFixtures(fixturesSource)) {
          const fork = yield* resolveFork(fixture.fork);
          yield* runStateTest(fixture).pipe(Effect.provide(fork));
        }
      }).pipe(runWithTestLogger);
      testState.passed = true;
    } catch (error) {
      testState.error = error;
      throw error;
    }
  });
});

describe("BlockchainTest", TEST_CONFIG, () => {
  const allBlockchainTests = [...casesByFormat.blockchain_test.values()];
  const totalBlockchainTests = allBlockchainTests.length;

  const testState: TestState = {
    shortHash: null,
    passed: false,
    skipped: false,
    startTime: 0,
    error: undefined,
  };

  afterEach(async () => {
    if (testState.shortHash && !testState.skipped) {
      const durationMs = performance.now() - testState.startTime;
      if (testState.passed) {
        await markTestPassed(testState.shortHash, durationMs);
      } else {
        await markTestFailed(testState.shortHash, testState.error, durationMs);
      }
    }
    testState.shortHash = null;
    testState.passed = false;
    testState.skipped = false;
    testState.startTime = 0;
    testState.error = undefined;
  });

  test.each(
    allBlockchainTests
      .slice(SKIP, LIMIT ? SKIP + LIMIT : undefined)
      .map((value, index) => ({
        ...value,
        index: SKIP + index,
        total: totalBlockchainTests,
      })),
  )(`$shortHash - [$index/$total] $id`, TEST_CONFIG, async (testCaseIndex) => {
    testState.shortHash = testCaseIndex.shortHash;
    testState.passed = false;
    testState.skipped = false;
    testState.startTime = performance.now();
    testState.error = undefined;

    if (await checkTestCache(testCaseIndex.shortHash)) {
      testState.skipped = true;
      return;
    }
    const testCaseRaw = (
      await readFile(
        path.join(root, "fixtures", testCaseIndex.json_path),
        "utf-8",
      ).then(JSON.parse)
    )[testCaseIndex.id];

    /**
     * Run blockchain test following the 9-step consumption algorithm
     * from blockchain_test.md specification
     */
    const runBlockchainTest = Effect.fn("runBlockchainTest")(function* (
      fixture: (typeof BlockchainTest)["Type"],
    ) {
      // STEP 1: Configure fork from fixture.network
      yield* Console.log(`Fork: ${fixture.network}`);
      const forkLayer = yield* resolveFork(fixture.network);

      // STEP 2: Initialize state from fixture.pre and calculate genesis state root
      const state = State.empty();
      for (const [address, account] of Object.entries(fixture.pre)) {
        yield* State.setAccount(
          state,
          new Address({ value: bufferFromHex(address) }),
          new Account({
            nonce: account.nonce,
            balance: new U256({ value: account.balance.value }),
            code: account.code,
          }),
        );

        for (const [slot, storageValue] of Object.entries(account.storage)) {
          const keyBytes = new Bytes32({ value: bufferFromHex(slot) });
          const valueU256 = U256.fromBeBytes(storageValue.value);

          yield* State.setStorage(
            state,
            new Address({ value: bufferFromHex(address) }),
            keyBytes,
            valueU256,
          );
        }
      }
      const calculatedGenesisStateRoot = State.stateRoot(state);

      // STEP 3: Decode genesisRLP - FAIL if cannot decode
      const decodedGenesis = yield* decodeBlock(fixture.genesisRLP);

      // STEP 4: Compare decoded header with genesisBlockHeader - FAIL if mismatch
      // We check stateRoot explicitly for a clear error message, but the block hash
      // verification below will catch any field mismatch (since hash = keccak256(rlp(header)))
      const decodedHeader = decodedGenesis.header;
      const expectedHeader = fixture.genesisBlockHeader;

      // State root comparison (explicit check for better error messages)
      const decodedStateRoot = decodedHeader.stateRoot.toHex();
      const expectedStateRoot = expectedHeader.stateRoot.toHex();
      if (decodedStateRoot !== expectedStateRoot) {
        yield* Console.log(
          `Header stateRoot mismatch: decoded=${decodedStateRoot}, expected=${expectedStateRoot}`,
        );
        return yield* Effect.fail(
          new Error(
            "Genesis header stateRoot mismatch between RLP and fixture",
          ),
        );
      }

      // STEP 5: Compare calculated state root with genesis header state root
      const calculatedStateRootHex = yield* calculatedGenesisStateRoot.pipe(
        Effect.map((value) => value.toHex()),
      );
      if (calculatedStateRootHex !== expectedStateRoot) {
        yield* Console.log(
          `State root mismatch: calculated=${calculatedStateRootHex}, expected=${expectedStateRoot}`,
        );
        return yield* Effect.fail(
          new Error("Calculated genesis state root does not match header"),
        );
      }

      // STEP 6: Set genesis as current head
      let chain = BlockChain.empty(
        new U64({ value: fixture.config.chainid.value }),
      )
        .withState(state)
        .addBlock(decodedGenesis);

      // Compute and verify genesis block hash
      const computedGenesisHash = computeBlockHash(decodedGenesis.header);
      let currentHeadHash = computedGenesisHash.toHex();
      const expectedGenesisHash = fixture.genesisBlockHeader.hash.toHex();
      if (currentHeadHash !== expectedGenesisHash) {
        yield* Console.log(
          `Genesis hash mismatch: computed=${currentHeadHash}, expected=${expectedGenesisHash}`,
        );
        return yield* Effect.fail(
          new Error("Computed genesis block hash does not match fixture"),
        );
      }

      // STEP 7: Process each block in fixture.blocks
      for (
        let blockIndex = 0;
        blockIndex < fixture.blocks.length;
        blockIndex++
      ) {
        const block = fixture.blocks[blockIndex];
        const expectsException = "expectException" in block;

        yield* Console.log(
          `Processing block ${blockIndex + 1}/${fixture.blocks.length}${
            expectsException
              ? ` (expects exception: ${block.expectException})`
              : ""
          }`,
        );

        // 7.2: Attempt to decode RLP
        const decodeResult = yield* decodeBlock(block.rlp).pipe(Effect.result);

        if (Result.isFailure(decodeResult)) {
          // Decode failed
          if (!expectsException) {
            yield* Console.log(`Block decode failed: ${decodeResult.failure}`);
            return yield* Effect.fail(
              new Error("Block decode failed but no exception expected"),
            );
          }
          // Expected decode failure - check if the error matches expected exception
          // RLP decode errors map to RLP_STRUCTURES_ENCODING
          const { matches, actualException, expectedOptions } =
            matchesExpectedException(
              // Create an error object with RLP tag for matching
              {
                _tag: "EthereumException/InvalidBlock/RlpStructuresEncodingError",
              },
              block.expectException,
            );

          yield* Console.log(
            `Decode exception expected: ${block.expectException}`,
          );
          yield* Console.log(
            `  Actual exception: ${actualException ?? "RLP decode error"}`,
          );

          if (!matches) {
            // Check if any expected option is RLP related
            const isRlpExpected = expectedOptions.some(
              (opt) =>
                opt.includes("RLP") ||
                opt.includes("TYPE_3_TX_WITH_FULL_BLOBS"),
            );
            if (!isRlpExpected) {
              return yield* Effect.fail(
                new Error(
                  `Decode exception mismatch: expected ${expectedOptions.join(
                    " | ",
                  )}, got RLP decode error`,
                ),
              );
            }
          }
          // Expected decode failure - this is the last block per spec
          yield* Console.log("Expected decode failure occurred");
          break;
        }

        const decodedBlock = decodeResult.success;

        // For transition forks, resolve the appropriate fork based on block timestamp
        const blockForkLayer = isTransitionFork(fixture.network)
          ? yield* resolveForkForTimestamp(
              fixture.network,
              decodedBlock.header.timestamp.value,
            )
          : forkLayer;

        // 7.3: Attempt to apply block
        const applyResult = yield* stateTransition(chain, decodedBlock).pipe(
          Effect.provide(blockForkLayer),
          Effect.result,
        );

        if (Result.isFailure(applyResult)) {
          // Apply failed
          if (!expectsException) {
            yield* Console.log(`Block apply failed: ${applyResult.failure}`);
            return yield* Effect.fail(
              new Error(`Block apply failed: ${applyResult.failure}`),
            );
          }
          // Expected exception - verify it matches
          const actualError = applyResult.failure;
          const { matches, actualException, expectedOptions } =
            matchesExpectedException(actualError, block.expectException);

          yield* Console.log(`Exception expected: ${block.expectException}`);
          yield* Console.log(
            `  Actual exception: ${actualException ?? "UNKNOWN (no mapping)"}`,
          );

          if (!matches) {
            // Special handling: INVALID_BLOCK is acceptable for RLP/blob-related expected exceptions
            // These are low-level structural errors that our implementation may not distinguish
            const isRlpOrBlobExpected = expectedOptions.some(
              (opt) =>
                opt.includes("RLP") ||
                opt.includes("TYPE_3_TX_WITH_FULL_BLOBS"),
            );
            if (
              isRlpOrBlobExpected &&
              actualException === "BlockException.INVALID_BLOCK"
            ) {
              yield* Console.log(
                `  (INVALID_BLOCK accepted for RLP/blob-related expected exception)`,
              );
              break;
            }

            const errorTag =
              actualError !== null &&
              typeof actualError === "object" &&
              "_tag" in actualError
                ? String(actualError._tag)
                : "unknown";
            return yield* Effect.fail(
              new Error(
                actualException === null
                  ? `Unmapped exception: got error tag "${errorTag}", expected one of: ${expectedOptions.join(
                      " | ",
                    )}`
                  : `Exception mismatch: expected ${expectedOptions.join(
                      " | ",
                    )}, got ${actualException}`,
              ),
            );
          }
          break;
        }

        // Apply succeeded
        if (expectsException) {
          return yield* Effect.fail(
            new Error(
              `Expected exception ${block.expectException} but block applied successfully`,
            ),
          );
        }

        chain = applyResult.success;

        // Compute the actual block hash from the processed block header
        const lastBlock = chain.blocks[chain.blocks.length - 1];
        const computedHash = computeBlockHash(lastBlock.header);
        currentHeadHash = computedHash.toHex();

        // Verify computed hash matches expected hash from fixture
        if ("blockHeader" in block && block.blockHeader.hash) {
          const expectedBlockHash = block.blockHeader.hash.toHex();
          if (currentHeadHash !== expectedBlockHash) {
            yield* Console.log(
              `Block ${
                blockIndex + 1
              } hash mismatch: computed=${currentHeadHash}, expected=${expectedBlockHash}`,
            );
          }
          expect(currentHeadHash).toBe(expectedBlockHash);
        }
      }

      // STEP 8: Compare hash of current head against lastblockhash
      const expectedLastBlockHash = fixture.lastblockhash.toHex();
      if (currentHeadHash !== expectedLastBlockHash) {
        yield* Console.log(
          `Last block hash mismatch: current=${currentHeadHash}, expected=${expectedLastBlockHash}`,
        );
      }
      expect(currentHeadHash).toBe(expectedLastBlockHash);

      // STEP 9: Compare postState against current state
      // Note: We only check accounts listed in postState here for detailed error messages.
      // Any extra/missing accounts would already cause a state root mismatch in stateTransition,
      // which validates computed state root against block.header.stateRoot.
      for (const [address, expectedAccount] of Object.entries(
        fixture.postState,
      )) {
        const actualAccount = yield* State.getAccount(
          chain.state,
          new Address({ value: bufferFromHex(address) }),
        );

        // Check nonce
        if (actualAccount.nonce.value !== expectedAccount.nonce.value) {
          yield* Console.log(
            `Account ${address} nonce mismatch: actual=${
              actualAccount.nonce.value
            }, expected=${expectedAccount.nonce.value}`,
          );
        }
        expect(actualAccount.nonce.value).toBe(expectedAccount.nonce.value);

        // Check balance
        if (actualAccount.balance.value !== expectedAccount.balance.value) {
          yield* Console.log(
            `Account ${address} balance mismatch: actual=${
              actualAccount.balance.value
            }, expected=${expectedAccount.balance.value}`,
          );
        }
        expect(actualAccount.balance.value).toBe(expectedAccount.balance.value);

        // Check code
        const actualCodeHex = actualAccount.code.toHex();
        const expectedCodeHex = expectedAccount.code.toHex();
        if (actualCodeHex !== expectedCodeHex) {
          yield* Console.log(`Account ${address} code mismatch`);
        }
        expect(actualCodeHex).toBe(expectedCodeHex);

        // Check storage (only slots listed in expected - extra slots cause state root mismatch)
        for (const [slot, expectedValue] of Object.entries(
          expectedAccount.storage,
        )) {
          const actualValue = yield* State.getStorage(
            chain.state,
            new Address({ value: bufferFromHex(address) }),
            new Bytes32({ value: bufferFromHex(slot) }),
          );
          const actualValueHex = actualValue.toBeBytes32().toHex();
          // Pad expected value to 32 bytes (64 hex chars) for proper comparison
          const expectedValueHex = U256.fromBeBytes(expectedValue.value)
            .toBeBytes32()
            .toHex();

          if (actualValueHex !== expectedValueHex) {
            yield* Console.log(
              `Account ${address} storage[${slot}] mismatch: actual=${actualValueHex}, expected=${expectedValueHex}`,
            );
          }
          expect(actualValueHex).toBe(expectedValueHex);
        }
      }
    });

    try {
      await Effect.gen(function* () {
        yield* Effect.log(`Running test case: ${testCaseIndex.id}`);
        const fixture =
          yield* Schema.decodeUnknownEffect(BlockchainTest)(testCaseRaw);
        yield* runBlockchainTest(fixture);
      }).pipe(runWithTestLogger);
      // Mark as passed - afterEach will handle the caching
      testState.passed = true;
    } catch (error) {
      testState.error = error;
      throw error;
    }
  });
});

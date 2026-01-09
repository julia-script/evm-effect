// import { BunContext } from "@effect/platform-bun/BunContext";

import * as path from "node:path";
import * as Bun from "bun";
import {
  checkTestCache,
  isTransitionFork,
  LIMIT,
  markTestPassed,
  resolveFork,
  resolveForkForTimestamp,
  runWithTestLogger,
  SKIP,
  TEST_CONFIG,
  unmarkTestPassed,
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
// then let bun do the filtering based on the  --test-name-pattern parameter,
// and only run the relevant tests
// then the code that runs inside the test body is already past filtering
// so we can lazily  do any more expensive things there
const dirname = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(dirname, "..", "test-fixtures");
const now = performance.now();
const fixturesIndexPath = path.join(root, "fixtures", ".meta", "index.json");

const loaded = (await Bun.file(
  fixturesIndexPath,
).json()) as (typeof Index)["Type"];

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
  testCase.shortHash = testCase.fixture_hash.slice(0, 10);

  casesByFormat[testCase.format].set(testCase.shortHash, testCase);
}
console.log(`processed in ${performance.now() - now}ms`);

// END OF THE INDEX LOADING

import { afterEach, describe, expect, test } from "bun:test";
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
import { Bytes32 } from "@evm-effect/ethereum-types/bytes";
import { U8, U64, U256, Uint } from "@evm-effect/ethereum-types/numeric";
import rlp from "@evm-effect/rlp";
import { Console, Effect, Either, Match, Schema } from "effect";
import { BlockChain, emptyBlockOutput } from "../src/blockchain.js";
import { stateTransition } from "../src/fork.js";
import State from "../src/state.js";
import { processTransaction } from "../src/transactions/processor.js";
import { decodeBlock } from "../src/types/Block.js";
import { Log } from "../src/types/Receipt.js";
import { Fork } from "../src/vm/Fork.js";
import { BlockEnvironment } from "../src/vm/message.js";
import { Account } from "../src/vm/types.js";

type FlatStateTestFixture = ReturnType<
  typeof flattenStateTestFixtures
> extends Generator<infer T, void>
  ? T
  : never;

// Test state tracker for afterEach hooks
// Tracks the current test's shortHash and whether it passed or failed
type TestState = {
  shortHash: string | null;
  passed: boolean;
  skipped: boolean;
};

describe("StateTest", () => {
  // Track current test state for afterEach
  const testState: TestState = {
    shortHash: null,
    passed: false,
    skipped: false,
  };

  afterEach(async () => {
    if (testState.shortHash && !testState.skipped) {
      if (testState.passed) {
        await markTestPassed(testState.shortHash);
      } else {
        await unmarkTestPassed(testState.shortHash);
      }
    }
    // Reset state for next test
    testState.shortHash = null;
    testState.passed = false;
    testState.skipped = false;
  });

  test.each(
    [...casesByFormat.state_test.values()]
      .slice(SKIP, LIMIT ? SKIP + LIMIT : undefined)
      .map((value, index) => ({
        ...value,
        index: SKIP + index,
      })),
  )(
    `$shortHash - [$index] $id`,
    async (testCaseIndex) => {
      testState.shortHash = testCaseIndex.shortHash;
      testState.passed = false;
      testState.skipped = false;

      if (await checkTestCache(testCaseIndex.shortHash)) {
        testState.skipped = true;
        return;
      }
      const testCaseRaw: unknown = (
        await Bun.file(
          path.join(root, "fixtures", testCaseIndex.json_path),
        ).json()
      )[testCaseIndex.id];

      const runStateTest = Effect.fn("runStateTest")(function* (
        fixture: FlatStateTestFixture,
      ) {
        const state = State.empty();
        const fork = yield* Fork;
        yield* Console.log(`Fork: ${fork.name}`);

        for (const { key, value } of fixture.pre) {
          yield* State.setAccount(
            state,
            key,
            new Account({
              nonce: value.nonce,
              balance: new U256({ value: value.balance.value }),
              code: value.code,
            }),
          );

          if (value.storage) {
            for (const storageEntry of value.storage) {
              const keyBytes = new Bytes32({ value: storageEntry.key.value });

              const valueU256 = U256.fromBeBytes(storageEntry.value.value);

              yield* State.setStorage(state, key, keyBytes, valueU256);
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

        // sign the transaction
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
        ).pipe(Effect.either);
        if (post.expectException) {
          if (Either.isRight(processTransactionResult)) {
            return yield* Effect.fail(
              new Error(
                `Expected exception ${post.expectException} but got right`,
              ),
            );
          }
          // TODO: check if the exception is the expected one
        } else {
          yield* processTransactionResult;
        }

        // check results

        const stateRoot = State.stateRoot(blockEnv.state);
        const expectedHash = post.hash.value.toHex();
        const actualHash = stateRoot.value.toHex();
        const testFailed = actualHash !== expectedHash;

        // Only log details if test failed
        if (testFailed) {
          // Check which accounts exist in actual vs expected
          yield* Console.log("\n=== ACCOUNT EXISTENCE COMPARISON ===");
          const expectedAddrs = new Set<string>();
          for (const { key: address } of post.state) {
            const addrHex = address.value.value.toHex();
            expectedAddrs.add(addrHex);
            const exists = State.accountExists(blockEnv.state, address);
            if (!exists) {
              yield* Console.log(`  MISSING in actual: 0x${addrHex}`);
            }
          }
          yield* Console.log("====================================\n");
          // Log gas summary
          const gasUsed = block_output.blockGasUsed.value;
          // Handle both legacy (gasPrice) and modern (maxFeePerGas) transactions
          const gasPrice =
            "maxFeePerGas" in fixture.transaction &&
            fixture.transaction.maxFeePerGas
              ? fixture.transaction.maxFeePerGas.value
              : "gasPrice" in fixture.transaction &&
                  fixture.transaction.gasPrice
                ? fixture.transaction.gasPrice.value
                : undefined;

          // Calculate expected gas from balance difference
          const senderAddr = fixture.transaction.sender;
          let expectedGasUsed: bigint | undefined;
          if (gasPrice !== undefined) {
            for (const { key: addr, value: preAcct } of fixture.pre) {
              if (addr.toHex() === senderAddr?.toHex()) {
                for (const {
                  key: postAddr,
                  value: expectedAcct,
                } of post.state) {
                  if (
                    postAddr.value.value.toHex() ===
                    senderAddr.value.value.toHex()
                  ) {
                    const preBalance = preAcct.balance.value;
                    const expectedPostBalance = expectedAcct.balance.value;
                    const expectedWeiCost = preBalance - expectedPostBalance;
                    expectedGasUsed = expectedWeiCost / gasPrice;
                    break;
                  }
                }
                break;
              }
            }
          }

          if (expectedGasUsed !== undefined) {
            const gasDiff = gasUsed - expectedGasUsed;
            yield* Console.log(
              "\n\x1b[36m%s\x1b[0m",
              "=== GAS USAGE SUMMARY ===",
            );
            yield* Console.log(`Expected gas: ${expectedGasUsed}`);
            yield* Console.log(`Actual gas:   ${gasUsed}`);
            if (gasDiff !== 0n) {
              yield* Console.log(
                "\x1b[31m%s\x1b[0m",
                `Difference:   ${gasDiff > 0n ? "+" : ""}${gasDiff}`,
              );
            } else {
              yield* Console.log(
                "\x1b[32m%s\x1b[0m",
                `Difference:   ${gasDiff} ✓`,
              );
            }
            yield* Console.log("=========================\n");
          }

          for (const { key: address, value: expectedAccount } of post.state) {
            const actualAccount = State.getAccount(blockEnv.state, address);
            yield* Console.log(
              "- Address: ",
              `0x${new Uint8Array(address.value.value).toHex()}`,
            );
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
            if (
              actualAccount.code.value.toHex() !==
              expectedAccount.code.value.toHex()
            ) {
              yield* Console.log(
                "\x1b[31m%s\x1b[0m",
                `    Code mismatch: expected ${expectedAccount.code.value.toHex()}, actual ${actualAccount.code.value.toHex()}`,
              );
            } else {
              yield* Console.log(`    Code match`);
            }

            for (const {
              key: slot,
              value: expectedValueBytes,
            } of expectedAccount.storage) {
              // const slot3Key =
              const actualValue = `0x${State.getStorage(
                blockEnv.state,
                address,
                new Bytes32({ value: slot.value }),
              )
                .toBeBytes32()
                .value.toHex()}`;
              const expectedValue = `0x${new Bytes32({ value: expectedValueBytes.value }).value.toHex()}`;
              if (actualValue !== expectedValue) {
                yield* Console.log(
                  "\x1b[31m%s\x1b[0m",
                  `    Storage mismatch:`,
                );
                yield* Console.log(
                  `          Slot:     0x${slot.value.toHex()}`,
                );
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
        const actualLogsHash = `0x${keccak256(logsRlpEncoded).value.toHex()}`;
        const expectedLogsHash = `0x${post.logs.value.toHex()}`;
        expect(actualLogsHash).toBe(expectedLogsHash);
      });

      await Effect.gen(function* () {
        yield* Effect.log(`Running test case: ${testCaseIndex.id}`);
        yield* Effect.log(testCaseRaw);
        const fixturesSource = yield* Schema.decodeUnknown(StateTestFix, {
          exact: true,
        })(testCaseRaw);
        for (const fixture of flattenStateTestFixtures(fixturesSource)) {
          const fork = yield* resolveFork(fixture.fork);
          yield* runStateTest(fixture).pipe(Effect.provide(fork));
        }
      }).pipe(runWithTestLogger);
      // Mark as passed - afterEach will handle the caching
      testState.passed = true;
    },
    TEST_CONFIG,
  );
});

describe("BlockchainTest", () => {
  const allBlockchainTests = [...casesByFormat.blockchain_test.values()];
  const totalBlockchainTests = allBlockchainTests.length;

  // Track current test state for afterEach
  const testState: TestState = {
    shortHash: null,
    passed: false,
    skipped: false,
  };

  afterEach(async () => {
    if (testState.shortHash && !testState.skipped) {
      if (testState.passed) {
        await markTestPassed(testState.shortHash);
      } else {
        await unmarkTestPassed(testState.shortHash);
      }
    }
    // Reset state for next test
    testState.shortHash = null;
    testState.passed = false;
    testState.skipped = false;
  });

  test.each(
    allBlockchainTests
      .slice(SKIP, LIMIT ? SKIP + LIMIT : undefined)
      .map((value, index) => ({
        ...value,
        index: SKIP + index,
        total: totalBlockchainTests,
      })),
  )(
    `$shortHash - [$index/$total] $id`,
    async (testCaseIndex) => {
      testState.shortHash = testCaseIndex.shortHash;
      testState.passed = false;
      testState.skipped = false;

      if (await checkTestCache(testCaseIndex.shortHash)) {
        testState.skipped = true;
        return;
      }
      const testCaseRaw = (
        await Bun.file(
          path.join(root, "fixtures", testCaseIndex.json_path),
        ).json()
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
        for (const { key: address, value: account } of fixture.pre) {
          yield* State.setAccount(
            state,
            address,
            new Account({
              nonce: account.nonce,
              balance: new U256({ value: account.balance.value }),
              code: account.code,
            }),
          );

          for (const { key: slot, value: storageValue } of account.storage) {
            const keyBytes = new Bytes32({ value: slot.value });
            const valueU256 = U256.fromBeBytes(storageValue.value);
            yield* State.setStorage(state, address, keyBytes, valueU256);
          }
        }
        const calculatedGenesisStateRoot = State.stateRoot(state);

        // STEP 3: Decode genesisRLP - FAIL if cannot decode
        const decodedGenesis = yield* decodeBlock(fixture.genesisRLP);

        // STEP 4: Compare decoded header with genesisBlockHeader - FAIL if mismatch
        // Compare key fields between decoded header and fixture header
        const decodedHeader = decodedGenesis.header;
        const expectedHeader = fixture.genesisBlockHeader;

        // State root comparison
        const decodedStateRoot = decodedHeader.stateRoot.value.toHex();
        const expectedStateRoot = expectedHeader.stateRoot.value.toHex();
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
        const calculatedStateRootHex = calculatedGenesisStateRoot.value.toHex();
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

        // Track the hash of the current head (genesis hash from fixture)
        let currentHeadHash = fixture.genesisBlockHeader.hash.value.toHex();

        // STEP 7: Process each block in fixture.blocks
        for (
          let blockIndex = 0;
          blockIndex < fixture.blocks.length;
          blockIndex++
        ) {
          const block = fixture.blocks[blockIndex];
          const expectsException = "expectException" in block;

          yield* Console.log(
            `Processing block ${blockIndex + 1}/${fixture.blocks.length}${expectsException ? ` (expects exception: ${block.expectException})` : ""}`,
          );

          // 7.2: Attempt to decode RLP
          const decodeResult = yield* decodeBlock(block.rlp).pipe(
            Effect.either,
          );

          if (Either.isLeft(decodeResult)) {
            // Decode failed
            if (!expectsException) {
              yield* Console.log(`Block decode failed: ${decodeResult.left}`);
              return yield* Effect.fail(
                new Error("Block decode failed but no exception expected"),
              );
            }
            // Expected decode failure - this is the last block per spec
            yield* Console.log("Expected decode failure occurred");
            break;
          }

          const decodedBlock = decodeResult.right;

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
            Effect.either,
          );

          if (Either.isLeft(applyResult)) {
            // Apply failed
            if (!expectsException) {
              yield* Console.log(`Block apply failed: ${applyResult.left}`);
              return yield* Effect.fail(
                new Error(`Block apply failed: ${applyResult.left}`),
              );
            }
            // Expected exception - this is the last block per spec
            yield* Console.log("Expected block apply failure occurred");
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

          chain = applyResult.right;

          // Update current head hash from the block header in fixture
          // (The fixture contains the expected hash for each block)
          if ("blockHeader" in block && block.blockHeader.hash) {
            currentHeadHash = block.blockHeader.hash.value.toHex();
          }
        }

        // STEP 8: Compare hash of current head against lastblockhash
        const expectedLastBlockHash = fixture.lastblockhash.value.toHex();
        if (currentHeadHash !== expectedLastBlockHash) {
          yield* Console.log(
            `Last block hash mismatch: current=${currentHeadHash}, expected=${expectedLastBlockHash}`,
          );
        }
        expect(currentHeadHash).toBe(expectedLastBlockHash);

        // STEP 9: Compare postState against current state
        for (const {
          key: address,
          value: expectedAccount,
        } of fixture.postState) {
          const actualAccount = State.getAccount(chain.state, address);

          // Check nonce
          if (actualAccount.nonce.value !== expectedAccount.nonce.value) {
            yield* Console.log(
              `Account ${address.toHex()} nonce mismatch: actual=${actualAccount.nonce.value}, expected=${expectedAccount.nonce.value}`,
            );
          }
          expect(actualAccount.nonce.value).toBe(expectedAccount.nonce.value);

          // Check balance
          if (actualAccount.balance.value !== expectedAccount.balance.value) {
            yield* Console.log(
              `Account ${address.toHex()} balance mismatch: actual=${actualAccount.balance.value}, expected=${expectedAccount.balance.value}`,
            );
          }
          expect(actualAccount.balance.value).toBe(
            expectedAccount.balance.value,
          );

          // Check code
          const actualCodeHex = actualAccount.code.value.toHex();
          const expectedCodeHex = expectedAccount.code.value.toHex();
          if (actualCodeHex !== expectedCodeHex) {
            yield* Console.log(`Account ${address.toHex()} code mismatch`);
          }
          expect(actualCodeHex).toBe(expectedCodeHex);

          // Check storage
          for (const {
            key: slot,
            value: expectedValue,
          } of expectedAccount.storage) {
            const actualValue = State.getStorage(
              chain.state,
              address,
              new Bytes32({ value: slot.value }),
            );
            const actualValueHex = actualValue.toBeBytes32().value.toHex();
            // Pad expected value to 32 bytes (64 hex chars) for proper comparison
            const expectedValueHex = U256.fromBeBytes(expectedValue.value)
              .toBeBytes32()
              .value.toHex();

            if (actualValueHex !== expectedValueHex) {
              yield* Console.log(
                `Account ${address.toHex()} storage[${slot.value.toHex()}] mismatch: actual=${actualValueHex}, expected=${expectedValueHex}`,
              );
            }
            expect(actualValueHex).toBe(expectedValueHex);
          }
        }
      });

      await Effect.gen(function* () {
        yield* Effect.log(`Running test case: ${testCaseIndex.id}`);
        const fixture =
          yield* Schema.decodeUnknown(BlockchainTest)(testCaseRaw);
        yield* runBlockchainTest(fixture);
      }).pipe(runWithTestLogger);
      // Mark as passed - afterEach will handle the caching
      testState.passed = true;
    },
    TEST_CONFIG,
  );
});

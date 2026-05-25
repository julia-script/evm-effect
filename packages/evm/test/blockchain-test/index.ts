// For each [`Fixture`](#fixture) test object in the JSON fixture file, perform the following steps:

import { keccak256 } from "@evm-effect/crypto/keccak256";
import { U64 } from "@evm-effect/ethereum-types";
import { stringify } from "@evm-effect/shared/stringify";
import { Console, Effect, Equal, Predicate, Result } from "effect";
import { dedent } from "ts-dedent";
import { stateTransition } from "../../src/fork.js";
import { Account, BlockChain, Header } from "../../src/index.js";
import * as State from "../../src/state.js";
import { Block } from "../../src/types/index.js";
import { ExecutionSpecTestError } from "../utils/ExecutionSpecTestError.js";
import { getFork } from "../utils/getFork.js";
import type { BlockchainTest, Forks } from "../utils/test-index.js";

// 1. Use [`network`](#-network-fork) to configure the execution fork schedule according to the [`Fork`](./common_types.md#fork) type definition.
// 2. Use [`pre`](#-pre-alloc) as the starting state allocation of the execution environment for the test and calculate the genesis state root.
// 3. Decode [`genesisRLP`](#-genesisrlp-bytes) to obtain the genesis block header, if the block cannot be decoded, fail the test.
// 4. Compare the genesis block header with [`genesisBlockHeader`](#-genesisblockheader-fixtureheader), if any field does not match, fail the test.
// 5. Compare the state root calculated on step 2 with the state root in the genesis block header, if they do not match, fail the test.
// 6. Set the genesis block as the current head of the chain.
// 7. If [`blocks`](#-blocks-listfixtureblockinvalidfixtureblock) contains at least one block, perform the following steps for each [`FixtureBlock`](#fixtureblock) or [`InvalidFixtureBlock`](#invalidfixtureblock):

//     1. Determine whether the current block is valid or invalid:

//         1. If the [`expectException`](#-expectexception-transactionexceptionblockexception) field is not present, it is valid, and object must be decoded as a [`FixtureBlock`](#fixtureblock).
//         2. If the [`expectException`](#-expectexception-transactionexceptionblockexception) field is present, it is invalid, and object must be decoded as a [`InvalidFixtureBlock`](#invalidfixtureblock).

//     2. Attempt to decode field [`rlp`](#-rlp-bytes) as the current block
//         1. If the block cannot be decoded:
//             - If an rlp decoding exception is not expected for the current block, fail the test.
//             - If an rlp decoding error is expected, pass the test (Note: A block with an expected exception will be the last block in the fixture).
//         2. If the block can be decoded, proceed to the next step.

//     3. Attempt to apply the current decoded block on top of the current head of the chain
//         1. If the block cannot be applied:
//             - If an exception is expected on the current block and it matches the exception obtained upon execution, pass the test. (Note: A block with an expected exception will be the last block in the fixture)
//             - If an exception is not expected on the current block, fail the test
//         2. If the block can be applied:
//             - If an exception is expected on the current block, fail the test
//             - If an exception is not expected on the current block, set the decoded block as the current head of the chain and proceed to the next block until you reach the last block in the fixture.

// 8. Compare the hash of the current head of the chain against [`lastblockhash`](#-lastblockhash-hash), if they do not match, fail the test.
// 9. Compare all accounts and the fields described in [`post`](#-post-alloc) against the current state, if any do not match, fail the test.

export const runBlockchainTest = Effect.fn("runBlockchainTest")(function* (
  blockchainTest: typeof BlockchainTest.Type,
) {
  const transitions = ForkTransitions[blockchainTest.config.network];
  const fork = yield* getFork(blockchainTest.config.network);
  // yield* Effect.provide(fork);
  yield* Effect.gen(function* () {
    // 1. Use [`network`](#-network-fork) to configure the execution fork schedule according to the [`Fork`](./common_types.md#fork) type definition.
    const state = State.State.empty();
    // 2. Use [`pre`](#-pre-alloc) as the starting state allocation of the execution environment for the test and calculate the genesis state root.
    for (const [address, account] of blockchainTest.pre) {
      yield* State.setAccount(
        state,
        address,
        Account.make({
          nonce: account.nonce,
          balance: account.balance,
          code: account.code,
        }),
      );
      for (const [storageKey, storageValue] of account.storage) {
        yield* State.setStorage(state, address, storageKey, storageValue);
      }
    }
    // 3. Decode [`genesisRLP`](#-genesisrlp-bytes) to obtain the genesis block header, if the block cannot be decoded, fail the test.
    // const genesisHeader = yield* decodeBlock(blockchainTest.genesisRLP);

    const decodedGenesisBlockResult = yield* Block.decode(
      blockchainTest.genesisRLP,
    ).pipe(Effect.result);
    if (Result.isFailure(decodedGenesisBlockResult)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: `Failed to decode genesis block: ${decodedGenesisBlockResult.failure}`,
        }),
      );
    }
    const decodedGenesisBlock = decodedGenesisBlockResult.success;
    const genesisHeader = Header.make({
      parentHash: blockchainTest.genesisBlockHeader.parentHash,
      ommersHash: blockchainTest.genesisBlockHeader.uncleHash,
      coinbase: blockchainTest.genesisBlockHeader.coinbase,
      stateRoot: blockchainTest.genesisBlockHeader.stateRoot,
      transactionsRoot: blockchainTest.genesisBlockHeader.transactionsTrie,
      receiptRoot: blockchainTest.genesisBlockHeader.receiptTrie,
      bloom: blockchainTest.genesisBlockHeader.bloom,
      difficulty: blockchainTest.genesisBlockHeader.difficulty,
      baseFeePerGas: blockchainTest.genesisBlockHeader.baseFeePerGas,
      number: blockchainTest.genesisBlockHeader.number,
      gasLimit: blockchainTest.genesisBlockHeader.gasLimit,
      gasUsed: blockchainTest.genesisBlockHeader.gasUsed,
      timestamp: blockchainTest.genesisBlockHeader.timestamp,
      extraData: blockchainTest.genesisBlockHeader.extraData,
      prevRandao: blockchainTest.genesisBlockHeader.mixHash,
      nonce: blockchainTest.genesisBlockHeader.nonce,
      requestsHash: blockchainTest.genesisBlockHeader.requestsHash,
      withdrawalsRoot: blockchainTest.genesisBlockHeader.withdrawalsRoot,
      blobGasUsed: blockchainTest.genesisBlockHeader.blobGasUsed,
      excessBlobGas: blockchainTest.genesisBlockHeader.excessBlobGas,
      parentBeaconBlockRoot:
        blockchainTest.genesisBlockHeader.parentBeaconBlockRoot,
    });

    for (const [key, value] of Object.entries(decodedGenesisBlock.header)) {
      const genesisHeaderValue = genesisHeader[key as keyof Header];
      if (Predicate.isUndefined(genesisHeaderValue)) {
        if (!Predicate.isUndefined(value)) {
          return yield* Effect.fail(
            new ExecutionSpecTestError({
              message: `Genesis header ${key} is undefined but value is not undefined`,
            }),
          );
        }
        continue;
      }
      if (Predicate.isFunction(genesisHeaderValue)) {
        continue;
      }
      if (!Equal.equals(genesisHeaderValue || undefined, value || undefined)) {
        return yield* Effect.fail(
          new ExecutionSpecTestError({
            message: dedent`Genesis header ${key} mismatch:
          Expected:
          ${stringify(genesisHeaderValue)}
          Actual:
          ${stringify(value)}
          `,
          }),
        );
      }
    }

    // 5. Compare the state root calculated on step 2 with the state root in the genesis block header, if they do not match, fail the test.
    const genesisStateRoot = yield* State.stateRoot(state);
    if (!Equal.equals(genesisStateRoot, genesisHeader.stateRoot)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: `Genesis state root mismatch:
          Expected: ${genesisStateRoot.toHex()}
          Actual: ${genesisHeader.stateRoot.toHex()}`,
        }),
      );
    }

    // 6. Set the genesis block as the current head of the chain.
    let chain = new BlockChain({
      blocks: [decodedGenesisBlock],
      state: state,
      chainId: transitions.chainId,
    });

    let i = 0;
    // 7. If [`blocks`](#-blocks-listfixtureblockinvalidfixtureblock) contains at least one block, perform the following steps for each [`FixtureBlock`](#fixtureblock) or [`InvalidFixtureBlock`](#invalidfixtureblock):
    for (const block of blockchainTest.blocks) {
      //     1. Determine whether the current block is valid or invalid:

      //         1. If the [`expectException`](#-expectexception-transactionexceptionblockexception) field is not present, it is valid, and object must be decoded as a [`FixtureBlock`](#fixtureblock).
      //         2. If the [`expectException`](#-expectexception-transactionexceptionblockexception) field is present, it is invalid, and object must be decoded as a [`InvalidFixtureBlock`](#invalidfixtureblock).

      //     2. Attempt to decode field [`rlp`](#-rlp-bytes) as the current block
      //         1. If the block cannot be decoded:
      //             - If an rlp decoding exception is not expected for the current block, fail the test.
      //             - If an rlp decoding error is expected, pass the test (Note: A block with an expected exception will be the last block in the fixture).
      yield* Console.log(`Block ${++i}/${blockchainTest.blocks.length}:`);
      const decodedBlockResult = yield* Block.decode(block.rlp).pipe(
        Effect.result,
      );
      if (Result.isFailure(decodedBlockResult)) {
        if (!("expectException" in block)) {
          return yield* Effect.fail(
            new ExecutionSpecTestError({
              message: `Failed to decode block: ${decodedBlockResult.failure}`,
            }),
          );
        }
        continue;
      }

      //         2. If the block can be decoded, proceed to the next step.
      //     3. Attempt to apply the current decoded block on top of the current head of the chain
      const applyResult = yield* stateTransition(
        chain,
        decodedBlockResult.success,
      ).pipe(Effect.result);

      if (Result.isFailure(applyResult)) {
        if (!("expectException" in block)) {
          return yield* Effect.fail(
            new ExecutionSpecTestError({
              message: `Failed to apply block: ${applyResult.failure}`,
            }),
          );
        }
        continue;
      } else {
        if ("expectException" in block) {
          return yield* Effect.fail(
            new ExecutionSpecTestError({
              message: `Expected exception: ${block.expectException}`,
            }),
          );
        }
      }
      chain = applyResult.success;

      // console.log(applyResult);
      //         1. If the block cannot be applied:
      //             - If an exception is expected on the current block and it matches the exception obtained upon execution, pass the test. (Note: A block with an expected exception will be the last block in the fixture)
      //             - If an exception is not expected on the current block, fail the test
      //         2. If the block can be applied:
      //             - If an exception is expected on the current block, fail the test
      //             - If an exception is not expected on the current block, set the decoded block as the current head of the chain and proceed to the next block until you reach the last block in the fixture.

      // 9. Compare all accounts and the fields described in [`post`](#-post-alloc) against the current state, if any do not match, fail the test.
    }
    // 8. Compare the hash of the current head of the chain against [`lastblockhash`](#-lastblockhash-hash), if they do not match, fail the test.
    const lastBlock = chain.blocks[chain.blocks.length - 1];

    const computedHash = yield* lastBlock.header
      .encode()
      .pipe(Effect.map(keccak256));
    const expectedHash = blockchainTest.lastblockhash.toHex();
    if (computedHash.toHex() !== expectedHash) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: `Last block hash mismatch: ${computedHash.toHex()} !== ${expectedHash}`,
        }),
      );
    }

    for (const [address, account] of blockchainTest.postState) {
      const actualAccount = yield* State.getAccount(chain.state, address);
      if (!Equal.equals(actualAccount.nonce, account.nonce)) {
        return yield* Effect.fail(
          new ExecutionSpecTestError({
            message: `Account ${address} nonce mismatch: ${actualAccount.nonce.value} !== ${account.nonce.value}`,
          }),
        );
      }
      if (!Equal.equals(actualAccount.balance, account.balance)) {
        return yield* Effect.fail(
          new ExecutionSpecTestError({
            message: `Account ${address} balance mismatch: ${actualAccount.balance.value} !== ${account.balance.value}`,
          }),
        );
      }
      if (!Equal.equals(actualAccount.code, account.code)) {
        return yield* Effect.fail(
          new ExecutionSpecTestError({
            message: `Account ${address} code mismatch: ${actualAccount.code.toHex()} !== ${account.code.toHex()}`,
          }),
        );
      }
      for (const [storageKey, storageValue] of account.storage) {
        const actualStorageValue = yield* State.getStorage(
          chain.state,
          address,
          storageKey,
        );
        if (!Equal.equals(actualStorageValue, storageValue)) {
          return yield* Effect.fail(
            new ExecutionSpecTestError({
              message: `Account ${address.toHex()} storage ${storageKey.toHex()} mismatch: ${actualStorageValue.value} !== ${storageValue.value}`,
            }),
          );
        }
      }
    }
  }).pipe(Effect.provide(fork));
});

const base = {
  chainId: U64.one,
  homesteadBlock: 0n,
  eip150Block: 0n,
  eip155Block: 0n,
  eip158Block: 0n,
  daoForkBlock: 0n,
  byzantiumBlock: 0n,
  constantinopleBlock: 0n,
  constantinopleFixBlock: 0n,
  istanbulBlock: 0n,
  muirGlacierBlock: 0n,
  berlinBlock: 0n,
  londonBlock: 0n,
  arrowGlacierBlock: 0n,
  grayGlacierBlock: 0n,
  terminalTotalDifficulty: 0n,
  shanghaiTime: 0n,
  cancunTime: 0n,
};
// ## `"Frontier"`

// - Chain ID: `0x00`

const Frontier = {
  ...base,
  chainId: U64.zero,
};

// ### `"Homestead"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
const Homestead = base;

// ### `"Byzantium"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`

const Byzantium = base;

// ### `"Constantinople"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`

const Constantinople = base;
// ### `"ConstantinopleFix"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`

const ConstantinopleFix = base;
// ### `"Istanbul"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`

const Istanbul = base;
// ### `"MuirGlacier"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`

const MuirGlacier = base;
// ### `"Berlin"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`

const Berlin = base;
// ### `"BerlinToLondonAt5"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`
// - London Block: `0x05`
const BerlinToLondonAt5 = {
  ...base,
  londonBlock: 5n,
};

// ### `"London"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`
// - London Block: `0x00`

const London = base;
// ### `"ArrowGlacier"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`
// - London Block: `0x00`
// - Arrow Glacier Block: `0x00`

const ArrowGlacier = base;
// ### `"GrayGlacier"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`
// - London Block: `0x00`
// - Arrow Glacier Block: `0x00`
// - Gray Glacier Block: `0x00`

const GrayGlacier = base;
// ### `"Merge"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`
// - London Block: `0x00`
// - Arrow Glacier Block: `0x00`
// - Gray Glacier Block: `0x00`
// - Terminal Total Difficulty: `0x00`

const Merge = base;
// ### `"MergeToShanghaiAtTime15k"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`
// - London Block: `0x00`
// - Arrow Glacier Block: `0x00`
// - Gray Glacier Block: `0x00`
// - Terminal Total Difficulty: `0x00`
// - Shanghai Time: `0x3a98`

const MergeToShanghaiAtTime15k = {
  ...base,
  shanghaiTime: 15000n,
};
// ### `"Shanghai"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`
// - London Block: `0x00`
// - Arrow Glacier Block: `0x00`
// - Gray Glacier Block: `0x00`
// - Terminal Total Difficulty: `0x00`
// - Shanghai Time: `0x00`

const Shanghai = base;

// ### `"ShanghaiToCancunAtTime15k"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`
// - London Block: `0x00`
// - Arrow Glacier Block: `0x00`
// - Gray Glacier Block: `0x00`
// - Terminal Total Difficulty: `0x00`
// - Shanghai Time: `0x0`
// - Cancun Time: `0x3a98`

const ShanghaiToCancunAtTime15k = {
  ...base,

  cancunTime: 15000n,
};
// ### `"Cancun"`

// - Chain ID: `0x01`
// - Homestead Block: `0x00`
// - EIP150 Block: `0x00`
// - EIP155 Block: `0x00`
// - EIP158 Block: `0x00`
// - DAO Fork Block: `0x00`
// - Byzantium Block: `0x00`
// - Constantinople Block: `0x00`
// - Constantinople Fix Block: `0x00`
// - Istanbul Block: `0x00`
// - Muir Glacier Block: `0x00`
// - Berlin Block: `0x00`
// - London Block: `0x00`
// - Arrow Glacier Block: `0x00`
// - Gray Glacier Block: `0x00`
// - Terminal Total Difficulty: `0x00`
// - Shanghai Time: `0x00`
// - Cancun Time: `0x00`

const Cancun = base;

const ForkTransitions: Record<typeof Forks.Type, typeof base> = {
  Frontier,
  Homestead,
  Byzantium,
  Constantinople,
  ConstantinopleFix,
  Istanbul,
  MuirGlacier,
  Berlin,
  BerlinToLondonAt5,
  London,
  ArrowGlacier,
  GrayGlacier,
  Merge,
  MergeToShanghaiAtTime15k,
  Shanghai,
  ShanghaiToCancunAtTime15k,
  Cancun,
  Amsterdam: base,
  Osaka: base,
  Prague: base,
  ParisToShanghaiAtTime15k: base,
  Paris: base,
  CancunToPragueAtTime15k: base,

  BPO1ToBPO2AtTime15k: base,
  BPO2ToAmsterdamAtTime15k: base,
  OsakaToBPO1AtTime15k: base,
  PragueToOsakaAtTime15k: base,
} as const;

// ## Consumption

import { keccak256 } from "@evm-effect/crypto/keccak256";
import {
  Address,
  Bytes,
  Bytes32,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import rlp from "@evm-effect/rlp";
import { Effect, Predicate, Result, Schema } from "effect";
import {
  Access,
  decodeTransaction,
  encodeTransaction,
  signTransaction,
} from "packages/evm/src/transactions.js";
import { dedent } from "ts-dedent";
import {
  AccessListTransaction,
  Account,
  Authorization,
  BlobTransaction,
  BlockEnvironment,
  emptyBlockOutput,
  FeeMarketTransaction,
  LegacyTransaction,
  processTransaction,
  SetCodeTransaction,
  State,
  type Transaction,
} from "../../src/index.js";
import { Rlp } from "../../src/rlp.js";
import { Log } from "../../src/types/Receipt.js";
import { ExecutionSpecTestError } from "../utils/ExecutionSpecTestError.js";
import { getFork } from "../utils/getFork.js";
import type { StateTest, TransactionFixture } from "../utils/test-index.js";

// For each [`Fixture`](#fixture) test object in the JSON fixture file, perform the following steps:
// 1. Use [`pre`](#-pre-alloc) as the starting state allocation of the execution environment for the test.
// 2. Use [`env`](#-env-fixtureenvironment) to configure the current execution environment.
// 3. For each [`Fork`](./common_types.md#fork) key of [`post`](#-post-mappingforklist-fixtureforkpost) in the test, and for each of the elements of the list of [`FixtureForkPost`](#fixtureforkpost) values:
//     1. Configure the execution fork schedule according to the current [`Fork`](./common_types.md#fork) key.
//     2. Using the [`indexes`](#-indexes-fixtureforkpostindexes) values, and the [`transaction`](#-transaction-fixturetransaction) object, decode the transaction to be executed.
//     3. If the serialized version of the decoded transaction does not match [`txbytes`](#-txbytes-bytes), fail the test.
//     4. Attempt to apply the transaction using the current execution environment:
//         1. If the transaction could not be applied to the current execution context:
//             - If [`expectException`](#-expectexception-transactionexception) is empty, fail the test.
//             - If [`expectException`](#-expectexception-transactionexception) is not empty, revert the state to the pre-state.
//         2. If the transaction could be applied to the current execution context:
//             - If [`expectException`](#-expectexception-transactionexception) is not empty, fail the test.
//     5. Compare the resulting post-state root with the expected post-state root contained in the [`hash`](#-hash-hash) field of the current [`FixtureForkPost`](#fixtureforkpost), and fail the test if they do not match.
//     6. Compare the resulting logs hash with the expected logs contained in the [`logs`](#-logs-hash) field of the current [`FixtureForkPost`](#fixtureforkpost), and fail the test if they do not match.

const isProtected = (tx: Transaction) => {
  if (tx._tag === "LegacyTransaction") {
    return tx.v.value >= 35n;
  }
  return true;
};
export const runStateTest = Effect.fn("runStateTest")(function* (
  test: typeof StateTest.Type,
) {
  const blockEnv = BlockEnvironment.make({
    chainId: U64.wrap(test.config.chainid),
    baseFeePerGas: test.env.currentBaseFee ?? Uint.zero,
    blockGasLimit: test.env.currentGasLimit ?? Uint.zero,
    blockHashes: [],
    coinbase: test.env.currentCoinbase,
    number: test.env.currentNumber ?? Uint.zero,
    time: test.env.currentTimestamp ?? U256.zero,
    prevRandao:
      test.env.currentRandom ?? Bytes32.make({ value: new Uint8Array(32) }),
    difficulty: test.env.currentDifficulty ?? Uint.zero,
    excessBlobGas: test.env.currentExcessBlobGas ?? U64.zero,
    parentBeaconBlockRoot: Bytes32.make({ value: new Uint8Array(32) }),
    state: State.empty(),
  });

  for (const [address, account] of test.pre) {
    // yield* Effect.gen
    yield* State.setAccount(
      blockEnv.state,
      address,
      Account.make({
        nonce: account.nonce,
        balance: account.balance,
        code: account.code,
      }),
    );
    for (const [storageKey, storageValue] of account.storage) {
      yield* State.setStorage(
        blockEnv.state,
        address,
        storageKey,
        storageValue,
      );
    }
  }

  const [forkName, post] = Object.entries(test.post)[0];
  const fork = yield* getFork(forkName);

  yield* Effect.gen(function* () {
    const decodedTx = yield* decodeTxBytes(post.txbytes);
    const isProtectedTx = isProtected(decodedTx);
    const unsignedTx = yield* getTransaction(
      test.transaction,
      isProtectedTx ? test.config.chainid : undefined,
    );

    const signedTx = signTransaction({
      transaction: unsignedTx,
      privateKey: test.transaction.secretKey,
    });

    const encodedTxToCompare =
      signedTx._tag === "LegacyTransaction"
        ? yield* Rlp.encode(signedTx)
        : ((yield* encodeTransaction(signedTx)) as Bytes);

    if (encodedTxToCompare.toHex() !== post.txbytes.toHex()) {
      console.log(decodedTx._tag, decodedTx.r.value, decodedTx.s.value);
      console.log(signedTx._tag, signedTx.r.value, signedTx.s.value);
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: dedent`
        Transaction does not match: 
        got:      ${encodedTxToCompare.toHex()}
        expected: ${post.txbytes.toHex()}
        `,
        }),
      );
    }

    // for (const [prop, value] of Object.entries(decodedTx)) {
    //   const signedValue = signedTx[prop as keyof typeof signedTx];
    //   if (Array.isArray(value) && Array.isArray(signedValue)) {
    //     for (let i = 0; i < value.length; i++) {

    //        if (!Equal.equals(value[i], signedValue[i])) {
    //         return yield* Effect.fail(
    //           new StateTestError({
    //             message: dedent`
    //           Transaction ${prop} does not match
    //           expected:
    //           ${stringify(value[i])}
    //           got:
    //           ${stringify(signedValue[i])}
    //           `,
    //           }),
    //         );
    //       }
    //     }
    //   } else if (!Equal.equals(value, signedValue)) {
    //     return yield* Effect.fail(
    //       new StateTestError({
    //         message: dedent`
    //       Transaction ${prop} does not match
    //       expected:
    //       ${stringify(value)}
    //       got:
    //       ${stringify(signedValue)}
    //       `,
    //       }),
    //     );
    //   }
    // }

    const blockOutput = emptyBlockOutput();

    const processedTx = yield* processTransaction(
      blockEnv,
      blockOutput,
      signedTx,
      new Uint({ value: 0n }),
    ).pipe(Effect.provide(fork), Effect.result);

    //     4. Attempt to apply the transaction using the current execution environment:

    //         1. If the transaction could not be applied to the current execution context:
    if (Result.isFailure(processedTx)) {
      if (!post.expectException) {
        return yield* Effect.fail(
          new ExecutionSpecTestError({
            message: dedent`
          Transaction failed with exception: ${processedTx.failure}
          `,
          }),
          // TransactionException.INTRINSIC_GAS_TOO_LOW
        );
      } else {
        if (
          !("testTag" in processedTx.failure) ||
          !post.expectException.split("|").includes(processedTx.failure.testTag)
        ) {
          return yield* Effect.fail(
            new ExecutionSpecTestError({
              message: dedent`
            Transaction failed with exception: ${processedTx.failure}
            Expected exception: ${post.expectException}
            `,
            }),
          );
        }
      }
      //             - If [`expectException`](#-expectexception-transactionexception) is empty, fail the test.
      //             - If [`expectException`](#-expectexception-transactionexception) is not empty, revert the state to the pre-state.
    } else {
      //         2. If the transaction could be applied to the current execution context:
      //             - If [`expectException`](#-expectexception-transactionexception) is not empty, fail the test.
      if (post.expectException) {
        return yield* Effect.fail(
          new ExecutionSpecTestError({
            message: dedent`
          Transaction succeeded but expected exception: ${post.expectException}
          `,
          }),
        );
      }
    }
    const stateRoot = yield* State.stateRoot(blockEnv.state).pipe(
      Effect.map((stateRoot) => stateRoot.toHex()),
    );
    const expectedHash = post.hash;
    //     5. Compare the resulting post-state root with the expected post-state root contained in the [`hash`](#-hash-hash) field of the current [`FixtureForkPost`](#fixtureforkpost), and fail the test if they do not match.
    if (stateRoot !== expectedHash) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: dedent`
        State root mismatch: ${stateRoot} !== ${expectedHash}
        `,
        }),
      );
    }
    //     6. Compare the resulting logs hash with the expected logs contained in the [`logs`](#-logs-hash) field of the current [`FixtureForkPost`](#fixtureforkpost), and fail the test if they do not match.
    const logsRlpEncoded = yield* rlp
      .encodeTo(Schema.Array(Log), blockOutput.blockLogs)
      .pipe(Effect.fromResult);
    const actualLogsHash = keccak256(logsRlpEncoded).toHex();
    const expectedLogsHash = post.logs.toHex();
    if (actualLogsHash !== expectedLogsHash) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: dedent`
        Logs hash mismatch: ${actualLogsHash} !== ${expectedLogsHash}
        `,
        }),
      );
    }
  }).pipe(Effect.provide(fork));
});
const decodeTxBytes = Effect.fn("decodeTxBytes")(function* (txbytes: Bytes) {
  if (txbytes.value[0] >= 0x01 && txbytes.value[0] <= 0x04) {
    return yield* decodeTransaction(txbytes);
  }
  return yield* Rlp.fromSimple(LegacyTransaction, yield* Rlp.decode(txbytes));
});
const getTransaction = Effect.fn("getTransaction")(function* (
  transaction: typeof TransactionFixture.Type,
  chainIdBigint?: bigint,
) {
  const chainId = Predicate.isUndefined(chainIdBigint)
    ? undefined
    : U64.wrap(chainIdBigint);

  const accessList = transaction.accessLists?.map((address) =>
    Access.make({
      account: address.address,
      slots: address.storageKeys,
    }),
  );
  // console.log("accessList",transaction.accessLists, accessList);
  if (!Predicate.isUndefined(transaction.authorizationList)) {
    if (Predicate.isUndefined(transaction.maxFeePerGas)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Max fee is required for set code transaction",
        }),
      );
    }
    if (Predicate.isUndefined(transaction.maxPriorityFeePerGas)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Max priority fee is required for set code transaction",
        }),
      );
    }
    if (Predicate.isUndefined(transaction.gasLimit)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Gas limit is required for set code transaction",
        }),
      );
    }

    if (Predicate.isUndefined(chainId)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Chain id is required for set code transaction",
        }),
      );
    }

    return SetCodeTransaction.make({
      chainId,
      nonce: U64.wrap(transaction.nonce),
      data: transaction.data || Bytes.empty,
      gas: Uint.wrap(transaction.gasLimit),
      value: U256.wrap(transaction.value),
      maxFeePerGas: Uint.wrap(transaction.maxFeePerGas),
      maxPriorityFeePerGas: Uint.wrap(transaction.maxPriorityFeePerGas),
      authorizations: transaction.authorizationList.map((auth) =>
        Authorization.make({
          chainId: auth.chainId,
          address: auth.address,
          nonce: auth.nonce,
          yParity: auth.yParity,
          r: auth.r,
          s: auth.s,
        }),
      ),
      accessList: accessList ?? [],
      to: transaction.to,
    });
  }

  if (transaction.blobVersionedHashes || transaction.maxFeePerBlobGas) {
    if (Predicate.isUndefined(chainId)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Chain id is required for blob transaction",
        }),
      );
    }
    if (Predicate.isUndefined(transaction.gasLimit)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Gas limit is required for blob transaction",
        }),
      );
    }

    if (Predicate.isUndefined(transaction.maxFeePerGas)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Max fee is required for blob transaction",
        }),
      );
    }
    if (Predicate.isUndefined(transaction.maxPriorityFeePerGas)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Max priority fee is required for blob transaction",
        }),
      );
    }

    const blobTx = new BlobTransaction({
      chainId,
      nonce: U256.wrap(transaction.nonce),
      data: transaction.data || Bytes.empty,
      gas: Uint.wrap(transaction.gasLimit),
      value: U256.wrap(transaction.value),
      maxFeePerBlobGas: U256.wrap(transaction.maxFeePerBlobGas ?? 0n),
      blobVersionedHashes: transaction.blobVersionedHashes ?? [],
      accessList: accessList ?? [],
      maxFeePerGas: Uint.wrap(transaction.maxFeePerGas),
      maxPriorityFeePerGas: Uint.wrap(transaction.maxPriorityFeePerGas),

      to: Address.zero,
    });
    // @ts-expect-error - Some tests expect this to fail at runtime, but since this schema validates the input,
    // it fails right away. So we force a possibly wrong value here to test the error path.
    blobTx.to = transaction.to as Address;
    return blobTx;
  }

  if (transaction.maxFeePerGas || transaction.maxPriorityFeePerGas) {
    if (Predicate.isUndefined(transaction.maxFeePerGas)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Max fee is required for fee market transaction",
        }),
      );
    }
    if (Predicate.isUndefined(transaction.maxPriorityFeePerGas)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Max priority fee is required for fee market transaction",
        }),
      );
    }
    if (Predicate.isUndefined(transaction.gasLimit)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Gas limit is required for fee market transaction",
        }),
      );
    }
    if (Predicate.isUndefined(chainId)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Chain id is required for fee market transaction",
        }),
      );
    }
    return FeeMarketTransaction.make({
      chainId,
      nonce: U256.wrap(transaction.nonce),
      data: transaction.data || Bytes.empty,
      gas: Uint.wrap(transaction.gasLimit),
      value: U256.wrap(transaction.value),
      accessList: accessList ?? [],
      maxFeePerGas: Uint.wrap(transaction.maxFeePerGas),
      maxPriorityFeePerGas: Uint.wrap(transaction.maxPriorityFeePerGas),
      to: transaction.to,
    });
  }

  if (accessList) {
    if (Predicate.isUndefined(transaction.gasPrice)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Gas price is required for access list transaction",
        }),
      );
    }
    if (Predicate.isUndefined(transaction.gasLimit)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Gas limit is required for access list transaction",
        }),
      );
    }
    if (Predicate.isUndefined(chainId)) {
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: "Chain id is required for access list transaction",
        }),
      );
    }
    return AccessListTransaction.make({
      chainId,
      nonce: U256.wrap(transaction.nonce),
      data: transaction.data || Bytes.empty,
      gas: Uint.wrap(transaction.gasLimit),
      gasPrice: Uint.wrap(transaction.gasPrice),
      value: U256.wrap(transaction.value),
      accessList: accessList,
      to: transaction.to,
    });
  }

  if (Predicate.isUndefined(transaction.gasPrice)) {
    return yield* Effect.fail(
      new ExecutionSpecTestError({
        message: "Gas price is required for legacy transaction",
      }),
    );
  }
  if (Predicate.isUndefined(transaction.gasLimit)) {
    return yield* Effect.fail(
      new ExecutionSpecTestError({
        message: "Gas limit is required for legacy transaction",
      }),
    );
  }

  return LegacyTransaction.make({
    chainId,
    nonce: U256.wrap(transaction.nonce),
    data: transaction.data || Bytes.empty,
    gas: Uint.wrap(transaction.gasLimit),
    gasPrice: Uint.wrap(transaction.gasPrice),
    value: U256.wrap(transaction.value),
    to: transaction.to,
  });
});

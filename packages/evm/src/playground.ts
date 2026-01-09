import { keccak256 } from "@evm-effect/crypto";
import { getRandomPrivateKey } from "@evm-effect/crypto/getRandomPrivateKey";
import {
  FeeMarketTransaction,
  getAddressFromPrivateKey,
  signTransaction,
} from "@evm-effect/crypto/transactions";
import { Bytes, Bytes32, fromHex } from "@evm-effect/ethereum-types";
import { Address } from "@evm-effect/ethereum-types/domain";
import { U8, U64, U256, Uint } from "@evm-effect/ethereum-types/numeric";
import { stringify } from "@evm-effect/shared/stringify";
import { CompilerOutput, Contract, Solc } from "@evm-effect/solc";
import { Console, Effect, Either, Logger } from "effect";
import { emptyBlockOutput } from "./blockchain.js";
import State from "./state.js";
import { EvmTracer } from "./trace.js";
import { processTransaction } from "./transactions/processor.js";
import { computeContractAddress } from "./utils/address.js";
import { Fork } from "./vm/Fork.js";
import { BlockEnvironment } from "./vm/message.js";

const program = Effect.gen(function* () {
  const result = yield* Solc.compile({
    language: "Solidity",
    sources: {
      "Counter.sol": {
        content: /*solidity*/ `
          // SPDX-License-Identifier: MIT
          pragma solidity ^0.8.3;

          contract Counter {
              uint public count;

              // Function to get the current count
              function get() public view returns (uint) {
                  return count;
              }

              // Function to increment count by 1
              function inc() public {
                  count += 1;
              }

              // Function to decrement count by 1
              function dec() public {
                  count -= 1;
              }
          }
        `,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["*"],
        },
      },
    },
  });
  const contract = yield* CompilerOutput.getContract(result, "Counter");
  yield* Effect.log(contract);
  const bytes = yield* Contract.getBytes(contract);
  const privateKey = getRandomPrivateKey();

  const address = getAddressFromPrivateKey(privateKey);
  yield* Effect.log(address);

  const blockEnv = new BlockEnvironment({
    chainId: new U64({ value: 1n }),
    state: State.empty(),
    blockGasLimit: new Uint({ value: 30000000n }),
    blockHashes: [],
    coinbase: Address.zero(),
    number: new Uint({ value: 1n }),
    baseFeePerGas: new Uint({ value: 1000000000n }),
    time: new U256({ value: 1640000000n }),
    prevRandao: new Bytes32({ value: new Uint8Array(32) }),
    difficulty: new Uint({ value: 0n }),
    excessBlobGas: new U64({ value: 0n }),
    parentBeaconBlockRoot: new Bytes32({ value: new Uint8Array(32) }),
  });

  // Set the contract deployer account
  const deployerAddressResult = new Address(
    "0x4e59b44847b379578588920ca78fbf26c0b4956c",
  );
  const deployerAddress = deployerAddressResult;

  const deployerBytecode = yield* fromHex(
    "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3",
  );

  yield* State.setCode(blockEnv.state, deployerAddress, deployerBytecode);
  yield* Effect.log(`Set deployer account at ${deployerAddress.toHex()}`);

  yield* State.setAccountBalance(
    blockEnv.state,
    address,
    new U256({ value: 100000000000000000000000000000000000000n }),
  );

  const blockOutput = emptyBlockOutput();

  let tx = FeeMarketTransaction.make({
    chainId: new U64({ value: 1n }),
    nonce: new U256({ value: 0n }),
    gas: new Uint({ value: 1000000n }),
    maxPriorityFeePerGas: new Uint({ value: 1000000000n }),
    maxFeePerGas: new Uint({ value: 1000000000n }),
    accessList: [],
    data: bytes,
    value: new U256({ value: 0n }),
    r: new U256({ value: 0n }),
    s: new U256({ value: 0n }),
    yParity: new U8({ value: 0n }),
  });

  const signature = signTransaction({
    transaction: tx,
    privateKey: privateKey,
  });

  tx = {
    ...tx,
    yParity: signature.yParity,
    r: signature.r,
    s: signature.s,
  };

  yield* processTransaction(blockEnv, blockOutput, tx, new Uint({ value: 0n }));
  yield* Effect.log("=== Contract Deployment ===");
  yield* Effect.log(stringify(blockOutput));

  // Compute the deployed contract address
  const contractAddress = computeContractAddress(
    address,
    new Uint({ value: 0n }),
  );
  yield* Effect.log(
    `\n=== Deployed contract at: ${contractAddress.toHex()} ===\n`,
  );

  // Helper function to encode function selector
  const encodeFunctionCall = (
    signature: string,
    params: Uint8Array = new Uint8Array(),
  ): Bytes => {
    const hash = keccak256(new TextEncoder().encode(signature));
    const selector = hash.value.slice(0, 4);
    const data = new Uint8Array(selector.length + params.length);
    data.set(selector);
    data.set(params, selector.length);
    return new Bytes({ value: data });
  };

  // Helper function to create and execute a transaction
  const executeTransaction = function* (
    nonce: bigint,
    to: Address,
    data: Bytes,
    txIndex: bigint,
  ) {
    let callTx = FeeMarketTransaction.make({
      chainId: new U64({ value: 1n }),
      nonce: new U256({ value: nonce }),
      gas: new Uint({ value: 1000000n }),
      maxPriorityFeePerGas: new Uint({ value: 1000000000n }),
      maxFeePerGas: new Uint({ value: 1000000000n }),
      accessList: [],
      to: to,
      data: data,
      value: new U256({ value: 0n }),
      r: new U256({ value: 0n }),
      s: new U256({ value: 0n }),
      yParity: new U8({ value: 0n }),
    });

    const sig = signTransaction({
      transaction: callTx,
      privateKey: privateKey,
    });

    callTx = {
      ...callTx,
      yParity: sig.yParity,
      r: sig.r,
      s: sig.s,
    };

    yield* processTransaction(
      blockEnv,
      blockOutput,
      callTx,
      new Uint({ value: txIndex }),
    );
    return callTx;
  };

  // Call inc() function
  yield* Effect.log("=== Calling inc() ===");
  const incData = encodeFunctionCall("inc()");
  yield* executeTransaction(1n, contractAddress, incData, 1n);

  // Call inc() again
  yield* Effect.log("\n=== Calling inc() again ===");
  yield* executeTransaction(2n, contractAddress, incData, 2n);

  // Call get() function to read the count
  yield* Effect.log("\n=== Calling get() to read count ===");
  const getData = encodeFunctionCall("get()");
  yield* executeTransaction(3n, contractAddress, getData, 3n);

  // Read the return data from the last transaction
  const getReceipt = blockOutput.receiptsTrie.get(
    fromHex("0x03").pipe(Either.getOrThrow),
  );
  if (getReceipt) {
    yield* Effect.log(`get() returned: ${stringify(getReceipt)}`);
  }

  // Call dec() function
  yield* Effect.log("\n=== Calling dec() ===");
  const decData = encodeFunctionCall("dec()");
  yield* executeTransaction(4n, contractAddress, decData, 4n);

  // Call get() again to see the decremented value
  yield* Effect.log("\n=== Calling get() again after dec() ===");
  yield* executeTransaction(5n, contractAddress, getData, 5n);

  const getFinalReceipt = blockOutput.receiptsTrie.get(
    fromHex("0x05").pipe(Either.getOrThrow),
  );
  if (getFinalReceipt) {
    yield* Effect.log(`get() returned: ${stringify(getFinalReceipt)}`);
  }

  yield* Effect.log("\n=== Final Block Output ===");
  yield* Effect.log(stringify(blockOutput));

  // Read the contract storage directly to verify
  const storageSlot0 = State.getStorage(
    blockEnv.state,
    contractAddress,
    new Bytes32({ value: new Uint8Array(32) }),
  );
  yield* Effect.log(`\n=== Direct storage read (count) ===`);
  yield* Effect.log(`Storage slot 0 value: ${storageSlot0.value.toString()}`);
});

await program.pipe(
  // Effect.provide(DevTools.layer()),
  Effect.provide(Fork.prague()),
  Effect.provide(
    EvmTracer.eip3155({
      emit: (_, encode) =>
        Effect.gen(function* () {
          const encoded = yield* encode;
          yield* Console.log(encoded);
        }),
    }),
  ),
  Effect.provide(Logger.pretty),
  Effect.runPromise,
);

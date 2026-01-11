/**
 * README Example - Simple ETH Transfer
 *
 * This is the working example used in the README.md
 */

import { getRandomPrivateKey } from "@evm-effect/crypto/getRandomPrivateKey";
import {
  getAddressFromPrivateKey,
  signTransaction,
} from "@evm-effect/crypto/transactions";
import {
  Address,
  Bytes,
  Bytes32,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import {
  Account,
  applyBody,
  BlockChain,
  BlockEnvironment,
  Fork,
  LegacyTransaction,
  State,
} from "@evm-effect/evm";
import { Console, Effect } from "effect";

const program = Effect.gen(function* () {
  // Create empty blockchain
  const chainId = U64.constant(1n);
  const blockchain = BlockChain.empty(chainId);

  // Generate accounts
  const alicePrivateKey = getRandomPrivateKey();
  const alice = getAddressFromPrivateKey(alicePrivateKey);
  const bob = new Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  const coinbase = new Address("0xcccccccccccccccccccccccccccccccccccccccc");

  // Fund Alice with 10 ETH
  yield* State.setAccount(
    blockchain.state,
    alice,
    Account.make({
      nonce: Uint.constant(0n),
      balance: U256.constant(10n * 10n ** 18n),
      code: Bytes.empty(),
    }),
  );

  // Create transaction: Alice sends 1 ETH to Bob
  const unsignedTx = LegacyTransaction.make({
    nonce: U256.constant(0n),
    gasPrice: Uint.constant(10n * 10n ** 9n), // 10 gwei
    gas: Uint.constant(21_000n),
    to: bob,
    value: U256.constant(1n * 10n ** 18n), // 1 ETH
    data: Bytes.empty(),
  });

  // Sign transaction
  const signature = signTransaction({
    transaction: unsignedTx,
    privateKey: alicePrivateKey,
  });

  const signedTx: LegacyTransaction = {
    ...unsignedTx,
    v: signature.v,
    r: signature.r,
    s: signature.s,
  };

  // Create block environment
  const blockEnv = BlockEnvironment.make({
    chainId,
    state: blockchain.state,
    blockGasLimit: Uint.constant(30_000_000n),
    blockHashes: [],
    coinbase,
    number: Uint.constant(1n),
    baseFeePerGas: Uint.constant(10n * 10n ** 9n),
    time: U256.constant(BigInt(Math.floor(Date.now() / 1000))),
    prevRandao: Bytes32.zero(),
    difficulty: Uint.constant(0n),
    excessBlobGas: U64.constant(0n),
    parentBeaconBlockRoot: Bytes32.zero(),
  });

  // Execute block with transaction
  const blockOutput = yield* applyBody(blockEnv, [signedTx], [], []);

  // Check results
  const aliceBalance = State.getAccount(blockchain.state, alice).balance;
  const bobBalance = State.getAccount(blockchain.state, bob).balance;

  yield* Console.log("Transaction executed!");
  yield* Console.log(`Gas used: ${blockOutput.blockGasUsed.value}`);
  yield* Console.log(`Alice balance: ${aliceBalance.value / 10n ** 18n} ETH`);
  yield* Console.log(`Bob balance: ${bobBalance.value / 10n ** 18n} ETH`);
});

// Run with London fork
Effect.runPromise(program.pipe(Effect.provide(Fork.london())));

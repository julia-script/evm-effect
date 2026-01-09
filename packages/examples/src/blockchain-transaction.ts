/**
 * Blockchain Transaction Example
 *
 * This example demonstrates the full blockchain flow:
 * 1. Create a blockchain with genesis state
 * 2. Create and sign a transaction
 * 3. Create a block with the transaction
 * 4. Execute the block using applyBody
 * 5. Add the block to the chain
 *
 * Scenario:
 * - Alice starts with 10 ETH
 * - Alice sends 1 ETH to Bob
 * - Block is executed and state is updated
 */

import { getRandomPrivateKey } from "@evm-effect/crypto/getRandomPrivateKey";
import {
  getAddressFromPrivateKey,
  signTransaction,
} from "@evm-effect/crypto/transactions";
import {
  Address,
  Bytes,
  Bytes8,
  Bytes32,
  Bytes256,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import {
  Account,
  applyBody,
  Block,
  BlockChain,
  BlockEnvironment,
  Fork,
  Header,
  LegacyTransaction,
  State,
} from "@evm-effect/evm";
import { Console, Effect, Layer, Logger } from "effect";

// Helper to create ETH amounts
const eth = (amount: number): U256 =>
  U256.constant(BigInt(amount) * 10n ** 18n);
const gwei = (amount: number): Uint =>
  Uint.constant(BigInt(amount) * 10n ** 9n);

const program = Effect.gen(function* () {
  yield* Console.log("=== Blockchain Transaction Example ===\n");

  // 1. Generate a private key for Alice and derive her address
  const alicePrivateKey = getRandomPrivateKey();
  const alice = getAddressFromPrivateKey(alicePrivateKey);
  const bob = new Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  const coinbase = new Address("0xcccccccccccccccccccccccccccccccccccccccc");

  yield* Console.log("Addresses:");
  yield* Console.log("  Alice:", alice.toHex());
  yield* Console.log("  Bob:", bob.toHex());
  yield* Console.log("  Coinbase (miner):", coinbase.toHex());

  // 2. Create an empty blockchain
  const chainId = U64.constant(1n);
  let blockchain = BlockChain.empty(chainId);

  yield* Console.log("\n--- Setting up Genesis State ---");

  // 3. Set up initial state (genesis) - Give Alice 10 ETH
  yield* State.setAccount(
    blockchain.state,
    alice,
    Account.make({
      nonce: Uint.constant(0n),
      balance: eth(10),
      code: Bytes.empty(),
    }),
  );

  yield* Console.log("Alice initial balance: 10 ETH");
  yield* Console.log("Bob initial balance: 0 ETH");

  // 4. Create and sign a transaction: Alice sends 1 ETH to Bob
  yield* Console.log("\n--- Creating Transaction ---");

  // Create unsigned transaction (signature fields default to zero)
  const unsignedTx = LegacyTransaction.make({
    nonce: U256.constant(0n),
    gasPrice: gwei(10), // 10 gwei
    gas: Uint.constant(21_000n), // Standard transfer gas
    to: bob,
    value: eth(1), // 1 ETH
    data: Bytes.empty(),
  });

  // Sign the transaction with Alice's private key
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

  yield* Console.log("Transaction: Alice -> Bob, 1 ETH");
  yield* Console.log("  Gas price: 10 gwei");
  yield* Console.log("  Gas limit: 21,000");
  yield* Console.log("  Transaction signed successfully!");

  // 5. Create a block header
  yield* Console.log("\n--- Creating Block ---");

  const blockNumber = Uint.constant(1n);
  const timestamp = U256.constant(Math.floor(Date.now() / 1000));
  const baseFeePerGas = gwei(10);

  const header = Header.make({
    parentHash: Bytes32.zero(),
    ommersHash: Bytes32.zero(),
    coinbase,
    stateRoot: Bytes32.zero(),
    transactionsRoot: Bytes32.zero(),
    receiptRoot: Bytes32.zero(),
    bloom: Bytes256.zero(),
    difficulty: Uint.constant(131072n),
    number: blockNumber,
    gasLimit: Uint.constant(30_000_000n),
    gasUsed: Uint.constant(0n),
    timestamp,
    extraData: Bytes.empty(),
    prevRandao: Bytes32.zero(),
    nonce: Bytes8.zero(),
    baseFeePerGas, // London+ (EIP-1559)
  });

  yield* Console.log("Block #1 created");
  yield* Console.log("  Coinbase:", coinbase.toHex());
  yield* Console.log("  Gas limit: 30,000,000");
  yield* Console.log("  Base fee: 10 gwei");

  // 6. Create block environment for execution
  const blockEnv = BlockEnvironment.make({
    chainId,
    state: blockchain.state,
    blockGasLimit: header.gasLimit,
    blockHashes: [],
    coinbase: header.coinbase,
    number: header.number,
    baseFeePerGas,
    time: timestamp,
    prevRandao: header.prevRandao,
    difficulty: header.difficulty,
    excessBlobGas: U64.constant(0n),
    parentBeaconBlockRoot: Bytes32.zero(),
  });

  // 7. Execute the block
  yield* Console.log("\n--- Executing Block ---");

  const blockOutput = yield* applyBody(blockEnv, [signedTx], [], []);

  yield* Console.log("Block executed successfully!");
  yield* Console.log("  Gas used:", blockOutput.blockGasUsed.value.toString());

  // 8. Create the final block
  const block = Block.make({
    header: Header.make({
      ...header,
      gasUsed: blockOutput.blockGasUsed,
    }),
    transactions: [signedTx],
    ommers: [],
    withdrawals: [],
  });

  // 9. Add block to blockchain
  blockchain = blockchain.addBlock(block);

  yield* Console.log("\n--- Block Added to Chain ---");
  yield* Console.log("Chain length:", blockchain.length);

  // 10. Print final state
  yield* Console.log("\n--- Final State ---");

  const aliceAccount = State.getAccount(blockchain.state, alice);
  const bobAccount = State.getAccount(blockchain.state, bob);
  const coinbaseAccount = State.getAccount(blockchain.state, coinbase);

  // Expected: 10 ETH - 1 ETH (transfer) - 0.00021 ETH (gas) = 8.99979 ETH
  yield* Console.log("Alice:");
  yield* Console.log(
    "  Balance:",
    formatEth(aliceAccount.balance.value),
    "ETH",
  );
  yield* Console.log("  Nonce:", aliceAccount.nonce.value.toString());

  // Expected: 1 ETH (received from Alice)
  yield* Console.log("Bob:");
  yield* Console.log("  Balance:", formatEth(bobAccount.balance.value), "ETH");

  // Expected: 0.00021 ETH (21000 gas * 10 gwei, but London burns base fee, so miner gets priority fee)
  yield* Console.log("Coinbase (miner):");
  yield* Console.log(
    "  Balance:",
    formatEth(coinbaseAccount.balance.value),
    "ETH",
  );

  yield* Console.log("\n=== Blockchain Transaction Example Complete ===");
});

// Helper to format wei to ETH string
function formatEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
}

// Run the program with London fork (simpler, no system contracts required)
const runtimeLayer = Layer.merge(Fork.london(), Logger.pretty);

Effect.runPromise(program.pipe(Effect.provide(runtimeLayer)));

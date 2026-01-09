/**
 * Contract Deployment Example
 *
 * This example demonstrates how to deploy a smart contract:
 * 1. Create init code (constructor bytecode)
 * 2. Create a contract creation transaction (to = undefined)
 * 3. Execute the transaction to deploy the contract
 * 4. Verify the deployed contract code
 *
 * We deploy a simple contract that returns 42 when called.
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
  computeContractAddress,
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

/**
 * Create init code that deploys a contract returning 42.
 *
 * The init code (constructor) runs once during deployment.
 * It copies the runtime code to memory and returns it.
 *
 * Runtime code (what gets deployed):
 *   PUSH1 0x2A    (60 2A)  - Push 42 onto stack
 *   PUSH1 0x00    (60 00)  - Push memory offset 0
 *   MSTORE        (52)     - Store 42 at memory[0] (32 bytes, right-padded)
 *   PUSH1 0x20    (60 20)  - Push return size (32 bytes)
 *   PUSH1 0x00    (60 00)  - Push return offset
 *   RETURN        (F3)     - Return 32 bytes from memory[0]
 *
 * Init code:
 *   PUSH1 0x0A    (60 0A)  - Push runtime code size (10 bytes)
 *   PUSH1 0x0C    (60 0C)  - Push runtime code offset in this bytecode (12)
 *   PUSH1 0x00    (60 00)  - Push destination memory offset
 *   CODECOPY      (39)     - Copy runtime code to memory
 *   PUSH1 0x0A    (60 0A)  - Push runtime code size (10 bytes)
 *   PUSH1 0x00    (60 00)  - Push memory offset
 *   RETURN        (F3)     - Return runtime code (deploys it)
 *   <runtime code follows>
 */
const createInitCode = (): Uint8Array => {
  // Runtime code (10 bytes) - returns 42
  const runtimeCode = [
    0x60,
    0x2a, // PUSH1 42
    0x60,
    0x00, // PUSH1 0
    0x52, // MSTORE
    0x60,
    0x20, // PUSH1 32
    0x60,
    0x00, // PUSH1 0
    0xf3, // RETURN
  ];

  // Init code (12 bytes) - deploys the runtime code
  const initCode = [
    0x60,
    0x0a, // PUSH1 10 (runtime code length)
    0x60,
    0x0c, // PUSH1 12 (offset where runtime code starts)
    0x60,
    0x00, // PUSH1 0 (destination in memory)
    0x39, // CODECOPY
    0x60,
    0x0a, // PUSH1 10 (runtime code length)
    0x60,
    0x00, // PUSH1 0 (memory offset)
    0xf3, // RETURN
  ];

  return new Uint8Array([...initCode, ...runtimeCode]);
};

const program = Effect.gen(function* () {
  yield* Console.log("=== Contract Deployment Example ===\n");

  // 1. Generate deployer account
  const deployerPrivateKey = getRandomPrivateKey();
  const deployer = getAddressFromPrivateKey(deployerPrivateKey);
  const coinbase = new Address("0xcccccccccccccccccccccccccccccccccccccccc");

  yield* Console.log("Deployer:", deployer.toHex());
  yield* Console.log("Coinbase:", coinbase.toHex());

  // 2. Create an empty blockchain
  const chainId = U64.constant(1n);
  let blockchain = BlockChain.empty(chainId);

  // 3. Fund the deployer account
  yield* Console.log("\n--- Setting up Genesis State ---");

  yield* State.setAccount(
    blockchain.state,
    deployer,
    Account.make({
      nonce: Uint.constant(0n),
      balance: eth(10),
      code: Bytes.empty(),
    }),
  );

  yield* Console.log("Deployer balance: 10 ETH");

  // 4. Create init code (constructor bytecode)
  yield* Console.log("\n--- Creating Init Code ---");

  const initCode = createInitCode();
  yield* Console.log("Init code:", Bytes.from(initCode).toHex());
  yield* Console.log("Init code length:", initCode.length, "bytes");

  // 5. Create deployment transaction (to = undefined means contract creation)
  yield* Console.log("\n--- Creating Deployment Transaction ---");

  const unsignedTx = LegacyTransaction.make({
    nonce: U256.constant(0n),
    gasPrice: gwei(10),
    gas: Uint.constant(100_000n), // Enough gas for deployment
    to: undefined, // No recipient = contract creation
    value: U256.constant(0n), // No ETH sent to contract
    data: Bytes.from(initCode), // Init code as transaction data
  });

  // Sign the transaction
  const signature = signTransaction({
    transaction: unsignedTx,
    privateKey: deployerPrivateKey,
  });

  const signedTx: LegacyTransaction = {
    ...unsignedTx,
    v: signature.v,
    r: signature.r,
    s: signature.s,
  };

  yield* Console.log("Transaction type: Contract Creation");
  yield* Console.log("  Gas limit: 100,000");
  yield* Console.log("  Transaction signed!");

  // 6. Create block header
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
    baseFeePerGas,
  });

  // 7. Create block environment
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

  // 8. Execute the block
  yield* Console.log("\n--- Executing Deployment ---");

  const blockOutput = yield* applyBody(blockEnv, [signedTx], [], []);

  yield* Console.log("Deployment executed!");
  yield* Console.log("  Gas used:", blockOutput.blockGasUsed.value.toString());

  // 9. Get the deployed contract address
  // Contract address = keccak256(rlp([deployer, nonce]))[12:]
  const contractAddress = computeContractAddress(deployer, Uint.constant(0n));

  yield* Console.log("\n--- Deployment Result ---");
  yield* Console.log("Contract deployed at:", contractAddress.toHex());

  // 10. Verify the deployed code
  const deployedAccount = State.getAccount(blockchain.state, contractAddress);
  yield* Console.log("Deployed code:", deployedAccount.code.toHex());
  yield* Console.log(
    "Deployed code length:",
    deployedAccount.code.value.length,
    "bytes",
  );

  // Expected: runtime code (10 bytes) that returns 42
  yield* Console.log("\n--- Expected ---");
  yield* Console.log(
    "Expected code: 0x602a60005260206000f3 (10 bytes, returns 42)",
  );

  // 11. Create and add the final block
  const block = Block.make({
    header: Header.make({
      ...header,
      gasUsed: blockOutput.blockGasUsed,
    }),
    transactions: [signedTx],
    ommers: [],
    withdrawals: [],
  });

  blockchain = blockchain.addBlock(block);

  yield* Console.log("\n--- Block Added ---");
  yield* Console.log("Chain length:", blockchain.length);

  // 12. Show deployer's remaining balance
  const deployerAccount = State.getAccount(blockchain.state, deployer);
  yield* Console.log("\nDeployer:");
  yield* Console.log(
    "  Balance:",
    formatEth(deployerAccount.balance.value),
    "ETH",
  );
  yield* Console.log("  Nonce:", deployerAccount.nonce.value.toString());

  yield* Console.log("\n=== Contract Deployment Complete ===");
});

// Helper to format wei to ETH string
function formatEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
}

// Run with London fork
const runtimeLayer = Layer.merge(Fork.london(), Logger.pretty);

Effect.runPromise(program.pipe(Effect.provide(runtimeLayer)));

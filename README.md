# evm-effect

An Ethereum Virtual Machine (EVM) implementation in TypeScript using the [Effect](https://effect.website/) library, with a focus on debuggability.

This implementation is designed for building developer tooling that requires deep introspection into EVM execution — such as debuggers, tracers, profilers, and testing frameworks. The Effect-TS foundation provides structured concurrency, typed errors, and built-in tracing capabilities that make it straightforward to observe and analyze every step of execution.

**Primary packages:**

| Package | Role |
|--------|------|
| [`@evm-effect/evm`](https://github.com/julia-script/evm-effect/tree/main/packages/evm) | EVM interpreter, block/transaction processing, state, precompiles, and tracing. See [packages/evm/README.md](packages/evm/README.md). |
| [`@evm-effect/solc`](https://github.com/julia-script/evm-effect/tree/main/packages/solc) | Compile Solidity via Effect (Node or Next.js worker). See [packages/solc/README.md](packages/solc/README.md). |

Other packages in this repo (`@evm-effect/ethereum-types`, `@evm-effect/crypto`, `@evm-effect/rlp`, and internal packages) are published as needed for those two; you typically install `evm` and/or `solc` and let the package manager resolve the rest.

## Test Coverage

This implementation is extensively tested against the official [Ethereum Execution Specs](https://github.com/ethereum/execution-specs) state tests and blockchain tests:

```shell
➜  evm-effect git:(main) ✗ bun test packages/evm/test/fixtures.test.ts
...

 91392 pass
 0 fail
 2851964 expect() calls
Ran 91392 tests across 1 file. [11202.85s]
```

## Supported Forks

All released Ethereum forks are supported:

| Fork | Status |
|------|--------|
| Frontier | ✅ |
| Homestead | ✅ |
| Tangerine Whistle | ✅ |
| Spurious Dragon | ✅ |
| Byzantium | ✅ |
| Constantinople | ✅ |
| Petersburg | ✅ |
| Istanbul | ✅ |
| Muir Glacier | ✅ |
| Berlin | ✅ |
| London | ✅ |
| Paris (The Merge) | ✅ |
| Shanghai | ✅ |
| Cancun | ✅ |
| Prague | ✅ |
| Osaka (Unreleased) | 🚧 In Progress |

## Packages

This monorepo contains the following packages:

| Package | Description |
|---------|-------------|
| `@evm-effect/evm` | Core EVM implementation with interpreter, block/transaction processing, state management, precompiles, and EIP-3155 tracing |
| `@evm-effect/ethereum-types` | Core Ethereum types (Address, Bytes, U256, etc.) |
| `@evm-effect/rlp` | RLP encoding and decoding |
| `@evm-effect/crypto` | Cryptographic primitives (keccak256, sha256, transaction signing) |
| `@evm-effect/solc` | Solidity compiler wrapper with typed schemas |
| `@evm-effect/shared` | Shared utilities (HashMap, HashSet) |
| `@evm-effect/examples` | Usage examples (contract deployment, transactions) |

## Usage

### Simple ETH Transfer

```typescript
import { Console, Effect } from "effect";
import { getRandomPrivateKey } from "@evm-effect/crypto/getRandomPrivateKey";
import { getAddressFromPrivateKey, signTransaction } from "@evm-effect/crypto/transactions";
import { Address, Bytes, Bytes32, U64, U256, Uint } from "@evm-effect/ethereum-types";
import {
  Account, applyBody, BlockChain, BlockEnvironment,
  Fork, LegacyTransaction, State
} from "@evm-effect/evm";

const program = Effect.gen(function* () {
  // Create empty blockchain
  const chainId = U64.constant(1n);
  const blockchain = BlockChain.empty(chainId);

  // Generate accounts
  const alicePrivateKey = getRandomPrivateKey();
  const alice = getAddressFromPrivateKey(alicePrivateKey);
  const bob = new Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

  // Fund Alice with 10 ETH
  yield* State.setAccount(blockchain.state, alice, Account.make({
    nonce: Uint.constant(0n),
    balance: U256.constant(10n * 10n ** 18n),
    code: Bytes.empty(),
  }));

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
  const signature = signTransaction({ transaction: unsignedTx, privateKey: alicePrivateKey });
  const signedTx: LegacyTransaction = { ...unsignedTx, ...signature };

  // Create block environment
  const blockEnv = BlockEnvironment.make({
    chainId,
    state: blockchain.state,
    blockGasLimit: Uint.constant(30_000_000n),
    blockHashes: [],
    coinbase: new Address("0xcccccccccccccccccccccccccccccccccccccccc"),
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

  yield* Console.log(`Gas used: ${blockOutput.blockGasUsed.value}`);
  yield* Console.log(`Bob balance: ${State.getAccount(blockchain.state, bob).balance.value / 10n ** 18n} ETH`);
});

// Run with London fork
Effect.runPromise(program.pipe(Effect.provide(Fork.london())));
// Output:
//   Gas used: 21000
//   Bob balance: 1 ETH
```

## Installation



```bash
npm add @evm-effect/evm effect @effect/platform @effect/platform-node
```

Pre-1.0 releases may still change APIs; pin versions in production as you would for any `0.x` dependency.

**From source** (contributors or local development):

```bash
git clone https://github.com/julia-script/evm-effect.git
cd evm-effect
bun install
bun run build
```

## License

MIT

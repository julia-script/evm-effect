# evm-effect

An Ethereum Virtual Machine (EVM) implementation in TypeScript using the [Effect](https://effect.website/) library, with a focus on debuggability.

This implementation is designed for building developer tooling that requires deep introspection into EVM execution — such as debuggers, tracers, profilers, and testing frameworks. The Effect-TS foundation provides structured concurrency, typed errors, and built-in tracing capabilities that make it straightforward to observe and analyze every step of execution.

> **Note:** This project is not yet published to npm. The API is still in flux and will likely go through significant changes before the first stable release.

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
import { Effect } from "effect";
import {
  Account, applyBody, BlockChain, BlockEnvironment,
  Fork, LegacyTransaction, State
} from "@evm-effect/evm";
import { Address, Bytes, U64, U256, Uint } from "@evm-effect/ethereum-types";

const program = Effect.gen(function* () {
  // Create empty blockchain
  const chainId = U64.constant(1n);
  const blockchain = BlockChain.empty(chainId);

  // Fund Alice with 10 ETH
  const alice = new Address("0xaaaa...");
  yield* State.setAccount(blockchain.state, alice, Account.make({
    nonce: Uint.constant(0n),
    balance: U256.constant(10n * 10n ** 18n),
    code: Bytes.empty(),
  }));

  // Create and execute transaction...
  const blockOutput = yield* applyBody(blockEnv, [signedTx], [], []);
});

// Run with London fork
Effect.runPromise(program.pipe(Effect.provide(Fork.london())));
```

## Installation

This project is **not yet published to npm**. The API is still being refined and will likely undergo changes.

To use from source:

```bash
git clone https://github.com/your-username/evm-effect.git
cd evm-effect
bun install
bun run build
```

## License

MIT

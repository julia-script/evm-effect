# evm-effect

An Ethereum Virtual Machine (EVM) implementation in TypeScript using the [Effect](https://effect.website/) library, with a focus on debuggability.

This implementation is designed for building developer tooling that requires deep introspection into EVM execution — such as debuggers, tracers, profilers, and testing frameworks. The Effect-TS foundation provides structured concurrency, typed errors, and built-in tracing capabilities that make it straightforward to observe and analyze every step of execution.

**Primary packages:**

| Package | Role |
|--------|------|
| [`@evm-effect/evm`](https://github.com/julia-script/evm-effect/tree/main/packages/evm) | EVM interpreter, block/transaction processing, state, precompiles, and tracing. See [packages/evm/README.md](packages/evm/README.md). |
| [`@evm-effect/solc`](https://github.com/julia-script/evm-effect/tree/main/packages/solc) | Compile Solidity via Effect (Node or Next.js worker). See [packages/solc/README.md](packages/solc/README.md). |

Other packages in this repo (`@evm-effect/ethereum-types`, `@evm-effect/crypto`, `@evm-effect/rlp`, and internal packages) are published as needed for those two; you typically install `evm` and/or `solc` and let the package manager resolve the rest.

## Documentation

The documentation site lives in [`apps/docs`](apps/docs) — a Next.js app using
[Fumadocs](https://fumadocs.dev) and Tailwind CSS. Its API reference is generated
from the TSDoc comments of every published package with
[TypeDoc](https://typedoc.org), so it always matches the source.

```bash
pnpm docs:dev     # build the packages, generate the API reference, serve on :3000
pnpm docs:build   # production build
pnpm docs:api     # regenerate content/docs/api only
```

Guides are written in `apps/docs/content/docs`. The `api/` section underneath it
is generated and git-ignored; regenerate it with `pnpm docs:api` after changing
a package's doc comments. TypeDoc settings shared by every package live in
[`typedoc.base.json`](typedoc.base.json), with per-package entry points in each
`packages/*/typedoc.json`.

## Test Coverage

This implementation is extensively tested against the official [Ethereum Execution Specs](https://github.com/ethereum/execution-specs) state tests and blockchain tests, from the `tests-bal@v7.1.1` fixture release. Both suites run on every push and pull request via [`.github/workflows/evm-tests.yml`](.github/workflows/evm-tests.yml):

| Suite | Tests | Result | Runtime |
|-------|------:|--------|---------|
| State tests | 49,931 | ✅ all passing | 2h 44m |
| Blockchain tests | 59,722 | ✅ all passing | 4h 36m |
| **Total** | **109,653** | ✅ **0 failures** | |

Numbers from the latest run on `main` (commit `381b062`).

<details>
<summary>What isn't covered by those runs</summary>

The fixture release contains 220,583 test cases in total; 148,067 of them are in the two formats this runner consumes (`state_test` and `blockchain_test`). Of those, 109,653 execute — the rest are skipped by the fork allowlist in [`test/cli.ts`](packages/evm/test/cli.ts):

| Skipped | Tests | Why |
|---------|------:|-----|
| Amsterdam | 35,480 | Fork still in progress |
| Petersburg (`ConstantinopleFix`) | 2,561 | Not yet in the enabled fork set |
| Transition forks (`ShanghaiToCancunAtTime15k`, …) | 373 | Not yet in the enabled fork set |

The remaining 72,516 fixtures are in formats the runner does not consume: `blockchain_test_engine` (72,333), `transaction_test` (165), and `blockchain_test_sync` (18).

</details>

### Running the fixtures locally

```shell
cd packages/evm
pnpm run fixtures                                  # download the execution-spec fixtures (requires uv)
pnpm tsx ./test/cli.ts --format=state_test
pnpm tsx ./test/cli.ts --format=blockchain_test
```

The full suite takes several hours, so narrow it down with `--filter` (comma-separated substrings matched against the test id, fixture hash, fork, and format) and `--limit`:

```shell
pnpm tsx ./test/cli.ts --format=state_test --filter=eip7702 --limit=100
```

Add `--trace` to emit EIP-3155 traces per test case, or `--emit-report` to write a pass/fail report file.

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
| Arrow Glacier | ✅ |
| Gray Glacier | ✅ |
| Paris (The Merge) | ✅ |
| Shanghai | ✅ |
| Cancun | ✅ |
| Prague | ✅ |
| Osaka | ✅ |
| Amsterdam (unreleased) | 🚧 In Progress |

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
    code: Bytes.empty,
  }));

  // Create transaction: Alice sends 1 ETH to Bob
  const unsignedTx = LegacyTransaction.make({
    nonce: U256.constant(0n),
    gasPrice: Uint.constant(10n * 10n ** 9n), // 10 gwei
    gas: Uint.constant(21_000n),
    to: bob,
    value: U256.constant(1n * 10n ** 18n), // 1 ETH
    data: Bytes.empty,
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
    prevRandao: Bytes32.zero,
    difficulty: Uint.constant(0n),
    excessBlobGas: U64.constant(0n),
    parentBeaconBlockRoot: Bytes32.zero,
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

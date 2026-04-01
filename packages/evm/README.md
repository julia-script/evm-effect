# @evm-effect/evm

Ethereum Virtual Machine implementation in TypeScript using [Effect](https://effect.website/), aimed at debuggers, tracers, profilers, and tests that need full visibility into execution.

## Installation

```bash
npm add @evm-effect/evm effect @effect/platform @effect/platform-bun
```

Align `effect` and `@effect/platform` versions with your application (this repo’s workspace catalog uses compatible `^3.x` / `^0.9x` ranges).

## Documentation

- **End-to-end example** (simple ETH transfer, fork layers, signing): see the [repository root README](https://github.com/julia-script/evm-effect#usage).
- **Solidity compilation** (Node or Next.js worker): use [`@evm-effect/solc`](https://github.com/julia-script/evm-effect/tree/main/packages/solc) alongside this package when you need to compile contracts.

## Entry points

The main export is the package root:

```ts
import { /* ... */ } from "@evm-effect/evm";
```

Additional subpaths are published for lower-level tooling:

| Subpath | Use |
|--------|-----|
| `@evm-effect/evm` | Public API (interpreter, block processing, state, forks, etc.) |
| `@evm-effect/evm/vm/interpreter` | Interpreter-focused APIs |
| `@evm-effect/evm/vm/runtime` | Runtime helpers |
| `@evm-effect/evm/vm/StorageKey` | Storage key types |

## License

MIT

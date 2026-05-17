---
"@evm-effect/ethereum-types": minor
"@evm-effect/rpc": minor
---

- Restructure schema modules: hand-written codecs live in `@evm-effect/ethereum-types/schemas/base-types.ts`; OpenRPC-generated RPC structs live in `@evm-effect/rpc` (`src/schemas/generated-schemas.ts`).
- Add `EthTypes` namespace on the ethereum-types entrypoint (primitives and base codecs). RPC schemas export from `@evm-effect/rpc`.
- Add hex/string codecs for Ethereum primitives (`Bytes*`, `Address`, `Uint`, `U8`, `U32`, `U64`, `U256`, `Int`) plus `EntriesFromRecord` / `HashMapFromRecord` helpers.
- Add `U32` numeric type and include it in `AnyUint` / `FixedUnsigned` unions.
- Expand `gen-schemas` to generate Effect schemas from [ethereum/execution-apis](https://github.com/ethereum/execution-apis) OpenRPC specs (Biome formatting).
- Bump Effect catalog to `4.0.0-beta.66`.

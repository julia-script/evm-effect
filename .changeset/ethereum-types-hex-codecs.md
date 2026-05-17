---
"@evm-effect/ethereum-types": minor
---

- Restructure schema modules: hand-written codecs live in `schemas/base-types.ts`; OpenRPC-generated structs live in `schemas/generated-schemas.ts` (replaces `schemas/index.ts`).
- Add `EthTypes` namespace on the package entrypoint, aggregating primitives, base codecs, and generated RPC schemas.
- Add hex/string codecs for Ethereum primitives (`Bytes*`, `Address`, `Uint`, `U8`, `U32`, `U64`, `U256`, `Int`) plus `EntriesFromRecord` / `HashMapFromRecord` helpers.
- Add `U32` numeric type and include it in `AnyUint` / `FixedUnsigned` unions.
- Expand `gen-schemas` to generate Effect schemas from [ethereum/execution-apis](https://github.com/ethereum/execution-apis) OpenRPC specs (Biome formatting).
- Bump Effect catalog to `4.0.0-beta.66`.

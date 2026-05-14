---
"@evm-effect/ethereum-types": patch
---

**Eth hex codecs:** `EthSchema` now includes hex string codecs for fixed-width byte types (`Bytes0` through `Bytes256`), `Address`, and numeric wrappers (`Uint`, `U8`, `U64`, `U256`, `Int`), with explicit `Schema.Codec` types on existing exports. Fixed-width `Bytes*` tagged classes use `Schema.Uint8Array` instead of `instanceOf(Uint8Array)`. Schema tests run under Vitest with `src/schemas/index.test.ts` included again.

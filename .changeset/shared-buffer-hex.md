---
"@evm-effect/shared": patch
"@evm-effect/ethereum-types": patch
"@evm-effect/evm": patch
---

Expose `bufferFromHex` and `bufferToHex` on `@evm-effect/shared/bytes`, and have `ethereum-types` and `evm` import them from there. `@evm-effect/ethereum-types` now depends on `@evm-effect/shared` at runtime. Remove the standalone `fromHex` and `toHex` exports from the ethereum-types package entrypoint in favor of `Bytes.fromHex` and instance `toHex()` methods.

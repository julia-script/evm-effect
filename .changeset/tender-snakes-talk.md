---
"@evm-effect/evm": patch
"@evm-effect/rlp": patch
---

Improve EVM transaction tracing with dedicated transaction processing lifecycle events and make tracer usage safe when an `Evm` service is not present in the effect environment.

Clean up package exports and tooling by stabilizing root exports, removing unused VM latch state, and updating Biome script usage and formatting-related source changes.

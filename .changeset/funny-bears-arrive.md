---
"@evm-effect/crypto": patch
"@evm-effect/ethereum-types": patch
"@evm-effect/evm": patch
"@evm-effect/rlp": patch
"@evm-effect/shared": patch
"@evm-effect/solc": patch
---

Migrate the workspace to Effect 4.x (core APIs, `Schema`, and related Effect modules), not only schema definitions. Touches domain types, RLP, crypto transactions, shared utilities, solc JSON schemas, and the EVM (including tests and examples). Removes obsolete schema helpers and aligns decoding/encoding and fixture schemas with the updated stack.

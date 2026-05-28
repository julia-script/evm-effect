---
"@evm-effect/ethereum-types": patch
"@evm-effect/evm": patch
---

- Add `EvmTypeError.invalidValue` and `EvmTypeError.invalidSize` static factory helpers.
- Fix incorrect `packages/evm/src/` import paths to relative imports across evm internals and state tests.

---
"@evm-effect/evm": minor
"@evm-effect/crypto": minor
"@evm-effect/ethereum-types": minor
"@evm-effect/rlp": patch
"@evm-effect/shared": patch
---

- Add Osaka fork support (EIP-7934 block size limit, EIP-7825 blob gas, EIP-7951 `p256verify` precompile, updated `modexp` implementation).
- Move transaction types, RLP encode/decode, and signing helpers from `@evm-effect/crypto` into `@evm-effect/evm`; export `BlockChain`, `Block`, `Header`, `State`, and transaction APIs from the evm entrypoint.
- Rework block/header/account RLP models with Effect-based encoding and expanded block validation.
- Replace the old Vitest fixture runner with an execution-specs test CLI for state and blockchain tests (BAL fixtures v7.1.1).
- Add ethash and `keccak512` to `@evm-effect/crypto` (transaction exports removed).
- Refine `@evm-effect/ethereum-types` byte helpers (`leftPadBuffer`, singleton `empty` values, `bufferRead`) and numeric/domain types.
- Improve `@evm-effect/rlp` `decodeTo` typing and decoding; adjust `@evm-effect/shared` JSON stringify for tagged values.

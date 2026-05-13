---
"@evm-effect/shared": patch
"@evm-effect/evm": patch
---

`HashMap.getHash` now falls back to `Hash.hash` for unknown key shapes instead of throwing, and `HashMap.equals` compares keys using that same numeric hash path so equality matches `HashMap` bucketing.

The EVM switches deposit-log, account-empty, trie-default, and storage-key checks from `Equal.equals` to `HashMap.equals`. `Account` defines `Hash.symbol` from its encoded form so hashing lines up with trie and map usage. `executeLoop` is named for clearer CPU profiles.

Fixture cache reads use Node `fs` instead of `Bun.file`. `.gitignore` ignores `.tmp-*/`. Adds `packages/evm/test/run.ts` as an indexed fixture test runner entrypoint.

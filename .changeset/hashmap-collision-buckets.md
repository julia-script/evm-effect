---
"@evm-effect/shared": patch
"@evm-effect/evm": patch
"@evm-effect/ethereum-types": patch
---

**HashMap collisions:** buckets now store an array of entries per hash slot so distinct keys that share a numeric hash no longer overwrite each other. Lookups use `Equal.equals` on keys instead of treating equal hash codes as equal keys. `HashMap.getHash` delegates to `Hash.hash` for a single consistent hash path.

`HashSet` and EVM/state helpers align with the stricter map semantics; related bytes and type tweaks ship alongside.

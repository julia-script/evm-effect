---
"@evm-effect/shared": patch
"@evm-effect/evm": patch
---

`HashMap` and `HashSet` no longer rely on Effect’s built-in `Hash` caching, which now uses a `WeakMap` and could not retain hashes for the volume of distinct key objects used in the EVM. Keys that expose `Hash.symbol` still use the same numeric hash function; the result is memoized on the object via a dedicated symbol so lookups stay stable without the WeakMap cache.

`State` exposes trie and transaction-snapshot fields for profiling and inspection. Repository `.gitignore` now ignores `*.heapsnapshot` files.

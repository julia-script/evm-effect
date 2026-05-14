# @evm-effect/shared

## 0.0.8

### Patch Changes

- [`b8770d3`](https://github.com/julia-script/evm-effect/commit/b8770d32742e4d328a92f0840528f476b06a3095) Thanks [@julia-script](https://github.com/julia-script)! - `HashMap.getHash` now falls back to `Hash.hash` for unknown key shapes instead of throwing, and `HashMap.equals` compares keys using that same numeric hash path so equality matches `HashMap` bucketing.

  The EVM switches deposit-log, account-empty, trie-default, and storage-key checks from `Equal.equals` to `HashMap.equals`. `Account` defines `Hash.symbol` from its encoded form so hashing lines up with trie and map usage. `executeLoop` is named for clearer CPU profiles.

  Fixture cache reads use Node `fs` instead of `Bun.file`. `.gitignore` ignores `.tmp-*/`. Adds `packages/evm/test/run.ts` as an indexed fixture test runner entrypoint.

- [#24](https://github.com/julia-script/evm-effect/pull/24) [`8482f85`](https://github.com/julia-script/evm-effect/commit/8482f85d2a06a42fb2c2b1003968dc7ed21ad566) Thanks [@julia-script](https://github.com/julia-script)! - **HashMap collisions:** buckets now store an array of entries per hash slot so distinct keys that share a numeric hash no longer overwrite each other. Lookups use `Equal.equals` on keys instead of treating equal hash codes as equal keys. `HashMap.getHash` delegates to `Hash.hash` for a single consistent hash path.

  `HashSet` and EVM/state helpers align with the stricter map semantics; related bytes and type tweaks ship alongside.

- [`b7aabcc`](https://github.com/julia-script/evm-effect/commit/b7aabcc00bdc32f055e85d8533c5395365d2aa00) Thanks [@julia-script](https://github.com/julia-script)! - `HashMap` and `HashSet` no longer rely on Effect’s built-in `Hash` caching, which now uses a `WeakMap` and could not retain hashes for the volume of distinct key objects used in the EVM. Keys that expose `Hash.symbol` still use the same numeric hash function; the result is memoized on the object via a dedicated symbol so lookups stay stable without the WeakMap cache.

  `State` exposes trie and transaction-snapshot fields for profiling and inspection. Repository `.gitignore` now ignores `*.heapsnapshot` files.

- [`f2e6fc8`](https://github.com/julia-script/evm-effect/commit/f2e6fc81526d4b4475935648a456cccce73ca708) Thanks [@julia-script](https://github.com/julia-script)! - **Tooling:** Migrate the monorepo from Bun to **pnpm**, **Node 22+**, and **Vitest**. GitHub Actions and the release flow use pnpm installs and `pnpm publish -r` with Changesets. Replace `@effect/platform-bun` with `@effect/platform-node` where tests or scripts needed a runtime. Examples use `tsx` instead of `bun run`.

## 0.0.7

### Patch Changes

- [`48cf21f`](https://github.com/julia-script/evm-effect/commit/48cf21fb3ab964a370e103d7eca36879930678b1) Thanks [@julia-script](https://github.com/julia-script)! - Migrate the workspace to Effect 4.x (core APIs, `Schema`, and related Effect modules), not only schema definitions. Touches domain types, RLP, crypto transactions, shared utilities, solc JSON schemas, and the EVM (including tests and examples). Removes obsolete schema helpers and aligns decoding/encoding and fixture schemas with the updated stack.

## 0.0.6

### Patch Changes

- [`d6a4e8f`](https://github.com/julia-script/evm-effect/commit/d6a4e8f8a54cece8ea6d159318c83b9ecd10160c) Thanks [@julia-script](https://github.com/julia-script)! - Export `annotateSafe` from `@evm-effect/shared/annotateSafe` instead of `@evm-effect/shared/traced`, so callers avoid pulling the OpenTelemetry tracing setup. Update the EVM package to use that entry, import `node:crypto` synchronously for requests-hash computation, and use `bufferToHex` from shared in the KZG point-evaluation precompile.

## 0.0.5

### Patch Changes

- [`f6e9a5b`](https://github.com/julia-script/evm-effect/commit/f6e9a5b4ecf17b2c000dcecede02452c933882ae) Thanks [@julia-script](https://github.com/julia-script)! - Fix `stringify` bytes rendering to use `bufferToHex` instead of calling `toHex()` on `Uint8Array`, preventing runtime errors when formatting byte-like values.

## 0.0.4

### Patch Changes

- [`9e4e20f`](https://github.com/julia-script/evm-effect/commit/9e4e20fef1e6a7014211aa8d194b53af9ace94f8) Thanks [@julia-script](https://github.com/julia-script)! - Expose `bufferFromHex` and `bufferToHex` on `@evm-effect/shared/bytes`, and have `ethereum-types` and `evm` import them from there. `@evm-effect/ethereum-types` now depends on `@evm-effect/shared` at runtime. Remove the standalone `fromHex` and `toHex` exports from the ethereum-types package entrypoint in favor of `Bytes.fromHex` and instance `toHex()` methods.

## 0.0.3

### Patch Changes

- [`b908dfd`](https://github.com/julia-script/evm-effect/commit/b908dfd2ad81010b1b320769c4a1919213f7bd7d) Thanks [@julia-script](https://github.com/julia-script)! - Fix dependencies

## 0.0.2

### Patch Changes

- [`bded2dd`](https://github.com/julia-script/evm-effect/commit/bded2dd65ecf9ee823a5767d38ad4465f8c082fb) Thanks [@julia-script](https://github.com/julia-script)! - - **@evm-effect/shared**: publish to npm (remove `private`, add registry metadata, README, `files`). Listed first in [`scripts/publish-bun.mjs`](https://github.com/julia-script/evm-effect/blob/main/scripts/publish-bun.mjs).
  - **@evm-effect/rlp**: move `@evm-effect/shared` from `dependencies` to `devDependencies` (only used in tests); avoids pulling unpublished `shared` when installing packages like `@evm-effect/solc`.
  - **@evm-effect/crypto**, **@evm-effect/solc**, **@evm-effect/evm**: patch release for updated internal dependency ranges.

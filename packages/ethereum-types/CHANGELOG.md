# @evm-effect/ethereum-types

## 0.0.9

### Patch Changes

- [`207d868`](https://github.com/julia-script/evm-effect/commit/207d868ade8d9d751edf9c352996ae2cdb2a89d3) Thanks [@julia-script](https://github.com/julia-script)! - **Eth hex codecs:** `EthSchema` now includes hex string codecs for fixed-width byte types (`Bytes0` through `Bytes256`), `Address`, and numeric wrappers (`Uint`, `U8`, `U64`, `U256`, `Int`), with explicit `Schema.Codec` types on existing exports. Fixed-width `Bytes*` tagged classes use `Schema.Uint8Array` instead of `instanceOf(Uint8Array)`. Schema tests run under Vitest with `src/schemas/index.test.ts` included again.

## 0.0.8

### Patch Changes

- [#24](https://github.com/julia-script/evm-effect/pull/24) [`8482f85`](https://github.com/julia-script/evm-effect/commit/8482f85d2a06a42fb2c2b1003968dc7ed21ad566) Thanks [@julia-script](https://github.com/julia-script)! - **HashMap collisions:** buckets now store an array of entries per hash slot so distinct keys that share a numeric hash no longer overwrite each other. Lookups use `Equal.equals` on keys instead of treating equal hash codes as equal keys. `HashMap.getHash` delegates to `Hash.hash` for a single consistent hash path.

  `HashSet` and EVM/state helpers align with the stricter map semantics; related bytes and type tweaks ship alongside.

- [`f2e6fc8`](https://github.com/julia-script/evm-effect/commit/f2e6fc81526d4b4475935648a456cccce73ca708) Thanks [@julia-script](https://github.com/julia-script)! - **Tooling:** Migrate the monorepo from Bun to **pnpm**, **Node 22+**, and **Vitest**. GitHub Actions and the release flow use pnpm installs and `pnpm publish -r` with Changesets. Replace `@effect/platform-bun` with `@effect/platform-node` where tests or scripts needed a runtime. Examples use `tsx` instead of `bun run`.

- Updated dependencies [[`b8770d3`](https://github.com/julia-script/evm-effect/commit/b8770d32742e4d328a92f0840528f476b06a3095), [`8482f85`](https://github.com/julia-script/evm-effect/commit/8482f85d2a06a42fb2c2b1003968dc7ed21ad566), [`b7aabcc`](https://github.com/julia-script/evm-effect/commit/b7aabcc00bdc32f055e85d8533c5395365d2aa00), [`f2e6fc8`](https://github.com/julia-script/evm-effect/commit/f2e6fc81526d4b4475935648a456cccce73ca708)]:
  - @evm-effect/shared@0.0.8

## 0.0.7

### Patch Changes

- [`48cf21f`](https://github.com/julia-script/evm-effect/commit/48cf21fb3ab964a370e103d7eca36879930678b1) Thanks [@julia-script](https://github.com/julia-script)! - Migrate the workspace to Effect 4.x (core APIs, `Schema`, and related Effect modules), not only schema definitions. Touches domain types, RLP, crypto transactions, shared utilities, solc JSON schemas, and the EVM (including tests and examples). Removes obsolete schema helpers and aligns decoding/encoding and fixture schemas with the updated stack.

- Updated dependencies [[`48cf21f`](https://github.com/julia-script/evm-effect/commit/48cf21fb3ab964a370e103d7eca36879930678b1)]:
  - @evm-effect/shared@0.0.7

## 0.0.6

### Patch Changes

- Updated dependencies [[`d6a4e8f`](https://github.com/julia-script/evm-effect/commit/d6a4e8f8a54cece8ea6d159318c83b9ecd10160c)]:
  - @evm-effect/shared@0.0.6

## 0.0.5

### Patch Changes

- Updated dependencies [[`f6e9a5b`](https://github.com/julia-script/evm-effect/commit/f6e9a5b4ecf17b2c000dcecede02452c933882ae)]:
  - @evm-effect/shared@0.0.5

## 0.0.4

### Patch Changes

- [`9e4e20f`](https://github.com/julia-script/evm-effect/commit/9e4e20fef1e6a7014211aa8d194b53af9ace94f8) Thanks [@julia-script](https://github.com/julia-script)! - Expose `bufferFromHex` and `bufferToHex` on `@evm-effect/shared/bytes`, and have `ethereum-types` and `evm` import them from there. `@evm-effect/ethereum-types` now depends on `@evm-effect/shared` at runtime. Remove the standalone `fromHex` and `toHex` exports from the ethereum-types package entrypoint in favor of `Bytes.fromHex` and instance `toHex()` methods.

- Updated dependencies [[`9e4e20f`](https://github.com/julia-script/evm-effect/commit/9e4e20fef1e6a7014211aa8d194b53af9ace94f8)]:
  - @evm-effect/shared@0.0.4

## 0.0.3

### Patch Changes

- [`fc8463c`](https://github.com/julia-script/evm-effect/commit/fc8463c64c0a34b80569334c9f62c5796936781d) Thanks [@julia-script](https://github.com/julia-script)! - Add manual hex encode/decode fallbacks in `bufferToHex` and `bufferFromHex` when runtime `Uint8Array` helpers are missing. Use a type-only import for `PrecompileFailure` in the interpreter.

## 0.0.2

### Patch Changes

- [`b908dfd`](https://github.com/julia-script/evm-effect/commit/b908dfd2ad81010b1b320769c4a1919213f7bd7d) Thanks [@julia-script](https://github.com/julia-script)! - Fix dependencies

## 0.0.1

### Patch Changes

- **Release tooling and registry metadata**

  - Add npm-oriented `package.json` fields (`repository`, `license`, `files`, `publishConfig`) for published packages.
  - Document `@evm-effect/evm` and `@evm-effect/solc` in root and package READMEs; point repository links to `julia-script/evm-effect`.
  - Configure Changesets for public access and [GitHub](https://github.com/julia-script/evm-effect) changelog notes.
  - **Publish with `bun publish`** via [`scripts/publish-bun.mjs`](https://github.com/julia-script/evm-effect/blob/main/scripts/publish-bun.mjs) so `workspace:` and `catalog:` resolve in published tarballs (avoid raw protocols from `npm publish`).
  - `ci:version` runs `bun update` after `changeset version`; `ci:publish` builds, publishes packages in dependency order, then `changeset tag`.
  - Fix build-time dependency declarations (`@noble/hashes` on ethereum-types, `@effect/platform` on solc).
  - Ship rspack config as `rspack.config.mjs` for Node-based rspack on CI.
  - Remove tests from the publish script; fixture tests stay on the `evm-tests` workflow.

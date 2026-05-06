# @evm-effect/evm

## 0.0.14

### Patch Changes

- Updated dependencies [[`f25068c`](https://github.com/julia-script/evm-effect/commit/f25068cd2a7210010da337bd3fc8a512cfe64c91)]:
  - @evm-effect/solc@0.2.0

## 0.0.13

### Patch Changes

- [`d6a4e8f`](https://github.com/julia-script/evm-effect/commit/d6a4e8f8a54cece8ea6d159318c83b9ecd10160c) Thanks [@julia-script](https://github.com/julia-script)! - Export `annotateSafe` from `@evm-effect/shared/annotateSafe` instead of `@evm-effect/shared/traced`, so callers avoid pulling the OpenTelemetry tracing setup. Update the EVM package to use that entry, import `node:crypto` synchronously for requests-hash computation, and use `bufferToHex` from shared in the KZG point-evaluation precompile.

- Updated dependencies [[`d6a4e8f`](https://github.com/julia-script/evm-effect/commit/d6a4e8f8a54cece8ea6d159318c83b9ecd10160c)]:
  - @evm-effect/shared@0.0.6
  - @evm-effect/crypto@0.2.6
  - @evm-effect/ethereum-types@0.0.6
  - @evm-effect/rlp@0.1.8
  - @evm-effect/solc@0.1.6

## 0.0.12

### Patch Changes

- Updated dependencies [[`f6e9a5b`](https://github.com/julia-script/evm-effect/commit/f6e9a5b4ecf17b2c000dcecede02452c933882ae)]:
  - @evm-effect/shared@0.0.5
  - @evm-effect/crypto@0.2.5
  - @evm-effect/ethereum-types@0.0.5
  - @evm-effect/rlp@0.1.7
  - @evm-effect/solc@0.1.5

## 0.0.11

### Patch Changes

- [`9e4e20f`](https://github.com/julia-script/evm-effect/commit/9e4e20fef1e6a7014211aa8d194b53af9ace94f8) Thanks [@julia-script](https://github.com/julia-script)! - Expose `bufferFromHex` and `bufferToHex` on `@evm-effect/shared/bytes`, and have `ethereum-types` and `evm` import them from there. `@evm-effect/ethereum-types` now depends on `@evm-effect/shared` at runtime. Remove the standalone `fromHex` and `toHex` exports from the ethereum-types package entrypoint in favor of `Bytes.fromHex` and instance `toHex()` methods.

- Updated dependencies [[`9e4e20f`](https://github.com/julia-script/evm-effect/commit/9e4e20fef1e6a7014211aa8d194b53af9ace94f8)]:
  - @evm-effect/shared@0.0.4
  - @evm-effect/ethereum-types@0.0.4
  - @evm-effect/crypto@0.2.4
  - @evm-effect/rlp@0.1.6
  - @evm-effect/solc@0.1.4

## 0.0.10

### Patch Changes

- [`fc8463c`](https://github.com/julia-script/evm-effect/commit/fc8463c64c0a34b80569334c9f62c5796936781d) Thanks [@julia-script](https://github.com/julia-script)! - Add manual hex encode/decode fallbacks in `bufferToHex` and `bufferFromHex` when runtime `Uint8Array` helpers are missing. Use a type-only import for `PrecompileFailure` in the interpreter.

- Updated dependencies [[`fc8463c`](https://github.com/julia-script/evm-effect/commit/fc8463c64c0a34b80569334c9f62c5796936781d)]:
  - @evm-effect/ethereum-types@0.0.3
  - @evm-effect/crypto@0.2.3
  - @evm-effect/rlp@0.1.5
  - @evm-effect/solc@0.1.3

## 0.0.9

### Patch Changes

- [`9e2853a`](https://github.com/julia-script/evm-effect/commit/9e2853a3a9b92c41fdf3319502be0e1ba3698d01) Thanks [@julia-script](https://github.com/julia-script)! - Align alt_bn128 G1 precompiles with go-ethereum: validate affine inputs with the same on-curve rules as `bn256/cloudflare` (infinity as `(0,0)`, no Noble prime-subgroup check), fixing `pointAdd` / `pointAddTrunc` cases that mix cofactor-torsion points. On precompile `Run` failure, exhaust the call frame’s remaining gas like `Call` / `CallCode` after `RunPrecompiledContract`, while still using `PrecompileFailure` for tracing and state rollback.

## 0.0.8

### Patch Changes

- [`209b9f7`](https://github.com/julia-script/evm-effect/commit/209b9f7721b4b6cacb9665fa561cac1eb0cc9a60) Thanks [@julia-script](https://github.com/julia-script)! - Fix alt_bn128 ECADD (0x06) when the sum is the point at infinity: Noble’s `assertValidity()` rejects the identity, which previously surfaced as an exceptional halt and burned the full CALL stipend. The precompile now encodes infinity as 64 zero bytes per EIP-196, matching consensus clients and fixing `pointMulAdd` / `pointMulAdd2` fixture tests.

## 0.0.7

### Patch Changes

- [`a514da6`](https://github.com/julia-script/evm-effect/commit/a514da660549feb8304c122be47b21abacc519de) Thanks [@julia-script](https://github.com/julia-script)! - Replace explicit `package.json` export subpaths with a single `"./*"` pattern so every built module under `dist/` resolves consistently without maintaining a separate entry per path.

## 0.0.6

### Patch Changes

- [`c5ac0de`](https://github.com/julia-script/evm-effect/commit/c5ac0de865d0273e26767ede3a07adf69a15b188) Thanks [@julia-script](https://github.com/julia-script)! - Improve EVM transaction tracing with dedicated transaction processing lifecycle events and make tracer usage safe when an `Evm` service is not present in the effect environment.

  Clean up package exports and tooling by stabilizing root exports, removing unused VM latch state, and updating Biome script usage and formatting-related source changes.

- Updated dependencies [[`c5ac0de`](https://github.com/julia-script/evm-effect/commit/c5ac0de865d0273e26767ede3a07adf69a15b188)]:
  - @evm-effect/rlp@0.1.4
  - @evm-effect/crypto@0.2.2
  - @evm-effect/solc@0.1.2

## 0.0.5

### Patch Changes

- [`20dc44b`](https://github.com/julia-script/evm-effect/commit/20dc44be9dd21261eadbe702213f27d72c098b75) Thanks [@julia-script](https://github.com/julia-script)! - Export `Evm` from the package root entrypoint so consumers can import it directly from `@evm-effect/evm`.

## 0.0.4

### Patch Changes

- [`1c7b2e5`](https://github.com/julia-script/evm-effect/commit/1c7b2e595f97ae25863dd05aee3cdce45045a5e2) Thanks [@julia-script](https://github.com/julia-script)! - Add a `./trace` package export so consumers can import trace APIs from a stable public entrypoint.

## 0.0.3

### Patch Changes

- [`b908dfd`](https://github.com/julia-script/evm-effect/commit/b908dfd2ad81010b1b320769c4a1919213f7bd7d) Thanks [@julia-script](https://github.com/julia-script)! - Fix dependencies

- Updated dependencies [[`b908dfd`](https://github.com/julia-script/evm-effect/commit/b908dfd2ad81010b1b320769c4a1919213f7bd7d)]:
  - @evm-effect/rlp@0.1.3
  - @evm-effect/crypto@0.2.1
  - @evm-effect/ethereum-types@0.0.2
  - @evm-effect/shared@0.0.3
  - @evm-effect/solc@0.1.1

## 0.0.2

### Patch Changes

- [`bded2dd`](https://github.com/julia-script/evm-effect/commit/bded2dd65ecf9ee823a5767d38ad4465f8c082fb) Thanks [@julia-script](https://github.com/julia-script)! - - **@evm-effect/shared**: publish to npm (remove `private`, add registry metadata, README, `files`). Listed first in [`scripts/publish-bun.mjs`](https://github.com/julia-script/evm-effect/blob/main/scripts/publish-bun.mjs).
  - **@evm-effect/rlp**: move `@evm-effect/shared` from `dependencies` to `devDependencies` (only used in tests); avoids pulling unpublished `shared` when installing packages like `@evm-effect/solc`.
  - **@evm-effect/crypto**, **@evm-effect/solc**, **@evm-effect/evm**: patch release for updated internal dependency ranges.
- Updated dependencies [[`544cd6b`](https://github.com/julia-script/evm-effect/commit/544cd6bfbb04e9660d80d2718278d27cfa1618ef), [`bded2dd`](https://github.com/julia-script/evm-effect/commit/bded2dd65ecf9ee823a5767d38ad4465f8c082fb)]:
  - @evm-effect/crypto@0.2.0
  - @evm-effect/solc@0.1.0
  - @evm-effect/shared@0.0.2
  - @evm-effect/rlp@0.1.2
  - @evm-effect/ethereum-types@0.0.1

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

- Updated dependencies:
  - @evm-effect/ethereum-types@0.0.1
  - @evm-effect/rlp@0.1.1
  - @evm-effect/crypto@0.1.1
  - @evm-effect/solc@0.0.1

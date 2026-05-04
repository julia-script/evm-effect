# @evm-effect/ethereum-types

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

# @evm-effect/solc

## 0.2.6

### Patch Changes

- [`f2e6fc8`](https://github.com/julia-script/evm-effect/commit/f2e6fc81526d4b4475935648a456cccce73ca708) Thanks [@julia-script](https://github.com/julia-script)! - **Tooling:** Migrate the monorepo from Bun to **pnpm**, **Node 22+**, and **Vitest**. GitHub Actions and the release flow use pnpm installs and `pnpm publish -r` with Changesets. Replace `@effect/platform-bun` with `@effect/platform-node` where tests or scripts needed a runtime. Examples use `tsx` instead of `bun run`.

- Updated dependencies [[`8482f85`](https://github.com/julia-script/evm-effect/commit/8482f85d2a06a42fb2c2b1003968dc7ed21ad566), [`f2e6fc8`](https://github.com/julia-script/evm-effect/commit/f2e6fc81526d4b4475935648a456cccce73ca708)]:
  - @evm-effect/ethereum-types@0.0.8
  - @evm-effect/crypto@0.2.9

## 0.2.5

### Patch Changes

- Updated dependencies []:
  - @evm-effect/crypto@0.2.8

## 0.2.4

### Patch Changes

- [`48cf21f`](https://github.com/julia-script/evm-effect/commit/48cf21fb3ab964a370e103d7eca36879930678b1) Thanks [@julia-script](https://github.com/julia-script)! - Migrate the workspace to Effect 4.x (core APIs, `Schema`, and related Effect modules), not only schema definitions. Touches domain types, RLP, crypto transactions, shared utilities, solc JSON schemas, and the EVM (including tests and examples). Removes obsolete schema helpers and aligns decoding/encoding and fixture schemas with the updated stack.

- Updated dependencies [[`48cf21f`](https://github.com/julia-script/evm-effect/commit/48cf21fb3ab964a370e103d7eca36879930678b1)]:
  - @evm-effect/crypto@0.2.7
  - @evm-effect/ethereum-types@0.0.7

## 0.2.3

### Patch Changes

- [`c882251`](https://github.com/julia-script/evm-effect/commit/c882251a4fe4bb2e434fc7ca6ebd1efe65307886) Thanks [@julia-script](https://github.com/julia-script)! - Tighten Yul AST schema typing by separating expression and statement nodes and removing fallback catchall variants.

## 0.2.2

### Patch Changes

- [`26f7e33`](https://github.com/julia-script/evm-effect/commit/26f7e33233cb5ba7f1c8096aa47631f553475ae9) Thanks [@julia-script](https://github.com/julia-script)! - Refine Solidity and Yul output schemas: use `YulBlock` for mixed source AST, model contract IR as `YulObjectSchema`, re-export AST modules from `output`, and extend schema tests.

## 0.2.1

### Patch Changes

- [`97feb10`](https://github.com/julia-script/evm-effect/commit/97feb10c6db1cb32422f035b844d474b287f68e3) Thanks [@julia-script](https://github.com/julia-script)! - Allow `sources[].ast` to be either a Solidity `SourceUnit` or a Yul `YulBlock`, add optional `legacyAST` on source output, type `generatedSources[].ast` as Yul asm JSON, export `isSolcSourceUnitAst`, and add tests for generated utility Yul and compiler input modes.

- [`9be85b3`](https://github.com/julia-script/evm-effect/commit/9be85b3a6ad0c2a1ebba2672ddf8cb431e65654a) Thanks [@julia-script](https://github.com/julia-script)! - Add Effect schemas for Yul IR (`irAst` / `irOptimizedAst`) and Solidity `InlineAssembly` AST roots, wire them through compiler output types, and treat a missing `parameters` field on `YulFunctionDefinition` as an empty list so solc IR decodes fully (including statements such as `YulLeave`).

## 0.2.0

### Minor Changes

- [`f25068c`](https://github.com/julia-script/evm-effect/commit/f25068cd2a7210010da337bd3fc8a512cfe64c91) Thanks [@julia-script](https://github.com/julia-script)! - Add Effect schemas for standard compiler JSON AST (`SolcAst` / `AstNodeSchema`) and type `SourceOutput.ast` instead of `unknown`. Include solc-backed tests that decode real compile output.

## 0.1.6

### Patch Changes

- Updated dependencies []:
  - @evm-effect/crypto@0.2.6
  - @evm-effect/ethereum-types@0.0.6

## 0.1.5

### Patch Changes

- Updated dependencies []:
  - @evm-effect/crypto@0.2.5
  - @evm-effect/ethereum-types@0.0.5

## 0.1.4

### Patch Changes

- Updated dependencies [[`9e4e20f`](https://github.com/julia-script/evm-effect/commit/9e4e20fef1e6a7014211aa8d194b53af9ace94f8)]:
  - @evm-effect/ethereum-types@0.0.4
  - @evm-effect/crypto@0.2.4

## 0.1.3

### Patch Changes

- Updated dependencies [[`fc8463c`](https://github.com/julia-script/evm-effect/commit/fc8463c64c0a34b80569334c9f62c5796936781d)]:
  - @evm-effect/ethereum-types@0.0.3
  - @evm-effect/crypto@0.2.3

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @evm-effect/crypto@0.2.2

## 0.1.1

### Patch Changes

- [`b908dfd`](https://github.com/julia-script/evm-effect/commit/b908dfd2ad81010b1b320769c4a1919213f7bd7d) Thanks [@julia-script](https://github.com/julia-script)! - Fix dependencies

- Updated dependencies [[`b908dfd`](https://github.com/julia-script/evm-effect/commit/b908dfd2ad81010b1b320769c4a1919213f7bd7d)]:
  - @evm-effect/crypto@0.2.1
  - @evm-effect/ethereum-types@0.0.2

## 0.1.0

### Minor Changes

- [`544cd6b`](https://github.com/julia-script/evm-effect/commit/544cd6bfbb04e9660d80d2718278d27cfa1618ef) Thanks [@julia-script](https://github.com/julia-script)! - Updates effect library

### Patch Changes

- [`bded2dd`](https://github.com/julia-script/evm-effect/commit/bded2dd65ecf9ee823a5767d38ad4465f8c082fb) Thanks [@julia-script](https://github.com/julia-script)! - - **@evm-effect/shared**: publish to npm (remove `private`, add registry metadata, README, `files`). Listed first in [`scripts/publish-bun.mjs`](https://github.com/julia-script/evm-effect/blob/main/scripts/publish-bun.mjs).
  - **@evm-effect/rlp**: move `@evm-effect/shared` from `dependencies` to `devDependencies` (only used in tests); avoids pulling unpublished `shared` when installing packages like `@evm-effect/solc`.
  - **@evm-effect/crypto**, **@evm-effect/solc**, **@evm-effect/evm**: patch release for updated internal dependency ranges.
- Updated dependencies [[`544cd6b`](https://github.com/julia-script/evm-effect/commit/544cd6bfbb04e9660d80d2718278d27cfa1618ef), [`bded2dd`](https://github.com/julia-script/evm-effect/commit/bded2dd65ecf9ee823a5767d38ad4465f8c082fb)]:
  - @evm-effect/crypto@0.2.0
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
  - @evm-effect/crypto@0.1.1

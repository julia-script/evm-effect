# @evm-effect/crypto

## 0.3.1

### Patch Changes

- Updated dependencies [[`5b7a4dc`](https://github.com/julia-script/evm-effect/commit/5b7a4dcb0e6fb29e6b89752b8007d2af274a6df9)]:
  - @evm-effect/ethereum-types@0.1.1
  - @evm-effect/rlp@0.1.14

## 0.3.0

### Minor Changes

- [#27](https://github.com/julia-script/evm-effect/pull/27) [`e74c16c`](https://github.com/julia-script/evm-effect/commit/e74c16c64c1419d14b39de14ed77d35c4c6c6435) Thanks [@julia-script](https://github.com/julia-script)! - - Add Osaka fork support (EIP-7934 block size limit, EIP-7825 blob gas, EIP-7951 `p256verify` precompile, updated `modexp` implementation).
  - Move transaction types, RLP encode/decode, and signing helpers from `@evm-effect/crypto` into `@evm-effect/evm`; export `BlockChain`, `Block`, `Header`, `State`, and transaction APIs from the evm entrypoint.
  - Rework block/header/account RLP models with Effect-based encoding and expanded block validation.
  - Replace the old Vitest fixture runner with an execution-specs test CLI for state and blockchain tests (BAL fixtures v7.1.1).
  - Add ethash and `keccak512` to `@evm-effect/crypto` (transaction exports removed).
  - Refine `@evm-effect/ethereum-types` byte helpers (`leftPadBuffer`, singleton `empty` values, `bufferRead`) and numeric/domain types.
  - Improve `@evm-effect/rlp` `decodeTo` typing and decoding; adjust `@evm-effect/shared` JSON stringify for tagged values.

### Patch Changes

- Updated dependencies [[`8743399`](https://github.com/julia-script/evm-effect/commit/8743399b3708fad1f68c8e1f422242d66a8c1e2a), [`e74c16c`](https://github.com/julia-script/evm-effect/commit/e74c16c64c1419d14b39de14ed77d35c4c6c6435)]:
  - @evm-effect/ethereum-types@0.1.0
  - @evm-effect/rlp@0.1.13

## 0.2.10

### Patch Changes

- Updated dependencies [[`207d868`](https://github.com/julia-script/evm-effect/commit/207d868ade8d9d751edf9c352996ae2cdb2a89d3)]:
  - @evm-effect/ethereum-types@0.0.9
  - @evm-effect/rlp@0.1.12

## 0.2.9

### Patch Changes

- [`f2e6fc8`](https://github.com/julia-script/evm-effect/commit/f2e6fc81526d4b4475935648a456cccce73ca708) Thanks [@julia-script](https://github.com/julia-script)! - **Tooling:** Migrate the monorepo from Bun to **pnpm**, **Node 22+**, and **Vitest**. GitHub Actions and the release flow use pnpm installs and `pnpm publish -r` with Changesets. Replace `@effect/platform-bun` with `@effect/platform-node` where tests or scripts needed a runtime. Examples use `tsx` instead of `bun run`.

- Updated dependencies [[`8482f85`](https://github.com/julia-script/evm-effect/commit/8482f85d2a06a42fb2c2b1003968dc7ed21ad566), [`f2e6fc8`](https://github.com/julia-script/evm-effect/commit/f2e6fc81526d4b4475935648a456cccce73ca708)]:
  - @evm-effect/ethereum-types@0.0.8
  - @evm-effect/rlp@0.1.11

## 0.2.8

### Patch Changes

- Updated dependencies [[`0e0778c`](https://github.com/julia-script/evm-effect/commit/0e0778c8c4e183bc77511165ff619c1522b9ffae)]:
  - @evm-effect/rlp@0.1.10

## 0.2.7

### Patch Changes

- [`48cf21f`](https://github.com/julia-script/evm-effect/commit/48cf21fb3ab964a370e103d7eca36879930678b1) Thanks [@julia-script](https://github.com/julia-script)! - Migrate the workspace to Effect 4.x (core APIs, `Schema`, and related Effect modules), not only schema definitions. Touches domain types, RLP, crypto transactions, shared utilities, solc JSON schemas, and the EVM (including tests and examples). Removes obsolete schema helpers and aligns decoding/encoding and fixture schemas with the updated stack.

- Updated dependencies [[`48cf21f`](https://github.com/julia-script/evm-effect/commit/48cf21fb3ab964a370e103d7eca36879930678b1)]:
  - @evm-effect/ethereum-types@0.0.7
  - @evm-effect/rlp@0.1.9

## 0.2.6

### Patch Changes

- Updated dependencies []:
  - @evm-effect/ethereum-types@0.0.6
  - @evm-effect/rlp@0.1.8

## 0.2.5

### Patch Changes

- Updated dependencies []:
  - @evm-effect/ethereum-types@0.0.5
  - @evm-effect/rlp@0.1.7

## 0.2.4

### Patch Changes

- Updated dependencies [[`9e4e20f`](https://github.com/julia-script/evm-effect/commit/9e4e20fef1e6a7014211aa8d194b53af9ace94f8)]:
  - @evm-effect/ethereum-types@0.0.4
  - @evm-effect/rlp@0.1.6

## 0.2.3

### Patch Changes

- Updated dependencies [[`fc8463c`](https://github.com/julia-script/evm-effect/commit/fc8463c64c0a34b80569334c9f62c5796936781d)]:
  - @evm-effect/ethereum-types@0.0.3
  - @evm-effect/rlp@0.1.5

## 0.2.2

### Patch Changes

- Updated dependencies [[`c5ac0de`](https://github.com/julia-script/evm-effect/commit/c5ac0de865d0273e26767ede3a07adf69a15b188)]:
  - @evm-effect/rlp@0.1.4

## 0.2.1

### Patch Changes

- [`b908dfd`](https://github.com/julia-script/evm-effect/commit/b908dfd2ad81010b1b320769c4a1919213f7bd7d) Thanks [@julia-script](https://github.com/julia-script)! - Fix dependencies

- Updated dependencies [[`b908dfd`](https://github.com/julia-script/evm-effect/commit/b908dfd2ad81010b1b320769c4a1919213f7bd7d)]:
  - @evm-effect/rlp@0.1.3
  - @evm-effect/ethereum-types@0.0.2

## 0.2.0

### Minor Changes

- [`544cd6b`](https://github.com/julia-script/evm-effect/commit/544cd6bfbb04e9660d80d2718278d27cfa1618ef) Thanks [@julia-script](https://github.com/julia-script)! - Updates effect library

### Patch Changes

- [`bded2dd`](https://github.com/julia-script/evm-effect/commit/bded2dd65ecf9ee823a5767d38ad4465f8c082fb) Thanks [@julia-script](https://github.com/julia-script)! - - **@evm-effect/shared**: publish to npm (remove `private`, add registry metadata, README, `files`). Listed first in [`scripts/publish-bun.mjs`](https://github.com/julia-script/evm-effect/blob/main/scripts/publish-bun.mjs).
  - **@evm-effect/rlp**: move `@evm-effect/shared` from `dependencies` to `devDependencies` (only used in tests); avoids pulling unpublished `shared` when installing packages like `@evm-effect/solc`.
  - **@evm-effect/crypto**, **@evm-effect/solc**, **@evm-effect/evm**: patch release for updated internal dependency ranges.
- Updated dependencies [[`bded2dd`](https://github.com/julia-script/evm-effect/commit/bded2dd65ecf9ee823a5767d38ad4465f8c082fb)]:
  - @evm-effect/rlp@0.1.2
  - @evm-effect/ethereum-types@0.0.1

## 0.1.1

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

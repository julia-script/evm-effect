# @evm-effect/ethereum-types

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

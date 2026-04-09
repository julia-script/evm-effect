---
"@evm-effect/shared": patch
"@evm-effect/rlp": patch
"@evm-effect/crypto": patch
"@evm-effect/solc": patch
"@evm-effect/evm": patch
---

- **@evm-effect/shared**: publish to npm (remove `private`, add registry metadata, README, `files`). Listed first in [`scripts/publish-bun.mjs`](https://github.com/julia-script/evm-effect/blob/main/scripts/publish-bun.mjs).
- **@evm-effect/rlp**: move `@evm-effect/shared` from `dependencies` to `devDependencies` (only used in tests); avoids pulling unpublished `shared` when installing packages like `@evm-effect/solc`.
- **@evm-effect/crypto**, **@evm-effect/solc**, **@evm-effect/evm**: patch release for updated internal dependency ranges.

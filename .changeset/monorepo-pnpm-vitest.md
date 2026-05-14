---
"@evm-effect/shared": patch
"@evm-effect/ethereum-types": patch
"@evm-effect/rlp": patch
"@evm-effect/crypto": patch
"@evm-effect/solc": patch
"@evm-effect/evm": patch
---

**Tooling:** Migrate the monorepo from Bun to **pnpm**, **Node 22+**, and **Vitest**. GitHub Actions and the release flow use pnpm installs and `pnpm publish -r` with Changesets. Replace `@effect/platform-bun` with `@effect/platform-node` where tests or scripts needed a runtime. Examples use `tsx` instead of `bun run`.

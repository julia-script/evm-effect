---
"@evm-effect/evm": patch
---

Replace explicit `package.json` export subpaths with a single `"./*"` pattern so every built module under `dist/` resolves consistently without maintaining a separate entry per path.

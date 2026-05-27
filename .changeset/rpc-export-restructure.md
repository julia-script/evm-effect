---
"@evm-effect/rpc": minor
---

- Restructure package exports: the main entry default-exports component schemas; the `/schemas` entry exports `{ Components, Rpc }` namespaces instead of flat re-exports.
- Clean up generated RPC/schema import formatting.
- Switch monorepo TypeScript config to `module: esnext` and `moduleResolution: bundler` for improved bundler compatibility.

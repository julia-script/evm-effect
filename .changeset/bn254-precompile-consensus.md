---
"@evm-effect/evm": patch
---

Align alt_bn128 G1 precompiles with go-ethereum: validate affine inputs with the same on-curve rules as `bn256/cloudflare` (infinity as `(0,0)`, no Noble prime-subgroup check), fixing `pointAdd` / `pointAddTrunc` cases that mix cofactor-torsion points. On precompile `Run` failure, exhaust the call frame’s remaining gas like `Call` / `CallCode` after `RunPrecompiledContract`, while still using `PrecompileFailure` for tracing and state rollback.

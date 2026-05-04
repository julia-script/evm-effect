---
"@evm-effect/shared": patch
"@evm-effect/evm": patch
---

Export `annotateSafe` from `@evm-effect/shared/annotateSafe` instead of `@evm-effect/shared/traced`, so callers avoid pulling the OpenTelemetry tracing setup. Update the EVM package to use that entry, import `node:crypto` synchronously for requests-hash computation, and use `bufferToHex` from shared in the KZG point-evaluation precompile.

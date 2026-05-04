---
"@evm-effect/ethereum-types": patch
"@evm-effect/evm": patch
---

Add manual hex encode/decode fallbacks in `bufferToHex` and `bufferFromHex` when runtime `Uint8Array` helpers are missing. Use a type-only import for `PrecompileFailure` in the interpreter.

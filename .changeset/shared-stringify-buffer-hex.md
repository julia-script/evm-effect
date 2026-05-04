---
"@evm-effect/shared": patch
---

Fix `stringify` bytes rendering to use `bufferToHex` instead of calling `toHex()` on `Uint8Array`, preventing runtime errors when formatting byte-like values.

---
"@evm-effect/evm": patch
---

Fix alt_bn128 ECADD (0x06) when the sum is the point at infinity: Noble’s `assertValidity()` rejects the identity, which previously surfaced as an exceptional halt and burned the full CALL stipend. The precompile now encodes infinity as 64 zero bytes per EIP-196, matching consensus clients and fixing `pointMulAdd` / `pointMulAdd2` fixture tests.

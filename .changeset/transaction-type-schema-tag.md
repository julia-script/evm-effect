---
"@evm-effect/rpc": patch
---

- Generate required transaction `type` fields with `Schema.tag` from OpenRPC patterns instead of bigint refinements.
- Emit struct `type` properties first in generated schemas for consistent field ordering.

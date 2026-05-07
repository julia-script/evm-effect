---
"@evm-effect/evm": patch
---

Fix Effect-based account lookup call sites in transaction and VM execution paths so account existence, liveness, and CREATE collision checks use yielded booleans and preserve expected state transitions.

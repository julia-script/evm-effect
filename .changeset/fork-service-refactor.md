---
"@evm-effect/evm": patch
---

Extract the fork `Context.Service` into `ForkService.ts` and re-export fork layers from `Fork.ts`, updating VM, transaction, and block code to use the new module boundary. `InvalidOpcode` errors now describe the opcode in hexadecimal so the exceptions module no longer depends on opcode metadata.

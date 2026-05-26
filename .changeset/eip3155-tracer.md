---
"@evm-effect/evm": minor
---

- Add EIP-3155 structured trace emission (`Eip3155Tracer`, opcode/summary schemas, `jsonlFileEmit`).
- Refactor `EvmTracer` events (`OpStart`/`OpEnd`, `GasAndRefund`, precompile handling) for opcode-level tracing.
- Wire execution-spec test CLI `--trace` to write JSONL traces and fixture `input.json` under `test/traces/`.

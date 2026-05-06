---
"@evm-effect/solc": patch
---

Allow `sources[].ast` to be either a Solidity `SourceUnit` or a Yul `YulBlock`, add optional `legacyAST` on source output, type `generatedSources[].ast` as Yul asm JSON, export `isSolcSourceUnitAst`, and add tests for generated utility Yul and compiler input modes.

---
"@evm-effect/solc": patch
---

Add Effect schemas for Yul IR (`irAst` / `irOptimizedAst`) and Solidity `InlineAssembly` AST roots, wire them through compiler output types, and treat a missing `parameters` field on `YulFunctionDefinition` as an empty list so solc IR decodes fully (including statements such as `YulLeave`).

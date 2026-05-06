import { describe, expect, test } from "bun:test";
import solc from "solc";
import { decodeOutput } from "./helpers.js";
import type { CompilerOutput } from "./output.js";

type YulObjectDecoded = {
  readonly nodeType: "YulObject";
  readonly code: {
    readonly nodeType: "YulCode";
    readonly block: { readonly nodeType: string };
  };
};

/** Walk JSON-like trees and collect every `nodeType` string (Yul + any nested JSON). */
function collectYulNodeTypes(value: unknown): Set<string> {
  const out = new Set<string>();
  const visit = (v: unknown) => {
    if (v === null || v === undefined) {
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) {
        visit(x);
      }
      return;
    }
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      const nt = o.nodeType;
      if (typeof nt === "string") {
        out.add(nt);
      }
      for (const x of Object.values(o)) {
        visit(x);
      }
    }
  };
  visit(value);
  return out;
}

function compileWithIrAst(sources: Record<string, string>): CompilerOutput {
  const input = {
    language: "Solidity",
    sources: Object.fromEntries(
      Object.entries(sources).map(([k, content]) => [k, { content }]),
    ),
    settings: {
      outputSelection: {
        "*": {
          "*": ["irAst", "irOptimizedAst", "abi", "ast"],
          "": ["ast"],
        },
      },
    },
  };
  return decodeOutput(JSON.parse(solc.compile(JSON.stringify(input))));
}

function findInlineAssemblyAst(root: unknown): unknown {
  const walk = (n: unknown): unknown => {
    if (n === null || n === undefined) {
      return undefined;
    }
    if (Array.isArray(n)) {
      for (const x of n) {
        const r = walk(x);
        if (r !== undefined) {
          return r;
        }
      }
      return undefined;
    }
    if (typeof n === "object") {
      const o = n as Record<string, unknown>;
      if (o.nodeType === "InlineAssembly" && "AST" in o) {
        return o.AST;
      }
      for (const x of Object.values(o)) {
        const r = walk(x);
        if (r !== undefined) {
          return r;
        }
      }
    }
    return undefined;
  };
  return walk(root);
}

describe("YulIrAst / ContractOutput irAst", () => {
  test("decodes irAst and irOptimizedAst as YulObject from solc", () => {
    const out = compileWithIrAst({
      "C.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract C {
    function f() external pure {
        assembly { pop(calldataload(0)) }
    }
}
`,
    });
    const c = out.contracts?.["C.sol"]?.C;
    const ir = c?.irAst;
    expect(ir && "nodeType" in ir && ir.nodeType).toBe("YulObject");
    if (ir && "nodeType" in ir && ir.nodeType === "YulObject") {
      const obj = ir as YulObjectDecoded;
      expect(obj.code.nodeType).toBe("YulCode");
      expect(obj.code.block.nodeType).toBe("YulBlock");
    }
    const iro = c?.irOptimizedAst;
    expect(iro && "nodeType" in iro && iro.nodeType).toBe("YulObject");
  });

  test("irAst from storage + abi codegen contains broad Yul node kinds", () => {
    const out = compileWithIrAst({
      "Store.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Store {
    uint256 public x;
    function set(uint256 a, uint256 b) external {
        x = a + b;
    }
}
`,
    });
    const ir = out.contracts?.["Store.sol"]?.Store?.irAst;
    expect(ir && "nodeType" in ir && ir.nodeType).toBe("YulObject");
    const kinds = collectYulNodeTypes(ir);
    for (const expected of [
      "YulObject",
      "YulCode",
      "YulBlock",
      "YulData",
      "YulFunctionDefinition",
      "YulVariableDeclaration",
      "YulAssignment",
      "YulExpressionStatement",
      "YulIf",
      "YulSwitch",
      "YulCase",
      "YulFunctionCall",
      "YulIdentifier",
      "YulLiteral",
      "YulTypedName",
    ] as const) {
      expect(kinds.has(expected)).toBe(true);
    }
  });

  test("irAst for external return uses YulLeave in generated IR", () => {
    const out = compileWithIrAst({
      "Ret.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Ret {
    function f() external pure returns (uint256) {
        return 1;
    }
}
`,
    });
    const ir = out.contracts?.["Ret.sol"]?.Ret?.irAst;
    expect(collectYulNodeTypes(ir).has("YulLeave")).toBe(true);
  });

  test("irAst and irOptimizedAst both decode and expose overlapping Yul shapes", () => {
    const out = compileWithIrAst({
      "M.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract M {
    mapping(address => uint256) m;
    function t(address k, uint256 v) external {
        m[k] = v;
    }
}
`,
    });
    const c = out.contracts?.["M.sol"]?.M;
    const a = collectYulNodeTypes(c?.irAst);
    const b = collectYulNodeTypes(c?.irOptimizedAst);
    expect(a.has("YulObject")).toBe(true);
    expect(b.has("YulObject")).toBe(true);
    expect([...a].filter((k) => k.startsWith("Yul")).length).toBeGreaterThan(8);
    expect([...b].filter((k) => k.startsWith("Yul")).length).toBeGreaterThan(8);
  });

  test("decodes InlineAssembly.AST as YulBlock on sources AST", () => {
    const out = compileWithIrAst({
      "C.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract C {
    function f() external pure {
        assembly { pop(calldataload(0)) }
    }
}
`,
    });
    const ast = out.sources?.["C.sol"]?.ast;
    const contract = ast?.nodes?.find(
      (n) => n.nodeType === "ContractDefinition" && n.name === "C",
    );
    const fn = contract?.nodes?.find(
      (n) => n.nodeType === "FunctionDefinition" && n.name === "f",
    );
    const body = fn?.body;
    expect(body?.nodeType).toBe("Block");
    const asmStmt = body?.statements?.find(
      (s) => s.nodeType === "InlineAssembly",
    );
    expect(asmStmt?.nodeType).toBe("InlineAssembly");
    if (asmStmt?.nodeType === "InlineAssembly" && asmStmt.AST) {
      expect(asmStmt.AST.nodeType).toBe("YulBlock");
      expect(Array.isArray(asmStmt.AST.statements)).toBe(true);
    }
  });

  test("inline assembly: for-loop, switch, case, default, and variable declarations decode", () => {
    const out = compileWithIrAst({
      "Loop.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Loop {
    function f() external pure {
        assembly {
            let x := 1
            for { } lt(x, 3) { x := add(x, 1) }
            {
                x := mul(x, 2)
            }
            switch x
            case 1 { x := 5 }
            default { x := 7 }
        }
    }
}
`,
    });
    const ast = findInlineAssemblyAst(out.sources?.["Loop.sol"]?.ast);
    expect(ast && typeof ast === "object" && (ast as { nodeType?: string }).nodeType).toBe(
      "YulBlock",
    );
    const kinds = collectYulNodeTypes(ast);
    for (const expected of [
      "YulForLoop",
      "YulSwitch",
      "YulCase",
      "YulVariableDeclaration",
      "YulAssignment",
      "YulFunctionCall",
      "YulIdentifier",
      "YulLiteral",
      "YulTypedName",
    ] as const) {
      expect(kinds.has(expected)).toBe(true);
    }
  });

  test("inline assembly: break inside for-loop decodes as YulBreak", () => {
    const out = compileWithIrAst({
      "Br.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Br {
    function f() external pure {
        assembly {
            for { let i := 0 } lt(i, 1) { i := add(i, 1) } { break }
        }
    }
}
`,
    });
    const ast = findInlineAssemblyAst(out.sources?.["Br.sol"]?.ast);
    expect(collectYulNodeTypes(ast).has("YulBreak")).toBe(true);
    expect(collectYulNodeTypes(ast).has("YulForLoop")).toBe(true);
  });

  test("inline assembly: continue inside for-loop decodes as YulContinue", () => {
    const out = compileWithIrAst({
      "Cont.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Cont {
    function f() external pure {
        assembly {
            for { let i := 0 } lt(i, 2) { i := add(i, 1) } { continue }
        }
    }
}
`,
    });
    const ast = findInlineAssemblyAst(out.sources?.["Cont.sol"]?.ast);
    expect(collectYulNodeTypes(ast).has("YulContinue")).toBe(true);
  });
});

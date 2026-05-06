import { describe, expect, test } from "bun:test";
import solc from "solc";
import { decodeOutput } from "./helpers.js";
import type { CompilerOutput } from "./output.js";

const astOutputSelection = {
  "*": {
    "*": ["ast"],
    "": ["ast"],
  },
} as const;

function compileSolidity(sources: Record<string, string>): CompilerOutput {
  const input = {
    language: "Solidity",
    sources: Object.fromEntries(
      Object.entries(sources).map(([k, content]) => [k, { content }]),
    ),
    settings: {
      outputSelection: astOutputSelection,
    },
  };
  const raw = solc.compile(JSON.stringify(input));
  return decodeOutput(JSON.parse(raw));
}

describe("SolcAst / SourceOutput.ast", () => {
  test("decodes Counter-style contract AST from solc", () => {
    const out = compileSolidity({
      "Counter.sol": `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
contract Counter {
    uint256 public count;
    function get() public view returns (uint256) { return count; }
    function inc() public { count += 1; }
    function dec() public { count -= 1; }
}
`,
    });
    const ast = out.sources?.["Counter.sol"]?.ast;
    expect(ast?.nodeType).toBe("SourceUnit");
    expect(ast?.license).toBe("MIT");
    const contract = ast?.nodes?.find(
      (n) => n.nodeType === "ContractDefinition" && n.name === "Counter",
    );
    expect(contract?.nodeType).toBe("ContractDefinition");
    const fn = contract?.nodes?.filter(
      (n) => n.nodeType === "FunctionDefinition",
    );
    expect(fn?.length).toBe(3);
  });

  test("decodes declarations and type nodes", () => {
    const out = compileSolidity({
      "Decl.sol": `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Symbol as Alias} from "./Lib.sol";
using L for uint;
contract C {
    struct Point { uint x; }
    enum Side { L, R }
    type Wrapped is uint256;
    event Ev(Point p);
    error Er(Side s);
    Wrapped constant w = Wrapped.wrap(1);
}
library L {
    function add(uint a, uint b) internal pure returns (uint) { return a + b; }
}
`,
      "Lib.sol": `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Symbol {}
`,
    });
    const ast = out.sources?.["Decl.sol"]?.ast;
    expect(ast?.nodeType).toBe("SourceUnit");
    const contract = ast?.nodes?.find(
      (n) => n.nodeType === "ContractDefinition" && n.name === "C",
    );
    expect(contract?.nodeType).toBe("ContractDefinition");
    const kinds = new Set(contract?.nodes?.map((n) => n.nodeType));
    expect(kinds.has("StructDefinition")).toBe(true);
    expect(kinds.has("EnumDefinition")).toBe(true);
    expect(kinds.has("UserDefinedValueTypeDefinition")).toBe(true);
    expect(kinds.has("EventDefinition")).toBe(true);
    expect(kinds.has("ErrorDefinition")).toBe(true);
    expect(ast?.nodes?.some((n) => n.nodeType === "ImportDirective")).toBe(
      true,
    );
    expect(ast?.nodes?.some((n) => n.nodeType === "UsingForDirective")).toBe(
      true,
    );
  });

  test("decodes statements and expression nodes", () => {
    const out = compileSolidity({
      "Stmt.sol": `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
interface I { function ext() external; }
contract C {
    function f(I i) public payable {
        unchecked { uint x = 0; x++; }
        for (uint j = 0; j < 1; j++) { break; continue; }
        while (false) {}
        do { } while (false);
        if (true) { } else { }
        (uint a, uint b) = (1, 2);
        uint c = true ? 1 : 2;
        block.number;
        try i.ext() { } catch (bytes memory) { } catch Error(string memory) { }
        emit Ev();
        revert Er();
        assembly { }
    }
    event Ev();
    error Er();
}
`,
    });
    const ast = out.sources?.["Stmt.sol"]?.ast;
    const contract = ast?.nodes?.find(
      (n) => n.nodeType === "ContractDefinition" && n.name === "C",
    );
    const fn = contract?.nodes?.find(
      (n) => n.nodeType === "FunctionDefinition" && n.name === "f",
    );
    expect(fn?.nodeType).toBe("FunctionDefinition");
    const body = fn?.body;
    expect(body?.nodeType).toBe("Block");
    const kinds = new Set(body?.statements?.map((s) => s.nodeType));
    expect(kinds.has("UncheckedBlock")).toBe(true);
    expect(kinds.has("ForStatement")).toBe(true);
    expect(kinds.has("WhileStatement")).toBe(true);
    expect(kinds.has("DoWhileStatement")).toBe(true);
    expect(kinds.has("IfStatement")).toBe(true);
    expect(kinds.has("VariableDeclarationStatement")).toBe(true);
    expect(kinds.has("ExpressionStatement")).toBe(true);
    expect(kinds.has("TryStatement")).toBe(true);
    expect(kinds.has("EmitStatement")).toBe(true);
    expect(kinds.has("RevertStatement")).toBe(true);
    expect(kinds.has("InlineAssembly")).toBe(true);
  });
});

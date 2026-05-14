import { Schema } from "effect";
import solc from "solc";
import { describe, expect, test } from "vitest";
import { CompilerInput } from "./input.js";
import { CompilerOutput } from "./output.js";

const decodeOutput = Schema.decodeUnknownSync(CompilerOutput);
const decodeInput = Schema.decodeUnknownSync(CompilerInput);

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

function compileCounterWithDeployedBytecode(): CompilerOutput {
  const input = {
    language: "Solidity" as const,
    sources: {
      "Counter.sol": {
        content: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Counter {
    uint256 public count;
    function get() public view returns (uint256) {
        return count;
    }
    function inc() public {
        count += 1;
    }
    function dec() public {
        count -= 1;
    }
}
`,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.deployedBytecode", "ast"],
          "": ["ast"],
        },
      },
    },
  };
  return decodeOutput(JSON.parse(solc.compile(JSON.stringify(input))));
}

describe("CompilerOutput mixed Solidity + generated Yul", () => {
  test("decodeOutput accepts deployedBytecode.generatedSources with YulBlock ast", () => {
    const out = compileCounterWithDeployedBytecode();
    const gs =
      out.contracts?.["Counter.sol"]?.Counter?.evm?.deployedBytecode
        ?.generatedSources;
    expect(gs?.length).toBeGreaterThan(0);
    const util = gs?.find(
      (g) => g.name === "#utility.yul" && g.language === "Yul",
    );
    expect(util).toBeDefined();
    expect(util?.ast).toBeDefined();
    if (util === undefined || util.ast === undefined) {
      throw new Error("expected #utility.yul with ast");
    }
    const yulAst = util.ast;
    expect(yulAst.nodeType).toBe("YulBlock");
    const kinds = collectYulNodeTypes(yulAst);
    for (const expected of [
      "YulFunctionDefinition",
      "YulIf",
      "YulAssignment",
    ] as const) {
      expect(kinds.has(expected)).toBe(true);
    }
  });

  test("sources Counter.sol ast remains SourceUnit", () => {
    const out = compileCounterWithDeployedBytecode();
    expect(out.sources?.["Counter.sol"]?.ast?.nodeType).toBe("SourceUnit");
  });

  test("standard JSON does not mix Solidity and Yul sources in one Solidity compile", () => {
    const input: CompilerInput = {
      language: "Solidity",
      sources: {
        "C.sol": {
          content:
            "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\ncontract C { uint256 x; }",
        },
        "extra.yul": { content: "{ function f() {} }" },
      },
      settings: { outputSelection: { "*": { "*": ["abi"] } } },
    };
    expect(() => decodeInput(input)).not.toThrow();
    const raw = solc.compile(JSON.stringify(input));
    const out = JSON.parse(raw) as { errors?: readonly { severity: string }[] };
    const hasError = out.errors?.some((e) => e.severity === "error") ?? false;
    expect(hasError).toBe(true);
    expect(decodeInput(input)).toEqual(input);
  });

  test("language Yul input is separate compile; output still decodes as CompilerOutput", () => {
    const yul = `object "O" {
  code {
    function main() -> ret {
      ret := 0
    }
  }
}`;
    const input: CompilerInput = {
      language: "Yul",
      sources: { "O.yul": { content: yul } },
      settings: {
        outputSelection: { "*": { "*": ["evm.bytecode"] } },
      },
    };
    expect(() => decodeInput(input)).not.toThrow();
    const out = decodeOutput(JSON.parse(solc.compile(JSON.stringify(input))));
    expect(out.contracts?.["O.yul"]?.O?.evm?.bytecode?.object).toBeDefined();
  });
});

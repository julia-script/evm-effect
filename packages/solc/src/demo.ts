import { Effect } from "effect";
import { CompilerOutput, Contract, Solc } from "./index.js";

var output = Solc.compile({
  language: "Solidity",
  sources: {
    "test.sol": {
      content: /*solidity*/ `
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

contract Counter {
    uint public count;

    // Function to get the current count
    function get() public view returns (uint) {
        return count;
    }

    // Function to increment count by 1
    function inc() public {
        count += 1;
    }

    // Function to decrement count by 1
    function dec() public {
        count -= 1;
    }
}
      `,
    },
    "test2.sol": {
      content: /*solidity*/ `
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

contract Counter2 {
    uint public count;
}
      `,
    },
  },

  settings: {
    outputSelection: {
      "*": {
        "*": ["*"],
      },
    },
  },
});
const program = Effect.gen(function* () {
  const result = yield* output;
  console.log("output", output);

  const contract = yield* CompilerOutput.getContract(
    result,
    "test2.sol",
    "Counter2",
  );
  const bytes = yield* Contract.getBytes(contract);
  yield* Effect.log(bytes);
});
Effect.runPromise(program);

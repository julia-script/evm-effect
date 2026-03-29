import { FetchHttpClient } from "@effect/platform";
import { Console, Effect } from "effect";
import { Solc } from "./index.js";
import { SolcNodeLayer } from "./node.js";

const program = Effect.gen(function* () {
  const solc = yield* Solc;
  var output = yield* solc.compile({
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
  yield* Console.log(output);
}).pipe(Effect.provide([SolcNodeLayer, FetchHttpClient.layer]));
Effect.runPromise(program);

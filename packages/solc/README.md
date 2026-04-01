# @evm-effect/solc

Effect-TS service for compiling Solidity using the standard [Solidity compiler JSON interface](https://docs.soliditylang.org/en/latest/using-the-compiler.html#compiler-input-and-output-json-description). The same `Solc` tag is provided in two ways: on **Node** via the official [`solc`](https://www.npmjs.com/package/solc) package, and in the **browser / Next.js** via a prebundled worker and a small App Router API.

## Which implementation should I use?

| Use case | Import | What it does |
| -------- | ------ | ------------ |
| **Node**, scripts, servers | [`@evm-effect/solc/node`](#node) | Uses [`solc`](https://www.npmjs.com/package/solc) directly (`compile`, `loadRemoteVersion`). No worker bundle or Next route. |
| **Browser / Next.js**, client-side compile | [`@evm-effect/solc/next`](#nextjs-app-router) | your app serves `worker.js` and compiler binaries through `nextWorkerApi`. Use when the compiler must run in a Worker on the client. |

## Installation

```bash
npm add @evm-effect/solc effect @effect/platform
```

The examples below use [`FetchHttpClient.layer`](https://effect.website/docs/platform/introduction/) from `@effect/platform` to satisfy the `HttpClient` requirement of `Solc`. Align `effect` and `@effect/platform` versions with your app (this repo’s catalog uses compatible `^0.9x` / `^3.x` ranges).

## `Solc.compile`

The `Solc` service is a `Context.Tag` whose `compile` method takes the standard JSON `CompilerInput` and an optional second argument for the compiler build:

```ts
readonly compile: (
  input: CompilerInput,
  options?: {
    solidityVersion?: string;
  },
) => Effect.Effect<
  CompilerOutput.CompilerOutput,
  SolcWorkerError,
  HttpClient.HttpClient
>;
```

Pass `solidityVersion` when you need a specific release (for example `"latest"` or a version from the [binary list](https://binaries.soliditylang.org/bin/list.json)).

```ts
yield* solc.compile(compilerInput, { solidityVersion: "0.8.26" });
```

## Next.js (App Router)

### API route

Add a catch-all route so the package can serve the bundled worker and proxy compiler builds from [`binaries.soliditylang.org`](https://binaries.soliditylang.org/bin/list.json).

Create `src/app/api/solc/[...params]/route.ts`

```ts
export { nextWorkerApi as GET } from "@evm-effect/solc/next";
```

This handler responds to:

- **`worker.js`** — prebundled worker script (module Worker entry).
- **`bin/{version}`** — compiler build for that version, adapted so the worker can `import()` it.

### Client usage

Import the preconfigured **`SolcNextLayer`** to use it with the default options. 

If your `nextWorkerApi` route is not at `app/api/solc/...`, pass **`const SolcNextLayer = setupSolcNextLayer({ workerApiUrl: "custom/path" })`** instead.

```ts
import { FetchHttpClient } from "@effect/platform";
import { Effect } from "effect";
import { Solc } from "@evm-effect/solc";
import { SolcNextLayer } from "@evm-effect/solc/next";

const program = Effect.gen(function* () {
  const solcWorker = yield* Solc;
  const result = yield* solcWorker.compile({
    language: "Solidity",
    sources: {
      "Hello.sol": {
        content: `
          // SPDX-License-Identifier: MIT
          pragma solidity ^0.8.3;

          contract Counter {
              uint public count;

              function get() public view returns (uint) {
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
          "*": ["*"],
        },
      },
    },
  });
  return result;
}).pipe(Effect.provide([SolcNextLayer, FetchHttpClient.layer]));

Effect.runPromise(program);
```

## Node

Use `SolcNodeLayer` when you run in Node, this will wrap [`solc`](https://www.npmjs.com/package/solc) package.

```ts
import { FetchHttpClient } from "@effect/platform";
import { Effect } from "effect";
import { Solc } from "@evm-effect/solc";
import { SolcNodeLayer } from "@evm-effect/solc/node";

const program = Effect.gen(function* () {
  const solc = yield* Solc;
  return yield* solc.compile({
    language: "Solidity",
    sources: {
      "Hello.sol": { content: "pragma solidity ^0.8.3; contract C {}" },
    },
    settings: {
      outputSelection: { "*": { "*": ["*"] } },
    },
  });
}).pipe(Effect.provide([SolcNodeLayer, FetchHttpClient.layer]));

Effect.runPromise(program);
```



## License

MIT — see the repository root `LICENSE`.

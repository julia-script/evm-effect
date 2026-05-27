// git@github.com:ethereum/execution-apis.git

import { NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import {
  generateRpcSchemasProgram,
  generateSchemasProgram,
} from "./lib/program.js";

await Effect.runPromise(
  generateSchemasProgram.pipe(Effect.provide(NodeServices.layer)),
);

await Effect.runPromise(
  generateRpcSchemasProgram.pipe(Effect.provide(NodeServices.layer)),
);

import { NodeServices } from "@effect/platform-node";
import { Effect, type Scope } from "effect";

export const runTest = <A, E>(
  program: Effect.Effect<A, E, NodeServices.NodeServices | Scope.Scope>,
) => {
  return Effect.runPromise(
    program.pipe(Effect.provide(NodeServices.layer), Effect.scoped),
  );
};

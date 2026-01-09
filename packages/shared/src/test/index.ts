import { BunContext } from "@effect/platform-bun";
import { Effect, Logger, type Scope } from "effect";

export const runTest = <A, E>(
  program: Effect.Effect<A, E, BunContext.BunContext | Scope.Scope>,
) => {
  return Effect.runPromise(
    program.pipe(
      Effect.provide(BunContext.layer),
      Effect.scoped,
      Effect.provide(Logger.pretty),
    ),
  );
};

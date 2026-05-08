import { BunServices } from "@effect/platform-bun";
import { Effect,  type Scope } from "effect";

export const runTest = <A, E>(
  program: Effect.Effect<A, E, BunServices.BunServices | Scope.Scope>,
) => {
  return Effect.runPromise(
    program.pipe(
      Effect.provide(BunServices.layer),
      Effect.scoped,
    ),
  );
};

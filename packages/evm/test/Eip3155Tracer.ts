import { stringify } from "@evm-effect/shared/stringify";
import { Console, Effect } from "effect";
import { type EvmTraceEvent, EvmTracer } from "../src/trace.js";

export const Eip3155Tracer = Effect.fn("Eip3155Tracer")(function* () {
  const trace: (event: EvmTraceEvent) => Effect.Effect<void, never, never> =
    Effect.fn("trace")(function* (event: EvmTraceEvent) {
      yield* Console.log(stringify(event));
    });

  return EvmTracer.of({
    trace,
  });
});

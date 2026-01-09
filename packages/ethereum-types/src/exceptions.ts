import { Data } from "effect";

export class EvmTypeError extends Data.TaggedError("EvmTypeError")<{
  readonly message: string;
  readonly input?: unknown;
}> {}

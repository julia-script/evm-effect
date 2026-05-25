import { Data } from "effect";

export class ExecutionSpecTestError extends Data.TaggedError(
  "ExecutionSpecTestError",
)<{
  readonly message: string;
}> {}

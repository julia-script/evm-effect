import { Data } from "effect";

export class RlpEncodeError extends Data.TaggedError("RlpEncodeError")<{
  readonly message: string;
  readonly path: string[];
}> {}

export class RlpDecodeError extends Data.TaggedError("RlpDecodeError")<{
  readonly message: string;
  readonly path: string[];
}> {}

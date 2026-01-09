import { Data } from "effect";

export class TrieError extends Data.TaggedClass("TrieError")<{
  readonly message: string;
}> {}

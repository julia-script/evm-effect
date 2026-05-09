import { Bytes } from "@evm-effect/ethereum-types";
import { Context, Data, type Effect, Option, Result } from "effect";
import type { HttpClient } from "effect/unstable/http";
import type { CompilerInput } from "./schemas/input.js";
import type * as output from "./schemas/output.js";
export namespace CompilerOutput {
  export type CompilerOutput = output.CompilerOutput;
  export type CompilerError = output.CompilerError;

  export type ContractOutput = output.ContractOutput;
}
export namespace Contract {
  export type Contract = output.ContractOutput;

  export const getBytes = (self: Contract): Option.Option<Bytes> => {
    const bytesString = self.evm?.bytecode?.object;
    if (!bytesString) {
      return Option.none();
    }
    const bytes = Bytes.fromHex(bytesString);
    if (Result.isFailure(bytes)) {
      return Option.none();
    }
    return Option.some(bytes.success);
  };
}
export class SolcWorkerError extends Data.TaggedError("SolcWorkerError")<{
  message: string;
}> {}

export class Solc extends Context.Service<
  Solc,
  {
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
  }
>()("Solc") {}

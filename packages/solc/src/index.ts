import type { HttpClient } from "@effect/platform";
import { Bytes } from "@evm-effect/ethereum-types";
import { Context, Data, type Effect, Either, Option } from "effect";
import type { CompilerInput } from "./schemas/input.js";
import type * as output from "./schemas/output.js";
export namespace CompilerOutput {
  export type CompilerOutput = output.CompilerOutput;
  export type CompilerError = output.CompilerError;

  export type ContractOutput = output.ContractOutput;

  function _getContract(
    self: CompilerOutput,
    name: string,
    path?: string,
  ): Option.Option<ContractOutput> {
    path = path ?? `${name}.sol`;

    return Option.fromNullable(self.contracts?.[path]?.[name]);
  }

  export const getContract: {
    (
      name: string,
      path?: string,
    ): (self: CompilerOutput) => Option.Option<ContractOutput>;
    (
      self: CompilerOutput,
      name: string,
      path?: string,
    ): Option.Option<ContractOutput>;
  } = function () {
    if (typeof arguments[0] === "string") {
      return (self: CompilerOutput) =>
        _getContract(self, arguments[0], arguments[1]);
    }
    return _getContract(arguments[0], arguments[1], arguments[2]);
  } as never;

  export const _findContractByName = (
    self: CompilerOutput,
    name: string,
  ): Option.Option<ContractOutput> => {
    if (!self.contracts) {
      return Option.none();
    }
    for (const fileContracts of Object.values(self.contracts)) {
      for (const [key, value] of Object.entries(fileContracts)) {
        if (key === name) {
          return Option.fromNullable(value);
        }
      }
    }
    return Option.none();
  };

  export const findContractByName: {
    (name: string): (self: CompilerOutput) => Option.Option<ContractOutput>;
    (self: CompilerOutput, name: string): Option.Option<ContractOutput>;
  } = function () {
    if (typeof arguments[0] === "string") {
      return (self: CompilerOutput) => _findContractByName(self, arguments[0]);
    }
    return _findContractByName(arguments[0], arguments[1]);
  } as never;
}
export namespace Contract {
  export type Contract = output.ContractOutput;

  export const getBytes = (self: Contract): Option.Option<Bytes> => {
    const bytesString = self.evm?.bytecode?.object;
    if (!bytesString) {
      return Option.none();
    }
    const bytes = Bytes.fromHex(bytesString);
    if (Either.isLeft(bytes)) {
      return Option.none();
    }
    return Option.some(bytes.right);
  };
}
export class SolcWorkerError extends Data.TaggedError("SolcWorkerError")<{
  message: string;
}> {}

export class Solc extends Context.Tag("Solc")<
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
>() {}

import { Bytes } from "@evm-effect/ethereum-types";
import { Data, type Effect, Either, Option, Schema } from "effect";
import solc from "solc";
import type { CompilerInput } from "./schemas/input.js";
import * as output from "./schemas/output.js";
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

export class SolcCompilationError extends Data.TaggedError(
  "SolcCompilationError",
)<{
  readonly message: string;
  readonly compilerErrors: CompilerOutput.CompilerError[];
}> {}
export class Solc extends Data.TaggedClass("Solc")<{
  compile: (input: CompilerInput) => Effect.Effect<string, never>;
}> {
  /**
   * This calls the compile function but does not validate the output.
   * This exist in case there is a bug in our schema so you can get unstack in the meantime.
   */
  static unsafe_rawCompile(
    input: CompilerInput,
  ): Either.Either<CompilerOutput.CompilerOutput, SolcCompilationError> {
    const result = solc.compile(JSON.stringify(input));
    return Schema.decodeEither(Schema.parseJson())(result).pipe(
      Either.mapLeft(
        (error): SolcCompilationError =>
          new SolcCompilationError({
            message: `${error}`,
            compilerErrors: [],
          }),
      ),
      Either.map((output) => output as CompilerOutput.CompilerOutput),
    );
  }

  static compile(
    input: CompilerInput,
    options: {
      failThreshold?: CompilerOutput.CompilerError["severity"];
    } = {
      failThreshold: "error",
    },
  ): Either.Either<CompilerOutput.CompilerOutput, SolcCompilationError> {
    const result = solc.compile(JSON.stringify(input));
    return Schema.decodeEither(Schema.parseJson(output.CompilerOutput))(
      result,
    ).pipe(
      Either.mapLeft(
        (error) =>
          new SolcCompilationError({
            message: `Parsing compiler output failed: ${error}`,
            compilerErrors: [],
          }),
      ),
      Either.flatMap((output) => {
        const errorSeverity = ["info", "warning", "error"];
        const failThresholdIndex = errorSeverity.indexOf(
          options.failThreshold ?? "error",
        );
        const filteredErrors =
          output.errors?.filter(
            (error) =>
              errorSeverity.indexOf(error.severity) >= failThresholdIndex,
          ) ?? [];
        if (filteredErrors.length > 0) {
          return Either.left(
            new SolcCompilationError({
              message: `Compiler errors found:\n${filteredErrors
                .map((error) => `- ${error.message}`)
                .join("\n")}`,
              compilerErrors: filteredErrors,
            }),
          );
        }
        return Either.right(output);
      }),
    );
  }
}

import { Effect, Layer } from "effect";
import solc from "solc";
import { getList } from "./fetch.js";
import { type CompilerOutput, Solc, SolcWorkerError } from "./index.js";

export const SolcNode = Solc.of({
  compile: (input, options = { solidityVersion: "latest" }) =>
    Effect.gen(function* () {
      const compiler = yield* Effect.gen(function* () {
        const versionString = options.solidityVersion || "latest";
        if (options.solidityVersion === "latest") {
          return yield* Effect.succeed(solc);
        }
        const solList = yield* getList().pipe(
          Effect.mapError(
            (error) =>
              new SolcWorkerError({
                message: `Failed to get list of solidity versions: ${error}`,
              }),
          ),
        );
        const compilerVersionString = solList.releases[versionString];
        if (!compilerVersionString) {
          return yield* Effect.fail(
            new SolcWorkerError({
              message: `Solidity version ${versionString} not found`,
            }),
          );
        }
        return yield* Effect.tryPromise({
          try: () =>
            new Promise<typeof solc>((resolve, reject) => {
              solc.loadRemoteVersion(
                compilerVersionString,
                (error: unknown, compiler: typeof solc) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(compiler);
                  }
                },
              );
            }),
          catch: (error) =>
            new SolcWorkerError({
              message: `Failed to load remote version ${compilerVersionString}: ${error}`,
            }),
        });
      });

      const result = compiler.compile(JSON.stringify(input));
      return yield* Effect.succeed(
        JSON.parse(result) as CompilerOutput.CompilerOutput,
      );
    }),
});

export const SolcNodeLayer = Layer.succeed(Solc, SolcNode);

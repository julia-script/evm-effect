/**
 * Generic test helpers for fuzzy testing against Python implementation
 *
 * @module
 */

import { expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { Chunk, Data, Effect, Either, Stream } from "effect";
import * as fc from "fast-check";
import { dedent } from "ts-dedent";

// Configure fast-check defaults
fc.configureGlobal({ numRuns: 20, timeout: 1000 });

/**
 * Error for Python evaluation failures
 */
export class PythonEvalError extends Data.TaggedError("PythonEvalError")<{
  readonly message: string;
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}> {}

/**
 * Result of Python evaluation
 */
export interface PythonResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  ok: boolean;
}

// Find the monorepo root by walking up from this file
// This works regardless of which package imports this module
const findMonorepoRoot = (): string => {
  let current = path.dirname(fileURLToPath(import.meta.url));
  // Walk up until we find package.json with workspaces
  while (current !== path.dirname(current)) {
    try {
      const pkgPath = path.join(current, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkgContent = fs.readFileSync(pkgPath, "utf-8");
        const pkg = JSON.parse(pkgContent);
        if (pkg.workspaces) {
          return current;
        }
      }
    } catch {
      // Continue searching
    }
    current = path.dirname(current);
  }
  throw new Error("Could not find monorepo root");
};

const root = findMonorepoRoot();
const pythonTestEnv = path.resolve(root, "python-test-env");

/**
 * Execute Python code and return result
 *
 * Sets PYTHONPATH to include ethereum_types library
 */
export const pythonEval = (code: string, fail = true) =>
  Effect.gen(function* () {
    const command = Command.make(".venv/bin/python", "-c", dedent(code)).pipe(
      Command.workingDirectory(pythonTestEnv),
      Command.stdout("pipe"),
      Command.stderr("pipe"),
    );

    const run = yield* Command.start(command);

    const decoder = new TextDecoder();
    const stdout = yield* Stream.runCollect(run.stdout).pipe(
      Effect.map(Chunk.map((value) => decoder.decode(value))),
      Effect.map(Chunk.join("")),
    );
    const stderr = yield* Stream.runCollect(run.stderr).pipe(
      Effect.map(Chunk.map((value) => decoder.decode(value))),
      Effect.map(Chunk.join("")),
    );
    const exitCode = yield* run.exitCode;

    if (exitCode !== 0 && fail) {
      return yield* Effect.fail(
        new PythonEvalError({
          message: "Python evaluation failed",
          exitCode,
          stderr,
          stdout,
        }),
      );
    }

    return yield* Effect.succeed({
      stdout,
      stderr,
      exitCode,
      ok: exitCode === 0,
    });
  });

/**
 * Configuration for comparing TypeScript and Python implementations
 */
export interface TestAgainstPythonConfig<TInput, TOutput> {
  name: string;
  arbitrary: fc.Arbitrary<TInput>;
  tsOperation: (input: TInput) => TOutput | Either.Either<TOutput, Error>;
  pyCode: (input: TInput) => string;
  parseOutput: (stdout: string) => TOutput;
  numRuns?: number;
}

/**
 * Test TypeScript implementation against Python reference
 *
 * Generates random inputs using fast-check, runs both implementations,
 * and verifies they produce the same output (or both error).
 */
export async function testAgainstPython<TInput, TOutput>(
  config: TestAgainstPythonConfig<TInput, TOutput>,
): Promise<void> {
  await fc.assert(
    fc.asyncProperty(config.arbitrary, async (input) => {
      const program = Effect.gen(function* () {
        // Run Python
        const pyResult = yield* pythonEval(config.pyCode(input), false);

        // Run TypeScript
        let tsResult: TOutput | "error";
        let tsError: unknown;
        try {
          const result = config.tsOperation(input);
          if (Either.isEither(result)) {
            if (Either.isLeft(result)) {
              tsResult = "error";
              tsError = result.left;
            } else {
              tsResult = result.right;
            }
          } else {
            tsResult = result;
          }
        } catch (e) {
          tsResult = "error";
          tsError = e;
        }

        // Compare results
        if (pyResult.ok) {
          // Python succeeded - TS should too
          if (tsResult === "error") {
            console.error("Python succeeded but TS failed:");
            console.error("Input:", input);
            console.error("Python output:", pyResult.stdout);
            console.error("TS error:", tsError);
            throw new Error(
              `Python succeeded but TypeScript failed: ${tsError}`,
            );
          }

          const expected = config.parseOutput(pyResult.stdout);
          expect(tsResult).toEqual(expected);
        } else {
          // Python threw - TS should too
          if (tsResult !== "error") {
            console.error("Python failed but TS succeeded:");
            console.error("Input:", input);
            console.error("Python error:", pyResult.stderr);
            console.error("TS result:", tsResult);
            throw new Error(
              `Python failed but TypeScript succeeded. Python stderr: ${pyResult.stderr}`,
            );
          }
          // Both errored - this is correct
          // Optionally verify error messages match
        }
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(BunContext.layer), Effect.scoped),
      );
    }),
  );
}

/**
 * Helper to create a test that compares TS and Python implementations
 */
export function createComparisonTest<TInput, TOutput>(
  config: TestAgainstPythonConfig<TInput, TOutput>,
) {
  return async () => {
    await testAgainstPython(config);
  };
}

// Re-export fast-check for convenience
export { fc };

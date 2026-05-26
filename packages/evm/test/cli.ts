#! /usr/bin/env pnpx tsx

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { NodeServices } from "@effect/platform-node";
import { Console, Effect, FileSystem, Layer, Logger, Result } from "effect";
import type { LiteralValue } from "effect/SchemaAST";
import { CliError, Command, Flag } from "effect/unstable/cli";
import { DevTools } from "effect/unstable/devtools";
import { Eip3155Tracer, jsonlFileEmit } from "../src/Eip3155Tracer.js";
import { EvmTracer } from "../src/trace.js";
import { runBlockchainTest } from "./blockchain-test/index.js";
import { testDir } from "./constants.js";
import { runStateTest } from "./state-tests/index.js";
import { ExecutionSpecTestError } from "./utils/ExecutionSpecTestError.js";
import {
  type FixtureFormat,
  type Forks,
  type IndexEntry,
  readBlockchainTest,
  readStateTest,
  readTestFixturesIndex,
} from "./utils/test-index.js";

const Choices = <const C extends readonly LiteralValue[]>(
  name: string,
  choices: C,
): Flag.Flag<C[number][]> => {
  const choicesSet = new Set(choices);
  return Flag.string(name).pipe(
    Flag.mapEffect((value) =>
      Effect.gen(function* () {
        const values = value
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        for (const value of values) {
          if (!choicesSet.has(value)) {
            return yield* Effect.fail(
              new CliError.InvalidValue({
                expected: `one of ${choices.join(", ")}, received \`${value}\``,
                value,
                option: name,
                kind: "flag",
              }),
            );
          }
        }
        return values as C[number][];
      }),
    ),
    Flag.withDescription(`${choices.join(", ")}`),
  );
};

const formatFlag = Choices("format", [
  "state_test",
  "blockchain_test",
  "all",
]).pipe(Flag.withDefault(["all"]));

const filterFlag = Flag.string("filter").pipe(
  Flag.withDefault(""),
  Flag.map((value) => {
    if (value === "") {
      return [];
    }
    return value
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }),
);
const limitFlag = Flag.integer("limit").pipe(Flag.withDefault(Infinity));

const devtoolsFlag = Flag.boolean("devtools").pipe(Flag.withDefault(false));

const skipFlag = Flag.integer("skip").pipe(Flag.withDefault(0));

const traceFlag = Flag.boolean("trace").pipe(Flag.withDefault(false));

const emitReportFlag = Flag.boolean("emit-report").pipe(
  Flag.withDefault(false),
);

const supportedTestFormats = [
  "state_test",
  "blockchain_test",
] satisfies (typeof FixtureFormat.Type)[];

const main = Command.make("main", {
  format: formatFlag,
  filter: filterFlag,
  limit: limitFlag,
  devtools: devtoolsFlag,
  skip: skipFlag,
  trace: traceFlag,
  emitReport: emitReportFlag,
}).pipe(
  Command.withHandler((config) =>
    Effect.gen(function* () {
      const formats = new Set(
        config.format.flatMap((format) => format.split(",")),
      );

      if (formats.has("all")) {
        for (const format of supportedTestFormats) {
          formats.add(format);
        }
        formats.delete("all");
      }

      const index = yield* readTestFixturesIndex();
      const enabledForks = new Set<(typeof Forks)["Type"]>([
        "ArrowGlacier",
        "Berlin",
        "Byzantium",
        "Cancun",
        "Constantinople",
        "Frontier",
        "GrayGlacier",
        "Homestead",
        "Istanbul",
        "London",
        "Merge",
        "MuirGlacier",
        "Osaka",
        "Paris",
        "Prague",
        "Shanghai",
      ]);

      const filtered: (typeof IndexEntry)["Type"][] = [];
      for (const testCase of index.test_cases) {
        if (!formats.has(testCase.format)) {
          continue;
        }
        if (!enabledForks.has(testCase.fork)) {
          continue;
        }
        if (config.filter.length > 0) {
          const searchString =
            `${testCase.id}${testCase.fixture_hash}${testCase.fork}${testCase.format}`.toLowerCase();
          if (
            !config.filter.some((filter) =>
              searchString.includes(filter.toLowerCase()),
            )
          ) {
            continue;
          }
        }

        filtered.push(testCase);
        if (filtered.length >= config.limit) {
          break;
        }
      }
      console.log("--------------------------------");
      const reportFile = `report-${Date.now()}.json`;
      const totalDurationStart = performance.now();
      let passed = 0;
      let failed = 0;
      for (let i = config.skip; i < filtered.length; i++) {
        const now = performance.now();
        const testCase = filtered[i];
        const testCaseDir = path.join(testDir, "traces", testCase.id);
        const maybeTrace = config.trace
          ? Layer.effect(
              EvmTracer,
              Eip3155Tracer((entry) =>
                jsonlFileEmit(testCaseDir, NodeServices.layer)(entry),
              ),
            )
          : Layer.empty;

        const header = `[${i}/${filtered.length}] ${testCase.fixture_hash.slice(0, 10)} [${testCase.fork}] ${testCase.id}`;

        yield* Console.log(header);
        const result = yield* runTest(testCase, testCaseDir).pipe(
          Effect.provide(maybeTrace),
        );
        const duration = performance.now() - now;

        yield* Console.log(`Time taken: ${Math.round(duration)}ms`);

        if (Result.isSuccess(result)) {
          passed++;
        } else {
          failed++;
        }

        if (config.emitReport) {
          yield* Effect.tryPromise({
            try: async () => {
              if (Result.isFailure(result)) {
                return fs.appendFile(
                  reportFile,
                  `(FAILED) ${header}: ${result.failure}\n`,
                );
              } else {
                return fs.appendFile(
                  reportFile,
                  `(PASSED) ${Math.round(duration)}ms ${header}\n`,
                );
              }
            },
            catch: (error) => Console.error(error),
          });
        }
      }
      yield* Console.log("\n");

      yield* Console.log(`Total tests: ${filtered.length}`);
      if (filtered.length === passed) {
        yield* Console.log(`\x1b[32mAll tests passed\x1b[0m`);
      } else {
        yield* Console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
        yield* Console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
      }

      const totalDuration = performance.now() - totalDurationStart;
      const seconds = totalDuration / 1000;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      let formattedTime = "";
      if (hours > 0) {
        formattedTime += `${hours}h `;
      }
      if (minutes > 0) {
        formattedTime += `${minutes}m `;
      }
      formattedTime += `${seconds.toFixed(2)}s`;

      yield* Console.log(`Total time taken: ${formattedTime}`);
      if (failed > 0) {
        process.exit(1);
      }
    }).pipe(
      Effect.withSpan("runTest", {
        attributes: {
          config: config,
        },
      }),

      Effect.provide(config.devtools ? DevTools.layer() : Layer.empty),
    ),
  ),
);

const runTest = Effect.fn("runTest")(function* (
  testCase: typeof IndexEntry.Type,
  testCaseDir: string,
) {
  const fs = yield* FileSystem.FileSystem;
  if (testCase.format === "state_test") {
    const { _raw, ...stateTest } = yield* readStateTest(testCase);
    yield* fs.makeDirectory(testCaseDir, { recursive: true });
    yield* fs.writeFileString(path.join(testCaseDir, "input.json"), _raw);

    return yield* runStateTest(stateTest).pipe(Effect.result);
  }

  if (testCase.format === "blockchain_test") {
    const { _raw, ...blockchainTest } = yield* readBlockchainTest(testCase);
    yield* fs.makeDirectory(testCaseDir, { recursive: true });
    yield* fs.writeFileString(path.join(testCaseDir, "input.json"), _raw);

    return yield* runBlockchainTest(blockchainTest).pipe(Effect.result);
  }
  return Result.fail(
    new ExecutionSpecTestError({
      message: `Unsupported test format: ${testCase.format}`,
    }),
  );
});

const layers = Layer.mergeAll(
  NodeServices.layer,
  Logger.layer([Logger.consolePretty({})]),
);
const program = Command.run(main, {
  version: "1.0.0",
}).pipe(Effect.provide(layers));

await program.pipe(Effect.runPromise);

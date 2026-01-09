#!/usr/bin/env bun
/**
 * Script to print all failed tests from the cached test status directory.
 *
 * Usage:
 *   bun packages/evm/test/print-failed-tests.ts
 *   bun packages/evm/test/print-failed-tests.ts --verbose  # Include error details
 *   bun packages/evm/test/print-failed-tests.ts --json     # Output as JSON
 */

import * as path from "node:path";
import { FileSystem } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import {
  Array as Arr,
  Console,
  Effect,
  Option,
  Order,
  pipe,
  Schema,
} from "effect";

// Schema for test run metadata
const TestRunMetadata = Schema.Struct({
  timestamp: Schema.String,
  passed: Schema.Boolean,
  durationMs: Schema.optional(Schema.Number),
  error: Schema.optional(Schema.String),
  errorStack: Schema.optional(Schema.String),
});
type TestRunMetadata = typeof TestRunMetadata.Type;

// Schema for a failed test with additional context
type FailedTest = {
  shortHash: string;
  lastRun: TestRunMetadata;
  runCount: number;
  failCount: number;
};

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const jsonOutput = args.includes("--json");

const dirname = path.dirname(new URL(import.meta.url).pathname);
const cachedTestStatusDir = path.join(dirname, ".tmp-cached-test-status");

/**
 * Parse a single line as TestRunMetadata
 */
const parseLine = (line: string): Option.Option<TestRunMetadata> =>
  pipe(
    Schema.decodeUnknownOption(TestRunMetadata)(JSON.parse(line)),
    Option.flatMap((result) =>
      typeof result === "object" && "passed" in result
        ? Option.some(result)
        : Option.none(),
    ),
  );

/**
 * Parse file content into test runs, handling legacy format
 */
const parseFileContent = (
  content: string,
): { runs: TestRunMetadata[]; isLegacy: boolean } => {
  const lines = content.trim().split("\n").filter(Boolean);

  if (lines.length === 0) {
    return { runs: [], isLegacy: false };
  }

  const runs: TestRunMetadata[] = [];

  for (const line of lines) {
    try {
      const parsed = parseLine(line);
      if (Option.isSome(parsed)) {
        runs.push(parsed.value);
      } else {
        // Legacy format detected
        return { runs: [], isLegacy: true };
      }
    } catch {
      // Legacy format (non-JSON like "true")
      return { runs: [], isLegacy: true };
    }
  }

  return { runs, isLegacy: false };
};

type TestFileResult = {
  shortHash: string;
  passed: boolean;
  isLegacy: boolean;
  runs: TestRunMetadata[];
  lastRun: TestRunMetadata | null;
};

/**
 * Process a single test file and return its status
 */
const processTestFile = (filePath: string, fileName: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = yield* fs.readFileString(filePath);
    const { runs, isLegacy } = parseFileContent(content);

    if (isLegacy) {
      // Legacy format: if last line is "true", consider passed
      const lines = content.trim().split("\n");
      const lastLine = lines[lines.length - 1];
      return {
        shortHash: fileName,
        passed: lastLine === "true",
        isLegacy: true,
        runs: [],
        lastRun: null,
      };
    }

    if (runs.length === 0) {
      return {
        shortHash: fileName,
        passed: true,
        isLegacy: false,
        runs: [],
        lastRun: null,
      };
    }

    const lastRun = runs[runs.length - 1];
    return {
      shortHash: fileName,
      passed: lastRun.passed,
      isLegacy: false,
      runs,
      lastRun,
    };
  });

/**
 * Format duration in a human-readable way
 */
const formatDuration = (durationMs: number | undefined): string =>
  durationMs !== undefined ? `${(durationMs / 1000).toFixed(2)}s` : "N/A";

/**
 * Print the summary and failed tests
 */
const printResults = (
  totalTests: number,
  passedTests: number,
  failedTests: FailedTest[],
) =>
  Effect.gen(function* () {
    if (jsonOutput) {
      yield* Console.log(
        JSON.stringify(
          {
            summary: {
              total: totalTests,
              passed: passedTests,
              failed: failedTests.length,
            },
            failedTests,
          },
          null,
          2,
        ),
      );
      return;
    }

    yield* Console.log("\n=== Test Status Summary ===");
    yield* Console.log(`Total tests:  ${totalTests}`);
    yield* Console.log(`Passed:       ${passedTests}`);
    yield* Console.log(`Failed:       ${failedTests.length}`);
    yield* Console.log("");

    if (failedTests.length === 0) {
      yield* Console.log("✅ All tests passed!\n");
      return;
    }

    yield* Console.log("=== Failed Tests ===\n");

    for (const test of failedTests) {
      const duration = formatDuration(test.lastRun.durationMs);

      yield* Console.log(`❌ ${test.shortHash}`);
      yield* Console.log(`   Last run:  ${test.lastRun.timestamp}`);
      yield* Console.log(`   Duration:  ${duration}`);
      yield* Console.log(
        `   Runs:      ${test.runCount} (${test.failCount} failures)`,
      );

      if (test.lastRun.error) {
        yield* Console.log(`   Error:     ${test.lastRun.error}`);
      }

      if (verbose && test.lastRun.errorStack) {
        yield* Console.log("   Stack trace:");
        const stackLines = test.lastRun.errorStack.split("\n");
        for (const line of stackLines.slice(0, 5)) {
          yield* Console.log(`     ${line}`);
        }
        if (stackLines.length > 5) {
          yield* Console.log(`     ... (${stackLines.length - 5} more lines)`);
        }
      }

      yield* Console.log("");
    }

    // Print test hashes for easy copy-paste to re-run
    yield* Console.log("=== Failed Test Hashes (for filtering) ===");
    yield* Console.log(failedTests.map((t) => t.shortHash).join("\n"));
    yield* Console.log("");
  });

/**
 * Main program
 */
const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  // Check if directory exists
  const exists = yield* fs.exists(cachedTestStatusDir);
  if (!exists) {
    yield* Console.error(`Cache directory not found: ${cachedTestStatusDir}`);
    return;
  }

  // Read all files in the directory
  const entries = yield* fs.readDirectory(cachedTestStatusDir);
  const files = yield* pipe(
    entries,
    Arr.filter((entry) => !entry.startsWith(".")),
    Arr.map((fileName) => ({
      fileName,
      filePath: path.join(cachedTestStatusDir, fileName),
    })),
    Arr.map(({ fileName, filePath }) =>
      pipe(
        fs.stat(filePath),
        Effect.map((stat) => ({
          fileName,
          filePath,
          isFile: stat.type === "File",
        })),
        Effect.catchAll(() =>
          Effect.succeed({ fileName, filePath, isFile: false }),
        ),
      ),
    ),
    Effect.all,
  );

  const testFiles = files.filter((f) => f.isFile);

  // Process all test files
  const results = yield* pipe(
    testFiles,
    Arr.map(({ filePath, fileName }) =>
      pipe(
        processTestFile(filePath, fileName),
        Effect.catchAll(
          (): Effect.Effect<TestFileResult> =>
            Effect.succeed({
              shortHash: fileName,
              passed: true,
              isLegacy: true,
              runs: [],
              lastRun: null,
            }),
        ),
      ),
    ),
    Effect.all,
  );

  // Collect statistics
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;

  // Collect failed tests with details
  const failedTests: FailedTest[] = pipe(
    results,
    Arr.filter(
      (r): r is TestFileResult & { lastRun: TestRunMetadata } =>
        !r.passed && !r.isLegacy && r.lastRun !== null,
    ),
    Arr.map((r) => ({
      shortHash: r.shortHash,
      lastRun: r.lastRun,
      runCount: r.runs.length,
      failCount: r.runs.filter((run) => !run.passed).length,
    })),
    // Sort by most recent failure first
    Arr.sort(
      Order.mapInput(
        Order.reverse(Order.string),
        (t: FailedTest) => t.lastRun.timestamp,
      ),
    ),
  );

  yield* printResults(totalTests, passedTests, failedTests);
});

// Run the program
BunRuntime.runMain(program.pipe(Effect.provide(BunContext.layer)));

import { appendFile, mkdir } from "node:fs/promises";
import * as path from "node:path";
import * as Bun from "bun";
import { Effect, type Layer, Logger, Match } from "effect";
import { Fork } from "../src/vm/Fork.js";

export const SKIP_CACHE = process.env.SKIP_CACHE !== "false";
export const VERBOSE = process.env.VERBOSE === "true";
export const SKIP = process.env.SKIP ? Number(process.env.SKIP) : 0;
export const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : undefined;

export const TEST_CONFIG = {
  timeout: 1000 * 60 * 20,
  retry: 2,
} as const;

const dirname = path.dirname(new URL(import.meta.url).pathname);
const cachedTestStatusDir = path.join(dirname, ".tmp-cached-test-status");

try {
  await mkdir(cachedTestStatusDir, { recursive: true });
} catch (error) {
  console.error("Error creating cached test status directory", error);
}

/**
 * Metadata for a single test run, serialized as JSON per line
 */
type TestRunMetadata = {
  timestamp: string;
  passed: boolean;
  durationMs?: number;
  error?: string;
  errorStack?: string;
};

/**
 * Check if a test has already passed (cached).
 * Reads the last line of the test file and returns true only if:
 * - SKIP_CACHE is false
 * - The file exists
 * - The last run was a pass
 */
export const checkTestCache = async (shortHash: string): Promise<boolean> => {
  if (SKIP_CACHE) return false;

  const testFilePath = path.join(cachedTestStatusDir, shortHash);
  const file = Bun.file(testFilePath);

  if (!(await file.exists())) {
    return false;
  }

  try {
    const content = await file.text();
    const lines = content.trim().split("\n");
    const lastLine = lines[lines.length - 1];

    if (!lastLine) return false;

    const metadata: TestRunMetadata = JSON.parse(lastLine);
    return metadata.passed === true;
  } catch {
    return false;
  }
};

/**
 * Record a test result by appending a JSON line to the test's history file.
 *
 * @param shortHash - The test identifier
 * @param passed - Whether the test passed
 * @param error - Error object if the test failed (optional)
 * @param durationMs - Test duration in milliseconds (optional)
 */
export const recordTestResult = async (
  shortHash: string,
  passed: boolean,
  error?: unknown,
  durationMs?: number,
): Promise<void> => {
  const testFilePath = path.join(cachedTestStatusDir, shortHash);

  const metadata: TestRunMetadata = {
    timestamp: new Date().toISOString(),
    passed,
  };

  if (durationMs !== undefined) {
    metadata.durationMs = durationMs;
  }

  if (!passed && error !== undefined) {
    if (error instanceof Error) {
      metadata.error = error.message;
      if (error.stack !== undefined) {
        metadata.errorStack = error.stack;
      }
    } else if (typeof error === "string") {
      metadata.error = error;
    } else {
      try {
        metadata.error = JSON.stringify(error);
      } catch {
        metadata.error = String(error);
      }
    }
  }

  const line = `${JSON.stringify(metadata)}\n`;
  await appendFile(testFilePath, line);
};

/**
 * Mark a test as passed in the cache (convenience wrapper)
 */
export const markTestPassed = async (
  shortHash: string,
  durationMs?: number,
): Promise<void> => {
  await recordTestResult(shortHash, true, undefined, durationMs);
};

/**
 * Mark a test as failed in the cache (convenience wrapper)
 */
export const markTestFailed = async (
  shortHash: string,
  error?: unknown,
  durationMs?: number,
): Promise<void> => {
  await recordTestResult(shortHash, false, error, durationMs);
};

const TRANSITION_TIMESTAMP = 15000n;

const TRANSITION_FORKS: Record<string, [string, string]> = {
  ParisToShanghaiAtTime15k: ["Paris", "Shanghai"],
  ShanghaiToCancunAtTime15k: ["Shanghai", "Cancun"],
  CancunToPragueAtTime15k: ["Cancun", "Prague"],
};

class UnsupportedForkError extends Error {
  readonly _tag = "UnsupportedForkError";
  constructor(forkName: string) {
    super(`Unsupported fork: ${forkName}`);
  }
}

/**
 * Resolve a simple fork name to Fork layer
 */
const resolveSimpleFork = (
  forkName: string,
): Effect.Effect<Layer.Layer<Fork>, UnsupportedForkError> =>
  Match.value(forkName).pipe(
    Match.when("Osaka", () => Effect.succeed(Fork.osaka())),
    Match.when("Cancun", () => Effect.succeed(Fork.cancun())),
    Match.when("Prague", () => Effect.succeed(Fork.prague())),
    Match.when("Berlin", () => Effect.succeed(Fork.berlin())),
    Match.when("London", () => Effect.succeed(Fork.london())),
    Match.when("Paris", () => Effect.succeed(Fork.paris())),
    Match.when("Shanghai", () => Effect.succeed(Fork.shanghai())),
    Match.when("Istanbul", () => Effect.succeed(Fork.istantbul())),
    Match.when("Byzantium", () => Effect.succeed(Fork.byzantium())),
    Match.when("Constantinople", () => Effect.succeed(Fork.constantinople())),
    Match.when("ConstantinopleFix", () => Effect.succeed(Fork.petersburg())),
    Match.when("Homestead", () => Effect.succeed(Fork.homestead())),
    Match.when("Frontier", () => Effect.succeed(Fork.frontier())),
    Match.orElse((name) => Effect.fail(new UnsupportedForkError(name))),
  );

/**
 * Check if a fork name is a transition fork
 */
export const isTransitionFork = (forkName: string): boolean =>
  forkName in TRANSITION_FORKS;

/**
 * Resolve a fork name string to the corresponding Fork layer
 */
export const resolveFork = (
  forkName: string,
): Effect.Effect<Layer.Layer<Fork>, UnsupportedForkError> => {
  if (forkName in TRANSITION_FORKS) {
    const [, targetFork] = TRANSITION_FORKS[forkName];
    return resolveSimpleFork(targetFork);
  }
  return resolveSimpleFork(forkName);
};

/**
 * Resolve fork for a specific block timestamp in a transition fork
 * Returns the appropriate fork based on whether timestamp >= 15000
 */
export const resolveForkForTimestamp = (
  forkName: string,
  timestamp: bigint,
): Effect.Effect<Layer.Layer<Fork>, UnsupportedForkError> => {
  if (forkName in TRANSITION_FORKS) {
    const [sourceFork, targetFork] = TRANSITION_FORKS[forkName];
    if (timestamp >= TRANSITION_TIMESTAMP) {
      return resolveSimpleFork(targetFork);
    }
    return resolveSimpleFork(sourceFork);
  }
  return resolveSimpleFork(forkName);
};

/**
 * Apply the appropriate logger configuration based on VERBOSE setting
 */
export const withTestLogger = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    VERBOSE
      ? Effect.provide(Logger.pretty)
      : Effect.provide(Logger.remove(Logger.defaultLogger)),
  );

/**
 * Run an effect with test logger configuration
 */
export const runWithTestLogger = <A, E>(effect: Effect.Effect<A, E, never>) =>
  withTestLogger(effect).pipe(Effect.runPromise);

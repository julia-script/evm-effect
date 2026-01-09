import { mkdir } from "node:fs/promises";
import * as path from "node:path";
import * as Bun from "bun";
import { Effect, type Layer, Logger, Match } from "effect";
import { Fork } from "../src/vm/Fork.js";

// Environment configuration
export const SKIP_CACHE = process.env.SKIP_CACHE !== "false";
export const VERBOSE = process.env.VERBOSE !== "false";
export const SKIP = process.env.SKIP ? Number(process.env.SKIP) : 0;
export const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : undefined;

// Test timeout configuration
export const TEST_CONFIG = {
  timeout: 1000 * 60 * 5,
  retry: 0,
  repeats: 0,
} as const;

// Cache directory setup
const dirname = path.dirname(new URL(import.meta.url).pathname);
const cachedTestStatusDir = path.join(dirname, ".temp-cached-test-status");

// Initialize cache directory
try {
  await mkdir(cachedTestStatusDir, { recursive: true });
} catch (error) {
  console.error("Error creating cached test status directory", error);
}

/**
 * Check if a test has already passed (cached)
 */
export const checkTestCache = async (shortHash: string): Promise<boolean> => {
  if (SKIP_CACHE) return false;
  const testFileCheck = path.join(cachedTestStatusDir, shortHash);
  return Bun.file(testFileCheck).exists();
};

/**
 * Mark a test as passed in the cache
 */
export const markTestPassed = async (shortHash: string): Promise<void> => {
  const testFileCheck = path.join(cachedTestStatusDir, shortHash);
  await Bun.file(testFileCheck).write("true");
};

/**
 * Unmark a test as passed (remove from cache when test fails)
 */
export const unmarkTestPassed = async (shortHash: string): Promise<void> => {
  const testFileCheck = path.join(cachedTestStatusDir, shortHash);
  try {
    await Bun.file(testFileCheck).delete();
  } catch {
    // Ignore errors if file doesn't exist
  }
};

// Transition fork timestamp threshold (15k = 15000)
const TRANSITION_TIMESTAMP = 15000n;

// Transition fork configurations: [sourceFork, targetFork]
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
  // Check if it's a transition fork
  if (forkName in TRANSITION_FORKS) {
    // For transition forks, return the target fork by default
    // (use resolveForkForTimestamp for per-block resolution)
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

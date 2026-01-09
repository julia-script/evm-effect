/**
 * Optimizer settings schema for Solidity compiler
 */
import { Schema } from "effect";

// Yul optimizer details
export const YulDetails = Schema.Struct({
  stackAllocation: Schema.optional(Schema.Boolean),
  optimizerSteps: Schema.optional(Schema.String),
});

export type YulDetails = typeof YulDetails.Type;

// Optimizer details
export const OptimizerDetails = Schema.Struct({
  peephole: Schema.optional(Schema.Boolean),
  inliner: Schema.optional(Schema.Boolean),
  jumpdestRemover: Schema.optional(Schema.Boolean),
  orderLiterals: Schema.optional(Schema.Boolean),
  deduplicate: Schema.optional(Schema.Boolean),
  cse: Schema.optional(Schema.Boolean),
  constantOptimizer: Schema.optional(Schema.Boolean),
  yul: Schema.optional(Schema.Boolean),
  simpleCounterForLoopUncheckedIncrement: Schema.optional(Schema.Boolean),
  yulDetails: Schema.optional(YulDetails),
});

export type OptimizerDetails = typeof OptimizerDetails.Type;

// Main optimizer settings
export const OptimizerSettings = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean),
  runs: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.nonNegative())),
  details: Schema.optional(OptimizerDetails),
});

export type OptimizerSettings = typeof OptimizerSettings.Type;

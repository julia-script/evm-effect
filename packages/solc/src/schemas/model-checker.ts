/**
 * Model checker settings schema for Solidity compiler
 */
import { Schema } from "effect";
import {
  ModelCheckerEngine,
  ModelCheckerExtCalls,
  ModelCheckerInvariant,
  ModelCheckerSolver,
  ModelCheckerTarget,
} from "./types.js";

export const ModelCheckerContracts = Schema.Record({
  key: Schema.String,
  value: Schema.Array(Schema.String),
});

export const ModelCheckerSettings = Schema.Struct({
  contracts: Schema.optional(ModelCheckerContracts),
  divModNoSlacks: Schema.optional(Schema.Boolean),
  engine: Schema.optional(ModelCheckerEngine),
  bmcLoopIterations: Schema.optional(Schema.Number),
  extCalls: Schema.optional(ModelCheckerExtCalls),
  invariants: Schema.optional(Schema.Array(ModelCheckerInvariant)),
  showProvedSafe: Schema.optional(Schema.Boolean),
  showUnproved: Schema.optional(Schema.Boolean),
  showUnsupported: Schema.optional(Schema.Boolean),
  printQuery: Schema.optional(Schema.Boolean),
  solvers: Schema.optional(Schema.Array(ModelCheckerSolver)),
  targets: Schema.optional(Schema.Array(ModelCheckerTarget)),
  timeout: Schema.optional(Schema.Number),
});

export type ModelCheckerSettings = typeof ModelCheckerSettings.Type;

/**
 * ABI (Application Binary Interface) schemas for Solidity compiler
 */
import { Schema } from "effect";

// State mutability enum
export const StateMutability = Schema.Literal(
  "pure",
  "view",
  "nonpayable",
  "payable",
);

// ABI parameter (for inputs/outputs)
// Note: components is recursive for tuples and arrays
const ABIParameterBase = Schema.Struct({
  name: Schema.String,
  type: Schema.String,
  internalType: Schema.optional(Schema.String),
  indexed: Schema.optional(Schema.Boolean), // Only for event parameters
});

export interface ABIParameter
  extends Schema.Schema.Type<typeof ABIParameterBase> {
  readonly components?: ReadonlyArray<ABIParameter> | undefined;
}

export const ABIParameter: Schema.Schema<ABIParameter> = Schema.suspend(() =>
  Schema.Struct({
    ...ABIParameterBase.fields,
    components: Schema.optional(
      Schema.suspend(() => Schema.Array(ABIParameter)),
    ),
  }),
);

// Function ABI entry
export const ABIFunction = Schema.Struct({
  type: Schema.Literal("function"),
  name: Schema.String,
  inputs: Schema.Array(ABIParameter),
  outputs: Schema.Array(ABIParameter),
  stateMutability: StateMutability,
});

export type ABIFunction = typeof ABIFunction.Type;

// Constructor ABI entry
export const ABIConstructor = Schema.Struct({
  type: Schema.Literal("constructor"),
  inputs: Schema.Array(ABIParameter),
  stateMutability: StateMutability,
});

export type ABIConstructor = typeof ABIConstructor.Type;

// Fallback ABI entry
export const ABIFallback = Schema.Struct({
  type: Schema.Literal("fallback"),
  stateMutability: StateMutability,
});

export type ABIFallback = typeof ABIFallback.Type;

// Receive ABI entry
export const ABIReceive = Schema.Struct({
  type: Schema.Literal("receive"),
  stateMutability: StateMutability,
});

export type ABIReceive = typeof ABIReceive.Type;

// Event ABI entry
export const ABIEvent = Schema.Struct({
  type: Schema.Literal("event"),
  name: Schema.String,
  inputs: Schema.Array(ABIParameter),
  anonymous: Schema.Boolean,
});

export type ABIEvent = typeof ABIEvent.Type;

// Error ABI entry
export const ABIError = Schema.Struct({
  type: Schema.Literal("error"),
  name: Schema.String,
  inputs: Schema.Array(ABIParameter),
});

export type ABIError = typeof ABIError.Type;

// Complete ABI entry (union of all types)
export const ABIEntry = Schema.Union(
  ABIFunction,
  ABIConstructor,
  ABIFallback,
  ABIReceive,
  ABIEvent,
  ABIError,
);

export type ABIEntry = typeof ABIEntry.Type;

// Complete ABI (array of entries)
export const ABI = Schema.Array(ABIEntry);

export type ABI = typeof ABI.Type;

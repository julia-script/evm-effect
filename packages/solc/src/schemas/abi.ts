/**
 * ABI (Application Binary Interface) schemas for Solidity compiler
 */
import { Schema } from "effect";

export const StateMutability = Schema.Literal(
  "pure",
  "view",
  "nonpayable",
  "payable",
);

const ABIParameterBase = Schema.Struct({
  name: Schema.String,
  type: Schema.String,
  internalType: Schema.optional(Schema.String),
  indexed: Schema.optional(Schema.Boolean),
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

export const ABIFunction = Schema.Struct({
  type: Schema.Literal("function"),
  name: Schema.String,
  inputs: Schema.Array(ABIParameter),
  outputs: Schema.Array(ABIParameter),
  stateMutability: StateMutability,
});

export type ABIFunction = typeof ABIFunction.Type;

export const ABIConstructor = Schema.Struct({
  type: Schema.Literal("constructor"),
  inputs: Schema.Array(ABIParameter),
  stateMutability: StateMutability,
});

export type ABIConstructor = typeof ABIConstructor.Type;

export const ABIFallback = Schema.Struct({
  type: Schema.Literal("fallback"),
  stateMutability: StateMutability,
});

export type ABIFallback = typeof ABIFallback.Type;

export const ABIReceive = Schema.Struct({
  type: Schema.Literal("receive"),
  stateMutability: StateMutability,
});

export type ABIReceive = typeof ABIReceive.Type;

export const ABIEvent = Schema.Struct({
  type: Schema.Literal("event"),
  name: Schema.String,
  inputs: Schema.Array(ABIParameter),
  anonymous: Schema.Boolean,
});

export type ABIEvent = typeof ABIEvent.Type;

export const ABIError = Schema.Struct({
  type: Schema.Literal("error"),
  name: Schema.String,
  inputs: Schema.Array(ABIParameter),
});

export type ABIError = typeof ABIError.Type;

export const ABIEntry = Schema.Union(
  ABIFunction,
  ABIConstructor,
  ABIFallback,
  ABIReceive,
  ABIEvent,
  ABIError,
);

export type ABIEntry = typeof ABIEntry.Type;

export const ABI = Schema.Array(ABIEntry);

export type ABI = typeof ABI.Type;

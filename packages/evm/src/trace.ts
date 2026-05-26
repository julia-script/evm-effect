import EthTypes, { Address } from "@evm-effect/ethereum-types";
import type { Bytes } from "@evm-effect/ethereum-types/bytes";
import { bufferToHex } from "@evm-effect/shared/bytes";
import {
  Context,
  Data,
  Effect,
  Option,
  Schema,
  SchemaGetter,
  SchemaIssue,
} from "effect";
import { isString } from "effect/Predicate";
import type { BlockOutput } from "./blockchain.js";
import type { MessageCallOutput } from "./blocks/system.js";
import type { EthereumException } from "./exceptions.js";
import type { Transaction } from "./transactions.js";
import type { LegacyReceipt, Receipt } from "./types/Receipt.js";
import { Evm } from "./vm/evm.js";
import type { BlockEnvironment } from "./vm/message.js";

export type EvmTraceEvent = Data.TaggedEnum<{
  TransactionProcessingStart: {
    readonly index: number;
    readonly tx: Transaction;
    readonly blockEnv: BlockEnvironment;
  };
  TransactionProcessingEnd: {
    readonly index: number;
    readonly tx: Transaction;
    readonly blockEnv: BlockEnvironment;
    readonly receipt: Receipt | LegacyReceipt;
    readonly encodedReceipt: Bytes;
    readonly blockOutput: BlockOutput;
    readonly txOutput: MessageCallOutput;
  };
  TransactionStart: {};

  TransactionEnd: {
    readonly gasUsed: bigint;
    readonly output: Bytes;
    readonly error: EthereumException | null;
  };
  PrecompileStart: { readonly address: Address };
  PrecompileEnd: {};
  OpStart: { readonly op: number; readonly invalidOpcode?: boolean };
  OpEnd: {};
  OpException: { readonly error: EthereumException };
  EvmStop: { readonly op: number };
  GasAndRefund: { readonly gasCost: bigint };
}>;
export const {
  TransactionProcessingEnd,
  TransactionProcessingStart,
  TransactionEnd,
  PrecompileStart,
  PrecompileEnd,
  OpStart,
  OpEnd,
  OpException,
  EvmStop,
  GasAndRefund,
} = Data.taggedEnum<EvmTraceEvent>();
export type TransactionEvent = Extract<
  EvmTraceEvent,
  { _tag: "TransactionProcessingStart" | "TransactionProcessingEnd" }
>;
export type TraceEvent = Exclude<EvmTraceEvent, TransactionEvent>;

export class EvmTracer extends Context.Service<
  EvmTracer,
  {
    readonly trace: (event: EvmTraceEvent) => Effect.Effect<void, never, never>;
  }
>()("EvmTracer") {
  static empty = EvmTracer.of({
    trace: () => Effect.succeed(void 0),
  });
}

export const processTrace = Effect.fn("processTrace")(function* (
  event: TransactionEvent,
) {
  const maybeTracer = yield* Effect.serviceOption(EvmTracer);
  // const emptyEvm = Evm.make()

  if (Option.isSome(maybeTracer)) {
    yield* maybeTracer.value.trace(event);
  }
});
export const evmTrace: (
  event: Readonly<TraceEvent>,
) => Effect.Effect<void, never, Evm> = Effect.fn("evmTrace")(function* (event) {
  const maybeTracer = yield* Effect.serviceOption(EvmTracer);

  if (Option.isSome(maybeTracer)) {
    yield* maybeTracer.value.trace(event);
  }
});
export const evmTraceWith = (evm: Evm["Service"], event: TraceEvent) =>
  evmTrace(event).pipe(Effect.provideService(Evm, evm));

const NumberFromHex = Schema.String.pipe(
  Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transformOrFail((value) =>
      Effect.gen(function* () {
        if (!isString(value)) {
          return yield* Effect.fail(
            new SchemaIssue.InvalidValue(Option.some(value)),
          );
        }
        let str: string = value;
        if (str.startsWith("0x")) {
          str = str.slice(2);
        }
        return yield* Effect.succeed(Number.parseInt(str, 16));
      }),
    ),
    encode: SchemaGetter.transformOrFail((value) =>
      Effect.gen(function* () {
        if (Number.isFinite(value)) {
          return yield* Effect.succeed(`0x${value.toString(16)}`);
        }
        return yield* Effect.fail(
          new SchemaIssue.InvalidValue(Option.some(value)),
        );
      }),
    ),
  }),
);
const AddressFromHex = Schema.String.pipe(
  Schema.decodeTo(Address, {
    decode: SchemaGetter.transformOrFail((value) =>
      Effect.gen(function* () {
        if (!isString(value)) {
          return yield* Effect.fail(
            new SchemaIssue.InvalidValue(Option.some(value)),
          );
        }
        return yield* Effect.succeed(new Address(value));
      }),
    ),
    encode: SchemaGetter.transformOrFail((value) =>
      Effect.gen(function* () {
        return yield* Effect.succeed(bufferToHex(value.value.value));
      }),
    ),
  }),
);

export class Trace extends Schema.Class<Trace>("Trace")({
  pc: Schema.Number,
  op: Schema.optional(Schema.Union([NumberFromHex, AddressFromHex])),
  gas: Schema.BigIntFromString,
  gasCost: Schema.BigIntFromString,
  memory: Schema.optional(EthTypes.UintFromString),
  memSize: Schema.Number,
  stack: Schema.optional(Schema.Array(EthTypes.U256FromString)),
  returnData: Schema.optional(EthTypes.UintFromString),
  depth: Schema.Number,
  refund: Schema.Number,
  opName: Schema.String,
  error: Schema.optional(Schema.String),
}) {}

export class FinalTrace extends Schema.Class<FinalTrace>("FinalTrace")({
  output: EthTypes.UintFromString,
  gasUsed: Schema.BigIntFromString,
  error: Schema.optional(Schema.String),
}) {}

export const AnyTrace = Schema.Union([Trace, FinalTrace]);

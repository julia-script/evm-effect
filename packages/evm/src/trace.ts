import type { Transaction } from "@evm-effect/crypto/transactions";
import { Address, U256 } from "@evm-effect/ethereum-types";
import type { Bytes } from "@evm-effect/ethereum-types/bytes";
import { bufferFromHex, bufferToHex } from "@evm-effect/shared/bytes";
import {
  Context,
  Data,
  Effect,
  Layer,
  Match,
  Option,
  Ref,
  Schema,
  SchemaGetter,
  SchemaIssue,
} from "effect";
import { isString } from "effect/Predicate";
import type { BlockOutput } from "./blockchain.js";
import type { MessageCallOutput } from "./blocks/system.js";
import type { EthereumException } from "./exceptions.js";
import type { LegacyReceipt, Receipt } from "./types/Receipt.js";
import { Evm } from "./vm/evm.js";
import type { BlockEnvironment, TransactionEnvironment } from "./vm/message.js";
import { getOpcodeName } from "./vm/opcodes.js";

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
  static eip3155 = (options: Eip3155TracerOptions = {}) =>
    Layer.effect(EvmTracer, Eip3155Tracer(options));
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

const Uint8ArrayFromHex = Schema.String.pipe(
  Schema.decodeTo(Schema.Uint8Array, {
    // strict: true,
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
        // const str = value
        // return yield* Effect.succeed(bufferFromHex(value));
        return yield* Effect.try({
          try: () => bufferFromHex(str),
          catch: () => new SchemaIssue.InvalidValue(Option.some(value)),
        });
      }),
    ),
    encode: SchemaGetter.transformOrFail((value) =>
      Effect.gen(function* () {
        return yield* Effect.succeed(bufferToHex(value));
      }),
    ),
  }),
);

const u256FromHex = Schema.String.pipe(
  Schema.decodeTo(U256, {
    decode: SchemaGetter.transformOrFail((value) =>
      Effect.try({
        try: () => new U256({ value: BigInt(value) }),
        catch: () => new SchemaIssue.InvalidValue(Option.some(value)),
      }),
    ),
    encode: SchemaGetter.transformOrFail((value) =>
      Effect.succeed(`0x${value.value.toString(16)}`),
    ),
  }),
);

export class Trace extends Schema.Class<Trace>("Trace")({
  pc: Schema.Number,
  op: Schema.optional(Schema.Union([NumberFromHex, AddressFromHex])),
  gas: Schema.BigIntFromString,
  gasCost: Schema.BigIntFromString,
  memory: Schema.optional(Uint8ArrayFromHex),
  memSize: Schema.Number,
  stack: Schema.optional(Schema.Array(u256FromHex)),
  returnData: Schema.optional(Uint8ArrayFromHex),
  depth: Schema.Number,
  refund: Schema.Number,
  opName: Schema.String,
  error: Schema.optional(Schema.String),
}) {}

export class FinalTrace extends Schema.Class<FinalTrace>("FinalTrace")({
  output: Uint8ArrayFromHex,
  gasUsed: Schema.BigIntFromString,
  error: Schema.optional(Schema.String),
}) {}

const AnyTrace = Schema.Union([Trace, FinalTrace]);
type AnyTrace = typeof AnyTrace.Type;
type Eip3155TracerOptions = {
  traceMemory?: boolean;
  traceStack?: boolean;
  traceReturnData?: boolean;
  emit?: (
    trace: AnyTrace,
    encoded: Effect.Effect<(typeof AnyTrace)["Encoded"], never, never>,
  ) => Effect.Effect<void, never, Evm>;
};

const Eip3155Tracer = Effect.fn("Eip3155Tracer")(function* ({
  traceMemory = false,
  traceStack = true,
  traceReturnData = false,
  emit,
}: Eip3155TracerOptions = {}) {
  let transactionEnvironment: TransactionEnvironment | null = null;
  let activeTraces: Array<
    [
      AnyTrace,
      {
        gasCostTraced?: boolean;
        errorTraced?: boolean;
      },
    ]
  > = [];

  const trace: (event: EvmTraceEvent) => Effect.Effect<void, never, Evm> =
    Effect.fn("trace")(function* (event: EvmTraceEvent) {
      const evm = yield* Evm;
      const pushTrace = (
        trace: (typeof Trace)["Type"] | (typeof FinalTrace)["Type"],
      ): Effect.Effect<undefined, never, never> => {
        activeTraces.push([trace, {}]);

        return Effect.succeed(undefined);
      };
      const emitLastTrace = (): Effect.Effect<void, never, Evm> => {
        if (lastTrace && emit) {
          return emit(
            lastTrace,
            Effect.suspend(() =>
              Schema.encodeUnknownEffect(AnyTrace)(event).pipe(Effect.orDie),
            ),
          );
        }
        return Effect.succeed(undefined);
      };

      if (transactionEnvironment !== evm.message.txEnv) {
        activeTraces = [];
        transactionEnvironment = evm.message.txEnv;
      }
      const [lastTrace, lastTraceMetadata] = activeTraces[
        activeTraces.length - 1
      ] || [undefined, {}];

      let refundCounter = yield* Ref.get(evm.refundCounter).pipe(
        Effect.map((refundCounter) => refundCounter.value),
      );
      let parentEvm = Option.getOrNull(evm.message.parentEvm);
      while (parentEvm) {
        refundCounter += yield* Ref.get(parentEvm.refundCounter).pipe(
          Effect.map((refundCounter) => refundCounter.value),
        );
        parentEvm = Option.getOrNull(parentEvm.message.parentEvm);
      }
      const memorySource = yield* Ref.get(evm.memory);
      const lenMemory = memorySource.length;

      const returnDataSource = yield* Ref.get(evm.returnData);
      const returnData = traceReturnData ? returnDataSource.value : undefined;

      const memory = traceMemory ? memorySource : undefined;
      const stackSource = yield* Ref.get(evm.stack.value);
      const stack = traceStack ? stackSource : undefined;
      const error = Option.getOrNull(yield* Ref.get(evm.error));
      const pc = yield* Ref.get(evm.pc);

      yield* Match.value(event).pipe(
        Match.tags({
          TransactionProcessingStart: () => {
            return Effect.succeed(void 0);
          },
          TransactionProcessingEnd: () => {
            return Effect.succeed(void 0);
          },
          TransactionStart: () => {
            return Effect.succeed(void 0);
          },
          TransactionEnd: () =>
            pushTrace(
              FinalTrace.make({
                output: returnDataSource.value,
                gasUsed: refundCounter,
                error: error ? error._tag : undefined,
              }),
            ),
          PrecompileStart: (event) =>
            pushTrace(
              Trace.make({
                pc: pc,
                op: event.address,
                gas: evm.gasLeft,
                gasCost: 0n,
                memory: memory,
                memSize: lenMemory,
                stack: stack,

                returnData: returnData,
                depth: Number(evm.message.depth.value),
                refund: Number(refundCounter),
                opName: event.address.toHex(),
              }),
            ),
          PrecompileEnd: () =>
            Effect.gen(function* () {
              if (!(lastTrace instanceof Trace)) {
                return yield* Effect.die(
                  new Error("Last trace is not a Trace"),
                );
              }
              lastTraceMetadata.gasCostTraced = true;
              lastTraceMetadata.errorTraced = true;
              yield* emitLastTrace();
            }),
          OpStart: (event) =>
            pushTrace(
              Trace.make({
                pc: pc,
                op: event.invalidOpcode ? undefined : event.op,
                gas: evm.gasLeft,
                gasCost: 0n,
                memory: memory,
                memSize: lenMemory,
                stack: stack,
                returnData: returnData,
                depth: Number(evm.message.depth.value),
                refund: Number(refundCounter),
                opName: event.invalidOpcode
                  ? "Invalid"
                  : getOpcodeName(event.op),
              }),
            ),
          OpEnd: () =>
            Effect.gen(function* () {
              if (!(lastTrace instanceof Trace)) {
                return Effect.die(new Error("Last trace is not a Trace"));
              }
              lastTraceMetadata.gasCostTraced = true;
              lastTraceMetadata.errorTraced = true;

              yield* emitLastTrace();
            }),
          OpException: (event) =>
            Effect.gen(function* () {
              if (lastTrace && !(lastTrace instanceof Trace)) {
                return Effect.die(new Error("Last trace is not a Trace"));
              }
              if (
                !lastTrace ||
                lastTraceMetadata.errorTraced ||
                lastTrace.depth === Number(evm.message.depth.value)
              ) {
                yield* pushTrace(
                  Trace.make({
                    pc: pc,
                    op: undefined,
                    gas: evm.gasLeft,
                    gasCost: 0n,
                    memory: memory,
                    memSize: lenMemory,
                    stack: stack,
                    returnData: returnData,
                    depth: Number(evm.message.depth.value),

                    refund: Number(refundCounter),
                    opName: "InvalidOpcode",
                    error: event.error._tag,
                  }),
                );
              } else if (!lastTraceMetadata.errorTraced) {
                if (!(lastTrace instanceof Trace)) {
                  return yield* Effect.die(
                    new Error("Last trace is not a Trace"),
                  );
                }
                activeTraces[activeTraces.length - 1][0] = Trace.make({
                  ...lastTrace,
                  error: event.error._tag,
                });
              }
              yield* emitLastTrace();
            }),
          EvmStop: (event) => {
            if (!evm.running) {
              return Effect.succeed(void 0);
            }
            if (evm.code.value.length === 0) {
              return Effect.succeed(void 0);
            }
            return trace(OpStart({ op: event.op }));
          },
          GasAndRefund: (event) => {
            if (activeTraces.length === 0) {
              return Effect.succeed(void 0);
            }
            if (!(lastTrace instanceof Trace)) {
              return Effect.die(new Error("Last trace is not a Trace"));
            }
            if (!lastTraceMetadata.gasCostTraced) {
              activeTraces[activeTraces.length - 1][0] = Trace.make({
                ...lastTrace,
                gasCost: event.gasCost,
                refund: Number(refundCounter),
              });
              lastTraceMetadata.gasCostTraced = true;
            }
            return Effect.succeed(void 0);
          },
        }),
        Match.exhaustive,
      );
    });
  return EvmTracer.of({
    trace: Effect.fn("traceWrapper")(function* (event: EvmTraceEvent) {
      const maybeEvm = yield* Effect.serviceOption(Evm);
      if (Option.isNone(maybeEvm)) {
        return Effect.succeed(void 0);
      }
      const evm = maybeEvm.value;
      return yield* trace(event).pipe(Effect.provideService(Evm, evm));
    }),
  });
});

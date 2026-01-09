import { Address, U256 } from "@evm-effect/ethereum-types";
import type { Bytes } from "@evm-effect/ethereum-types/bytes";
import { bufferFromHex, bufferToHex } from "@evm-effect/ethereum-types/utils";
import {
  Context,
  Data,
  Effect,
  Layer,
  Match,
  Option,
  ParseResult,
  Ref,
  Schema,
} from "effect";
import { BigIntFromSelf } from "effect/Schema";
import type { EthereumException } from "./exceptions.js";
import { Evm } from "./vm/evm.js";
import type { TransactionEnvironment } from "./vm/message.js";
import { getOpcodeName } from "./vm/opcodes.js";

export type EvmTraceEvent = Data.TaggedEnum<{
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
  TransactionEnd,
  PrecompileStart,
  PrecompileEnd,
  OpStart,
  OpEnd,
  OpException,
  EvmStop,
  GasAndRefund,
} = Data.taggedEnum<EvmTraceEvent>();

export class EvmTracer extends Context.Tag("EvmTracer")<
  EvmTracer,
  { readonly trace: (event: EvmTraceEvent) => Effect.Effect<void, never, Evm> }
>() {
  static empty = EvmTracer.of({
    trace: () => Effect.succeed(void 0),
  });
  static eip3155 = (options: Eip3155TracerOptions = {}) =>
    Layer.effect(EvmTracer, Eip3155Tracer(options));
}

export const evmTrace = Effect.fn("evmTrace")(function* (event: EvmTraceEvent) {
  const maybeTracer = yield* Effect.serviceOption(EvmTracer);

  if (Option.isSome(maybeTracer)) {
    yield* maybeTracer.value.trace(event);
  }
});
export const evmTraceWith = (evm: Evm["Type"], event: EvmTraceEvent) =>
  evmTrace(event).pipe(Effect.provideService(Evm, evm));

// const NumbefFromHex = Schema.transformOrFail(Schema.Number, Schema.String, {
//   decode: (value) => Effect.succeed(`0x${value.toString(16)}`),
//   encode: (value) => Effect.succeed(Number.parseInt(value, 16)),
// });

class NumberFromHex extends Schema.transformOrFail(
  Schema.String.annotations({
    description: "a Hex string to be decoded into a number",
  }),
  Schema.Number,
  {
    strict: true,
    decode: (value, _, ast) =>
      ParseResult.try({
        try: () => Number.parseInt(value, 16),
        catch: () =>
          new ParseResult.Type(
            ast,
            value,
            `Unable to decode ${JSON.stringify(value)} into a number`,
          ),
      }),
    encode: (value, _, ast) => {
      if (Number.isFinite(value)) {
        return ParseResult.succeed(`0x${value.toString(16)}`);
      }
      return ParseResult.fail(
        new ParseResult.Type(
          ast,
          value,
          `Unable to encode ${value} into a number`,
        ),
      );
    },
  },
).annotations({ identifier: "Number" }) {}
class AddressFromHex extends Schema.transformOrFail(
  Schema.String.annotations({
    description: "a Hex string to be decoded into a address",
  }),
  Address,
  {
    strict: true,
    decode: (value, _, ast) =>
      ParseResult.try({
        try: () => new Address(value),
        catch: () =>
          new ParseResult.Type(
            ast,
            value,
            `Unable to decode ${JSON.stringify(value)} into a address`,
          ),
      }),
    encode: (a) => ParseResult.succeed(`0x${bufferToHex(a.value.value)}`),
  },
).annotations({ identifier: "Address" }) {}
class BigIntFromHex extends Schema.transformOrFail(
  Schema.String.annotations({
    description: "a Hex string to be decoded into a bigint",
  }),
  BigIntFromSelf,
  {
    strict: true,
    decode: (value, _, ast) =>
      ParseResult.try({
        try: () => BigInt(value),
        catch: () =>
          new ParseResult.Type(
            ast,
            value,
            `Unable to decode ${JSON.stringify(value)} into a bigint`,
          ),
      }),

    encode: (a) => ParseResult.succeed(`0x${a.toString(16)}`),
  },
).annotations({ identifier: "BigInt" }) {}

class Uint8ArrayFromHex extends Schema.transformOrFail(
  Schema.String.annotations({
    description: "a Hex string to be decoded into a Uint8Array",
  }),
  Schema.Uint8ArrayFromSelf,
  {
    strict: true,
    decode: (value, _, ast) =>
      ParseResult.try({
        try: () =>
          value.startsWith("0x")
            ? bufferFromHex(value.slice(2))
            : bufferFromHex(value),
        catch: () =>
          new ParseResult.Type(
            ast,
            value,
            `Unable to decode ${JSON.stringify(value).slice(0, 10)}... into a Uint8Array`,
          ),
      }),
    encode: (value) => ParseResult.succeed(`0x${bufferToHex(value)}`),
  },
).annotations({ identifier: "Uint8Array" }) {}

class u256FromHex extends Schema.transformOrFail(
  Schema.String.annotations({
    description: "a Hex string to be decoded into a u256",
  }),
  U256,
  {
    strict: false,
    decode: (value, _, ast) =>
      ParseResult.try({
        try: () => new U256({ value: BigInt(value) }),
        catch: () =>
          new ParseResult.Type(
            ast,
            value,
            `Unable to decode ${JSON.stringify(value)} into a bigint`,
          ),
      }),

    encode: (a) => ParseResult.succeed(`0x${a.value.toString(16)}`),
  },
).annotations({ identifier: "BigInt" }) {}

export class Trace extends Schema.Class<Trace>("Trace")({
  pc: Schema.Number,
  op: Schema.optional(Schema.Union(NumberFromHex, AddressFromHex)),
  gas: BigIntFromHex,
  gasCost: BigIntFromHex,
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
  gasUsed: BigIntFromHex,
  error: Schema.optional(Schema.String),
}) {}
const AnyTrace = Schema.Union(Trace, FinalTrace);
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

  // return EvmTracer.of({
  const trace = (event: EvmTraceEvent): Effect.Effect<void, never, Evm> =>
    Effect.gen(function* () {
      const evm = yield* Evm;
      const pushTrace = (
        trace: (typeof Trace)["Type"] | (typeof FinalTrace)["Type"],
      ): Effect.Effect<undefined, never, Evm> => {
        activeTraces.push([trace, {}]);

        return Effect.succeed(undefined);
      };
      const emitLastTrace = (): Effect.Effect<void, never, Evm> => {
        if (lastTrace && emit) {
          return emit(
            lastTrace,
            Effect.suspend(() =>
              Schema.encode(AnyTrace)(lastTrace).pipe(Effect.orDie),
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
    trace: trace,
  });
});

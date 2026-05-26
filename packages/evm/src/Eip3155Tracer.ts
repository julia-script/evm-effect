import * as path from "node:path";
import {
  type Address,
  Bytes,
  type Bytes32,
  EthTypes,
  type U256,
  Uint,
} from "@evm-effect/ethereum-types";
import {
  Effect,
  FileSystem,
  type Layer,
  Match,
  Option,
  Ref,
  Schema,
} from "effect";
import type { EthereumException } from "./exceptions.js";
import { Evm } from "./index.js";
import { stateRoot } from "./state.js";
import { type EvmTraceEvent, EvmTracer, OpStart } from "./trace.js";
import { Fork } from "./vm/ForkService.js";
import { getOpcodeName } from "./vm/opcodes.js";
export const Eip3155OpcodeTrace = Schema.Struct({
  pc: Schema.Number,
  op: Schema.Number,
  gas: EthTypes.BigIntFromString,
  gasCost: EthTypes.BigIntFromString,
  memSize: Schema.Number,
  stack: Schema.Array(EthTypes.U256FromString),
  depth: Schema.Number,
  returnData: EthTypes.BytesFromString,
  refund: Schema.Number,
  opName: Schema.String,
  error: Schema.NullOr(Schema.String),
  memory: Schema.optional(EthTypes.BytesFromString),
});

export const Eip3155Summary = Schema.Struct({
  stateRoot: EthTypes.Bytes32FromString,
  output: EthTypes.BytesFromString,
  gasUsed: EthTypes.BigIntFromString,
  pass: Schema.Boolean,
  time: Schema.optional(Schema.Number),
  fork: Schema.optional(Schema.String),
});

type OpcodeTrace = {
  pc: number;
  op: number;
  gas: bigint;
  gasCost: bigint;
  memSize: number;
  stack: ReadonlyArray<U256>;
  depth: number;
  returnData: Bytes;
  refund: number;
  opName: string;
  error: string | null;
  memory?: Bytes;
};

type OpcodeTraceSlot = {
  trace: OpcodeTrace;
  meta: {
    gasCostTraced: boolean;
    errorTraced: boolean;
    precompile: boolean;
  };
};

type SummaryTrace = {
  stateRoot: Bytes32;
  output: Bytes;
  gasUsed: bigint;
  pass: boolean;
  time?: number;
  fork?: string;
};

type TraceContext = {
  memSize: number;
  stack: ReadonlyArray<U256>;
  returnData: Bytes;
  memory?: Bytes;
  pc: number;
  depth: number;
  messageDepth: number;
};

export type Eip3155EmitEntry = {
  readonly blockNumber: number;
  readonly opcodeTraces: ReadonlyArray<typeof Eip3155OpcodeTrace.Type>;
  readonly summary: typeof Eip3155Summary.Type;
  readonly indexInBlock: number;
  readonly txHash: Bytes32;
  jsonl: Effect.Effect<string, never, never>;
};

export type EmitFn = (
  entry: Eip3155EmitEntry,
) => Effect.Effect<void, never, never>;

export type Eip3155TracerOptions = {
  traceMemory?: boolean;
  traceStack?: boolean;
  traceReturnData?: boolean;
  includeFork?: boolean;
  includeTime?: boolean;
};

const fitsUint64 = (value: bigint | number): boolean => {
  const n = typeof value === "bigint" ? value : BigInt(value);
  return n >= 0n && n < 1n << 64n;
};

const toUint64Number = (value: bigint): number | undefined => {
  if (!fitsUint64(value)) {
    return undefined;
  }
  return Number(value);
};

const exceptionName = (error: EthereumException): string => {
  const slash = error._tag.lastIndexOf("/");
  return slash >= 0 ? error._tag.slice(slash + 1) : error._tag;
};

const hasOpcodeCode = (
  error: EthereumException,
): error is EthereumException & { readonly code: number } =>
  "code" in error && typeof error.code === "number";

const collectRefundCounter = (evm: Evm["Service"]) =>
  Effect.gen(function* () {
    let refundCounter = (yield* Ref.get(evm.refundCounter)).value;
    let parentEvm = Option.getOrNull(evm.message.parentEvm);
    while (parentEvm) {
      refundCounter += (yield* Ref.get(parentEvm.refundCounter)).value;
      parentEvm = Option.getOrNull(parentEvm.message.parentEvm);
    }
    return refundCounter;
  });

const makeTraceContext = (
  evm: Evm["Service"],
  options: Required<
    Pick<Eip3155TracerOptions, "traceMemory" | "traceStack" | "traceReturnData">
  >,
): Effect.Effect<TraceContext, never, Evm> =>
  Effect.gen(function* () {
    const memoryBytes = yield* Ref.get(evm.memory).pipe(
      Effect.map((memory) => memory.slice()),
    );
    const lenMemory = memoryBytes.length;
    const returnDataBytes = yield* Ref.get(evm.returnData);
    const stackSource = yield* Ref.get(evm.stack.value);
    const pc = yield* Ref.get(evm.pc);

    const ctx: TraceContext = {
      memSize: lenMemory,
      stack: options.traceStack ? stackSource.slice() : [],
      returnData: options.traceReturnData
        ? Bytes.from(returnDataBytes.value.slice())
        : Bytes.empty,
      pc,
      depth: Number(evm.message.depth.value) + 1,
      messageDepth: Number(evm.message.depth.value),
    };

    if (options.traceMemory) {
      ctx.memory = new Bytes({ value: memoryBytes });
    }

    return ctx;
  });

const makeOpcodeTrace = (
  ctx: TraceContext,
  gas: bigint,
  refund: number,
  fields: {
    op: number;
    opName: string;
    precompile?: boolean;
    gasCostTraced?: boolean;
    errorTraced?: boolean;
    error?: string | null;
  },
): OpcodeTraceSlot => ({
  trace: {
    pc: ctx.pc,
    op: fields.op,
    gas,
    gasCost: 0n,
    memSize: ctx.memSize,
    stack: ctx.stack,
    depth: ctx.depth,
    returnData: ctx.returnData,
    refund,
    opName: fields.opName,
    error: fields.error ?? null,
    ...(ctx.memory !== undefined ? { memory: ctx.memory } : {}),
  },
  meta: {
    gasCostTraced: fields.gasCostTraced ?? false,
    errorTraced: fields.errorTraced ?? false,
    precompile: fields.precompile ?? false,
  },
});

const encodeOpcodeTrace = (
  trace: OpcodeTrace,
  options: Pick<Eip3155TracerOptions, "traceMemory">,
) =>
  Schema.encodeEffect(Eip3155OpcodeTrace)(
    {
      ...trace,
      ...(options.traceMemory || trace.memory !== undefined
        ? { memory: trace.memory ?? Bytes.empty }
        : {}),
    },
    {
      propertyOrder: "original",
    },
  ).pipe(Effect.orDie);

const encodeSummary = (summary: SummaryTrace) =>
  Schema.encodeEffect(Eip3155Summary)(summary, {
    propertyOrder: "original",
  }).pipe(Effect.orDie);

const precompileOpNumber = (address: Address): number => {
  return Number(Uint.fromBeBytes(address.bytes).value);
};

export const jsonlFileEmit =
  (outputDir: string, fsLayer: Layer.Layer<FileSystem.FileSystem>): EmitFn =>
  (entry) =>
    Effect.gen(function* () {
      const dirPath = path.join(outputDir, entry.blockNumber.toString());
      const filePath = path.join(
        dirPath,
        `trace-${entry.indexInBlock}-${entry.txHash.toHex()}.jsonl`,
      );

      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(dirPath, { recursive: true });
      yield* fs.writeFileString(filePath, yield* entry.jsonl);
    }).pipe(Effect.orDie, Effect.provide(fsLayer));

export const Eip3155Tracer = Effect.fn("Eip3155Tracer")(function* (
  emit: EmitFn,
  {
    traceMemory = false,
    traceStack = true,
    traceReturnData = true,
    includeFork = true,
    includeTime = true,
  }: Eip3155TracerOptions = {},
) {
  let transactionEnvironment: Evm["Service"]["message"]["txEnv"] | null = null;
  let activeTraces: Array<OpcodeTraceSlot> = [];
  let txStartTime: number | undefined;

  const trace = (event: EvmTraceEvent): Effect.Effect<void, never, Evm> =>
    Effect.gen(function* () {
      const maybeEvm = yield* Effect.serviceOption(Evm);
      if (Option.isNone(maybeEvm)) {
        return;
      }
      const evm = maybeEvm.value;

      if (
        Option.isNone(evm.message.txEnv.indexInBlock) ||
        Option.isNone(evm.message.txEnv.txHash)
      ) {
        return;
      }

      if (transactionEnvironment !== evm.message.txEnv) {
        activeTraces = [];
        transactionEnvironment = evm.message.txEnv;
        txStartTime = performance.now();
      }

      const lastSlot = activeTraces[activeTraces.length - 1];
      const lastOpcodeTrace = lastSlot?.trace;
      const lastMeta = lastSlot?.meta;

      const ctx = yield* makeTraceContext(evm, {
        traceMemory,
        traceStack,
        traceReturnData,
      });

      const refundCounter = yield* collectRefundCounter(evm);
      const refund = toUint64Number(refundCounter);
      if (refund === undefined || !fitsUint64(evm.gasLeft)) {
        return;
      }
      const gas = evm.gasLeft;

      yield* Match.value(event).pipe(
        Match.tags({
          TransactionProcessingStart: () => Effect.void,
          TransactionProcessingEnd: () => Effect.void,
          TransactionStart: () => Effect.void,
          TransactionEnd: (event) =>
            Effect.gen(function* () {
              const postStateRoot = yield* stateRoot(
                evm.message.blockEnv.state,
              ).pipe(Effect.orDie);
              const maybeFork = includeFork
                ? yield* Effect.serviceOption(Fork)
                : Option.none();
              const index = yield* evm.message.txEnv.indexInBlock.pipe(
                Option.map((index) => Number(index.value)),
                Effect.fromOption,
                Effect.orDie,
              );
              const txHash = yield* evm.message.txEnv.txHash.pipe(
                Effect.fromOption,
                Effect.orDie,
              );

              const summary: SummaryTrace = {
                stateRoot: postStateRoot,
                output: event.output,
                gasUsed: event.gasUsed,
                pass: event.error === null,
              };
              if (includeTime && txStartTime !== undefined) {
                summary.time = Math.round(
                  (performance.now() - txStartTime) * 1_000_000,
                );
              }
              if (Option.isSome(maybeFork)) {
                summary.fork = maybeFork.value.name;
              }

              const opcodeTraces = activeTraces
                .filter((slot) => !slot.meta.precompile)
                .map((slot) => slot.trace);

              const encodedOpcodeTraces: Array<
                typeof Eip3155OpcodeTrace.Encoded
              > = [];
              for (const opcodeTrace of opcodeTraces) {
                encodedOpcodeTraces.push(
                  yield* encodeOpcodeTrace(opcodeTrace, { traceMemory }),
                );
              }

              yield* emit({
                opcodeTraces: opcodeTraces,
                blockNumber: Number(evm.message.blockEnv.number.value),
                summary: summary,
                indexInBlock: index,
                txHash,
                jsonl: Effect.suspend(() =>
                  Effect.gen(function* () {
                    let jsonl = "";
                    for (const trace of opcodeTraces) {
                      jsonl += yield* encodeOpcodeTrace(trace, {
                        traceMemory,
                      }).pipe(
                        Effect.map((encoded) => `${JSON.stringify(encoded)}\n`),
                      );
                    }
                    jsonl += yield* encodeSummary(summary).pipe(
                      Effect.map((encoded) => `${JSON.stringify(encoded)}\n`),
                    );
                    return jsonl;
                  }),
                ),
              });
            }),
          PrecompileStart: (event) =>
            Effect.sync(() => {
              activeTraces.push(
                makeOpcodeTrace(ctx, gas, refund, {
                  op: precompileOpNumber(event.address),
                  opName: event.address.toHex(),
                  precompile: true,
                }),
              );
            }),
          PrecompileEnd: () =>
            Effect.sync(() => {
              if (!lastMeta) {
                return;
              }
              lastMeta.gasCostTraced = true;
              lastMeta.errorTraced = true;
            }),
          OpStart: (event) =>
            Effect.sync(() => {
              const opName = event.invalidOpcode
                ? "Invalid"
                : getOpcodeName(event.op);

              activeTraces.push(
                makeOpcodeTrace(ctx, gas, refund, {
                  op: event.op,
                  opName,
                }),
              );
            }),
          OpEnd: () =>
            Effect.sync(() => {
              if (!lastMeta) {
                return;
              }
              lastMeta.gasCostTraced = true;
              lastMeta.errorTraced = true;
            }),
          OpException: (event) =>
            Effect.gen(function* () {
              if (
                !lastOpcodeTrace ||
                !lastMeta ||
                lastMeta.errorTraced ||
                lastOpcodeTrace.depth === ctx.messageDepth
              ) {
                if (!hasOpcodeCode(event.error)) {
                  return yield* Effect.die(
                    new TypeError(
                      `OpException event error type \`${exceptionName(event.error)}\` does not have code`,
                    ),
                  );
                }

                activeTraces.push(
                  makeOpcodeTrace(ctx, gas, refund, {
                    op: event.error.code,
                    opName: "INVALID",
                    gasCostTraced: true,
                    errorTraced: true,
                    error: exceptionName(event.error),
                  }),
                );
                return;
              }

              if (!lastMeta.errorTraced) {
                lastOpcodeTrace.error = exceptionName(event.error);
                lastMeta.errorTraced = true;
              }
            }),
          EvmStop: (event) =>
            Effect.gen(function* () {
              if (!evm.running || evm.code.value.length === 0) {
                return;
              }
              const error = yield* Ref.get(evm.error);
              if (Option.isSome(error)) {
                return;
              }
              return yield* trace(OpStart({ op: event.op }));
            }),
          GasAndRefund: (event) =>
            Effect.sync(() => {
              if (activeTraces.length === 0 || !lastOpcodeTrace || !lastMeta) {
                return;
              }
              if (!lastMeta.gasCostTraced) {
                const gasCost = event.gasCost;
                if (!fitsUint64(gasCost < 0n ? -gasCost : gasCost)) {
                  return;
                }
                lastOpcodeTrace.gasCost = gasCost;
                lastOpcodeTrace.refund = refund;
                lastMeta.gasCostTraced = true;
              }
            }),
        }),
        Match.exhaustive,
      );
    });

  return EvmTracer.of({
    trace: (event: EvmTraceEvent): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        const maybeEvm = yield* Effect.serviceOption(Evm);
        if (Option.isNone(maybeEvm)) {
          return;
        }
        yield* trace(event).pipe(Effect.provideService(Evm, maybeEvm.value));
      }),
  });
});

import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  // SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Effect, Match, Predicate } from "effect";
import { stringify } from "./stringify.js";

const otlpExporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
});
export const consoleSpanExporter = new ConsoleSpanExporter();
export const traced = ({ serviceName }: { serviceName: string }) =>
  NodeSdk.layer(() => ({
    resource: { serviceName: serviceName },
    spanProcessor: [
      new BatchSpanProcessor(otlpExporter),
      // new SimpleSpanProcessor(consoleSpanExporter),
    ],
    // spanProcessor: new SimpleSpanProcessor(zipkinExporter),
  }));

export const annotateSafe = (values: Record<string, unknown>) => {
  // const { json, meta } = superjson.serialize(values);
  const safeValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      Match.value(value).pipe(
        Match.when(Match.bigint, (value) => `${value}n`),
        Match.when(
          Predicate.isUint8Array,
          (value) => `0x${value.toHex() || "00"}`,
        ),
        Match.when(Predicate.isString, (value) => value),
        Match.when(Predicate.isNumber, (value) => value),
        Match.when(Predicate.isBoolean, (value) => value),
        Match.when(Predicate.isSymbol, (value) => value),
        Match.when(Predicate.isUndefined, (value) => value),
        Match.when(Predicate.isNull, (value) => value),
        Match.when(Predicate.isError, (value) => value),
        Match.when(Predicate.isRegExp, (value) => value),
        Match.when(Predicate.isDate, (value) => value),
        Match.orElse((value) => stringify(value)),
      ),
    ]),
  );
  return Effect.annotateCurrentSpan(safeValues);
};

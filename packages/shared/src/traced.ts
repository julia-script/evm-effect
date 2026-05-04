import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";

const otlpExporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
});
export const consoleSpanExporter = new ConsoleSpanExporter();
export const traced = ({ serviceName }: { serviceName: string }) =>
  NodeSdk.layer(() => ({
    resource: { serviceName: serviceName },
    spanProcessor: [new BatchSpanProcessor(otlpExporter)],
  }));

import Link from "next/link";
import { gitConfig } from "@/lib/shared";

const features = [
  {
    title: "Every released fork",
    description:
      "Frontier through Osaka, validated against the official Ethereum execution spec state and blockchain tests.",
  },
  {
    title: "Built for introspection",
    description:
      "Structured concurrency, typed errors and EIP-3155 tracing make every step of execution observable.",
  },
  {
    title: "Composable by construction",
    description:
      "Forks, state and blockchain access are Effect layers, so they can be swapped, mocked or instrumented.",
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <h1 className="font-mono text-4xl font-bold tracking-tight sm:text-5xl">
          evm-effect
        </h1>
        <p className="mt-6 text-lg text-fd-muted-foreground">
          An Ethereum Virtual Machine implementation in TypeScript, built on{" "}
          <a
            href="https://effect.website/"
            className="font-medium text-fd-foreground underline underline-offset-4"
          >
            Effect
          </a>
          , with a focus on debuggability.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs/getting-started"
            className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
          >
            Get started
          </Link>
          <Link
            href="/docs/api"
            className="rounded-lg border px-4 py-2 text-sm font-medium"
          >
            API reference
          </Link>
          <a
            href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
          >
            GitHub
          </a>
        </div>

        <code className="mt-8 rounded-lg border bg-fd-secondary px-4 py-2 font-mono text-sm">
          npm add @evm-effect/evm effect
        </code>

        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl border p-4">
              <h2 className="text-sm font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

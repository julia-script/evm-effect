import { Chunk, Effect, Layer, Stream, type StreamEmit } from "effect";
import { content } from "./generated/solcjs.bundle.js";
import { Solc, SolcWorkerError } from "./index.js";
import type { CompilerOutput } from "./schemas/output.js";

export const nextWorkerApi = async (
  _: Request,
  args: { params: Promise<{ params: [string, ...string[]] }> },
) => {
  const resolved = await args.params;
  const [first] = resolved.params;
  if (first === "worker.js") {
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
      },
    });
  }
  if (first === "bin") {
    const [, version] = resolved.params;
    const list = await fetch(
      `https://binaries.soliditylang.org/bin/list.json`,
      {
        // @ts-expect-error
        next: {
          revalidate: 60 * 60 * 24,
        },
      },
    ).then((res) => res.json());

    const versionMap = list.releases;
    versionMap.latest = versionMap[list.latestRelease];
    console.log("versionMap", versionMap, version);

    const release = versionMap[version];
    if (!release) {
      return new Response("Not Found", { status: 404 });
    }

    const content = await fetch(
      `https://binaries.soliditylang.org/bin/${release}`,
    );

    const text = await content.text();

    return new Response(`${text};export default Module;`, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
      },
    });
  }
  return new Response(null, { status: 404 });
};

type JSONRpcResponse = {
  id: number;
  jsonrpc: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};
export type SolcNextConfig = {
  workerApiUrl?: string;
};
export const SolcNext = Effect.fn("SolcNext")(function* ({
  workerApiUrl = "api/solc",
}: SolcNextConfig = {}) {
  const worker = new Worker(
    new URL(`${workerApiUrl}/worker.js`, location.origin),
    {
      type: "module",
    },
  );

  const stream = Stream.async(
    (emit: StreamEmit.Emit<never, never, JSONRpcResponse, void>) => {
      worker.onmessage = (event) => {
        const chunk = Chunk.of(event.data as JSONRpcResponse);
        emit(Effect.succeed(chunk));
      };
      worker.onerror = (event) => {
        console.error(event, event.message, event.error);
      };
      worker.onmessageerror = (event) => {
        console.error(event);
      };
    },
  );
  yield* Effect.addFinalizer(() => Effect.succeed(worker.terminate()));

  const send = Effect.fn("send")(function* (
    message: {
      id: number;
      method: string;
      params: unknown[];
    },
    version: string = "latest",
  ) {
    const fork = yield* stream.pipe(
      Stream.filter((chunk) => chunk.id === message.id),
      Stream.take(1),
      Stream.runCollect,
      Effect.fork,
    );
    const url = new URL("/api/solc", location.origin);
    worker.postMessage({
      ...message,
      params: [url.toString(), version, ...message.params],
    });
    const result = yield* fork;
    return yield* result.pipe(Chunk.head, Effect.orDie);
  });

  const id = 0;
  return Solc.of({
    compile: Effect.fn("compile")(function* (input, options = {}) {
      const response = yield* send(
        {
          id,
          method: "compile",
          params: [JSON.stringify(input), {}],
        },
        options.solidityVersion,
      );

      if (response.error) {
        return yield* Effect.fail(new SolcWorkerError(response.error));
      }

      return JSON.parse(response.result as string) as CompilerOutput;
    }),
  });
});

export const setupSolcNextLayer = (config: SolcNextConfig = {}) =>
  Layer.scoped(Solc, SolcNext(config));

export const SolcNextLayer = setupSolcNextLayer();

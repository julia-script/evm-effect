import { Effect, Fiber, Layer, Stream } from "effect";
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

  const onMessageStream = Stream.fromEventListener<MessageEvent>(
    worker,
    "message",
  );
  const onErrorStream = Stream.fromEventListener<ErrorEvent>(worker, "error");
  const onMessageErrorStream = Stream.fromEventListener<MessageEvent>(
    worker,
    "messageerror",
  );
  const stream = Stream.mergeAll<MessageEvent | ErrorEvent, never, never>(
    [onMessageStream, onErrorStream, onMessageErrorStream],
    { concurrency: 3 },
  );

  // const stream = Stream.callback(
  //   (emit: Queue<Queue>) => {
  //     worker.onmessage = (event) => {
  //       const chunk = Chunk.of(event.data as JSONRpcResponse);
  //       emit(Effect.succeed(chunk));
  //     };
  //     worker.onerror = (event) => {
  //       console.error(event, event.message, event.error);
  //     };
  // worker.onmessageerror = (event) => {
  //   console.error(event);
  // };
  //   },
  // );
  yield* Effect.addFinalizer(() => Effect.succeed(worker.terminate()));

  const send = Effect.fn("send")(function* (
    message: {
      id: number;
      method: string;
      params: unknown[];
    },
    version: string = "latest",
  ): Effect.fn.Return<JSONRpcResponse, SolcWorkerError> {
    const fork = yield* stream.pipe(
      Stream.filter((event) => {
        if (event.type === "message") {
          return (event as MessageEvent).data.id === message.id;
        }
        return true;
      }),
      Stream.take(1),
      Stream.runCollect,
      Effect.forkChild,
    );
    // const fork = yield* stream.pipe(
    //   Stream.filter((chunk) => chunk.id === message.id),
    //   Stream.take(1),
    //   Stream.runCollect,
    //   Effect.fork,
    // );
    const url = new URL("/api/solc", location.origin);
    worker.postMessage({
      ...message,
      params: [url.toString(), version, ...message.params],
    });
    const exit = yield* Fiber.await(fork);
    const [event] = yield* exit.pipe(
      Effect.mapError(
        (error) =>
          new SolcWorkerError({ message: `Failed to await fork: ${error}` }),
      ),
    );
    if (event.type === "message") {
      return yield* Effect.succeed(
        (event as MessageEvent).data as JSONRpcResponse,
      );
    }
    if (event.type === "error") {
      return yield* Effect.fail(
        new SolcWorkerError((event as ErrorEvent).error),
      );
    }
    if (event.type === "messageerror") {
      return yield* Effect.fail(
        new SolcWorkerError((event as MessageEvent).data),
      );
    }
    return yield* Effect.die("Unknown event type");
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
  Layer.effect(Solc, SolcNext(config));

export const SolcNextLayer = setupSolcNextLayer();

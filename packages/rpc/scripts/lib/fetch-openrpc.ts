import * as path from "node:path";
import { Console, Effect, Schema, Stream } from "effect";
import { FileSystem } from "effect/FileSystem";
import { ChildProcess } from "effect/unstable/process";
import type { ChildProcessHandle } from "effect/unstable/process/ChildProcessSpawner";
import { OpenRpcDoc } from "./openrpc-schema.js";
import { cloneDir, openRpcCachePath, root } from "./paths.js";

const cloneCommand = ChildProcess.make(
  "git",
  [
    "clone",
    "git@github.com:ethereum/execution-apis.git",
    "--depth=1",
    "--branch=main",
    cloneDir,
  ],
  { cwd: root, stderr: "pipe", stdout: "pipe" },
);

const makeCommand = ChildProcess.make("make", ["build"], {
  cwd: cloneDir,
  stderr: "pipe",
  stdout: "pipe",
});

const collectStderr = (command: ChildProcessHandle) =>
  command.stderr
    .pipe(Stream.runCollect)
    .pipe(
      Effect.map((chunks) =>
        chunks.map((chunk) => new TextDecoder().decode(chunk)).join(""),
      ),
    );

export const fetchOpenRpcSpec = Effect.fn("fetchOpenRpcSpec")(function* () {
  const fs = yield* FileSystem;

  const exists = yield* fs.exists(openRpcCachePath);
  if (!exists) {
    {
      const command = yield* cloneCommand;
      yield* Console.log(yield* collectStderr(command));
    }
    {
      const command = yield* makeCommand;
      yield* Console.log(yield* collectStderr(command));
    }

    yield* fs.copyFile(
      path.resolve(cloneDir, "refs-openrpc.json"),
      openRpcCachePath,
    );
    yield* fs.remove(cloneDir, { recursive: true });
  }

  const openrpcFile = yield* fs.readFileString(openRpcCachePath);
  const decode = Schema.decodeUnknownEffect(Schema.fromJsonString(OpenRpcDoc));
  return yield* decode(openrpcFile, {
    onExcessProperty: "error",
  });
});

// git@github.com:ethereum/execution-apis.git

import { Chunk, Console, Effect, JSONSchema, Stream } from "effect";
import { NodeCommandExecutor, NodeFileSystem } from "@effect/platform-node";
import { CommandExecutor, Command, FileSystem } from "@effect/platform";
import yaml from "yaml";

import { fileURLToPath } from "url";
import path from "path";
import { JSONSchemaAnnotationId } from "effect/SchemaAST";
import { JsonSchema7Root } from "effect/JSONSchema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cloneDir = path.resolve(root, "execution-apis");
const schemasDir = path.resolve(cloneDir, "src");
const cloneCommand = Command.make(
  "git",
  "clone",
  "git@github.com:ethereum/execution-apis.git",
  "--depth=1",
  "--branch=main",
  cloneDir,
);

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const exists = yield* fs.exists(cloneDir);
  if (!exists) {
    const command = yield* cloneCommand.pipe(Command.start);
    const stderr = yield* command.stderr
      .pipe(Stream.runCollect)
      .pipe(Effect.map(Chunk.map((value) => new TextDecoder().decode(value))));
    yield* Console.log(stderr);
  }
  const files = yield* fs
    .readDirectory(schemasDir, { recursive: true })
    .pipe(
      Effect.map((files) => files.filter((file) => file.endsWith(".yaml"))),
    );

  const schemaFiles = yield* Effect.all(
    files.map((file) =>
      fs.readFileString(path.resolve(schemasDir, file)).pipe(
        Effect.map((content) => {
          return [
            file,
            content,
          ] as const;
        }),
      ),
    ),
  ).pipe(Effect.tryMap({
    try: (entries) => (entries.map(([file, content]) => [file.replace(".yaml", ""), yaml.parse(content) as JsonSchema7Root] as const)),
    catch: (error) => {
      return Effect.die(error);
    },
  }));
  const schemas = Object.fromEntries(schemaFiles);
  

  yield* Console.log(schemaFiles.filter(([file]) => file.startsWith("schemas/")));

  JSONSchema
  // yield* Console.log(command.stdout.pipe(Stream.runCollect))
  // yield* Console.log(command);
  // const command = yield* Command.start().pipe(

  // );
  // const result = yield* command.stdout.pipe()

  // console.log(result);
}).pipe(Effect.scoped);

Effect.runPromise(
  program.pipe(
    Effect.provide(NodeCommandExecutor.layer),
    Effect.provide(NodeFileSystem.layer),
  ),
);

import { HttpClient, HttpClientResponse } from "@effect/platform";
import { Data, Effect, Schema } from "effect";

const ResponseSchema = Schema.Struct({
  builds: Schema.Array(
    Schema.Struct({
      path: Schema.String,
      version: Schema.String,
      build: Schema.String,
      longVersion: Schema.String,
      keccak256: Schema.String,
      sha256: Schema.String,
      urls: Schema.Array(Schema.URL),
    }),
  ),
  releases: Schema.Record({
    key: Schema.String,
    value: Schema.String,
  }),
  latestRelease: Schema.String,
});

const LIST_URL = "https://binaries.soliditylang.org/bin/list.json";
export const getList = Effect.fn("getList")(function* () {
  const response = yield* HttpClient.get(LIST_URL).pipe(
    Effect.flatMap(HttpClientResponse.schemaBodyJson(ResponseSchema)),
  );

  return response;
});

class FetchBinaryError extends Data.TaggedError("FetchBinaryError")<{
  readonly message: string;
}> {}
export const fetchBinary = Effect.fn("fetchBinary")(function* (
  version: string,
) {
  const bin = yield* Effect.gen(function* () {
    if (/^\d+\.\d+\.\d+$/.test(version)) {
      const list = yield* getList();
      const release = list.releases[version];
      if (!release) {
        return yield* Effect.fail(
          new FetchBinaryError({ message: `Version ${version} not found` }),
        );
      }
      return yield* Effect.succeed(release);
    }
    return yield* Effect.succeed(version);
  });
  const BINARY_URL = `https://binaries.soliditylang.org/bin/${bin}`;
  yield* Effect.log(`Fetching binary from ${BINARY_URL}`);
  const response = yield* HttpClient.get(BINARY_URL).pipe(
    Effect.flatMap((response) => response.text),
  );

  return yield* Effect.succeed(response);
});

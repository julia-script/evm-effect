import { FetchHttpClient, HttpBody, HttpClient, HttpClientResponse } from "@effect/platform";
import { Effect, Layer, Schema } from "effect";
import { Rpc, RpcClient, RpcGroup, RpcSerialization } from "@effect/rpc";


class RequestError extends Schema.Class<RequestError>("RequestError")({
  errorMessage: Schema.String,
}) {}

// 👇 Rpc API group shared between server and client
export class RpcAuth extends RpcGroup.make(
  Rpc.make("SignUpRequest", {
    error: RequestError,
    success: Schema.Boolean,
    payload: {
      email: Schema.NonEmptyString,
      password: Schema.String,
    },
  })
) {}

const ProtocolLive = RpcClient.layerProtocolHttp({
  url: "/api/rpc",
}).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson]));

export class RpcAuthClient extends Effect.Service<RpcAuthClient>()(
  "RpcAuthClient",
  {
    dependencies: [ProtocolLive],
    scoped: RpcClient.make(RpcAuth),
  }
) {}

const rpcApiUrl = "http://127.0.0.1:8545";

const JsonRpcRequestSchema = Schema.Struct({
  id: Schema.Number,
  jsonrpc: Schema.Literal("2.0"),
  method: Schema.String,
  params: Schema.Unknown,
});
const JsonRpcResponseSchema = Schema.Struct({
  id: Schema.Number,
  jsonrpc: Schema.Literal("2.0"),
  result: Schema.Unknown,

});
const program = Effect.gen(function* () {
  // Access HttpClient
  const client = yield* HttpClient.HttpClient;

  // Create and execute a GET request
  const response = yield* client.post(`${rpcApiUrl}`, {
    body: yield* HttpBody.json({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: ["latest", false],
    }),
  }).pipe(
    Effect.map(HttpClientResponse.schemaBodyJson(JsonRpcResponseSchema))
  );

  const json = yield* response

  console.log(json);
}).pipe(
  // Provide the HttpClient
  Effect.provide(FetchHttpClient.layer),
);

Effect.runPromise(program);

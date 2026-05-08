import { FetchHttpClient } from "@effect/platform";
import {
  Rpc,
  RpcClient,
  RpcGroup,
  RpcSerialization,
  RpcTest,
} from "@effect/rpc";
// import { RpcMiddleware } from "@effect/rpc/RpcMiddleware";
import * as RpcMiddleware from "@effect/rpc/RpcMiddleware";
import * as Context from "@effect/experimental/";

// import RpcTest from "@effect/rpc/RpcTest";
import { Console, Effect, Layer, Schema } from "effect";

class RequestError extends Schema.Class<RequestError>("RequestError")({
  errorMessage: Schema.String,
}) {}

// 👇 Rpc API group shared between server and client
export class RpcAuth extends RpcGroup.make(
  Rpc.make("eth_blockNumber", {
    error: RequestError,
    success: Schema.String,
    payload: Schema.Void,
  }),
) {}

const ProtocolLive = RpcClient.layerProtocolHttp({
  url: "http://127.0.0.1:8545/",
}).pipe(
  Layer.provide([
    FetchHttpClient.layer,
    RpcSerialization.layerJsonRpc({
      contentType: "application/json",
    }),
  ]),
);

export class RpcAuthClient extends Effect.Service<RpcAuthClient>()(
  "RpcAuthClient",
  {
    dependencies: [ProtocolLive],
    scoped: RpcTest.makeClient(RpcAuth),
  },
) {}

const main = Effect.gen(function* () {
  const client = yield* RpcAuthClient;
  //   👇 `boolean` (as defined in `Rpc.make`)
  const response = yield* client

    .eth_blockNumber()

    .pipe(
      Effect.tapError(
        // 👇 `requestError` is the error type defined in `Rpc.make`
        (requestError) => Effect.log(requestError),
      ),
    );
  yield* Console.log(response);
}).pipe(Effect.provide(RpcAuthClient.Default));

Effect.runPromise(main);

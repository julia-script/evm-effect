import { inspect } from "node:util";
import { EthBaseTypesSchema } from "@evm-effect/ethereum-types/schemas/base-types";
import { Effect, MutableHashMap, Result, Schema } from "effect";

const program = Effect.gen(function* () {
  const schema = EthBaseTypesSchema.EntriesFromRecord(
    EthBaseTypesSchema.BytesFromString,
    EthBaseTypesSchema.BytesFromString,
  );

  const decode = Schema.decodeResult(schema);
  const encode = Schema.encodeResult(schema);
  const result = decode({
    "0x010203": "0x040506",
    "0x010101": "0x010101",
  });
  console.log(inspect(result, { depth: null, colors: true }));
  if (Result.isSuccess(result)) {
    console.log(MutableHashMap.fromIterable(result.success));
    const result2 = encode(result.success);
    console.log(inspect(result2, { depth: null, colors: true }));
  }
});

program.pipe(Effect.runPromise);

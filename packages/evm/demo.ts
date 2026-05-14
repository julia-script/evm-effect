import { writeHeapSnapshot } from "node:v8";
import { Address } from "@evm-effect/ethereum-types";
import { hash, uint8ArrayEquals } from "@evm-effect/ethereum-types/utils";
import { bufferFromHex } from "@evm-effect/shared/bytes";
import { HashMap } from "@evm-effect/shared/hashmap";
import { Effect, Equal, Hash, Schema } from "effect";

class MyClass extends Schema.TaggedClass<MyClass>("MyClass")("MyClass", {
  value: Schema.Uint8Array,
}) {
  [Equal.symbol](that: Equal.Equal): boolean {
    if (!(that instanceof MyClass)) {
      return false;
    }
    return uint8ArrayEquals(this.value, that.value);
  }
  [Hash.symbol](): number {
    return hash(this.value);
  }
}
const program = Effect.gen(function* () {
  const instances = HashMap.empty<Address, MyClass>();
  // const instances = new HashMap<, MyClass>();
  // console.log(hash);
  writeHeapSnapshot("heap.heapsnapshot", {
    exposeInternals: true,
    exposeNumericValues: true,
  });
  const another = new MyClass({ value: new Uint8Array(32) });

  for (let i = 0; i < 500000; i++) {
    const instance = new MyClass({
      value: bufferFromHex(i.toString(16).padStart(32, "0")),
    });
    const address = new Address({
      value: bufferFromHex(i.toString(16).padStart(32, "0")),
    });
    // const hash = yield* Effect.succeed(Hash.hash(address));
    // const rehash = yield* Effect.succeed(Hash.hash(address));

    HashMap.equals(instance, another);
    // const instanceHash = HashMap.getHash(instance);

    const collision = instances.get(address);
    if (collision) {
      console.log(
        "Collision detected",
        instance.value.toHex(),
        collision.value.toHex(),
        address.toHex(),
      );
    }
    instances.set(address, instance);
    // instances.set(Hash.hash(instance), instance);
  }

  writeHeapSnapshot("heap2.heapsnapshot", {
    exposeInternals: true,
    exposeNumericValues: true,
  });
  // console.log(getHeapSnapshot());
  // console.log(instance[Hash.symbol]() === instance[Hash.symbol]());
});

program.pipe(Effect.runPromise);

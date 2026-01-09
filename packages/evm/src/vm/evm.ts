/**
 * Ethereum Virtual Machine (EVM) State
 */

import {
  type Address,
  Bytes,
  type Bytes32,
  U256,
  type Uint,
} from "@evm-effect/ethereum-types";
import { HashSet } from "@evm-effect/shared/hashset";
import { Context, Data, Effect, Option, Ref, type Schema } from "effect";
import type { EthereumException } from "../exceptions.js";
import { StackOverflowError, StackUnderflowError } from "../exceptions.js";
import type { Log } from "../types/Receipt.js";
import type { Message } from "./message.js";
import type { Code } from "./runtime.js";
import type { StorageKey } from "./StorageKey.js";
export interface EvmEncoded {
  _tag: "Evm";
  pc: number;
  stack: Schema.Array$<typeof U256>["Encoded"];

  memory: (typeof Schema.Uint8Array)["Encoded"];
  code: (typeof Bytes)["Encoded"];
  gasLeft: (typeof Uint)["Encoded"];
  validJumpDestinations: Schema.Set$<typeof Uint>["Encoded"];
  logs: Schema.Array$<typeof Log>["Encoded"];
  refundCounter: number;
  running: boolean;
  message: Message;
  output: (typeof Bytes)["Encoded"];
  accountsToDelete: Schema.Set$<typeof Address>["Encoded"];
  returnData: (typeof Bytes)["Encoded"];
  accessedAddresses: Schema.Set$<typeof Address>["Encoded"];
  accessedStorageKeys: Schema.Set$<
    Schema.Tuple2<typeof Address, typeof Bytes32>
  >["Encoded"];
}

export class Stack extends Data.Class<{
  value: Ref.Ref<Array<U256>>;
}> {
  static make() {
    return Ref.make<Array<U256>>([]).pipe(
      Effect.map(
        (value) =>
          new Stack({
            value,
          }),
      ),
    );
  }

  pop() {
    const self = this;
    return Effect.gen(function* () {
      const stack = yield* Ref.get(self.value);
      if (stack.length === 0) {
        return yield* Effect.fail(new StackUnderflowError({}));
      }
      const popped = stack.pop() as U256;
      return popped;
    });
  }
  push(value: U256) {
    return Effect.gen(
      function* (this: Stack) {
        const stack = yield* Ref.get(this.value);
        if (stack.length >= 1024) {
          return yield* Effect.fail(
            new StackOverflowError({ message: "Stack overflow" }),
          );
        }
        yield* Ref.update(this.value, (stack) => {
          stack.push(value);
          return stack;
        });
      }.bind(this),
    );
  }
  swap(itemNumber: number) {
    const self = this;
    return Effect.gen(function* () {
      const stack = yield* Ref.get(self.value);
      if (stack.length === 0) {
        return yield* Effect.fail(new StackUnderflowError({}));
      }
      const lastIndex = stack.length - 1;
      const aIndex = lastIndex - itemNumber;
      if (aIndex < 0) {
        return yield* Effect.fail(new StackUnderflowError({}));
      }
      const a = stack[aIndex];
      stack[aIndex] = stack[lastIndex];
      stack[lastIndex] = a;
      return stack;
    });
  }
}
export class Evm extends Context.Tag("Evm")<
  Evm,
  {
    pc: Ref.Ref<number>;
    stack: Stack;
    memory: Ref.Ref<Uint8Array>;
    code: Code;
    gasLeft: Readonly<bigint>;
    validJumpDestinations: ReadonlySet<number>;
    logs: Ref.Ref<ReadonlyArray<Log>>;
    refundCounter: Ref.Ref<U256>;
    running: boolean;
    latch: Effect.Latch;
    message: Message;
    output: Ref.Ref<Bytes>;
    accountsToDelete: HashSet<Address>;
    touchedAccounts: HashSet<Address>;
    returnData: Ref.Ref<Bytes>;
    error: Ref.Ref<Option.Option<EthereumException>>;
    accessedAddresses: HashSet<Address>;
    accessedStorageKeys: HashSet<StorageKey>;

    incrementPC: (delta: number) => Effect.Effect<void, never, Evm>;
    setGasLeft: (gasLeft: bigint) => void;
  }
>() {
  static make(partial: {
    message: Message;
    validJumpDestinations?: ReadonlySet<number>;
  }) {
    return Effect.gen(function* () {
      const code = partial.message.code;
      let validJumpDestinations = partial.validJumpDestinations;
      if (!validJumpDestinations) {
        validJumpDestinations = yield* code.validJumpDestinations;
      }

      return Evm.of({
        pc: yield* Ref.make(0),
        stack: yield* Stack.make(),
        memory: yield* Ref.make<Uint8Array>(new Uint8Array(0)),
        code: code,
        gasLeft: partial.message.gas.value,
        validJumpDestinations: validJumpDestinations,
        logs: yield* Ref.make<ReadonlyArray<Log>>([]),
        refundCounter: yield* Ref.make(new U256({ value: 0n })),
        running: true,
        latch: yield* Effect.makeLatch(),
        output: yield* Ref.make<Bytes>(new Bytes({ value: new Uint8Array(0) })),
        accountsToDelete: HashSet.empty(),
        touchedAccounts: HashSet.empty(),
        returnData: yield* Ref.make<Bytes>(
          new Bytes({ value: new Uint8Array(0) }),
        ),
        error: yield* Ref.make<Option.Option<EthereumException>>(Option.none()),
        accessedAddresses: partial.message.accessedAddresses.clone(),
        accessedStorageKeys: partial.message.accessedStorageKeys.clone(),
        message: partial.message,

        incrementPC(delta: number) {
          return Ref.update(this.pc, (current) => current + delta);
        },
        setGasLeft(gasLeft: bigint) {
          this.gasLeft = gasLeft;
        },
      });
    });
  }
}

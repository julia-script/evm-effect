import {
  Address,
  type AnyBytesClass,
  type AnyUintClass,
  Bytes,
  Bytes0,
  Bytes1,
  Bytes4,
  Bytes8,
  Bytes20,
  Bytes32,
  Bytes64,
  Bytes256,
  U8,
  U32,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import type { Extended, Simple } from "@evm-effect/rlp";
import * as rlp from "@evm-effect/rlp";
import { stringify } from "@evm-effect/shared/stringify";
import { Effect, Predicate, Result, Schema } from "effect";
import type { Fork } from "./vm/ForkService.js";

export namespace Rlp {
  export const ToExtendedTag = Symbol("ToExtended");
  export interface ToExtendedTag {
    [ToExtendedTag]: (
      this: any,
    ) => Effect.Effect<Readonly<Extended>, RlpError, Fork>;
  }
  export class RlpError extends Schema.TaggedClass<RlpError>()("RlpError", {
    message: Schema.String,
  }) {
    static of(message: string): RlpError {
      return new RlpError({ message });
    }
    static cantDecode(clsName: string, simple: Readonly<Simple>): RlpError {
      return new RlpError({
        message: `\`${clsName}\` can't be decoded from ${stringify(simple)}`,
      });
    }

    static shouldBeDefinedOnEip(name: string, eip: number): RlpError {
      return new RlpError({
        message: `\`${name}\` should be defined when EIP-${eip} is enabled`,
      });
    }
    static shouldNotBeDefinedOnEip(name: string, eip: number): RlpError {
      return new RlpError({
        message: `\`${name}\` should not be defined when EIP-${eip} is enabled`,
      });
    }
  }
  export const toExtended = Effect.fn("toExtended")(function* <
    const _T extends {},
  >(
    encodable: ToExtendedTag,
  ): Effect.fn.Return<Readonly<Extended>, RlpError, Fork> {
    return yield* encodable[Rlp.ToExtendedTag]();
  });

  export const toExtendedList = Effect.fn("toExtendedList")(function* (
    encodables: Readonly<ToExtendedTag[]>,
  ): Effect.fn.Return<Readonly<Extended>, RlpError, Fork> {
    return yield* Effect.all(
      encodables.map((encodable) => Rlp.toExtended(encodable)),
    );
  });

  export const encode = Effect.fn("encode")(function* (
    encodable: Readonly<ToExtendedTag>,
  ) {
    const extended = yield* encodable[Rlp.ToExtendedTag]();

    return rlp.encode(extended);
  });

  export const FromSimpleTag = Symbol("FromExtended");

  type AnyDecodable =
    | AnyUintClass
    | AnyBytesClass
    | typeof Address
    | (abstract new (
        ...args: any
      ) => any & {
        [Rlp.FromSimpleTag]: (
          simple: Readonly<Simple>,
        ) => Effect.Effect<any, RlpError, Fork>;
      });

  const isDecodable = <T>(
    value: unknown,
  ): value is {
    [Rlp.FromSimpleTag]: (
      simple: Readonly<Simple>,
    ) => Effect.Effect<T, RlpError, Fork>;
  } & T => {
    return (
      Predicate.hasProperty(value, Rlp.FromSimpleTag) &&
      Predicate.isFunction(value[Rlp.FromSimpleTag])
    );
  };

  export const fromSimpleList = Effect.fn("fromSimpleList")(function* <
    T extends AnyDecodable,
  >(
    cls: T,
    simple: Simple,
  ): Effect.fn.Return<InstanceType<T>[], RlpError, Fork> {
    if (!Array.isArray(simple)) {
      return yield* Effect.fail(
        new RlpError({
          message: `Simple is not an array: ${stringify(simple)}`,
        }),
      );
    }
    return yield* Effect.all(simple.map((c) => Rlp.fromSimple(cls, c)));
  });
  export const fromSimple = Effect.fn("fromSimple")(function* <
    T extends AnyDecodable,
  >(
    cls: T,
    simple: Readonly<Simple>,
  ): Effect.fn.Return<InstanceType<T>, RlpError, Fork> {
    if (simple instanceof Bytes) {
      switch (cls) {
        case Uint:
          return Uint.fromBeBytes(simple.value) as InstanceType<T>;
        case U8:
          return U8.fromBeBytes(simple.value) as InstanceType<T>;
        case U32:
          return U32.fromBeBytes(simple.value) as InstanceType<T>;
        case U64:
          return U64.fromBeBytes(simple.value) as InstanceType<T>;
        case U256:
          return U256.fromBeBytes(simple.value) as InstanceType<T>;
        case Address:
          return Address.make({
            value: new Bytes20({ value: simple.value }),
          }) as InstanceType<T>;
        case Bytes0:
          return Bytes0.empty as InstanceType<T>;
        case Bytes1:
          return new Bytes1({ value: simple.value }) as InstanceType<T>;
        case Bytes4:
          return new Bytes4({ value: simple.value }) as InstanceType<T>;
        case Bytes8:
          return new Bytes8({ value: simple.value }) as InstanceType<T>;
        case Bytes20:
          return new Bytes20({ value: simple.value }) as InstanceType<T>;
        case Bytes32:
          return new Bytes32({ value: simple.value }) as InstanceType<T>;
        case Bytes64:
          return new Bytes64({ value: simple.value }) as InstanceType<T>;
        case Bytes256:
          return new Bytes256({ value: simple.value }) as InstanceType<T>;
        case Bytes:
          return simple as InstanceType<T>;
      }
    }

    if (isDecodable(cls)) {
      return (yield* cls[Rlp.FromSimpleTag](simple)) as InstanceType<T>;
    }

    return yield* Effect.fail(
      new RlpError({
        message: `${cls.name} is not decodable from ${stringify(simple)}`,
      }),
    );
  });

  export const decode = Effect.fn("decode")(function* (
    bytes: Bytes | Uint8Array,
  ): Effect.fn.Return<Simple, RlpError, Fork> {
    const result = rlp.decode(bytes);
    if (Result.isFailure(result)) {
      return yield* Effect.fail(
        new RlpError({ message: result.failure.message }),
      );
    }
    return result.success;
  });
}

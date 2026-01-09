import { Data, Effect, Hash, ParseResult, Schema } from "effect";

// export class HashMap<K, V> {
//   private readonly _map: Map<number, [K, V]>;
// }()
export class Entry<K, V> {
  constructor(
    readonly key: K,
    readonly value: V,
  ) {}
}
export class HashMap<K, V> extends Data.TaggedClass("HashMap")<{
  readonly _map: Map<number, Entry<K, V>>;
}> {
  constructor(map: Map<number, Entry<K, V>>) {
    super({ _map: map });
  }

  static fromIterable<K, V>(
    iterable: Iterable<[K, V]> | [K, V][],
  ): HashMap<K, V> {
    const map = new Map<number, Entry<K, V>>();
    for (const [key, value] of iterable) {
      map.set(Hash.hash(key), new Entry(key, value));
    }
    return new HashMap(map);
  }

  static empty<K, V>(): HashMap<K, V> {
    return new HashMap(new Map());
  }

  set(key: K, value: V) {
    const hash = Hash.hash(key);
    this._map.set(hash, new Entry(key, value));
  }
  get(key: K): V | undefined {
    const hash = Hash.hash(key);
    return this._map.get(hash)?.value;
  }
  remove(key: K) {
    const hash = Hash.hash(key);
    this._map.delete(hash);
  }
  has(key: K): boolean {
    const hash = Hash.hash(key);
    return this._map.has(hash);
  }
  getOrPut(key: K): {
    existing: boolean;
    entry: Entry<K, V | undefined>;
  } {
    const hash = Hash.hash(key);
    const entry = this._map.get(hash);
    if (entry) {
      return { existing: true, entry };
    }
    const newEntry = new Entry(key, undefined);
    this._map.set(hash, newEntry as never);
    return { existing: false, entry: newEntry };
  }
  *entries() {
    for (const entry of this._map.values()) {
      yield entry;
    }
  }

  get size() {
    return this._map.size;
  }
  *keys() {
    for (const entry of this._map.values()) {
      yield entry.key;
    }
  }
  *values() {
    for (const entry of this._map.values()) {
      yield entry.value;
    }
  }
  clear() {
    this._map.clear();
  }
  clone() {
    return new HashMap(new Map(this._map));
  }
  *[Symbol.iterator]() {
    for (const entry of this._map.values()) {
      yield entry;
    }
  }
}

export const HashMapFromSelf = <
  K extends Schema.Schema.All,
  V extends Schema.Schema.All,
>(
  _key: K,
  _value: V,
): HashMapFromSelf<K, V> =>
  Schema.instanceOf(HashMap<K["Encoded"], V["Encoded"]>);
export type HashMapFromSelf<
  K extends Schema.Schema.All,
  V extends Schema.Schema.All,
> = Schema.Schema<HashMap<K["Encoded"], V["Encoded"]>>;
// Schema.HashMap
// export interface HashMapFromRecord<
//   K extends Schema.Schema.All,
//   V extends Schema.Schema.All,
// > extends Schema.transformOrFail<
//     Schema.Record$<Schema.Schema.Type<K>, Schema.Schema.Type<V>>,
//     HashMapFromSelf<Schema.Schema.Encoded<K>, Schema.Schema.Encoded<V>>
//   > {}

// export const HashMapFromRecord = <
//   K extends Schema.Schema.All,
//   V extends Schema.Schema.All,
// >(
//   key: K,
//   value: V,
// )=>
// {
//   return Schema.declare(
//     [key, value],
//     {
//       decode: (fromA) => {
//         return ParseResult.decodeUnknown(
//           Schema.Record({
//             key:Schema.String,
//             value:Schema.Unknown,
//           }).pipe(
//             Schema.transform(
//               Schema.Array(Schema.Tuple(key, value)),
//               HashMapFromSelf(key, value),
//             )
//           )
//         )
//       },
//       encode: (toI) => {
//         return HashMapFromSelf(key, value)(toI);
//       },
//     },
//   );
// }
export const HashMapFromRecord = <KType, KEncoded, VType, VEncoded>(
  key: Schema.Schema<KType, KEncoded>,
  value: Schema.Schema<VType, VEncoded>,
) => {
  const from = Schema.Record({
    key: Schema.encodedSchema(key),
    value: Schema.encodedSchema(value),
  });
  const to = HashMapFromSelf(Schema.typeSchema(key), Schema.typeSchema(value));
  return Schema.transformOrFail(from, to, {
    strict: false,
    decode: (fromA) => {
      return ParseResult.decodeUnknown(Schema.Array(Schema.Tuple(key, value)))(
        Object.entries(fromA),
      ).pipe(
        Effect.map((entries) => {
          const hashMap = HashMap.empty<KType, VType>();
          for (let i = 0; i < entries.length; i++) {
            const key = entries[i][0];
            const value = entries[i][1];
            hashMap.set(key, value);
          }
          return hashMap;
        }),
      );
    },
    encode: (toI) => {
      const entries = [...toI.entries()].map(
        (entry) => [entry.key, entry.value] as const,
      );
      return ParseResult.encodeUnknown(Schema.Array(Schema.Tuple(key, value)))(
        entries,
      ).pipe(Effect.map((entries) => Object.fromEntries(entries)));
    },
  });
};

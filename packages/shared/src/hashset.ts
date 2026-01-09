import { Data, Hash, Schema } from "effect";

export class HashSet<V> extends Data.TaggedClass("HashSet")<{
  readonly _map: Map<number, V>;
}> {
  constructor(map: Map<number, V>) {
    super({ _map: map });
  }

  static empty<V>(): HashSet<V> {
    return new HashSet(new Map());
  }

  add(value: V) {
    const hash = Hash.hash(value);
    this._map.set(hash, value);
  }
  remove(value: V) {
    const hash = Hash.hash(value);
    this._map.delete(hash);
  }
  has(value: V): boolean {
    const hash = Hash.hash(value);
    return this._map.has(hash);
  }

  get size() {
    return this._map.size;
  }
  clear() {
    this._map.clear();
  }
  clone() {
    return new HashSet(new Map(this._map));
  }
  *[Symbol.iterator]() {
    for (const entry of this._map.values()) {
      yield entry;
    }
  }
}

export const HashSetFromSelf = <V extends Schema.Schema.All>(
  _value: V,
): HashSetFromSelf<V> => Schema.instanceOf(HashSet<V["Encoded"]>);
export type HashSetFromSelf<V extends Schema.Schema.All> = Schema.Schema<
  HashSet<Schema.Schema.Type<V>>
>;
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
// export const HashMapFromRecord = <KType, KEncoded, VType, VEncoded>(
//   key: Schema.Schema<KType, KEncoded>,
//   value: Schema.Schema<VType, VEncoded>,
// ) => {
//   const from = Schema.Record({
//     key: Schema.encodedSchema(key),
//     value: Schema.encodedSchema(value),
//   });
//   const to = HashMapFromSelf(Schema.typeSchema(key), Schema.typeSchema(value));
//   return Schema.transformOrFail(from, to, {
//     strict: false,
//     decode: (fromA) => {
//       return ParseResult.decodeUnknown(Schema.Array(Schema.Tuple(key, value)))(
//         Object.entries(fromA),
//       ).pipe(
//         Effect.map((entries) => {
//           const hashMap = HashMap.empty<KType, VType>();
//           for (let i = 0; i < entries.length; i++) {
//             const key = entries[i][0];
//             const value = entries[i][1];
//             hashMap.set(key, value);
//           }
//           return hashMap;
//         }),
//       );
//     },
//     encode: (toI) => {
//       const entries = [...toI.entries()].map(
//         (entry) => [entry.key, entry.value] as const,
//       );
//       return ParseResult.encodeUnknown(Schema.Array(Schema.Tuple(key, value)))(
//         entries,
//       ).pipe(Effect.map((entries) => Object.fromEntries(entries)));
//     },
//   });
// };

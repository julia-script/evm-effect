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

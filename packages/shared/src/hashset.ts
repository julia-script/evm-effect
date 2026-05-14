import { Data, Equal, Schema } from "effect";
import { HashMap } from "./hashmap.js";

export class HashSet<V> extends Data.TaggedClass("HashSet")<{
  readonly _map: Map<number, V[]>;
}> {
  constructor(map: Map<number, V[]>) {
    super({ _map: map });
  }

  static empty<V>(): HashSet<V> {
    return new HashSet(new Map());
  }

  add(value: V) {
    const hash = HashMap.getHash(value);
    let entries = this._map.get(hash) || [];
    const index = entries.findIndex((entry) => Equal.equals(entry, value));
    if (index === -1) {
      entries = [...entries, value];
    }
    this._map.set(hash, entries);
  }
  remove(value: V) {
    const hash = HashMap.getHash(value);
    let entries = this._map.get(hash) || [];
    const index = entries.findIndex((entry) => Equal.equals(entry, value));
    if (index === -1) return;
    entries = [...entries.slice(0, index), ...entries.slice(index + 1)];

    if (entries.length === 0) {
      this._map.delete(hash);
    } else {
      this._map.set(hash, entries);
    }
  }
  has(value: V): boolean {
    const hash = HashMap.getHash(value);
    return (
      this._map.get(hash)?.some((entry) => Equal.equals(entry, value)) ?? false
    );
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
    for (const entries of this._map.values()) {
      for (const entry of entries) {
        yield entry;
      }
    }
  }
}

export const HashSetFromSelf = <V extends Schema.Top>(
  _value: V,
): HashSetFromSelf<V> => Schema.instanceOf(HashSet<Schema.Schema.Type<V>>);
export type HashSetFromSelf<V extends Schema.Top> = Schema.Schema<
  HashSet<Schema.Schema.Type<V>>
>;

import { Match, Predicate } from "effect";

export const startWith =
  <T extends string>(prefix: T) =>
  (value: unknown): value is `${T}${string}` =>
    Predicate.isString(value) && value.startsWith(prefix);
const pattern = (
  pattern: RegExp | string,
): Predicate.Refinement<unknown, string> => {
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  return (value: unknown): value is string =>
    Predicate.isString(value) && regex.test(value);
};

const hasTag = <T>(value: T): value is T & { _tag: string } => {
  return Predicate.hasProperty(value, "_tag") && Predicate.isString(value._tag);
};

export const tagStartWith = <T extends string>(prefix: T) => {
  return <V>(value: V): value is V & { _tag: `${T}${string}` } => {
    return hasTag(value) && value._tag.startsWith(prefix);
  };
};

const propertyMatch =
  <Property extends string, Out>(
    property: Property,
    predicate: Predicate.Refinement<unknown, Out>,
  ) =>
  <V>(value: V): value is V & { [K in Property]: Out } => {
    return Predicate.hasProperty(value, property) && predicate(value[property]);
  };

// // const propertyMatch2 = <In, Property extends string, Out>(
// //   value: In,
// //   property: Property,
// //   predicate: Predicate.Refinement<unknown, Out>,
// // ) => Predicate.and(
// //   Predicate.hasProperty(value, property),
// //   predicate,
// // )

// type Byteish = { _tag: `Bytes${number}` | "Bytes"; value: Uint8Array };
// export const isByteish = (value: unknown): value is Byteish => {
//   return tagStartWith("Bytes")(value);
// };
// const isBytish2 = Predicate.and(
//   tagStartWith("Bytes"),
//   Predicate.and(
//     Predicate.hasProperty("value"),
//     (value): value is { value: Uint8Array } => Predicate.isUint8Array(value.value),
//     // Predicate.isUint8Array,
//   )
// );

export const stringify = (value: unknown) => {
  const replacer = (_: string, value: unknown) => {
    return Match.value(value).pipe(
      Match.when(Predicate.isBigInt, (value) => value.toString()),
      Match.when(
        Predicate.and(
          propertyMatch("_tag", pattern(/^Uint|U[0-9]+$/)),
          propertyMatch("value", Predicate.isBigInt),
        ),
        (value) => `${value._tag}(${value.value})`,
      ),
      Match.when(
        Predicate.and(
          propertyMatch("value", Predicate.isUint8Array),
          propertyMatch("_tag", pattern("^Bytes\\d{0,3}$")),
        ),
        (value) => `${value._tag}(0x${value.value.toHex() || "00"})`,
      ),
      // this match is just to hoist the _tag property for readability in the logs
      Match.when(Predicate.hasProperty("_tag"), ({ _tag, ...value }) => ({
        _tag,
        ...value,
      })),

      Match.orElse((value) => value),
    );
  };
  // inspect(value, { depth: null, colors: true })
  const replaced = JSON.stringify(value, replacer, 2);
  return replaced;
};

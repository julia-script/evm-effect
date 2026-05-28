# @evm-effect/rpc

## 0.2.1

### Patch Changes

- Updated dependencies [[`5b7a4dc`](https://github.com/julia-script/evm-effect/commit/5b7a4dcb0e6fb29e6b89752b8007d2af274a6df9)]:
  - @evm-effect/ethereum-types@0.1.1

## 0.2.0

### Minor Changes

- [`96c5c1f`](https://github.com/julia-script/evm-effect/commit/96c5c1f3a88a7b8459b6ee39c256c8832b9e1582) Thanks [@julia-script](https://github.com/julia-script)! - - Restructure package exports: the main entry default-exports component schemas; the `/schemas` entry exports `{ Components, Rpc }` namespaces instead of flat re-exports.
  - Clean up generated RPC/schema import formatting.
  - Switch monorepo TypeScript config to `module: esnext` and `moduleResolution: bundler` for improved bundler compatibility.

## 0.1.2

### Patch Changes

- [`1fad287`](https://github.com/julia-script/evm-effect/commit/1fad28797e3fa4f79927d3c1a80df4d45087af4d) Thanks [@julia-script](https://github.com/julia-script)! - - Align RPC codegen scripts with ESM `.js` runtime imports and updated OpenRPC schema typing.
  - Switch generated schema imports to `@evm-effect/ethereum-types` package entrypoint and refresh generated RPC/schema outputs.

## 0.1.1

### Patch Changes

- [`4fe7633`](https://github.com/julia-script/evm-effect/commit/4fe76338f3796d65f0b264731f1ad32230130cb6) Thanks [@julia-script](https://github.com/julia-script)! - - Add `as const` to generated RPC method names for literal type inference.

  - Fix codegen import path for `JsonSchemaEncoded` (`openrpc-schema.ts`).

- [`71dcab0`](https://github.com/julia-script/evm-effect/commit/71dcab0ea7743a230eb22570031092dd9c220456) Thanks [@julia-script](https://github.com/julia-script)! - - Generate required transaction `type` fields with `Schema.tag` from OpenRPC patterns instead of bigint refinements.
  - Emit struct `type` properties first in generated schemas for consistent field ordering.

## 0.1.0

### Minor Changes

- [`8743399`](https://github.com/julia-script/evm-effect/commit/8743399b3708fad1f68c8e1f422242d66a8c1e2a) Thanks [@julia-script](https://github.com/julia-script)! - - Restructure schema modules: hand-written codecs live in `@evm-effect/ethereum-types/schemas/base-types.ts`; OpenRPC-generated RPC structs live in `@evm-effect/rpc` (`src/schemas/generated-schemas.ts`).
  - Add `EthTypes` namespace on the ethereum-types entrypoint (primitives and base codecs). RPC schemas export from `@evm-effect/rpc`.
  - Add hex/string codecs for Ethereum primitives (`Bytes*`, `Address`, `Uint`, `U8`, `U32`, `U64`, `U256`, `Int`) plus `EntriesFromRecord` / `HashMapFromRecord` helpers.
  - Add `U32` numeric type and include it in `AnyUint` / `FixedUnsigned` unions.
  - Expand `gen-schemas` to generate Effect schemas from [ethereum/execution-apis](https://github.com/ethereum/execution-apis) OpenRPC specs (Biome formatting).
  - Bump Effect catalog to `4.0.0-beta.66`.

### Patch Changes

- Updated dependencies [[`8743399`](https://github.com/julia-script/evm-effect/commit/8743399b3708fad1f68c8e1f422242d66a8c1e2a), [`e74c16c`](https://github.com/julia-script/evm-effect/commit/e74c16c64c1419d14b39de14ed77d35c4c6c6435)]:
  - @evm-effect/ethereum-types@0.1.0

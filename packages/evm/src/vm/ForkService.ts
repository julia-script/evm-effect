import type { Address } from "@evm-effect/ethereum-types";
import type { HashMap } from "@evm-effect/shared/hashmap";
import { Context, type Effect, Layer, Option } from "effect";
import type { EthereumException } from "../exceptions.js";
import type { Evm } from "./evm.js";
import type { OpcodeImplementation } from "./opcodes.js";

export type OpcodeHashMap = Map<number, OpcodeImplementation>;
export type PrecompileHashMap = HashMap<
  Address,
  Effect.Effect<void, EthereumException, Evm | Fork>
>;
export class Fork extends Context.Service<
  Fork,
  {
    name: string;
    precompiledContracts: PrecompileHashMap;
    ops: OpcodeHashMap;
    getPrecompiledContract: (
      address: Address,
    ) => Option.Option<Effect.Effect<void, EthereumException, Evm | Fork>>;
    getOp: (opcode: number) => OpcodeImplementation | undefined;
    eip: (n: number) => boolean;
    eipSelect: <T>(eip: number, left: T, right: T) => T;
    isForkBlock: boolean;
  }
>()("Fork") {
  static from({
    name,
    precompiledContracts,
    ops,
    EIPs = [],
    isForkBlock = false,
  }: {
    name: string;
    precompiledContracts: PrecompileHashMap;
    ops: OpcodeHashMap;
    EIPs: number[];
    isForkBlock?: boolean;
  }) {
    const eips = new Set(EIPs);
    const eip = (n: number) => eips.has(n);

    return Layer.succeed(
      Fork,
      Fork.of({
        name,
        precompiledContracts,
        ops,
        getPrecompiledContract: (address: Address) =>
          Option.fromNullishOr(precompiledContracts.get(address)),
        getOp: (opcode: number) => ops.get(opcode),
        eip,
        eipSelect: <T>(n: number, left: T, right: T) => (eip(n) ? left : right),
        isForkBlock,
      }),
    );
  }
}

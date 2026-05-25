import type { Address } from "@evm-effect/ethereum-types";
import type { HashMap } from "@evm-effect/shared/hashmap";
import { Context, type Effect, Layer, Option } from "effect";
import type { EthereumException } from "../exceptions.js";
import type { Evm } from "./evm.js";
import type { BlockEnvironment } from "./message.js";
import type { OpcodeImplementation } from "./opcodes.js";

export type ForkCriteria =
  | {
      _tag: "byBlockNumber";
      blockNumber: bigint;
    }
  | {
      _tag: "byTimestamp";
      timestamp: bigint;
    };
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
    forkCriteria?: ForkCriteria | undefined;
    blockEip: Record<number, (blockEnv: BlockEnvironment) => boolean>;
  }
>()("Fork") {
  static from({
    name,
    precompiledContracts,
    ops,
    EIPs = [],
    isForkBlock = false,
    forkCriteria,
    blockEip,
  }: {
    name: string;
    precompiledContracts: PrecompileHashMap;
    ops: OpcodeHashMap;
    EIPs: number[];
    isForkBlock?: boolean;
    forkCriteria?: ForkCriteria;
    blockEip?: Record<number, (blockEnv: BlockEnvironment) => boolean>;
  }) {
    const eips = new Set(EIPs);
    const eip = (n: number) => {
      if (!eips.has(n)) {
        return false;
      }
      return true;
    };

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
        forkCriteria,
        blockEip: blockEip ?? {},
      }),
    );
  }
}

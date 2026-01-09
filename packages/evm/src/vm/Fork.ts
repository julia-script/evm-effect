import { Address } from "@evm-effect/ethereum-types";
import { HashMap } from "@evm-effect/shared/hashmap";
import { Context, type Effect, Layer, Option } from "effect";
import type { EthereumException } from "../exceptions.js";
import type { Evm } from "./evm.js";
import {
  BASE_OPCODES,
  BERLIN_OPCODES,
  BYZANTIUM_OPCODES,
  CANCUN_OPCODES,
  CONSTANTINOPLE_OPCODES,
  HOMESTEAD_OPCODES,
  ISTANBUL_OPCODES,
  LONDON_OPCODES,
  type OpcodeImplementation,
  OSAKA_OPCODES,
  PARIS_OPCODES,
  PETERSBURG_OPCODES,
  PRAGUE_OPCODES,
  SHANGHAI_OPCODES,
} from "./opcodes.js";
import { kzgPointEvaluation } from "./precompiles/0a-kzg-point-evaluation.js";
import { bls12G1Add } from "./precompiles/0b-bls12-g1add.js";
import { bls12G1Msm } from "./precompiles/0c-bls12-g1msm.js";
import { bls12G2Add } from "./precompiles/0d-bls12-g2add.js";
import { bls12G2Msm } from "./precompiles/0e-bls12-g2msm.js";
import { bls12Pairing } from "./precompiles/0f-bls12-pairing.js";
import { erecover } from "./precompiles/01-erecover.js";
import { sha256 } from "./precompiles/02-sha256.js";
import { ripemd160 } from "./precompiles/03-ripemd160.js";
import { identity } from "./precompiles/04-identity.js";
import { bn254Add } from "./precompiles/06-bn254-add.js";
import { bn254Mul } from "./precompiles/07-bn254-mul.js";
import { bn254Pairing } from "./precompiles/08-bn254-pairing.js";
import { blake2f } from "./precompiles/09-blake2f.js";
import { bls12MapFpToG1 } from "./precompiles/10-bls12-map-fp-to-g1.js";
import { bls12MapFp2ToG2 } from "./precompiles/11-bls12-map-fp2-to-g2.js";
import { modexp } from "./precompiles/modexp.js";

type PrecompileEntry = [
  Address,
  Effect.Effect<void, EthereumException, Evm | Fork>,
];
// Frontier precompiles (from genesis)
const FRONTIER_PRECOMPILES: PrecompileEntry[] = [
  [
    new Address("0000000000000000000000000000000000000001"),

    erecover,
  ],
  [new Address("0000000000000000000000000000000000000002"), sha256],
  [new Address("0000000000000000000000000000000000000003"), ripemd160],
  [new Address("0000000000000000000000000000000000000004"), identity],
];

const HOMESTEAD_PRECOMPILES: PrecompileEntry[] = [...FRONTIER_PRECOMPILES];

// Byzantium added modexp (EIP-198) and bn254 (EIP-196, EIP-197)
const BYZANTIUM_PRECOMPILES: PrecompileEntry[] = [
  ...HOMESTEAD_PRECOMPILES,
  [new Address("0000000000000000000000000000000000000005"), modexp],
  [new Address("0000000000000000000000000000000000000006"), bn254Add],
  [new Address("0000000000000000000000000000000000000007"), bn254Mul],
  [new Address("0000000000000000000000000000000000000008"), bn254Pairing],
];

const CONSTANTINOPLE_PRECOMPILES: PrecompileEntry[] = [
  ...BYZANTIUM_PRECOMPILES,
];

const PETERSBURG_PRECOMPILES: PrecompileEntry[] = [
  ...CONSTANTINOPLE_PRECOMPILES,
];

// Istanbul added BLAKE2F (EIP-152)
const ISTANBUL_PRECOMPILES: PrecompileEntry[] = [
  ...PETERSBURG_PRECOMPILES,
  [new Address("0000000000000000000000000000000000000009"), blake2f],
];

const BERLIN_PRECOMPILES: PrecompileEntry[] = [...ISTANBUL_PRECOMPILES];

const LONDON_PRECOMPILES: PrecompileEntry[] = [...BERLIN_PRECOMPILES];

const PARIS_PRECOMPILES: PrecompileEntry[] = [...LONDON_PRECOMPILES];
const SHANGHAI_PRECOMPILES: PrecompileEntry[] = [...PARIS_PRECOMPILES];
// Cancun added KZG point evaluation (EIP-4844)
const CANCUN_PRECOMPILES: PrecompileEntry[] = [
  ...SHANGHAI_PRECOMPILES,
  [new Address("000000000000000000000000000000000000000A"), kzgPointEvaluation],
];

const PRAGUE_PRECOMPILES: PrecompileEntry[] = [
  ...CANCUN_PRECOMPILES,
  [new Address("000000000000000000000000000000000000000B"), bls12G1Add],
  [new Address("000000000000000000000000000000000000000C"), bls12G1Msm],
  [new Address("000000000000000000000000000000000000000D"), bls12G2Add],
  [new Address("000000000000000000000000000000000000000E"), bls12G2Msm],
  [new Address("000000000000000000000000000000000000000F"), bls12Pairing],
  [new Address("0000000000000000000000000000000000000010"), bls12MapFpToG1],
  [new Address("0000000000000000000000000000000000000011"), bls12MapFp2ToG2],
];

const FRONTIER_EIPS: number[] = [];
const HOMESTEAD_EIPS: number[] = [...FRONTIER_EIPS];
const TANGERINE_WHISTLE_EIPS = [
  ...HOMESTEAD_EIPS,
  150, // EIP-150: Gas cost changes for IO-heavy operations (Tangerine Whistle)
];

const SPURIUS_DRAGON_EIPS = [
  ...TANGERINE_WHISTLE_EIPS,
  // - [EIP-155: Simple replay attack protection][EIP-155]
  155, // EIP-155: Simple replay attack protection
  // - [EIP-160: EXP cost increase][EIP-160]
  160, // EIP-160: EXP cost increase
  // - [EIP-161: State trie clearing (invariant-preserving alternative)][EIP-161]
  161, // EIP-161: State trie clearing (invariant-preserving alternative)
  // - [EIP-170: Contract code size limit][EIP-170]
  170, // EIP-170: Contract code size limit
];

const BYZANTIUM_EIPS = [
  ...SPURIUS_DRAGON_EIPS,
  // - [EIP-100: Change difficulty adjustment to target mean block time including
  //   uncles][EIP-100]
  // - [EIP-140: REVERT instruction in the Ethereum Virtual Machine][EIP-140]
  // - [EIP-196: Precompiled contracts for addition and scalar multiplication on the
  //   elliptic curve alt_bn128][EIP-196]
  // - [EIP-197: Precompiled contracts for optimal ate pairing check on the elliptic
  //   curve alt_bn128][EIP-197]
  // - [EIP-198: Precompiled contract for bigint modular exponentiation][EIP-198]
  // - [EIP-211: New opcodes: RETURNDATASIZE and RETURNDATACOPY][EIP-211]
  // - [EIP-214: New opcode STATICCALL][EIP-214]
  // - [EIP-649: Difficulty Bomb Delay and Block Reward Reduction][EIP-649]
  // - [EIP-658: Embedding transaction status code in receipts][EIP-658]
  100, // EIP-100: Change difficulty adjustment to target mean block time including uncles
  140, // EIP-140: REVERT instruction in the Ethereum Virtual Machine
  196, // EIP-196: Precompiled contracts for addition and scalar multiplication on the elliptic curve alt_bn128
  197, // EIP-197: Precompiled contracts for optimal ate pairing check on the elliptic curve alt_bn128
  198, // EIP-198: Precompiled contract for bigint modular exponentiation
  211, // EIP-211: New opcodes: RETURNDATASIZE and RETURNDATACOPY
  214, // EIP-214: New opcode STATICCALL
  649, // EIP-649: Difficulty Bomb Delay and Block Reward Reduction
  658, // EIP-658: Embedding transaction status code in receipts
];
const CONSTANTINOPLE_EIPS = [
  ...BYZANTIUM_EIPS,
  145, // EIP-145: Bitwise shifting instructions in EVM
  1014, // EIP-1014: Skinny CREATE2
  1052, // EIP-1052: EXTCODEHASH opcode
  1234, // EIP-1234: Constantinople Difficulty Bomb Delay and Block Reward Adjustment
  1283, // EIP-1283: Net gas metering for SSTORE without dirty maps
];

// Petersburg/ConstantinopleFix removed EIP-1283 due to reentrancy concerns (EIP-1716)
const PETERSBURG_EIPS = [
  ...BYZANTIUM_EIPS,
  145, // EIP-145: Bitwise shifting instructions in EVM
  1014, // EIP-1014: Skinny CREATE2
  1052, // EIP-1052: EXTCODEHASH opcode
  1234, // EIP-1234: Constantinople Difficulty Bomb Delay and Block Reward Adjustment
  // Note: EIP-1283 is NOT included (disabled by EIP-1716)
];

const ISTANBUL_EIPS = [
  ...PETERSBURG_EIPS,
  152, // EIP-152: Add BLAKE2 compression function `F` precompile
  1108, // EIP-1108: Reduce alt_bn128 precompile gas costs
  1344, // EIP-1344: ChainID opcode
  1884, // EIP-1884: Repricing for trie-size-dependent opcodes
  2028, // EIP-2028: Transaction data gas cost reduction
  2200, // EIP-2200: Structured Definitions for Net Gas Metering
];

const MUIR_GLACIER_EIPS = [
  ...ISTANBUL_EIPS,
  2384, // EIP-2384: Muir Glacier Difficulty Bomb Delay
];

// EIP activation by fork (from ethereum/execution-specs)
const BERLIN_EIPS = [
  ...MUIR_GLACIER_EIPS,
  2565, // EIP-2565: ModExp Gas Cost
  2929, // EIP-2929: Gas cost increases for state access opcodes
  2718, // EIP-2718: Typed Transaction Envelope
  2930, // EIP-2930: Optional access lists
];

const LONDON_EIPS = [
  ...BERLIN_EIPS,
  1559, // EIP-1559: Fee market change for ETH 1.0 chain
  3198, // EIP-3198: BASEFEE opcode
  3529, // EIP-3529: Reduction in refunds
  3541, // EIP-3541: Reject new contract code starting with the 0xEF byte
  3554, // EIP-3554: Difficulty Bomb Delay to December 2021
];

const PARIS_EIPS = [
  ...LONDON_EIPS,
  3675, // EIP-3675: Upgrade consensus to Proof-of-Stake
  4399, // EIP-4399: Supplant DIFFICULTY opcode with PREVRANDAO
];

const SHANGHAI_EIPS = [
  ...PARIS_EIPS,
  3651, // EIP-3651: Warm COINBASE
  3855, // EIP-3855: PUSH0 instruction
  3860, // EIP-3860: Limit and meter initcode
  4895, // EIP-4895: Beacon chain push withdrawals as operations

  // - [EIP-6049: Deprecate SELFDESTRUCT][EIP-6049]
  6049, // EIP-6049: Deprecate SELFDESTRUCT
];

const CANCUN_EIPS = [
  ...SHANGHAI_EIPS,
  // 1153, // EIP-1153: Transient storage opcodes
  // 4788, // EIP-4788: Beacon block root in the EVM
  // 4844, // EIP-4844: Shard Blob Transactions
  // 5656, // EIP-5656: MCOPY - Memory copying instruction
  // 6780, // EIP-6780: SELFDESTRUCT only in same transaction
  // 7044, // EIP-7044: Perpetually Valid Signed Voluntary Exits
  // 7045, // EIP-7045: Increase Max Attestation Inclusion Slot
  // 7514, // EIP-7514: Add Max Epoch Churn Limit
  // 7516, // EIP-7516: BLOBBASEFEE opcode

  1153, // - [EIP-1153: Transient storage opcodes][EIP-1153]
  4788, // - [EIP-4788: Beacon block root in the EVM][EIP-4788]
  4844, // - [EIP-4844: Shard Blob Transactions][EIP-4844]
  5656, // - [EIP-5656: MCOPY - Memory copying instruction][EIP-5656]
  6780, // - [EIP-6780: SELFDESTRUCT only in same transaction][EIP-6780]
  7516, // - [EIP-7516: BLOBBASEFEE instruction][EIP-7516]
];

const PRAGUE_EIPS = [
  ...CANCUN_EIPS,
  2537, // EIP-2537: Precompile for BLS12-381 curve operations
  2935, // EIP-2935: Serve historical block hashes from state
  6110, // EIP-6110: Supply validator deposits on chain
  7002, // EIP-7002: Execution layer triggerable exits
  7251, // EIP-7251: Increase the MAX_EFFECTIVE_BALANCE
  7549, // EIP-7549: Move committee index outside Attestation
  7623, // EIP-7623: Increase calldata cost
  7685, // EIP-7685: General purpose execution layer requests
  7691, // EIP-7691: Blob throughput increase
  7702, // EIP-7702: Set EOA account code
];

const OSAKA_EIPS = [
  ...PRAGUE_EIPS,
  7594, // EIP-7594: PeerDAS - Peer Data Availability Sampling
  7823, // EIP-7823: Set upper bounds for MODEXP
  7825, // EIP-7825: Transaction Gas Limit Cap
  7883, // EIP-7883: ModExp Gas Cost Increase
  7918, // EIP-7918: Blob base fee bounded by execution cost
  7934, // EIP-7934: RLP Execution Block Size Limit
  7939, // EIP-7939: Count leading zeros (CLZ) opcode
  7951, // EIP-7951: Precompile for secp256r1 Curve Support
  7892, // EIP-7892: Blob Parameter Only Hardforks
  7642, // EIP-7642: eth/69 - history expiry and simpler receipts
  7910, // EIP-7910: eth_config JSON-RPC Method
];

type PrecompileHashMap = HashMap<
  Address,
  Effect.Effect<void, EthereumException, Evm | Fork>
>;
type OpcodeHashMap = Map<number, OpcodeImplementation>;
export class Fork extends Context.Tag("Fork")<
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
>() {
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
          Option.fromNullable(precompiledContracts.get(address)),
        getOp: (opcode: number) => ops.get(opcode),
        eip,
        eipSelect: <T>(n: number, left: T, right: T) => (eip(n) ? left : right),
        isForkBlock,
      }),
    );
  }

  static osaka() {
    return Fork.from({
      name: "osaka",
      precompiledContracts: HashMap.fromIterable(PRAGUE_PRECOMPILES),
      ops: OSAKA_OPCODES,
      EIPs: OSAKA_EIPS,
    });
  }
  static prague() {
    return Fork.from({
      name: "prague",
      precompiledContracts: HashMap.fromIterable(PRAGUE_PRECOMPILES),
      ops: PRAGUE_OPCODES,
      EIPs: PRAGUE_EIPS,
    });
  }
  static cancun() {
    return Fork.from({
      name: "cancun",
      precompiledContracts: HashMap.fromIterable(CANCUN_PRECOMPILES),
      ops: CANCUN_OPCODES,
      EIPs: CANCUN_EIPS,
    });
  }
  static shanghai() {
    return Fork.from({
      name: "shanghai",
      precompiledContracts: HashMap.fromIterable(SHANGHAI_PRECOMPILES),
      ops: SHANGHAI_OPCODES,
      EIPs: SHANGHAI_EIPS,
    });
  }
  static paris() {
    return Fork.from({
      name: "paris",
      precompiledContracts: HashMap.fromIterable(PARIS_PRECOMPILES),
      ops: PARIS_OPCODES,
      EIPs: PARIS_EIPS,
    });
  }

  static london() {
    return Fork.from({
      name: "london",
      precompiledContracts: HashMap.fromIterable(LONDON_PRECOMPILES),
      ops: LONDON_OPCODES,
      EIPs: LONDON_EIPS,
    });
  }
  static berlin() {
    return Fork.from({
      name: "berlin",
      precompiledContracts: HashMap.fromIterable(BERLIN_PRECOMPILES),
      ops: BERLIN_OPCODES,
      EIPs: BERLIN_EIPS,
    });
  }

  static istantbul() {
    return Fork.from({
      name: "istantbul",
      precompiledContracts: HashMap.fromIterable(ISTANBUL_PRECOMPILES),
      ops: ISTANBUL_OPCODES,
      EIPs: ISTANBUL_EIPS,
    });
  }
  static constantinople() {
    return Fork.from({
      name: "constantinople",
      precompiledContracts: HashMap.fromIterable(CONSTANTINOPLE_PRECOMPILES),
      ops: CONSTANTINOPLE_OPCODES,
      EIPs: CONSTANTINOPLE_EIPS,
    });
  }

  static petersburg() {
    return Fork.from({
      name: "petersburg",
      precompiledContracts: HashMap.fromIterable(PETERSBURG_PRECOMPILES),
      ops: PETERSBURG_OPCODES,
      EIPs: PETERSBURG_EIPS,
    });
  }

  static byzantium() {
    return Fork.from({
      name: "byzantium",
      precompiledContracts: HashMap.fromIterable(BYZANTIUM_PRECOMPILES),
      ops: BYZANTIUM_OPCODES,
      EIPs: BYZANTIUM_EIPS,
    });
  }

  static homestead() {
    return Fork.from({
      name: "homestead",
      precompiledContracts: HashMap.fromIterable(HOMESTEAD_PRECOMPILES),
      ops: HOMESTEAD_OPCODES,
      EIPs: HOMESTEAD_EIPS,
    });
  }
  static frontier() {
    return Fork.from({
      name: "frontier",
      precompiledContracts: HashMap.fromIterable(FRONTIER_PRECOMPILES),
      ops: BASE_OPCODES,
      EIPs: FRONTIER_EIPS,
    });
  }
}

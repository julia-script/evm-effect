/**
 * EVM Instruction Encoding (Opcodes)
 *
 * Machine-readable representations of EVM instructions, and a mapping to their
 * implementations.
 */

import type { Effect } from "effect";
import type { EthereumException } from "../exceptions.js";
import type { Evm } from "./evm.js";
import type { Fork } from "./Fork.js";
import * as Arithmetic from "./instructions/arithmetic.js";
import * as Bitwise from "./instructions/bitwise.js";
import * as Block from "./instructions/block.js";
import * as Comparison from "./instructions/comparison.js";
import * as ControlFlow from "./instructions/control_flow.js";
import * as Environment from "./instructions/environment.js";
import * as Keccak from "./instructions/keccak.js";
import * as Log from "./instructions/log.js";
import * as Memory from "./instructions/memory.js";
import * as Stack from "./instructions/stack.js";
import * as Storage from "./instructions/storage.js";
import * as System from "./instructions/system.js";

/**
 * Enum for EVM Opcodes
 */
export enum Ops {
  // Control Flow Ops
  STOP = 0x00,

  // Arithmetic Ops
  ADD = 0x01,
  MUL = 0x02,
  SUB = 0x03,
  DIV = 0x04,
  SDIV = 0x05,
  MOD = 0x06,
  SMOD = 0x07,
  ADDMOD = 0x08,
  MULMOD = 0x09,
  EXP = 0x0a,
  SIGNEXTEND = 0x0b,

  // Comparison Ops
  LT = 0x10,
  GT = 0x11,
  SLT = 0x12,
  SGT = 0x13,
  EQ = 0x14,
  ISZERO = 0x15,

  // Bitwise Ops
  AND = 0x16,
  OR = 0x17,
  XOR = 0x18,
  NOT = 0x19,
  BYTE = 0x1a,
  SHL = 0x1b,
  SHR = 0x1c,
  SAR = 0x1d,
  CLZ = 0x1e,

  // Keccak Op
  KECCAK256 = 0x20,

  // Environmental Ops
  ADDRESS = 0x30,
  BALANCE = 0x31,
  ORIGIN = 0x32,
  CALLER = 0x33,
  CALLVALUE = 0x34,
  CALLDATALOAD = 0x35,
  CALLDATASIZE = 0x36,
  CALLDATACOPY = 0x37,
  CODESIZE = 0x38,
  CODECOPY = 0x39,
  GASPRICE = 0x3a,
  EXTCODESIZE = 0x3b,
  EXTCODECOPY = 0x3c,
  RETURNDATASIZE = 0x3d,
  RETURNDATACOPY = 0x3e,
  EXTCODEHASH = 0x3f,

  // Block Ops
  BLOCKHASH = 0x40,
  COINBASE = 0x41,
  TIMESTAMP = 0x42,
  NUMBER = 0x43,
  PREVRANDAO = 0x44,
  GASLIMIT = 0x45,
  CHAINID = 0x46,
  SELFBALANCE = 0x47,
  BASEFEE = 0x48,
  BLOBHASH = 0x49,
  BLOBBASEFEE = 0x4a,

  // Stack Ops
  POP = 0x50,

  // Memory Operations
  MLOAD = 0x51,
  MSTORE = 0x52,
  MSTORE8 = 0x53,

  // Storage Ops
  SLOAD = 0x54,
  SSTORE = 0x55,

  // Control Flow Ops (continued)
  JUMP = 0x56,
  JUMPI = 0x57,
  PC = 0x58,

  // Memory Operations (continued)
  MSIZE = 0x59,

  // Control Flow Ops (continued)
  GAS = 0x5a,
  JUMPDEST = 0x5b,

  // Storage Ops (continued)
  TLOAD = 0x5c,
  TSTORE = 0x5d,

  // Memory Operations (continued)
  MCOPY = 0x5e,

  // Push Operations
  PUSH0 = 0x5f,
  PUSH1 = 0x60,
  PUSH2 = 0x61,
  PUSH3 = 0x62,
  PUSH4 = 0x63,
  PUSH5 = 0x64,
  PUSH6 = 0x65,
  PUSH7 = 0x66,
  PUSH8 = 0x67,
  PUSH9 = 0x68,
  PUSH10 = 0x69,
  PUSH11 = 0x6a,
  PUSH12 = 0x6b,
  PUSH13 = 0x6c,
  PUSH14 = 0x6d,
  PUSH15 = 0x6e,
  PUSH16 = 0x6f,
  PUSH17 = 0x70,
  PUSH18 = 0x71,
  PUSH19 = 0x72,
  PUSH20 = 0x73,
  PUSH21 = 0x74,
  PUSH22 = 0x75,
  PUSH23 = 0x76,
  PUSH24 = 0x77,
  PUSH25 = 0x78,
  PUSH26 = 0x79,
  PUSH27 = 0x7a,
  PUSH28 = 0x7b,
  PUSH29 = 0x7c,
  PUSH30 = 0x7d,
  PUSH31 = 0x7e,
  PUSH32 = 0x7f,

  // Dup operations
  DUP1 = 0x80,
  DUP2 = 0x81,
  DUP3 = 0x82,
  DUP4 = 0x83,
  DUP5 = 0x84,
  DUP6 = 0x85,
  DUP7 = 0x86,
  DUP8 = 0x87,
  DUP9 = 0x88,
  DUP10 = 0x89,
  DUP11 = 0x8a,
  DUP12 = 0x8b,
  DUP13 = 0x8c,
  DUP14 = 0x8d,
  DUP15 = 0x8e,
  DUP16 = 0x8f,

  // Swap operations
  SWAP1 = 0x90,
  SWAP2 = 0x91,
  SWAP3 = 0x92,
  SWAP4 = 0x93,
  SWAP5 = 0x94,
  SWAP6 = 0x95,
  SWAP7 = 0x96,
  SWAP8 = 0x97,
  SWAP9 = 0x98,
  SWAP10 = 0x99,
  SWAP11 = 0x9a,
  SWAP12 = 0x9b,
  SWAP13 = 0x9c,
  SWAP14 = 0x9d,
  SWAP15 = 0x9e,
  SWAP16 = 0x9f,

  // Log Operations
  LOG0 = 0xa0,
  LOG1 = 0xa1,
  LOG2 = 0xa2,
  LOG3 = 0xa3,
  LOG4 = 0xa4,

  // System Operations
  CREATE = 0xf0,
  CALL = 0xf1,
  CALLCODE = 0xf2,
  RETURN = 0xf3,
  DELEGATECALL = 0xf4,
  CREATE2 = 0xf5,
  STATICCALL = 0xfa,
  REVERT = 0xfd,
  SELFDESTRUCT = 0xff,
}

/**
 * Type for opcode implementation functions
 */
export type OpcodeImplementation = Effect.Effect<
  void,
  EthereumException,
  Evm | Fork
>;

/**
 * Base opcode implementations available in all forks (up to Shanghai).
 * Each fork can extend this with additional opcodes.
 *
 * Note: CREATE, CREATE2, CALL, CALLCODE, DELEGATECALL, STATICCALL, and SELFDESTRUCT
 * are not yet implemented as they require full interpreter integration.
 */
export const BASE_OPCODES: Map<number, OpcodeImplementation> = new Map([
  // Control Flow
  [Ops.STOP, ControlFlow.stop],
  [Ops.JUMP, ControlFlow.jump],
  [Ops.JUMPI, ControlFlow.jumpi],
  [Ops.PC, ControlFlow.pc],
  [Ops.GAS, ControlFlow.gasLeft],
  [Ops.JUMPDEST, ControlFlow.jumpdest],

  // Arithmetic
  [Ops.ADD, Arithmetic.add],
  [Ops.MUL, Arithmetic.mul],
  [Ops.SUB, Arithmetic.sub],
  [Ops.DIV, Arithmetic.div],
  [Ops.SDIV, Arithmetic.sdiv],
  [Ops.MOD, Arithmetic.mod],
  [Ops.SMOD, Arithmetic.smod],
  [Ops.ADDMOD, Arithmetic.addmod],
  [Ops.MULMOD, Arithmetic.mulmod],
  [Ops.EXP, Arithmetic.exp],
  [Ops.SIGNEXTEND, Arithmetic.signextend],

  // Comparison
  [Ops.LT, Comparison.lessThan],
  [Ops.GT, Comparison.greaterThan],
  [Ops.SLT, Comparison.signedLessThan],
  [Ops.SGT, Comparison.signedGreaterThan],
  [Ops.EQ, Comparison.equal],
  [Ops.ISZERO, Comparison.isZero],

  // Bitwise
  [Ops.AND, Bitwise.bitwiseAnd],
  [Ops.OR, Bitwise.bitwiseOr],
  [Ops.XOR, Bitwise.bitwiseXor],
  [Ops.NOT, Bitwise.bitwiseNot],
  [Ops.BYTE, Bitwise.getByte],

  // Keccak
  [Ops.KECCAK256, Keccak.keccak],

  // Stack
  [Ops.POP, Stack.pop],
  [Ops.PUSH1, Stack.push1],
  [Ops.PUSH2, Stack.push2],
  [Ops.PUSH3, Stack.push3],
  [Ops.PUSH4, Stack.push4],
  [Ops.PUSH5, Stack.push5],
  [Ops.PUSH6, Stack.push6],
  [Ops.PUSH7, Stack.push7],
  [Ops.PUSH8, Stack.push8],
  [Ops.PUSH9, Stack.push9],
  [Ops.PUSH10, Stack.push10],
  [Ops.PUSH11, Stack.push11],
  [Ops.PUSH12, Stack.push12],
  [Ops.PUSH13, Stack.push13],
  [Ops.PUSH14, Stack.push14],
  [Ops.PUSH15, Stack.push15],
  [Ops.PUSH16, Stack.push16],
  [Ops.PUSH17, Stack.push17],
  [Ops.PUSH18, Stack.push18],
  [Ops.PUSH19, Stack.push19],
  [Ops.PUSH20, Stack.push20],
  [Ops.PUSH21, Stack.push21],
  [Ops.PUSH22, Stack.push22],
  [Ops.PUSH23, Stack.push23],
  [Ops.PUSH24, Stack.push24],
  [Ops.PUSH25, Stack.push25],
  [Ops.PUSH26, Stack.push26],
  [Ops.PUSH27, Stack.push27],
  [Ops.PUSH28, Stack.push28],
  [Ops.PUSH29, Stack.push29],
  [Ops.PUSH30, Stack.push30],
  [Ops.PUSH31, Stack.push31],
  [Ops.PUSH32, Stack.push32],
  [Ops.DUP1, Stack.dup1],
  [Ops.DUP2, Stack.dup2],
  [Ops.DUP3, Stack.dup3],
  [Ops.DUP4, Stack.dup4],
  [Ops.DUP5, Stack.dup5],
  [Ops.DUP6, Stack.dup6],
  [Ops.DUP7, Stack.dup7],
  [Ops.DUP8, Stack.dup8],
  [Ops.DUP9, Stack.dup9],
  [Ops.DUP10, Stack.dup10],
  [Ops.DUP11, Stack.dup11],
  [Ops.DUP12, Stack.dup12],
  [Ops.DUP13, Stack.dup13],
  [Ops.DUP14, Stack.dup14],
  [Ops.DUP15, Stack.dup15],
  [Ops.DUP16, Stack.dup16],
  [Ops.SWAP1, Stack.swap1],
  [Ops.SWAP2, Stack.swap2],
  [Ops.SWAP3, Stack.swap3],
  [Ops.SWAP4, Stack.swap4],
  [Ops.SWAP5, Stack.swap5],
  [Ops.SWAP6, Stack.swap6],
  [Ops.SWAP7, Stack.swap7],
  [Ops.SWAP8, Stack.swap8],
  [Ops.SWAP9, Stack.swap9],
  [Ops.SWAP10, Stack.swap10],
  [Ops.SWAP11, Stack.swap11],
  [Ops.SWAP12, Stack.swap12],
  [Ops.SWAP13, Stack.swap13],
  [Ops.SWAP14, Stack.swap14],
  [Ops.SWAP15, Stack.swap15],
  [Ops.SWAP16, Stack.swap16],

  // Memory
  [Ops.MLOAD, Memory.mload],
  [Ops.MSTORE, Memory.mstore],
  [Ops.MSTORE8, Memory.mstore8],
  [Ops.MSIZE, Memory.msize],

  // Environment
  [Ops.ADDRESS, Environment.address],
  [Ops.BALANCE, Environment.balance],
  [Ops.ORIGIN, Environment.origin],
  [Ops.CALLER, Environment.caller],
  [Ops.CALLVALUE, Environment.callvalue],
  [Ops.CALLDATALOAD, Environment.calldataload],
  [Ops.CALLDATASIZE, Environment.calldatasize],
  [Ops.CALLDATACOPY, Environment.calldatacopy],
  [Ops.CODESIZE, Environment.codesize],
  [Ops.CODECOPY, Environment.codecopy],
  [Ops.GASPRICE, Environment.gasprice],
  [Ops.EXTCODESIZE, Environment.extcodesize],
  [Ops.EXTCODECOPY, Environment.extcodecopy],

  // Block
  [Ops.BLOCKHASH, Block.blockhash],
  [Ops.COINBASE, Block.coinbase],
  [Ops.TIMESTAMP, Block.timestamp],
  [Ops.NUMBER, Block.number],
  [Ops.PREVRANDAO, Block.prevrandao], // DIFFICULTY in pre-Paris forks
  [Ops.GASLIMIT, Block.gaslimit],

  // Storage
  [Ops.SSTORE, Storage.sstore],
  [Ops.SLOAD, Storage.sload],
  // Log
  [Ops.LOG0, Log.log0],
  [Ops.LOG1, Log.log1],
  [Ops.LOG2, Log.log2],
  [Ops.LOG3, Log.log3],
  [Ops.LOG4, Log.log4],

  // System
  [Ops.RETURN, System.returnOp],
  [Ops.CALL, System.call],
  [Ops.CALLCODE, System.callcode],
  [Ops.SELFDESTRUCT, System.selfdestruct],
  [Ops.CREATE, System.create],
]);

/**
 * Helper function to merge opcode maps.
 * Creates a new map with all entries from the base map plus new entries.
 */
function extendOpcodes(
  base: Map<number, OpcodeImplementation>,
  additions: Array<[number, OpcodeImplementation]>,
): Map<number, OpcodeImplementation> {
  return new Map([...base.entries(), ...additions]);
}
export const HOMESTEAD_OPCODES: Map<number, OpcodeImplementation> =
  extendOpcodes(BASE_OPCODES, [[Ops.DELEGATECALL, System.delegatecall]]);

const TANGERINE_WHISTLE_OPCODES: Map<number, OpcodeImplementation> =
  extendOpcodes(HOMESTEAD_OPCODES, []);
export const BYZANTIUM_OPCODES: Map<number, OpcodeImplementation> =
  extendOpcodes(TANGERINE_WHISTLE_OPCODES, [
    [Ops.REVERT, System.revert],
    [Ops.STATICCALL, System.staticcall],
    [Ops.RETURNDATASIZE, Environment.returndatasize],
    [Ops.RETURNDATACOPY, Environment.returndatacopy],
  ]);

export const CONSTANTINOPLE_OPCODES: Map<number, OpcodeImplementation> =
  extendOpcodes(BYZANTIUM_OPCODES, [
    [Ops.SHL, Bitwise.bitwiseShl],
    [Ops.SHR, Bitwise.bitwiseShr],
    [Ops.SAR, Bitwise.bitwiseSar],
    [Ops.EXTCODEHASH, Environment.extcodehash],
    [Ops.CREATE2, System.create2],
  ]);
export const PETERSBURG_OPCODES: Map<number, OpcodeImplementation> =
  extendOpcodes(CONSTANTINOPLE_OPCODES, []);

export const ISTANBUL_OPCODES: Map<number, OpcodeImplementation> =
  extendOpcodes(PETERSBURG_OPCODES, [
    [Ops.CHAINID, Block.chainid],
    [Ops.SELFBALANCE, Environment.selfbalance],
  ]);

export const BERLIN_OPCODES: Map<number, OpcodeImplementation> = extendOpcodes(
  ISTANBUL_OPCODES,
  [],
);

export const LONDON_OPCODES: Map<number, OpcodeImplementation> = extendOpcodes(
  BERLIN_OPCODES,
  [[Ops.BASEFEE, Block.basefee]],
);

export const PARIS_OPCODES: Map<number, OpcodeImplementation> = extendOpcodes(
  LONDON_OPCODES,
  [],
);

export const SHANGHAI_OPCODES: Map<number, OpcodeImplementation> =
  extendOpcodes(PARIS_OPCODES, [[Ops.PUSH0, Stack.push0]]);

/**
 * Cancun fork opcodes (EIP-1153, EIP-4844, EIP-5656, EIP-7516).
 * Extends BASE_OPCODES with new Cancun-specific opcodes.
 */
export const CANCUN_OPCODES: Map<number, OpcodeImplementation> = extendOpcodes(
  SHANGHAI_OPCODES,
  [
    [Ops.TLOAD, Storage.tload],
    [Ops.TSTORE, Storage.tstore],
    [Ops.BLOBHASH, Block.blobhash],
    [Ops.BLOBBASEFEE, Block.blobbasefee],
    [Ops.MCOPY, Memory.mcopy],
  ],
);

/**
 * Prague fork opcodes.
 * Currently same as Cancun, but defined separately for future additions.
 */
export const PRAGUE_OPCODES: Map<number, OpcodeImplementation> = extendOpcodes(
  CANCUN_OPCODES,
  [],
);

/**
 * Osaka fork opcodes.
 * Currently same as Prague, but defined separately for future additions.
 */
export const OSAKA_OPCODES: Map<number, OpcodeImplementation> = extendOpcodes(
  PRAGUE_OPCODES,
  [[Ops.CLZ, Bitwise.countLeadingZeros]],
);
/**
 * Get the name of an opcode from its byte value
 */
export function getOpcodeName(opcode: number): string {
  return (
    Ops[opcode] ??
    `UNKNOWN(0x${opcode.toString(16).toUpperCase().padStart(2, "0")})`
  );
}

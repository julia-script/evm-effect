/**
 * Ethereum Virtual Machine (EVM) Control Flow Instructions
 *
 * Implementations of the EVM Control Flow instructions following the
 * Osaka fork specification.
 */

import { U256 } from "@evm-effect/ethereum-types";
import { Effect, Ref } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { InvalidJumpDestError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

/**
 * STOP: Halt execution
 *
 * Stop further execution of EVM code. Sets running flag to false.
 *
 * Gas: 0 (free)
 * Stack: [...] -> [...]
 */
export const stop: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    // OPERATION
    const evm = yield* Evm;
    // yield* Ref.set(evm.running, false);
    evm.running = false;

    // PROGRAM COUNTER (incremented even though we're stopping)
    yield* evm.incrementPC(1);
  },
);

/**
 * JUMP: Unconditional jump
 *
 * Alter the program counter to the location specified by the top of the stack.
 * The destination must be a valid JUMPDEST.
 *
 * Gas: 8 (GAS_MID)
 * Stack: [destination, ...] -> [...]
 */
export const jump: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const jumpDest = yield* evm.stack
      .pop()
      .pipe(Effect.map((value) => Number(value.value)));

    // GAS
    yield* Gas.chargeGas(Gas.GAS_MID);

    // OPERATION - validate jump destination
    const isValid = evm.validJumpDestinations.has(jumpDest);

    if (!isValid) {
      yield* Effect.fail(new InvalidJumpDestError(jumpDest));
      return;
    }

    // PROGRAM COUNTER - set to jump destination
    yield* Ref.set(evm.pc, jumpDest);
  },
);

/**
 * JUMPI: Conditional jump
 *
 * Alter the program counter to the specified location if and only if a
 * condition is true. If the condition is not true, then the program counter
 * increases by 1.
 *
 * Gas: 10 (GAS_HIGH)
 * Stack: [destination, condition, ...] -> [...]
 */
export const jumpi: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const jumpDest = yield* evm.stack
      .pop()
      .pipe(Effect.map((value) => Number(value.value)));
    const conditionalValue = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_HIGH);

    // OPERATION
    if (conditionalValue.value === 0n) {
      // Condition false - just increment PC
      const currentPc = yield* evm.pc;
      yield* Ref.set(evm.pc, currentPc + 1);
    } else {
      const isValid = evm.validJumpDestinations.has(jumpDest);

      if (!isValid) {
        yield* Effect.fail(new InvalidJumpDestError(jumpDest));
        return;
      }

      yield* Ref.set(evm.pc, jumpDest);
    }
  },
);

/**
 * PC: Get program counter
 *
 * Push onto the stack the value of the program counter after reaching the
 * current instruction and without increasing it for the next instruction.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [pc, ...]
 */
export const pc: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const currentPc = yield* evm.pc;
    const pcValue = new U256({ value: BigInt(currentPc) });
    yield* evm.stack.push(pcValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * GAS: Get remaining gas
 *
 * Push the amount of available gas (including the corresponding reduction
 * for the cost of this instruction) onto the stack.
 *
 * Gas: 2 (GAS_BASE)
 * Stack: [...] -> [gas, ...]
 */
export const gasLeft: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // GAS
    yield* Gas.chargeGas(Gas.GAS_BASE);

    // OPERATION
    const gas = evm.gasLeft;
    const gasValue = new U256({ value: gas });
    yield* evm.stack.push(gasValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * JUMPDEST: Mark valid jump destination
 *
 * Mark a valid destination for jumps. This is a noop, present only
 * to be used by JUMP and JUMPI opcodes to verify that their jump is valid.
 *
 * Gas: 1 (GAS_JUMPDEST)
 * Stack: [...] -> [...]
 */
export const jumpdest: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;
    // GAS
    yield* Gas.chargeGas(Gas.GAS_JUMPDEST);

    // OPERATION (noop - jump destination is pre-calculated)

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

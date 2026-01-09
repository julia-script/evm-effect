/**
 * EVM Runtime helpers
 */

import type { AnyBytes } from "@evm-effect/ethereum-types";
import { Data, Effect } from "effect";
import { Ops } from "./opcodes.js";

export class Code extends Data.TaggedClass("Code")<{
  value: Uint8Array;
}> {
  static from(value: Uint8Array | AnyBytes | Code) {
    if (value instanceof Code) {
      return value;
    }
    return new Code({
      value: value instanceof Uint8Array ? value : value.value,
    });
  }
  static empty() {
    return new Code({ value: new Uint8Array(0) });
  }

  /**
   * Get valid jump destinations in the code.
   *
   * A valid jump destination is any JUMPDEST opcode (0x5B) that is not part
   * of PUSH data.
   */
  get validJumpDestinations() {
    const code = this.value;
    return Effect.gen(function* () {
      const validJumpDestinations = new Set<number>();
      let pc = 0;

      while (pc < code.length) {
        const currentOpcode = code[pc];
        if (!Ops[currentOpcode]) {
          pc += 1;
          continue;
        }
        if (currentOpcode === Ops.JUMPDEST) {
          validJumpDestinations.add(pc);
        } else if (currentOpcode >= Ops.PUSH1 && currentOpcode <= Ops.PUSH32) {
          const pushDataSize = currentOpcode - Ops.PUSH1 + 1;
          pc += pushDataSize;
        }
        pc += 1;
      }
      return validJumpDestinations;
    });
  }
  opAt(pc: number): number | undefined {
    return this.value[pc];
  }
}

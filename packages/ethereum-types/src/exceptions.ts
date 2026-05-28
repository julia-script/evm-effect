import { bufferToHex } from "@evm-effect/shared/bytes";
import { Data } from "effect";

export class EvmTypeError extends Data.TaggedError("EvmTypeError")<{
  readonly message: string;
  readonly input?: unknown;
}> {
  static invalidValue(input: unknown, expected: string): EvmTypeError {
    return new EvmTypeError({
      message: `Invalid input value: '${input}' expected '${expected}'`,
      input,
    });
  }
  static invalidSize(
    input: { readonly type: string; readonly value: Uint8Array },
    expected: number,
  ): EvmTypeError {
    return new EvmTypeError({
      message: `Invalid input value for ${input.type}: '${bufferToHex(input.value)}' expected size '${expected}'`,
      input,
    });
  }
}

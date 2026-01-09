/**
 * Helper functions for encoding and decoding compiler input/output
 */
import { Schema } from "effect";
import type { CompilerInput } from "./input.js";
import { CompilerInput as CompilerInputSchema } from "./input.js";
import type { CompilerOutput } from "./output.js";
import { CompilerOutput as CompilerOutputSchema } from "./output.js";

/**
 * Encode a compiler input object to validate it matches the schema
 * Returns the validated input or throws a ParseError
 */
export const encodeInput = Schema.encodeUnknownSync(CompilerInputSchema);

/**
 * Decode/validate a compiler input object
 * Returns the validated input or throws a ParseError
 */
export const decodeInput = Schema.decodeUnknownSync(CompilerInputSchema);

/**
 * Encode a compiler output (typically not needed as output comes from compiler)
 * Returns the validated output or throws a ParseError
 */
export const encodeOutput = Schema.encodeUnknownSync(CompilerOutputSchema);

/**
 * Decode/validate a compiler output object
 * Returns the validated output or throws a ParseError
 */
export const decodeOutput = Schema.decodeUnknownSync(CompilerOutputSchema);

/**
 * Encode compiler input to JSON string
 */
export function encodeInputToJSON(input: CompilerInput): string {
  const validated = encodeInput(input);
  return JSON.stringify(validated);
}

/**
 * Decode compiler output from JSON string
 */
export function decodeOutputFromJSON(json: string): CompilerOutput {
  const parsed = JSON.parse(json);
  return decodeOutput(parsed);
}

/**
 * Parse and validate compiler input from JSON string
 */
export function parseInputJSON(json: string): CompilerInput {
  const parsed = JSON.parse(json);
  return decodeInput(parsed);
}

/**
 * Validate compiler output and stringify to JSON
 */
export function validateAndStringifyOutput(output: CompilerOutput): string {
  const validated = encodeOutput(output);
  return JSON.stringify(validated);
}

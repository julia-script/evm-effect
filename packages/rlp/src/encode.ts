import {
  type AnyBytes,
  Bytes,
  isAddress,
  isBytes,
  isUnsignedInt,
  toBeBytes,
  Uint,
} from "@evm-effect/ethereum-types";
import type { Extended } from "./types.js";

const textEncoder = new TextEncoder();
export const encode = (input: Readonly<Extended>): Bytes => {
  if (Array.isArray(input)) {
    return encodeSequence(input);
  }
  if (isAddress(input)) {
    return encodeBytes(input.value.value);
  }
  if (isBytes(input) || input instanceof Uint8Array) {
    return encodeBytes(input);
  }
  if (typeof input === "string") {
    const buffer = textEncoder.encode(input);
    return encodeBytes(buffer);
  }
  if (isUnsignedInt(input)) {
    return encodeBytes(toBeBytes(input));
  }
  return input
    ? encodeBytes(new Uint8Array([1]))
    : encodeBytes(new Uint8Array());
};

const joinEncodings = (input: Extended[]) => {
  const bytesList: Bytes[] = [];
  let totalLength = 0;
  for (const item of input) {
    const encoded = encode(item);
    totalLength += encoded.value.length;
    bytesList.push(encoded);
  }
  const concatenated = new Uint8Array(totalLength);
  let offset = 0;
  for (const item of bytesList) {
    concatenated.set(item.value, offset);
    offset += item.value.length;
  }
  return new Bytes({ value: concatenated });
};
const encodeSequence = (input: Extended[]): Bytes => {
  const joinedEncodings = joinEncodings(input);
  const length = joinedEncodings.value.length;
  if (length < 0x38) {
    return new Bytes({
      value: new Uint8Array([0xc0 + length, ...joinedEncodings.value]),
    });
  }
  const lengthAsBe = toBeBytes(new Uint({ value: BigInt(length) }));
  return new Bytes({
    value: new Uint8Array([
      0xf7 + lengthAsBe.value.length,
      ...lengthAsBe.value,
      ...joinedEncodings.value,
    ]),
  });
};

export const encodeBytes = (input: AnyBytes | Uint8Array): Bytes => {
  const buffer = input instanceof Uint8Array ? input : input.value;
  const length = buffer.length;
  if (length === 1 && buffer[0] < 0x80) {
    return input instanceof Bytes ? input : new Bytes({ value: buffer });
  }
  if (length < 0x38) {
    return new Bytes({ value: new Uint8Array([0x80 + length, ...buffer]) });
  }
  const lengthAsBe = toBeBytes(new Uint({ value: BigInt(length) }));

  return new Bytes({
    value: new Uint8Array([
      0xb7 + lengthAsBe.value.length,
      ...lengthAsBe.value,
      ...buffer,
    ]),
  });
};

export default encode;

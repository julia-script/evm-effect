export const bufferToHex = (value: Uint8Array<ArrayBufferLike>): string => {
  if ("toHex" in value) {
    return value.toHex();
  }
  let out = "";
  for (let i = 0; i < (value as Uint8Array).length; ++i) {
    out += (value[i] as number).toString(16).padStart(2, "0");
  }
  return out;
};

export const bufferFromHex = (string: string): Uint8Array<ArrayBuffer> => {
  if (string.startsWith("0x")) {
    string = string.slice(2);
  }
  if ("fromHex" in Uint8Array) {
    return Uint8Array.fromHex(string);
  }
  if (typeof string !== "string") {
    throw new TypeError("expected string to be a string");
  }
  if (string.length % 2 !== 0) {
    throw new SyntaxError("string should be an even number of characters");
  }
  const maxLength = 2 ** 53 - 1;
  const bytes = [];
  let read = 0;
  if (maxLength > 0) {
    while (read < string.length) {
      const hexits = string.slice(read, read + 2);
      if (/[^0-9a-fA-F]/.test(hexits)) {
        throw new SyntaxError("string should only contain hex characters");
      }
      bytes.push(parseInt(hexits, 16));
      read += 2;
      if (bytes.length === maxLength) {
        break;
      }
    }
  }
  return new Uint8Array(bytes);
};

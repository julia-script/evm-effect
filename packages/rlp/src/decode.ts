import {
  type AnyBytes,
  Bytes,
  fromBeBytes,
  Uint,
} from "@evm-effect/ethereum-types";
import { Result } from "effect";
import { RlpDecodeError } from "./exceptions.js";
import type { Simple } from "./types.ts";
export const decode = (
  input: AnyBytes | Uint8Array,
): Result.Result<Simple, RlpDecodeError> => {
  const buffer = input instanceof Uint8Array ? input : input.value;
  if (buffer.length === 0) {
    return Result.fail(
      new RlpDecodeError({ message: "Cannot decode empty input", path: [] }),
    );
  }
  if (buffer[0] <= 0xbf) {
    return decodeToBytes(buffer, []);
  }
  return decodeToSequence(buffer, []);
};

const decodeToBytes = (
  buffer: Uint8Array,
  path: string[],
): Result.Result<Bytes, RlpDecodeError> => {
  if (buffer.length === 1 && buffer[0] < 0x80) {
    return Result.succeed(new Bytes({ value: buffer }));
  }
  if (buffer[0] <= 0xb7) {
    const lenRawData = buffer[0] - 0x80;
    if (lenRawData < 0) {
      return Result.fail(
        new RlpDecodeError({ message: "negative length", path: [] }),
      );
    }
    if (lenRawData >= buffer.length) {
      return Result.fail(
        new RlpDecodeError({ message: "truncated", path: [] }),
      );
    }
    const rawData = buffer.slice(1, 1 + lenRawData);
    if (lenRawData === 1 && rawData[0] < 0x80) {
      return Result.fail(
        new RlpDecodeError({
          message: "non-canonical encoding: single byte should not be prefixed",
          path: [],
        }),
      );
    }
    return Result.succeed(new Bytes({ value: rawData }));
  }

  const decodedDataStartIdx = 1 + buffer[0] - 0xb7;
  if (decodedDataStartIdx - 1 >= buffer.length) {
    return Result.fail(new RlpDecodeError({ message: "truncated", path }));
  }
  if (buffer[1] === 0) {
    return Result.fail(
      new RlpDecodeError({
        message: "non-canonical encoding: single byte should not be prefixed",
        path,
      }),
    );
  }

  const eitherLenDecodedData = fromBeBytes(
    new Bytes({ value: buffer.slice(1, decodedDataStartIdx) }),
    Uint,
  );
  if (Result.isFailure(eitherLenDecodedData)) {
    return Result.fail(
      new RlpDecodeError({
        message: "non-canonical encoding: single byte should not be prefixed",
        path,
      }),
    );
  }
  const lenDecodedData = Number(eitherLenDecodedData.success.value);
  if (lenDecodedData < 0x38) {
    return Result.fail(
      new RlpDecodeError({
        message: "non-canonical encoding: single byte should not be prefixed",
        path,
      }),
    );
  }
  const decodedDataEndIdx = decodedDataStartIdx + lenDecodedData;
  if (decodedDataEndIdx - 1 >= buffer.length) {
    return Result.fail(new RlpDecodeError({ message: "truncated", path }));
  }
  return Result.succeed(
    new Bytes({ value: buffer.slice(decodedDataStartIdx, decodedDataEndIdx) }),
  );
};
const decodeToSequence = (
  buffer: Uint8Array,
  path: string[],
): Result.Result<Simple[], RlpDecodeError> => {
  let joinedEncodings: Uint8Array;

  if (buffer[0] <= 0xf7) {
    const lenJoinedEncodings = buffer[0] - 0xc0;
    if (lenJoinedEncodings >= buffer.length) {
      return Result.fail(new RlpDecodeError({ message: "truncated", path }));
    }
    joinedEncodings = buffer.slice(1, 1 + lenJoinedEncodings);
  } else {
    const joinedEncodingsStartIdx = 1 + buffer[0] - 0xf7;
    if (joinedEncodingsStartIdx - 1 >= buffer.length) {
      return Result.fail(new RlpDecodeError({ message: "truncated", path }));
    }
    if (buffer[1] === 0) {
      return Result.fail(
        new RlpDecodeError({
          message: "non-canonical encoding: leading zero in length",
          path,
        }),
      );
    }
    const eitherLenJoinedEncodings = fromBeBytes(
      new Bytes({ value: buffer.slice(1, joinedEncodingsStartIdx) }),
      Uint,
    );
    if (Result.isFailure(eitherLenJoinedEncodings)) {
      return Result.fail(
        new RlpDecodeError({ message: "invalid length encoding", path }),
      );
    }
    const lenJoinedEncodings = Number(eitherLenJoinedEncodings.success.value);
    if (lenJoinedEncodings < 0x38) {
      return Result.fail(
        new RlpDecodeError({
          message: "non-canonical encoding: length too short",
          path,
        }),
      );
    }
    const joinedEncodingsEndIdx = joinedEncodingsStartIdx + lenJoinedEncodings;
    if (joinedEncodingsEndIdx - 1 >= buffer.length) {
      return Result.fail(new RlpDecodeError({ message: "truncated", path }));
    }
    joinedEncodings = buffer.slice(
      joinedEncodingsStartIdx,
      joinedEncodingsEndIdx,
    );
  }

  return decodeJoinedEncodings(joinedEncodings, path);
};
const decodeJoinedEncodings = (
  buffer: Uint8Array,
  path: string[],
): Result.Result<Simple[], RlpDecodeError> => {
  const decodedSequence: Simple[] = [];
  let itemStartIdx = 0;

  while (itemStartIdx < buffer.length) {
    const eitherEncodedItemLength = decodeItemLength(
      buffer.slice(itemStartIdx),
      path,
    );
    if (Result.isFailure(eitherEncodedItemLength)) {
      return Result.fail(eitherEncodedItemLength.failure);
    }
    const encodedItemLength = eitherEncodedItemLength.success;
    if (itemStartIdx + encodedItemLength - 1 >= buffer.length) {
      return Result.fail(new RlpDecodeError({ message: "truncated", path }));
    }
    const encodedItem = buffer.slice(
      itemStartIdx,
      itemStartIdx + encodedItemLength,
    );
    const eitherDecoded = decode(encodedItem);
    if (Result.isFailure(eitherDecoded)) {
      return Result.fail(eitherDecoded.failure);
    }
    decodedSequence.push(eitherDecoded.success);
    itemStartIdx += encodedItemLength;
  }

  return Result.succeed(decodedSequence);
};

const decodeItemLength = (
  buffer: Uint8Array,
  path: string[],
): Result.Result<number, RlpDecodeError> => {
  if (buffer.length <= 0) {
    return Result.fail(
      new RlpDecodeError({ message: "Cannot decode empty input", path }),
    );
  }

  const firstRlpByte = buffer[0];

  // This is the length of the big endian representation of the length of
  // rlp encoded object byte stream.
  let lengthLength = 0;
  let decodedDataLength = 0;

  // This occurs only when the raw_data is a single byte whose value < 128
  if (firstRlpByte < 0x80) {
    // We return 1 here, as the end formula
    // 1 + length_length + decoded_data_length would be invalid for
    // this case.
    return Result.succeed(1);
  }
  // This occurs only when the raw_data is a byte stream with length < 56
  // and doesn't fall into the above cases
  else if (firstRlpByte <= 0xb7) {
    decodedDataLength = firstRlpByte - 0x80;
  }
  // This occurs only when the raw_data is a byte stream and doesn't fall
  // into the above cases
  else if (firstRlpByte <= 0xbf) {
    lengthLength = firstRlpByte - 0xb7;
    if (lengthLength >= buffer.length) {
      return Result.fail(new RlpDecodeError({ message: "truncated", path }));
    }
    if (buffer[1] === 0) {
      return Result.fail(
        new RlpDecodeError({
          message: "non-canonical encoding: leading zero in length",
          path,
        }),
      );
    }
    const eitherLength = fromBeBytes(
      new Bytes({ value: buffer.slice(1, 1 + lengthLength) }),
      Uint,
    );
    if (Result.isFailure(eitherLength)) {
      return Result.fail(
        new RlpDecodeError({ message: "invalid length encoding", path }),
      );
    }
    decodedDataLength = Number(eitherLength.success.value);
  }
  // This occurs only when the raw_data is a sequence of objects with
  // length(concatenation of encoding of each object) < 56
  else if (firstRlpByte <= 0xf7) {
    decodedDataLength = firstRlpByte - 0xc0;
  }
  // This occurs only when the raw_data is a sequence of objects and
  // doesn't fall into the above cases.
  else if (firstRlpByte <= 0xff) {
    lengthLength = firstRlpByte - 0xf7;
    if (lengthLength >= buffer.length) {
      return Result.fail(new RlpDecodeError({ message: "truncated", path }));
    }
    if (buffer[1] === 0) {
      return Result.fail(
        new RlpDecodeError({
          message: "non-canonical encoding: leading zero in length",
          path,
        }),
      );
    }
    const eitherLength = fromBeBytes(
      new Bytes({ value: buffer.slice(1, 1 + lengthLength) }),
      Uint,
    );
    if (Result.isFailure(eitherLength)) {
      return Result.fail(
        new RlpDecodeError({ message: "invalid length encoding", path }),
      );
    }
    decodedDataLength = Number(eitherLength.success.value);
  }

  return Result.succeed(1 + lengthLength + decodedDataLength);
};

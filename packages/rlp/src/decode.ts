import {
  type AnyBytes,
  Bytes,
  fromBeBytes,
  Uint,
} from "@evm-effect/ethereum-types";
import { Either } from "effect";
import { RlpDecodeError } from "./exceptions.js";
import type { Simple } from "./types.js";
export const decode = (
  input: AnyBytes | Uint8Array,
): Either.Either<Simple, RlpDecodeError> => {
  const buffer = input instanceof Uint8Array ? input : input.value;
  if (buffer.length === 0) {
    return Either.left(
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
): Either.Either<Bytes, RlpDecodeError> => {
  if (buffer.length === 1 && buffer[0] < 0x80) {
    return Either.right(new Bytes({ value: buffer }));
  }
  if (buffer[0] <= 0xb7) {
    const lenRawData = buffer[0] - 0x80;
    if (lenRawData < 0) {
      return Either.left(
        new RlpDecodeError({ message: "negative length", path: [] }),
      );
    }
    if (lenRawData >= buffer.length) {
      return Either.left(
        new RlpDecodeError({ message: "truncated", path: [] }),
      );
    }
    const rawData = buffer.slice(1, 1 + lenRawData);
    if (lenRawData === 1 && rawData[0] < 0x80) {
      return Either.left(
        new RlpDecodeError({
          message: "non-canonical encoding: single byte should not be prefixed",
          path: [],
        }),
      );
    }
    return Either.right(new Bytes({ value: rawData }));
  }

  const decodedDataStartIdx = 1 + buffer[0] - 0xb7;
  if (decodedDataStartIdx - 1 >= buffer.length) {
    return Either.left(new RlpDecodeError({ message: "truncated", path }));
  }
  if (buffer[1] === 0) {
    return Either.left(
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
  if (Either.isLeft(eitherLenDecodedData)) {
    return Either.left(
      new RlpDecodeError({
        message: "non-canonical encoding: single byte should not be prefixed",
        path,
      }),
    );
  }
  const lenDecodedData = Number(eitherLenDecodedData.right.value);
  if (lenDecodedData < 0x38) {
    return Either.left(
      new RlpDecodeError({
        message: "non-canonical encoding: single byte should not be prefixed",
        path,
      }),
    );
  }
  const decodedDataEndIdx = decodedDataStartIdx + lenDecodedData;
  if (decodedDataEndIdx - 1 >= buffer.length) {
    return Either.left(new RlpDecodeError({ message: "truncated", path }));
  }
  return Either.right(
    new Bytes({ value: buffer.slice(decodedDataStartIdx, decodedDataEndIdx) }),
  );
};
const decodeToSequence = (
  buffer: Uint8Array,
  path: string[],
): Either.Either<Simple[], RlpDecodeError> => {
  let joinedEncodings: Uint8Array;

  if (buffer[0] <= 0xf7) {
    const lenJoinedEncodings = buffer[0] - 0xc0;
    if (lenJoinedEncodings >= buffer.length) {
      return Either.left(new RlpDecodeError({ message: "truncated", path }));
    }
    joinedEncodings = buffer.slice(1, 1 + lenJoinedEncodings);
  } else {
    const joinedEncodingsStartIdx = 1 + buffer[0] - 0xf7;
    if (joinedEncodingsStartIdx - 1 >= buffer.length) {
      return Either.left(new RlpDecodeError({ message: "truncated", path }));
    }
    if (buffer[1] === 0) {
      return Either.left(
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
    if (Either.isLeft(eitherLenJoinedEncodings)) {
      return Either.left(
        new RlpDecodeError({ message: "invalid length encoding", path }),
      );
    }
    const lenJoinedEncodings = Number(eitherLenJoinedEncodings.right.value);
    if (lenJoinedEncodings < 0x38) {
      return Either.left(
        new RlpDecodeError({
          message: "non-canonical encoding: length too short",
          path,
        }),
      );
    }
    const joinedEncodingsEndIdx = joinedEncodingsStartIdx + lenJoinedEncodings;
    if (joinedEncodingsEndIdx - 1 >= buffer.length) {
      return Either.left(new RlpDecodeError({ message: "truncated", path }));
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
): Either.Either<Simple[], RlpDecodeError> => {
  const decodedSequence: Simple[] = [];
  let itemStartIdx = 0;

  while (itemStartIdx < buffer.length) {
    const eitherEncodedItemLength = decodeItemLength(
      buffer.slice(itemStartIdx),
      path,
    );
    if (Either.isLeft(eitherEncodedItemLength)) {
      return Either.left(eitherEncodedItemLength.left);
    }
    const encodedItemLength = eitherEncodedItemLength.right;
    if (itemStartIdx + encodedItemLength - 1 >= buffer.length) {
      return Either.left(new RlpDecodeError({ message: "truncated", path }));
    }
    const encodedItem = buffer.slice(
      itemStartIdx,
      itemStartIdx + encodedItemLength,
    );
    const eitherDecoded = decode(encodedItem);
    if (Either.isLeft(eitherDecoded)) {
      return Either.left(eitherDecoded.left);
    }
    decodedSequence.push(eitherDecoded.right);
    itemStartIdx += encodedItemLength;
  }

  return Either.right(decodedSequence);
};

const decodeItemLength = (
  buffer: Uint8Array,
  path: string[],
): Either.Either<number, RlpDecodeError> => {
  if (buffer.length <= 0) {
    return Either.left(
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
    return Either.right(1);
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
      return Either.left(new RlpDecodeError({ message: "truncated", path }));
    }
    if (buffer[1] === 0) {
      return Either.left(
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
    if (Either.isLeft(eitherLength)) {
      return Either.left(
        new RlpDecodeError({ message: "invalid length encoding", path }),
      );
    }
    decodedDataLength = Number(eitherLength.right.value);
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
      return Either.left(new RlpDecodeError({ message: "truncated", path }));
    }
    if (buffer[1] === 0) {
      return Either.left(
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
    if (Either.isLeft(eitherLength)) {
      return Either.left(
        new RlpDecodeError({ message: "invalid length encoding", path }),
      );
    }
    decodedDataLength = Number(eitherLength.right.value);
  }

  return Either.right(1 + lengthLength + decodedDataLength);
};

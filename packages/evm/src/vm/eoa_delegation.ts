// """
// Set EOA account code.
// """

import { recoverAuthority } from "@evm-effect/crypto/transactions";
import { Address, Bytes, U64, U256 } from "@evm-effect/ethereum-types";
import { annotateSafe } from "@evm-effect/shared/traced";
import { Effect, Option } from "effect";
import { InvalidBlock } from "../exceptions.js";
import State from "../state.js";
import type { Message } from "./message.js";
import { Code } from "./runtime.js";

const EOA_DELEGATED_CODE_LENGTH = 23;
const PER_EMPTY_ACCOUNT_COST = 25000n;
const EOA_DELEGATION_MARKER = new Bytes({
  value: new Uint8Array([0xef, 0x01, 0x00]),
});
const PER_AUTH_BASE_COST = 12500n;

export const isValidDelegation = (code: Bytes): boolean => {
  const lengthMatch = code.value.length === EOA_DELEGATED_CODE_LENGTH;

  // Use simple array comparison instead of Equal.equals
  const codeSlice = code.value.slice(0, EOA_DELEGATION_MARKER.value.length);
  const markerMatch =
    codeSlice.length === EOA_DELEGATION_MARKER.value.length &&
    codeSlice.every(
      (byte, index) => byte === EOA_DELEGATION_MARKER.value[index],
    );

  return lengthMatch && markerMatch;
};

export const getDelegatedCodeAddress = (
  code: Bytes,
): Option.Option<Address> => {
  return isValidDelegation(code)
    ? Option.some(
        new Address({
          value: code.value.slice(EOA_DELEGATION_MARKER.value.length),
        }),
      )
    : Option.none();
};

export const setDelegation = Effect.fn("setDelegation")(function* (
  message: Message,
) {
  const state = message.blockEnv.state;
  let refundCounter = 0n;
  let index = 0;

  for (let i = 0; i < message.txEnv.authorizations.length; i++) {
    const auth = message.txEnv.authorizations[i];

    if (
      auth.chainId.value !== message.blockEnv.chainId.value &&
      auth.chainId.value !== 0n
    ) {
      continue;
    }
    if (auth.nonce.value >= U64.MAX_VALUE) {
      continue;
    }
    const baseKey = `message.txEnv.authorizations.${index}.recoverAuthority`;
    const authority = yield* recoverAuthority(auth).pipe(
      Effect.option,
      Effect.map(Option.getOrNull),
    );
    if (!authority) {
      yield* annotateSafe({
        [`${baseKey}.error`]: "Invalid signature",
        [`${baseKey}.authority`]: authority,
      });
      continue;
    }

    message.accessedAddresses.add(authority);

    const authorityAccount = State.getAccount(state, authority);
    const authorityCode = authorityAccount.code;

    if (authorityCode.length && !isValidDelegation(authorityCode)) {
      yield* annotateSafe({
        [`${baseKey}.error`]: "Invalid delegation code",
        [`${baseKey}.authority`]: authority,
      });
      continue;
    }
    const authorityNonce = authorityAccount.nonce;
    if (authorityNonce.value !== auth.nonce.value) {
      yield* annotateSafe({
        [`${baseKey}.error`]: "Invalid nonce",
        [`${baseKey}.authority`]: authority,
      });
      continue;
    }
    if (State.accountExists(state, authority)) {
      const refundAmount = PER_EMPTY_ACCOUNT_COST - PER_AUTH_BASE_COST;

      refundCounter += refundAmount;
    } else {
    }

    // Check if address is all zeros (EIP-7702: zero address means clear delegation)
    const isZeroAddress = auth.address.value.value.every((byte) => byte === 0);
    const codeToSet = isZeroAddress
      ? new Bytes({ value: new Uint8Array(0) })
      : new Bytes({
          value: new Uint8Array([
            ...EOA_DELEGATION_MARKER.value,
            ...auth.address.value.value,
          ]),
        });
    yield* State.setCode(state, authority, codeToSet);
    yield* State.incrementNonce(state, authority);
    if (i % 1000 === 0 && i > 0) {
      yield* Effect.yieldNow();
    }

    index++;
  }
  if (!message.codeAddress)
    return yield* Effect.fail(
      new InvalidBlock({ message: "Invalid type 4 transaction: no target" }),
    );
  message.code = Code.from(State.getAccount(state, message.codeAddress).code);
  return new U256({ value: refundCounter });
});

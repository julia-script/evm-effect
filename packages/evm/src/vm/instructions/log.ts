/**
 * Ethereum Virtual Machine (EVM) Logging Instructions
 *
 * Implementations of the EVM logging instructions following the
 * Osaka fork specification.
 */

import { Bytes, Bytes32, Uint } from "@evm-effect/ethereum-types";
import { Effect, Ref } from "effect";
import {
  type EthereumException,
  WriteInStaticContext,
} from "../../exceptions.js";
import { Log } from "../../types/Receipt.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

/**
 * Generic log operation handler
 */
const logN = (numTopics: number): Effect.Effect<void, EthereumException, Evm> =>
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK - read memory location and size
    const memoryStartIndex = yield* evm.stack.pop();
    const size = yield* evm.stack.pop();

    // STACK - read topics
    const topics: Bytes32[] = [];
    for (let i = 0; i < numTopics; i++) {
      const topic = yield* evm.stack.pop();
      topics.push(new Bytes32({ value: topic.toBeBytes32().value }));
    }

    // GAS
    const sizeUint = new Uint({ value: size.value });
    const memStartUint = new Uint({ value: memoryStartIndex.value });

    const memory = yield* Ref.get(evm.memory);
    const extension = Gas.calculateGasExtendMemory(memory, [
      [memStartUint, sizeUint],
    ]);

    const gasCost = new Uint({
      value:
        Gas.GAS_LOG.value +
        Gas.GAS_LOG_DATA.value * sizeUint.value +
        Gas.GAS_LOG_TOPIC.value * BigInt(numTopics) +
        extension.cost.value,
    });

    yield* Gas.chargeGas(gasCost);

    // OPERATION - check static context before modifying state
    if (evm.message.isStatic) {
      yield* Effect.fail(
        new WriteInStaticContext({
          message: "Cannot emit logs in static context",
        }),
      );
      return;
    }

    // Extend memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);
    yield* Ref.set(evm.memory, newMemory);

    // Read data from memory
    const start = Number(memStartUint.value);
    const length = Number(sizeUint.value);
    const slice = newMemory.slice(start, start + length);
    const data = new Bytes({ value: slice });

    // Create log entry
    const logEntry = new Log({
      address: evm.message.currentTarget,
      topics,
      data,
    });

    // Add log to EVM logs
    const currentLogs = yield* Ref.get(evm.logs);
    yield* Ref.set(evm.logs, [...currentLogs, logEntry]);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * LOG0: Append log record with no topics
 *
 * Gas: 375 + 8 * dataSize + memory expansion
 * Stack: [offset, size, ...] -> [...]
 */
export const log0 = logN(0);

/**
 * LOG1: Append log record with 1 topic
 *
 * Gas: 375 + 375 * 1 + 8 * dataSize + memory expansion
 * Stack: [offset, size, topic0, ...] -> [...]
 */
export const log1 = logN(1);

/**
 * LOG2: Append log record with 2 topics
 *
 * Gas: 375 + 375 * 2 + 8 * dataSize + memory expansion
 * Stack: [offset, size, topic0, topic1, ...] -> [...]
 */
export const log2 = logN(2);

/**
 * LOG3: Append log record with 3 topics
 *
 * Gas: 375 + 375 * 3 + 8 * dataSize + memory expansion
 * Stack: [offset, size, topic0, topic1, topic2, ...] -> [...]
 */
export const log3 = logN(3);

/**
 * LOG4: Append log record with 4 topics
 *
 * Gas: 375 + 375 * 4 + 8 * dataSize + memory expansion
 * Stack: [offset, size, topic0, topic1, topic2, topic3, ...] -> [...]
 */
export const log4 = logN(4);

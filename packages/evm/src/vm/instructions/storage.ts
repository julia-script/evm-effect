/**
 * Ethereum Virtual Machine (EVM) Storage Instructions
 *
 * Implementations of the EVM storage-related instructions following the
 * Arrow Glacier fork specification.
 */

import { U256, Uint } from "@evm-effect/ethereum-types";
import { Effect, Ref } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { OutOfGasError, WriteInStaticContext } from "../../exceptions.js";
import * as State from "../../state.js";
import { Evm } from "../evm.js";
import { Fork } from "../Fork.js";
import * as Gas from "../gas.js";
import { StorageKey } from "../StorageKey.js";

/**
 * SLOAD: Load from storage
 *
 * Loads to the stack, the value corresponding to a certain key from the
 * storage of the current account.
 *
 * Gas:
 * - Berlin+ (EIP-2929): 100 (warm) or 2100 (cold)
 * - Pre-Berlin: 800 (fixed)
 * Stack: [key, ...] -> [value, ...]
 */
export const sload: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const key = yield* evm.stack.pop().pipe(Effect.map((k) => k.toBeBytes32()));

    // GAS - fork-dependent (EIP-2929, EIP-1884, and EIP-150)
    const fork = yield* Fork;
    if (fork.eip(2929)) {
      // EIP-2929 (Berlin+): warm/cold storage access
      const storageKey = new StorageKey({
        address: evm.message.currentTarget,
        slot: key,
      });
      if (evm.accessedStorageKeys.has(storageKey)) {
        yield* Gas.chargeGas(Gas.GAS_WARM_ACCESS); // 100
      } else {
        evm.accessedStorageKeys.add(storageKey);
        yield* Gas.chargeGas(Gas.GAS_COLD_SLOAD); // 2100
      }
    } else {
      yield* Gas.chargeGas(yield* Gas.GAS_SLOAD); // 800
    }

    // OPERATION
    const blockEnv = evm.message.blockEnv;
    const value = State.getStorage(
      blockEnv.state,
      evm.message.currentTarget,
      key,
    );
    yield* evm.stack.push(value);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * SSTORE: Store to storage
 *
 * Stores a value at a certain key in the current context's storage.
 *
 * Gas: Variable based on storage state changes
 * Stack: [key, value, ...] -> [...]
 */
export const sstore: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const key = yield* evm.stack.pop().pipe(Effect.map((k) => k.toBeBytes32()));
    const newValue = yield* evm.stack.pop();

    // PRE-CHECKS
    // Check if we have enough gas (must have more than call stipend)
    const gasLeft = evm.gasLeft;
    if (gasLeft <= Gas.GAS_CALL_STIPEND.value) {
      yield* Effect.fail(
        new OutOfGasError({ message: "Insufficient gas for SSTORE" }),
      );
    }

    const state = evm.message.blockEnv.state;
    const currentTarget = evm.message.currentTarget;

    // Get original and current values
    const originalValue = yield* State.getStorageOriginal(
      state,
      currentTarget,
      key,
    );
    const currentValue = State.getStorage(state, currentTarget, key);

    const fork = yield* Fork;
    let gasCost = new Uint({ value: 0n });

    if (fork.eip(2929)) {
      const storageKey = new StorageKey({ address: currentTarget, slot: key });
      const wasAccessed = evm.accessedStorageKeys.has(storageKey);
      if (!wasAccessed) {
        evm.accessedStorageKeys.add(storageKey);
        gasCost = new Uint({ value: gasCost.value + Gas.GAS_COLD_SLOAD.value });
      }

      if (
        originalValue.value === currentValue.value &&
        currentValue.value !== newValue.value
      ) {
        if (originalValue.value === 0n) {
          gasCost = new Uint({
            value: gasCost.value + Gas.GAS_STORAGE_SET.value,
          });
        } else {
          gasCost = new Uint({
            value:
              gasCost.value +
              Gas.GAS_STORAGE_UPDATE.value -
              Gas.GAS_COLD_SLOAD.value,
          });
        }
      } else {
        gasCost = new Uint({
          value: gasCost.value + Gas.GAS_WARM_ACCESS.value,
        });
      }
    } else if (fork.eip(2200)) {
      if (
        originalValue.value === currentValue.value &&
        currentValue.value !== newValue.value
      ) {
        if (originalValue.value === 0n) {
          gasCost = Gas.GAS_STORAGE_SET; // 20000
        } else {
          gasCost = Gas.GAS_STORAGE_UPDATE; // 5000
        }
      } else {
        gasCost = yield* Gas.GAS_SLOAD;
      }
    } else if (fork.eip(1283)) {
      if (currentValue.value === newValue.value) {
        // No-op: current value equals new value
        gasCost = Gas.GAS_SSTORE_NOOP; // 200
      } else if (originalValue.value === currentValue.value) {
        // Clean slot (first write in transaction)
        if (originalValue.value === 0n) {
          // Slot is empty (original == 0)
          gasCost = Gas.GAS_SSTORE_INIT; // 20000
        } else if (newValue.value === 0n) {
          // Clearing a non-empty slot
          gasCost = Gas.GAS_SSTORE_CLEAN; // 5000
        } else {
          // Changing a non-empty slot to another non-zero value
          gasCost = Gas.GAS_SSTORE_CLEAN; // 5000
        }
      } else {
        // Dirty slot (subsequent write in transaction)
        gasCost = Gas.GAS_SSTORE_NOOP; // 200
      }
    } else {
      if (newValue.value !== 0n && currentValue.value === 0n) {
        gasCost = Gas.GAS_STORAGE_SET; // 20000
      } else {
        gasCost = Gas.GAS_STORAGE_UPDATE; // 5000
      }
    }

    // REFUND COUNTER CALCULATION
    if (currentValue.value !== newValue.value) {
      if (fork.eip(2929)) {
        // Case 3: Storage slot being restored to its original value
        if (originalValue.value === newValue.value) {
          if (originalValue.value === 0n) {
            const refund =
              Gas.GAS_STORAGE_SET.value - Gas.GAS_WARM_ACCESS.value;
            yield* Ref.update(
              evm.refundCounter,
              (current) => new U256({ value: current.value + refund }),
            );
          } else {
            const refund =
              Gas.GAS_STORAGE_UPDATE.value -
              Gas.GAS_COLD_SLOAD.value -
              Gas.GAS_WARM_ACCESS.value;
            yield* Ref.update(
              evm.refundCounter,
              (current) => new U256({ value: current.value + refund }),
            );
          }
        }
        const clearRefund = fork.eipSelect(3529, 4800n, 15000n);

        // Case 1: Storage is cleared for the first time in the transaction
        if (
          originalValue.value !== 0n &&
          currentValue.value !== 0n &&
          newValue.value === 0n
        ) {
          yield* Ref.update(
            evm.refundCounter,
            (current) =>
              new U256({
                value: current.value + clearRefund,
              }),
          );
        }

        // Case 2: Gas refund issued earlier to be reversed
        if (originalValue.value !== 0n && currentValue.value === 0n) {
          yield* Ref.update(
            evm.refundCounter,
            (current) =>
              new U256({
                value: current.value - clearRefund,
              }),
          );
        }
      } else if (fork.eip(1283)) {
        // EIP-1283 (Constantinople) refund logic
        // More complex refund handling based on the working VM implementation

        if (originalValue.value !== currentValue.value) {
          // Dirty slot (subsequent write)
          if (originalValue.value !== 0n) {
            // Original slot was non-empty
            if (currentValue.value === 0n) {
              // Reverse refund: slot was cleared but is now being set again
              yield* Ref.update(
                evm.refundCounter,
                (current) =>
                  new U256({
                    value:
                      current.value - Gas.GAS_SSTORE_CLEAR_REFUND_EIP1283.value,
                  }),
              );
            } else if (newValue.value === 0n) {
              // Issue refund: slot is being cleared
              yield* Ref.update(
                evm.refundCounter,
                (current) =>
                  new U256({
                    value:
                      current.value + Gas.GAS_SSTORE_CLEAR_REFUND_EIP1283.value,
                  }),
              );
            }
          }

          // Restoring to original value
          if (newValue.value === originalValue.value) {
            if (originalValue.value === 0n) {
              // Restoring to empty (was set, now clearing back to original)
              const refund =
                Gas.GAS_SSTORE_INIT.value - Gas.GAS_SSTORE_NOOP.value;
              yield* Ref.update(
                evm.refundCounter,
                (current) => new U256({ value: current.value + refund }),
              );
            } else {
              // Restoring to non-empty original value
              const refund =
                Gas.GAS_SSTORE_CLEAN.value - Gas.GAS_SSTORE_NOOP.value;
              yield* Ref.update(
                evm.refundCounter,
                (current) => new U256({ value: current.value + refund }),
              );
            }
          }
        } else {
          // Clean slot (first write in transaction)
          if (originalValue.value !== 0n && newValue.value === 0n) {
            // Clearing a non-empty slot
            yield* Ref.update(
              evm.refundCounter,
              (current) =>
                new U256({
                  value:
                    current.value + Gas.GAS_SSTORE_CLEAR_REFUND_EIP1283.value,
                }),
            );
          }
        }
      } else {
        // Pre-EIP-1283 refund logic (simple model)
        const clearRefund = 15000n; // Always 15000 before London

        // Case 1: Storage is cleared for the first time in the transaction
        if (
          originalValue.value !== 0n &&
          currentValue.value !== 0n &&
          newValue.value === 0n
        ) {
          yield* Ref.update(
            evm.refundCounter,
            (current) =>
              new U256({
                value: current.value + clearRefund,
              }),
          );
        }

        // Case 2: Gas refund issued earlier to be reversed
        if (originalValue.value !== 0n && currentValue.value === 0n) {
          yield* Ref.update(
            evm.refundCounter,
            (current) =>
              new U256({
                value: current.value - clearRefund,
              }),
          );
        }
      }
    }

    // Charge gas
    yield* Gas.chargeGas(gasCost);

    // Check if we're in a static context
    if (evm.message.isStatic) {
      yield* Effect.fail(
        new WriteInStaticContext({
          message: "Cannot modify storage in static context",
        }),
      );
    }

    // OPERATION
    yield* State.setStorage(state, currentTarget, key, newValue);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

/**
 * TLOAD: Load from transient storage
 *
 * Loads to the stack, the value corresponding to a certain key from the
 * transient storage of the current account.
 *
 * Gas: 100 (always warm)
 * Stack: [key, ...] -> [value, ...]
 */
export const tload: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const key = yield* evm.stack.pop().pipe(Effect.map((k) => k.toBeBytes32()));

    // GAS
    yield* Gas.chargeGas(Gas.GAS_WARM_ACCESS);

    // OPERATION
    const transientStorage = evm.message.txEnv.transientStorage;
    const value = State.getTransientStorage(
      transientStorage,
      evm.message.currentTarget,
      key,
    );
    yield* evm.stack.push(value);

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  },
);

/**
 * TSTORE: Store to transient storage
 *
 * Stores a value at a certain key in the current context's transient storage.
 *
 * Gas: 100 (always warm)
 * Stack: [key, value, ...] -> [...]
 */
export const tstore: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;

    // STACK
    const key = yield* evm.stack.pop().pipe(Effect.map((k) => k.toBeBytes32()));
    const newValue = yield* evm.stack.pop();

    // GAS
    yield* Gas.chargeGas(Gas.GAS_WARM_ACCESS);

    // Check if we're in a static context
    if (evm.message.isStatic) {
      yield* Effect.fail(
        new WriteInStaticContext({
          message: "Cannot modify transient storage in static context",
        }),
      );
    }

    // OPERATION
    const transientStorage = evm.message.txEnv.transientStorage;
    State.setTransientStorage(
      transientStorage,
      evm.message.currentTarget,
      key,
      newValue,
    );

    // PROGRAM COUNTER
    yield* evm.incrementPC(1);
  });

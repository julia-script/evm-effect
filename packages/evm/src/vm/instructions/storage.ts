/**
 * Ethereum Virtual Machine (EVM) Storage Instructions
 *
 * Implementations of the EVM storage-related instructions following the
 * Arrow Glacier fork specification.
 */

import { Uint } from "@evm-effect/ethereum-types";
import { Effect } from "effect";
import type { EthereumException } from "../../exceptions.js";
import { OutOfGasError, WriteInStaticContext } from "../../exceptions.js";
import * as State from "../../state.js";
import { Evm } from "../evm.js";
import { Fork } from "../ForkService.js";
import * as Gas from "../gas.js";
import { GasCosts } from "../gas.js";
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
        yield* Gas.chargeGas(GasCosts.WARM_ACCESS); // 100
      } else {
        evm.accessedStorageKeys.add(storageKey);
        yield* Gas.chargeGas(GasCosts.COLD_STORAGE_ACCESS); // 2100
      }
    } else {
      yield* Gas.chargeGas(yield* GasCosts.SLOAD); // 800
    }

    // OPERATION
    const blockEnv = evm.message.blockEnv;
    const value = yield* State.getStorage(
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
    const fork = yield* Fork;
    // STACK
    const key = yield* evm.stack.pop().pipe(Effect.map((k) => k.toBeBytes32()));
    const newValue = yield* evm.stack.pop();

    // PRE-CHECKS
    // Check if we have enough gas (must have more than call stipend)
    const gasLeft = evm.gasLeft;
    if (fork.eip(2200)) {
      if (gasLeft <= GasCosts.CALL_STIPEND.value) {
        return yield* Effect.fail(
          new OutOfGasError({ message: "Insufficient gas for SSTORE" }),
        );
      }
    }

    // GAS
    const state = evm.message.blockEnv.state;
    const currentTarget = evm.message.currentTarget;
    const originalValue = yield* state.getStorageOriginal(currentTarget, key);
    const currentValue = yield* state.getStorage(currentTarget, key);

    if (fork.eip(2929)) {
      let gasCost = 0n;

      if (
        !evm.accessedStorageKeys.has(
          new StorageKey({
            address: evm.message.currentTarget,
            slot: key,
          }),
        )
      ) {
        evm.accessedStorageKeys.add(
          new StorageKey({
            address: evm.message.currentTarget,
            slot: key,
          }),
        );
        gasCost += GasCosts.COLD_STORAGE_ACCESS.value;
      }

      if (
        originalValue.value === currentValue.value &&
        currentValue.value !== newValue.value
      ) {
        if (originalValue.value === 0n) {
          gasCost += GasCosts.STORAGE_SET.value;
        } else {
          gasCost +=
            GasCosts.COLD_STORAGE_WRITE.value -
            GasCosts.COLD_STORAGE_ACCESS.value;
        }
      } else {
        gasCost += GasCosts.WARM_ACCESS.value;
      }

      // refund calculation
      if (currentValue.value !== newValue.value) {
        if (
          originalValue.value !== 0n &&
          currentValue.value !== 0n &&
          newValue.value === 0n
        ) {
          yield* Gas.refundGas(yield* GasCosts.REFUND_STORAGE_CLEAR, [
            "Refund storage slot cleared",
            "Net gas cost model",
            "EIP-2929",
          ]);
        }
        if (originalValue.value !== 0n && currentValue.value === 0n) {
          yield* Gas.removeRefundGas(yield* GasCosts.REFUND_STORAGE_CLEAR, [
            "Remove refund storage",
            "Net gas cost model",
            "EIP-2929",
          ]);
        }

        if (originalValue.value === newValue.value) {
          if (originalValue.value === 0n) {
            yield* Gas.refundGas(
              Uint.wrap(
                GasCosts.STORAGE_SET.value - GasCosts.WARM_ACCESS.value,
              ),
              ["Refund storage slot reset", "Net gas cost model", "EIP-2200"],
            );
          } else {
            yield* Gas.refundGas(
              Uint.wrap(
                GasCosts.COLD_STORAGE_WRITE.value -
                  GasCosts.COLD_STORAGE_ACCESS.value -
                  GasCosts.WARM_ACCESS.value,
              ),
              ["Refund storage slot reset", "Net gas cost model", "EIP-2200"],
            );
          }
        }
      }

      yield* Gas.chargeGas(Uint.wrap(gasCost), [
        "Store to storage",
        "Net gas cost model",
        "EIP-2929",
      ]);
    } else if (fork.eip(2200)) {
      let gasCost = 0n;
      if (
        originalValue.value === currentValue.value &&
        currentValue.value !== newValue.value
      ) {
        if (originalValue.value === 0n) {
          gasCost += GasCosts.STORAGE_SET.value;
        } else {
          gasCost += GasCosts.COLD_STORAGE_WRITE.value;
        }
      } else {
        gasCost = yield* GasCosts.SLOAD.pipe(Effect.map((gas) => gas.value));
      }

      if (currentValue.value !== newValue.value) {
        if (
          originalValue.value !== 0n &&
          currentValue.value !== 0n &&
          newValue.value === 0n
        ) {
          yield* Gas.refundGas(yield* GasCosts.REFUND_STORAGE_CLEAR, [
            "Refund storage slot cleared",
            "Net gas cost model",
            "EIP-2200",
          ]);
        }
        if (originalValue.value !== 0n && currentValue.value === 0n) {
          yield* Gas.removeRefundGas(yield* GasCosts.REFUND_STORAGE_CLEAR, [
            "Remove refund storage",
            "Net gas cost model",
            "EIP-2200",
          ]);
        }

        if (originalValue.value === newValue.value) {
          const gasSload = yield* GasCosts.SLOAD.pipe(
            Effect.map((gas) => gas.value),
          );
          if (originalValue.value === 0n) {
            yield* Gas.refundGas(
              Uint.wrap(GasCosts.STORAGE_SET.value - gasSload),
              ["Refund storage slot reset", "Net gas cost model", "EIP-2200"],
            );
          } else {
            yield* Gas.refundGas(
              Uint.wrap(GasCosts.COLD_STORAGE_WRITE.value - gasSload),
              ["Refund storage slot reset", "Net gas cost model", "EIP-2200"],
            );
          }
        }
      }
      yield* Gas.chargeGas(Uint.wrap(gasCost), [
        "Store to storage",
        "Net gas cost model",
        "EIP-2200",
      ]);
    } else if (!fork.eip(2200)) {
      let gasCost = 0n;
      if (newValue.value !== 0n && currentValue.value === 0n) {
        gasCost = GasCosts.STORAGE_SET.value;
      } else {
        gasCost = GasCosts.COLD_STORAGE_WRITE.value;
      }
      if (newValue.value === 0n && currentValue.value !== 0n) {
        yield* Gas.refundGas(yield* GasCosts.REFUND_STORAGE_CLEAR, [
          "Refund storage slot cleared",
          "Net gas cost model",
        ]);
      }

      yield* Gas.chargeGas(Uint.wrap(gasCost), [
        "Store to storage",
        "Net gas cost model",
      ]);
    }

    if (fork.eip(609)) {
      if (evm.message.isStatic) {
        return yield* Effect.fail(
          new WriteInStaticContext({
            message: "Cannot modify storage in static context",
          }),
        );
      }
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
      return yield* Effect.fail(
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

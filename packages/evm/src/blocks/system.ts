/**
 * System Transaction Processing
 *
 * Direct port of system transaction functions from ethereum/forks/osaka/fork.py.
 * These functions handle system-level transactions like beacon root storage
 * and history storage operations.
 */

import { type Address, Bytes, U256, Uint } from "@evm-effect/ethereum-types";
import { HashSet } from "@evm-effect/shared/hashset";
import { Data, Effect, Option, Ref } from "effect";
import { SYSTEM_ADDRESS, SYSTEM_TRANSACTION_GAS } from "../constants.js";
import { type EthereumException, InvalidBlock } from "../exceptions.js";
import * as State from "../state.js";
import { TransientStorage } from "../state.js";
import type { Log } from "../types/index.js";
import type { Fork } from "../vm/Fork.js";
import { processMessage } from "../vm/interpreter.js";
import type { BlockEnvironment } from "../vm/message.js";
import { Message, TransactionEnvironment } from "../vm/message.js";
import { Code } from "../vm/runtime.js";

/**
 * Output of a particular message call.
 *
 * Contains the following:
 *
 *       1. `gasLeft`: remaining gas after execution.
 *       2. `refundCounter`: gas to refund after execution.
 *       3. `logs`: list of `Log` generated during execution.
 *       4. `accountsToDelete`: Contracts which have self-destructed.
 *       5. `touchedAccounts`: Accounts that have been touched.
 *       6. `error`: The error from the execution if any.
 *       7. `returnData`: The output of the execution.
 */
export class MessageCallOutput extends Data.TaggedClass("MessageCallOutput")<{
  readonly gasLeft: Uint;
  readonly refundCounter: U256;
  readonly logs: readonly Log[];
  readonly accountsToDelete: HashSet<Address>;
  readonly touchedAccounts: HashSet<Address>;
  readonly error: Option.Option<EthereumException>;
  readonly returnData: Bytes;
}> {}

/**
 * Process a system transaction with the given code.
 *
 * Prefer calling `processCheckedSystemTransaction` or
 * `processUncheckedSystemTransaction` depending on whether missing code or
 * an execution error should cause the block to be rejected.
 *
 * Parameters
 * ----------
 * blockEnv :
 *     The block scoped environment.
 * targetAddress :
 *     Address of the contract to call.
 * systemContractCode :
 *     Code of the contract to call.
 * data :
 *     Data to pass to the contract.
 *
 * Returns
 * -------
 * systemTxOutput : `MessageCallOutput`
 *     Output of processing the system transaction.
 */
const processSystemTransaction = (
  blockEnv: BlockEnvironment,
  targetAddress: Address,
  systemContractCode: Bytes,
  data: Bytes,
): Effect.Effect<MessageCallOutput, never, Fork> =>
  Effect.gen(function* () {
    // Create transaction environment for system transaction
    const systemTxEnv = new TransactionEnvironment({
      origin: SYSTEM_ADDRESS,
      gasPrice: new Uint({ value: 0n }),
      gas: SYSTEM_TRANSACTION_GAS,
      accessListAddresses: HashSet.empty(),
      accessListStorageKeys: HashSet.empty(),
      transientStorage: TransientStorage.empty(),
      blobVersionedHashes: [],
      authorizations: [],
      indexInBlock: Option.none(),
      txHash: Option.none(),
    });

    // Create message for system transaction
    const systemMessage = Message({
      blockEnv: blockEnv,
      txEnv: systemTxEnv,
      caller: SYSTEM_ADDRESS,
      target: targetAddress,
      currentTarget: targetAddress,
      gas: SYSTEM_TRANSACTION_GAS,
      value: new U256({ value: 0n }),
      data: data,
      codeAddress: targetAddress,
      code: Code.from(systemContractCode),
      depth: new Uint({ value: 0n }),
      shouldTransferValue: false,
      isStatic: false,
      accessedAddresses: HashSet.empty(),
      accessedStorageKeys: HashSet.empty(),
      disablePrecompiles: true, // System transactions don't use precompiles
      parentEvm: Option.none(),
    });

    // Execute the system transaction - catch any errors and convert to MessageCallOutput
    const evmResult = yield* processMessage(systemMessage).pipe(Effect.either);

    if (evmResult._tag === "Left") {
      // Execution failed - return output with error
      return new MessageCallOutput({
        gasLeft: new Uint({ value: 0n }),
        refundCounter: new U256({ value: 0n }),
        logs: [],
        accountsToDelete: HashSet.empty(),
        touchedAccounts: HashSet.empty(),
        error: Option.some(evmResult.left),
        returnData: new Bytes({ value: new Uint8Array(0) }),
      });
    }

    const evm = evmResult.right;
    const evmError = yield* evm.error;
    let logs: readonly Log[] = [];
    let accountsToDelete: HashSet<Address> = HashSet.empty();
    let touchedAccounts: HashSet<Address> = HashSet.empty();
    let refundCounter = new U256({ value: 0n });

    if (Option.isNone(evmError)) {
      logs = yield* Ref.get(evm.logs);
      accountsToDelete = evm.accountsToDelete;
      touchedAccounts = evm.touchedAccounts;
      refundCounter = yield* Ref.get(evm.refundCounter);
    }

    return new MessageCallOutput({
      gasLeft: new Uint({ value: evm.gasLeft }),
      refundCounter: refundCounter,
      logs: logs,
      accountsToDelete: accountsToDelete.clone(),
      touchedAccounts: touchedAccounts.clone(),
      error: evmError,
      returnData: yield* Ref.get(evm.output),
    });
  });

/**
 * Process a system transaction and raise an error if the contract does not
 * contain code or if the transaction fails.
 *
 * Parameters
 * ----------
 * blockEnv :
 *     The block scoped environment.
 * targetAddress :
 *     Address of the contract to call.
 * data :
 *     Data to pass to the contract.
 *
 * Returns
 * -------
 * systemTxOutput : `MessageCallOutput`
 *     Output of processing the system transaction.
 */
export const processCheckedSystemTransaction = (
  blockEnv: BlockEnvironment,
  targetAddress: Address,
  data: Bytes,
): Effect.Effect<MessageCallOutput, InvalidBlock, Fork> =>
  Effect.gen(function* () {
    const systemContractCode = State.getAccount(
      blockEnv.state,
      targetAddress,
    ).code;

    if (systemContractCode.value.length === 0) {
      return yield* Effect.fail(
        new InvalidBlock({
          message: `System contract address ${targetAddress.toString()} does not contain code`,
        }),
      );
    }

    const systemTxOutput = yield* processSystemTransaction(
      blockEnv,
      targetAddress,
      systemContractCode,
      data,
    );

    if (Option.isSome(systemTxOutput.error)) {
      return yield* Effect.fail(
        new InvalidBlock({
          message: `System contract (${targetAddress.toString()}) call failed: ${systemTxOutput.error.value}`,
        }),
      );
    }

    return systemTxOutput;
  });

/**
 * Process a system transaction without checking if the contract contains code
 * or if the transaction fails.
 *
 * Parameters
 * ----------
 * blockEnv :
 *     The block scoped environment.
 * targetAddress :
 *     Address of the contract to call.
 * data :
 *     Data to pass to the contract.
 *
 * Returns
 * -------
 * systemTxOutput : `MessageCallOutput`
 *     Output of processing the system transaction.
 */
export const processUncheckedSystemTransaction = (
  blockEnv: BlockEnvironment,
  targetAddress: Address,
  data: Bytes,
): Effect.Effect<MessageCallOutput, never, Fork> =>
  Effect.gen(function* () {
    const systemContractCode = State.getAccount(
      blockEnv.state,
      targetAddress,
    ).code;

    return yield* processSystemTransaction(
      blockEnv,
      targetAddress,
      systemContractCode,
      data,
    );
  });

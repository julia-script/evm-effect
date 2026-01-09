/**
 * Ethereum Virtual Machine (EVM) System Instructions
 *
 * Implementations of the EVM system-related instructions following the
 * Osaka fork specification.
 *
 * Note: Complex opcodes (CALL, CREATE, etc.) require full interpreter
 * integration and will be implemented as part of the interpreter module.
 */

import {
  type Address,
  Bytes,
  Bytes32,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import * as Numeric from "@evm-effect/ethereum-types/numeric";
import { Effect, Option, Ref } from "effect";
import type { EthereumException } from "../../exceptions.js";
import {
  OutOfGasError,
  Revert,
  WriteInStaticContext,
} from "../../exceptions.js";
import * as State from "../../state.js";
import {
  computeContractAddress,
  computeCreate2ContractAddress,
  toAddressMasked,
} from "../../utils/address.js";
import { memoryReadBytes, memoryWrite } from "../../utils/memory.js";
import {
  getDelegatedCodeAddress,
  isValidDelegation,
} from "../eoa_delegation.js";
import { Evm } from "../evm.js";
import { Fork } from "../Fork.js";
import * as Gas from "../gas.js";
import * as Interpreter from "../interpreter.js";
import {
  MAX_INIT_CODE_SIZE,
  processCreateMessage,
  processMessage,
  STACK_DEPTH_LIMIT,
} from "../interpreter.js";
import { Message } from "../message.js";
import { Code } from "../runtime.js";

/**
 * Simple access_delegation implementation for EIP-7702 support
 * Returns delegation info and access gas cost
 */
const accessDelegation = (
  evm: Evm["Type"],
  address: Address,
): Effect.Effect<[boolean, Address, Bytes, Uint], never, Evm | Fork> =>
  Effect.gen(function* () {
    // Check if EIP-7702 is supported
    const fork = yield* Fork;

    // Get account code
    const account = State.getAccount(evm.message.blockEnv.state, address);
    const code = account.code;

    // For pre-EIP-7702 forks, delegation doesn't exist
    if (!fork.eip(7702)) {
      return [false, address, code, new Uint({ value: 0n })] as const;
    }

    // Check if this is a valid delegation marker
    if (!isValidDelegation(code)) {
      // Not a delegation marker - return the original address and code
      return [false, address, code, new Uint({ value: 0n })] as const;
    }

    // Extract the delegated code address
    const delegatedAddressOption = getDelegatedCodeAddress(code);
    if (Option.isNone(delegatedAddressOption)) {
      // No delegated address found - return the original (though this shouldn't happen)
      return [false, address, code, new Uint({ value: 0n })] as const;
    }

    const delegatedAddress = delegatedAddressOption.value;

    // Get the delegated code
    const delegatedAccount = State.getAccount(
      evm.message.blockEnv.state,
      delegatedAddress,
    );
    const delegatedCode = delegatedAccount.code;

    // Calculate access gas cost
    let accessGasCost: Uint;
    const isWarm = evm.accessedAddresses.has(delegatedAddress);
    if (isWarm) {
      accessGasCost = Gas.GAS_WARM_ACCESS;
    } else {
      evm.accessedAddresses.add(delegatedAddress);
      accessGasCost = Gas.GAS_COLD_ACCOUNT_ACCESS;
    }

    // Return the delegated address, its code, and the access cost
    return [true, delegatedAddress, delegatedCode, accessGasCost] as const;
  });

/**
 * Perform the core logic of the `CALL*` family of opcodes.
 *
 * Ported from Python: generic_call
 */
const genericCall = (
  gas: Uint,
  value: U256,
  caller: Address,
  to: Address,
  codeAddress: Address,
  shouldTransferValue: boolean,
  isStaticCall: boolean,
  memoryInputStartPosition: U256,
  memoryInputSize: U256,
  memoryOutputStartPosition: U256,
  memoryOutputSize: U256,
  code: Bytes,
  disablePrecompiles: boolean,
) =>
  Effect.gen(function* () {
    const evm = yield* Evm;

    // Clear return data
    yield* Ref.set(evm.returnData, new Bytes({ value: new Uint8Array(0) }));

    // Check stack depth limit
    if (evm.message.depth.value + 1n > STACK_DEPTH_LIMIT.value) {
      // Return gas and push 0 on failure
      evm.setGasLeft(evm.gasLeft + gas.value);
      yield* evm.stack.push(new U256({ value: 0n }));
      return;
    }

    // Read call data from memory
    const memory = yield* Ref.get(evm.memory);
    const callData = memoryReadBytes(
      memory,
      memoryInputStartPosition,
      memoryInputSize,
    );

    // Create child message
    const childMessage = Message({
      blockEnv: evm.message.blockEnv,
      txEnv: evm.message.txEnv,
      caller,
      target: to,
      currentTarget: to,
      gas,
      value,
      data: callData,
      code: Code.from(code.value),
      depth: new Uint({ value: evm.message.depth.value + 1n }),
      codeAddress,
      shouldTransferValue,
      isStatic: isStaticCall || evm.message.isStatic,
      accessedAddresses: evm.accessedAddresses.clone(),
      accessedStorageKeys: evm.accessedStorageKeys.clone(),
      disablePrecompiles,
      parentEvm: Option.some(evm),
    });

    const childEvm = yield* processMessage(childMessage);

    // Handle result integration
    const childError = yield* childEvm.error;
    const childOutput = yield* Ref.get(childEvm.output);

    if (Option.isSome(childError)) {
      // Child execution failed

      yield* Interpreter.incorporateChildOnError(evm, childEvm);

      yield* Ref.set(evm.returnData, childOutput);
      yield* evm.stack.push(new U256({ value: 0n }));
    } else {
      // Child execution succeeded
      yield* Interpreter.incorporateChildOnSuccess(evm, childEvm);
      yield* Ref.set(evm.returnData, childOutput);
      yield* evm.stack.push(new U256({ value: 1n }));
    }

    // Write output to memory
    // Only write if memoryOutputSize > 0 to avoid expanding memory unnecessarily
    if (memoryOutputSize.value > 0n) {
      const actualOutputSize =
        memoryOutputSize.value < BigInt(childOutput.value.length)
          ? memoryOutputSize
          : new U256({ value: BigInt(childOutput.value.length) });

      const outputToWrite = new Bytes({
        value: childOutput.value.slice(0, Number(actualOutputSize.value)),
      });

      const currentMemory = yield* Ref.get(evm.memory);
      memoryWrite(currentMemory, memoryOutputStartPosition, outputToWrite);
    }
  });

/**
 * Core logic used by the `CREATE*` family of opcodes.
 *
 * Ported from Python: generic_create
 */
const genericCreate = (
  endowment: U256,
  contractAddress: Address,
  memoryStartPosition: U256,
  memorySize: U256,
) =>
  Effect.gen(function* () {
    const evm = yield* Evm;
    const fork = yield* Fork;

    // Read init code from memory
    const memory = yield* Ref.get(evm.memory);
    const callData = memoryReadBytes(memory, memoryStartPosition, memorySize);

    // Check init code size limit
    if (callData.value.length > MAX_INIT_CODE_SIZE) {
      yield* Effect.fail(new OutOfGasError({ message: "Init code too large" }));
    }

    // Calculate and reserve gas for child execution
    // EIP-150 introduced the 63/64 rule via maxMessageCallGas
    // Pre-EIP-150 (Frontier/Homestead): child gets ALL remaining gas
    let createMessageGas: Uint;

    if (fork.eip(150)) {
      // EIP-150+: Apply 63/64 rule - child gets 63/64 of remaining gas
      createMessageGas = Gas.maxMessageCallGas(
        new Uint({ value: evm.gasLeft }),
      );
      // Reserve gas for child by deducting from parent
      evm.setGasLeft(evm.gasLeft - createMessageGas.value);
    } else {
      // Pre-EIP-150: Child gets all remaining gas, parent keeps 0
      createMessageGas = new Uint({ value: evm.gasLeft });
      evm.setGasLeft(0n);
    }

    // Check static context
    if (evm.message.isStatic) {
      yield* Effect.fail(
        new WriteInStaticContext({
          message: "Cannot CREATE in static context",
        }),
      );
    }

    // Clear return data
    yield* Ref.set(evm.returnData, new Bytes({ value: new Uint8Array(0) }));

    // Check sender balance, nonce, and depth
    const senderAddress = evm.message.currentTarget;
    const sender = State.getAccount(evm.message.blockEnv.state, senderAddress);

    if (
      sender.balance.value < endowment.value ||
      sender.nonce.value === 2n ** 64n - 1n ||
      evm.message.depth.value + 1n > STACK_DEPTH_LIMIT.value
    ) {
      // Return gas and push 0 on failure
      evm.setGasLeft(evm.gasLeft + createMessageGas.value);
      yield* evm.stack.push(new U256({ value: 0n }));
      return;
    }

    // Add contract address to accessed addresses
    evm.accessedAddresses.add(contractAddress);

    // Check for address collision
    if (
      State.accountHasCodeOrNonce(
        evm.message.blockEnv.state,
        contractAddress,
      ) ||
      State.accountHasStorage(evm.message.blockEnv.state, contractAddress)
    ) {
      // Increment nonce and return failure
      yield* State.incrementNonce(
        evm.message.blockEnv.state,
        evm.message.currentTarget,
      );
      yield* evm.stack.push(new U256({ value: 0n }));
      return;
    }

    // Increment sender nonce
    yield* State.incrementNonce(
      evm.message.blockEnv.state,
      evm.message.currentTarget,
    );

    // Create child message
    const childMessage = Message({
      blockEnv: evm.message.blockEnv,
      txEnv: evm.message.txEnv,
      caller: evm.message.currentTarget,
      currentTarget: contractAddress,
      gas: createMessageGas,
      value: endowment,
      target: undefined,
      data: new Bytes({ value: new Uint8Array(0) }),
      code: Code.from(callData.value),
      depth: new Uint({ value: evm.message.depth.value + 1n }),
      codeAddress: undefined,
      shouldTransferValue: true,
      isStatic: false,
      accessedAddresses: evm.accessedAddresses.clone(), // FIX: Clone from evm, not evm.message
      accessedStorageKeys: evm.accessedStorageKeys.clone(), // FIX: Clone from evm, not evm.message
      disablePrecompiles: false,
      parentEvm: Option.some(evm),
    });

    // Execute child message
    const childEvm = yield* processCreateMessage(childMessage);

    // Handle result integration
    const childError = yield* Ref.get(childEvm.error);

    if (Option.isSome(childError)) {
      // Child execution failed
      yield* Interpreter.incorporateChildOnError(evm, childEvm);
      const childOutput = yield* Ref.get(childEvm.output);
      yield* Ref.set(evm.returnData, childOutput);
      yield* evm.stack.push(new U256({ value: 0n }));
    } else {
      // Child execution succeeded
      yield* Interpreter.incorporateChildOnSuccess(evm, childEvm);
      yield* Ref.set(evm.returnData, new Bytes({ value: new Uint8Array(0) }));
      // Push contract address to stack
      const addressAsU256 = U256.fromBeBytes(contractAddress.value.value);
      yield* evm.stack.push(addressAsU256);
    }
  });

/**
 * RETURN: Halt execution returning output data
 *
 * Halts execution and returns output data from memory.
 * Does not consume remaining gas.
 *
 * Gas: 0 + memory expansion cost
 * Stack: [offset, size, ...] -> []
 */
export const returnOp: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const memoryStartPosition = yield* evm.stack.pop();
    const memorySize = yield* evm.stack.pop();

    // GAS
    const memory = yield* Ref.get(evm.memory);
    const extension = Gas.calculateGasExtendMemory(memory, [
      [memoryStartPosition, memorySize],
    ]);

    yield* Gas.chargeGas(
      new Uint({ value: Gas.GAS_ZERO.value + extension.cost.value }),
    );

    // OPERATION
    // Expand memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);
    yield* Ref.set(evm.memory, newMemory);

    // Read bytes from memory
    const start = Number(memoryStartPosition.value);
    const length = Number(memorySize.value);
    const outputBytes = newMemory.slice(start, start + length);
    const output = new Bytes({ value: outputBytes });

    yield* Ref.set(evm.output, output);

    // Stop execution
    // yield* Ref.set(evm.running, false);
    evm.running = false;

    // PROGRAM COUNTER - no-op (execution stopped)
  },
);

/**
 * REVERT: Stop execution and revert state changes
 *
 * Stop execution and revert state changes, without consuming all provided gas.
 * Has the ability to return a reason (error message).
 *
 * Gas: 0 + memory expansion cost
 * Stack: [offset, size, ...] -> []
 */
export const revert: Effect.Effect<void, EthereumException, Evm> = Effect.gen(
  function* () {
    const evm = yield* Evm;

    // STACK
    const memoryStartIndex = yield* evm.stack.pop();
    const size = yield* evm.stack.pop();

    // GAS
    const memory = yield* Ref.get(evm.memory);
    const extension = Gas.calculateGasExtendMemory(memory, [
      [memoryStartIndex, size],
    ]);

    yield* Gas.chargeGas(extension.cost);

    // OPERATION
    // Expand memory if needed
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);
    yield* Ref.set(evm.memory, newMemory);

    // Read bytes from memory
    const start = Number(memoryStartIndex.value);
    const length = Number(size.value);
    const outputBytes = newMemory.slice(start, start + length);
    const output = new Bytes({ value: outputBytes });

    yield* Ref.set(evm.output, output);

    // Throw Revert exception to trigger state rollback
    yield* Effect.fail(new Revert({ message: "Execution reverted" }));

    // PROGRAM COUNTER - no-op (execution reverted)
  },
);

/**
 * SELFDESTRUCT: Halt execution and register account for later deletion
 *
 * Halts execution and registers the current account for deletion.
 * Sends all remaining balance to the beneficiary address.
 *
 * Gas: 5000 + 2600 (cold access) + 25000 (new account if needed)
 * Stack: [beneficiary, ...] -> []
 */
export const selfdestruct: Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.gen(function* () {
    const evm = yield* Evm;
    const fork = yield* Fork;

    // STACK
    const beneficiaryU256 = yield* evm.stack.pop();
    const beneficiary = toAddressMasked(beneficiaryU256);

    // GAS - fork-dependent base cost (EIP-150 and EIP-2929)
    let gasCost = yield* Gas.GAS_SELF_DESTRUCT;

    // Access gas cost - fork-dependent (EIP-2929)
    if (fork.eip(2929)) {
      // EIP-2929 (Berlin+): add cold account access cost if not accessed
      const accessedAddresses = evm.accessedAddresses;
      if (!accessedAddresses.has(beneficiary)) {
        evm.accessedAddresses.add(beneficiary);
        gasCost = new Uint({
          value: gasCost.value + Gas.GAS_COLD_ACCOUNT_ACCESS.value,
        });
      }
    }
    // Pre-EIP-2929: no additional access cost

    const originator = evm.message.currentTarget;
    const originatorAccount = State.getAccount(
      evm.message.blockEnv.state,
      originator,
    );

    // GAS_SELF_DESTRUCT_NEW_ACCOUNT - fork-dependent conditions
    if (fork.eip(161)) {
      // EIP-161 (Spurious Dragon+): Charge if beneficiary is not alive AND originator has non-zero balance
      if (
        !State.isAccountAlive(evm.message.blockEnv.state, beneficiary) &&
        originatorAccount.balance.value !== 0n
      ) {
        gasCost = new Uint({
          value: gasCost.value + Gas.GAS_SELF_DESTRUCT_NEW_ACCOUNT.value,
        });
      }
    } else if (fork.eip(150)) {
      // EIP-150 (Tangerine Whistle): Charge if beneficiary doesn't exist (no balance check)
      if (!State.accountExists(evm.message.blockEnv.state, beneficiary)) {
        gasCost = new Uint({
          value: gasCost.value + Gas.GAS_SELF_DESTRUCT_NEW_ACCOUNT.value,
        });
      }
    }
    // Pre-EIP-150 (Frontier/Homestead): No new account gas charge

    yield* Gas.chargeGas(gasCost);

    if (evm.message.isStatic) {
      yield* Effect.fail(
        new WriteInStaticContext({
          message: "Cannot SELFDESTRUCT in static context",
        }),
      );
    }

    // OPERATION
    yield* State.moveEther(
      evm.message.blockEnv.state,
      originator,
      beneficiary,
      originatorAccount.balance,
    );

    // EIP-6780: SELFDESTRUCT only in same transaction (Cancun and later)
    // Before EIP-6780, SELFDESTRUCT always deletes the account
    const shouldDelete = fork.eip(6780)
      ? evm.message.blockEnv.state.createdAccounts.has(originator)
      : true;

    // Collect all accounts already scheduled for deletion (current + all parents)
    // This is needed for correct gas refund calculation
    // Use address bytes as string key for set lookup
    const addressToKey = (addr: Address): string =>
      Array.from(addr.value.value)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const refundedAccounts = new Set<string>();
    for (const addr of evm.accountsToDelete) {
      refundedAccounts.add(addressToKey(addr));
    }
    let parentEvmOpt = evm.message.parentEvm;
    while (Option.isSome(parentEvmOpt)) {
      const parentEvm = parentEvmOpt.value;
      for (const addr of parentEvm.accountsToDelete) {
        refundedAccounts.add(addressToKey(addr));
      }
      parentEvmOpt = parentEvm.message.parentEvm;
    }

    // Gas refund for SELFDESTRUCT (removed in EIP-3529 / London)
    // Only add refund if originator is not already in refunded accounts
    if (!fork.eip(3529) && !refundedAccounts.has(addressToKey(originator))) {
      yield* Ref.update(
        evm.refundCounter,
        (current) =>
          new U256({
            value: current.value + Gas.GAS_SELF_DESTRUCT_REFUND.value,
          }),
      );
    }

    if (shouldDelete) {
      // If beneficiary is the same as originator, then the ether is burnt
      yield* State.setAccountBalance(
        evm.message.blockEnv.state,
        originator,
        new U256({ value: 0n }),
      );
      evm.accountsToDelete.add(originator);
    }

    // HALT execution
    evm.running = false;

    // PROGRAM COUNTER - no-op (execution halted)
  });

/**
 * CALL: Message-call into an account
 *
 * Ported from Python: call function in osaka/vm/instructions/system.py
 *
 * Gas: Complex calculation including memory expansion, access costs, and call stipend
 * Stack: [gas, to, value, input_start, input_size, output_start, output_size, ...] -> [success, ...]
 */
export const call = Effect.gen(function* () {
  const evm = yield* Evm;

  // STACK - exact order from Python
  const gas = new Uint({ value: (yield* evm.stack.pop()).value });
  const to = toAddressMasked(yield* evm.stack.pop());
  const value = yield* evm.stack.pop();
  const memoryInputStartPosition = yield* evm.stack.pop();
  const memoryInputSize = yield* evm.stack.pop();
  const memoryOutputStartPosition = yield* evm.stack.pop();
  const memoryOutputSize = yield* evm.stack.pop();

  // GAS
  const memory = yield* Ref.get(evm.memory);
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryInputStartPosition, memoryInputSize],
    [memoryOutputStartPosition, memoryOutputSize],
  ]);

  // Access gas cost calculation - fork-dependent (EIP-2929 and EIP-150)
  const fork = yield* Fork;
  let accessGasCost: Uint;

  if (fork.eip(2929)) {
    // EIP-2929 (Berlin+): warm/cold account access with access lists
    const accessedAddresses = evm.accessedAddresses;
    const isToWarm = accessedAddresses.has(to);
    if (isToWarm) {
      accessGasCost = Gas.GAS_WARM_ACCESS; // 100
    } else {
      evm.accessedAddresses.add(to);
      accessGasCost = Gas.GAS_COLD_ACCOUNT_ACCESS; // 2600
    }
  } else {
    // Pre-EIP-2929: fork-dependent CALL cost (40 for Frontier/Homestead, 700 for Tangerine Whistle+)
    accessGasCost = yield* Gas.GAS_CALL;
  }

  // Access delegation - only for EIP-7702 (Prague+)
  const codeAddress = to;
  const [disablePrecompiles, finalCodeAddress, code, delegatedAccessGasCost] =
    yield* accessDelegation(evm, codeAddress);

  accessGasCost = new Uint({
    value: accessGasCost.value + delegatedAccessGasCost.value,
  });

  // Create gas cost calculation - fork-dependent (EIP-161 changed behavior)
  let createGasCost = new Uint({ value: 0n });

  if (fork.eip(161)) {
    // EIP-161 (Spurious Dragon+): Only charge if transferring value to non-alive account
    // "alive" means exists and is non-empty
    // Note: In post-EIP-161, precompiles are NOT explicitly treated as alive here.
    // The reference implementation DOES charge GAS_NEW_ACCOUNT for value transfers to precompiles.
    const isAlive = State.isAccountAlive(evm.message.blockEnv.state, to);

    if (value.value !== 0n && !isAlive) {
      createGasCost = Gas.GAS_NEW_ACCOUNT;
    }
  } else {
    // Pre-EIP-161 (Frontier/Homestead/DAO/Tangerine Whistle):
    // Charge for ANY call to non-existent account
    // No special handling for precompiles - just check if account exists in state
    const accountExistsInState = State.accountExists(
      evm.message.blockEnv.state,
      to,
    );

    if (!accountExistsInState) {
      createGasCost = Gas.GAS_NEW_ACCOUNT;
    }
  }

  // Transfer gas cost
  const transferGasCost =
    value.value === 0n ? new Uint({ value: 0n }) : Gas.GAS_CALL_VALUE;

  const extraGas = new Uint({
    value: accessGasCost.value + createGasCost.value + transferGasCost.value,
  });

  // Calculate message call gas - fork-dependent (EIP-150 introduces 63/64 rule)
  const messageCallGas = Gas.calculateMessageCallGas(
    new Uint({ value: value.value }),
    gas,
    new Uint({ value: evm.gasLeft }),
    extendMemory.cost,
    extraGas,
    Gas.GAS_CALL_STIPEND,
    fork.eip(150), // Apply EIP-150 (63/64 rule) only if fork supports it
  );

  // Charge gas
  yield* Gas.chargeGas(
    new Uint({
      value: messageCallGas.cost.value + extendMemory.cost.value,
    }),
  );

  // Static context check
  if (evm.message.isStatic && value.value !== 0n) {
    yield* Effect.fail(
      new WriteInStaticContext({
        message: "Cannot transfer value in static context",
      }),
    );
  }

  // Memory extension
  const currentMemory = yield* Ref.get(evm.memory);
  const newMemory = new Uint8Array(
    currentMemory.length + Number(extendMemory.expandBy.value),
  );
  newMemory.set(currentMemory);
  yield* Ref.set(evm.memory, newMemory);

  // Sender balance check
  const senderBalance = State.getAccount(
    evm.message.blockEnv.state,
    evm.message.currentTarget,
  ).balance;

  if (senderBalance.value < value.value) {
    // Insufficient balance
    yield* evm.stack.push(new U256({ value: 0n }));
    yield* Ref.set(evm.returnData, new Bytes({ value: new Uint8Array(0) }));
    evm.setGasLeft(evm.gasLeft + messageCallGas.subCall.value);
  } else {
    // Execute generic call
    yield* genericCall(
      messageCallGas.subCall,
      value,
      evm.message.currentTarget,
      to,
      finalCodeAddress,
      true, // shouldTransferValue
      false, // isStaticCall
      memoryInputStartPosition,
      memoryInputSize,
      memoryOutputStartPosition,
      memoryOutputSize,
      code,
      disablePrecompiles,
    );
  }

  // PROGRAM COUNTER
  yield* Ref.update(evm.pc, (current) => current + 1);
});

/**
 * CALLCODE: Message-call into this account with alternative account's code
 *
 * Ported from Python: callcode function in osaka/vm/instructions/system.py
 *
 * Gas: Complex calculation including memory expansion and access costs
 * Stack: [gas, code_address, value, input_start, input_size, output_start, output_size, ...] -> [success, ...]
 */
export const callcode = Effect.gen(function* () {
  const evm = yield* Evm;

  // STACK - exact order from Python callcode function
  const gas = new Uint({ value: (yield* evm.stack.pop()).value });
  const codeAddress = toAddressMasked(yield* evm.stack.pop());
  const value = yield* evm.stack.pop();
  const memoryInputStartPosition = yield* evm.stack.pop();
  const memoryInputSize = yield* evm.stack.pop();
  const memoryOutputStartPosition = yield* evm.stack.pop();
  const memoryOutputSize = yield* evm.stack.pop();

  // GAS  callcode function
  // Target is current_target
  const to = evm.message.currentTarget;

  const memory = yield* Ref.get(evm.memory);
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryInputStartPosition, memoryInputSize],
    [memoryOutputStartPosition, memoryOutputSize],
  ]);

  // Access gas cost calculation for code_address - fork-dependent (EIP-2929 and EIP-150)
  const fork = yield* Fork;
  let accessGasCost: Uint;

  if (fork.eip(2929)) {
    // EIP-2929 (Berlin+): warm/cold account access with access lists
    const accessedAddresses = evm.accessedAddresses;
    if (accessedAddresses.has(codeAddress)) {
      accessGasCost = Gas.GAS_WARM_ACCESS; // 100
    } else {
      evm.accessedAddresses.add(codeAddress);
      accessGasCost = Gas.GAS_COLD_ACCOUNT_ACCESS; // 2600
    }
  } else {
    // Pre-EIP-2929: fork-dependent CALL cost (40 for Frontier/Homestead, 700 for Tangerine Whistle+)
    accessGasCost = yield* Gas.GAS_CALL;
  }

  // Access delegation - only for EIP-7702 (Prague+)

  const [disablePrecompiles, finalCodeAddress, code, delegatedAccessGasCost] =
    yield* accessDelegation(evm, codeAddress);
  accessGasCost = new Uint({
    value: accessGasCost.value + delegatedAccessGasCost.value,
  });

  // Transfer gas cost
  const transferGasCost =
    value.value === 0n ? new Uint({ value: 0n }) : Gas.GAS_CALL_VALUE;

  // Calculate message call gas without create_gas_cost - exactly as Python
  const messageCallGas = Gas.calculateMessageCallGas(
    new Uint({ value: value.value }),
    gas,
    new Uint({ value: evm.gasLeft }),
    extendMemory.cost,
    new Uint({
      value: accessGasCost.value + transferGasCost.value,
    }),
    Gas.GAS_CALL_STIPEND,
    fork.eip(150), // Apply EIP-150 (63/64 rule) only if fork supports it
  );

  // Charge gas
  yield* Gas.chargeGas(
    new Uint({
      value: messageCallGas.cost.value + extendMemory.cost.value,
    }),
  );

  // OPERATION
  // Memory extension
  const currentMemory = yield* Ref.get(evm.memory);
  const newMemory = new Uint8Array(
    currentMemory.length + Number(extendMemory.expandBy.value),
  );
  newMemory.set(currentMemory);
  yield* Ref.set(evm.memory, newMemory);

  // Sender balance check
  const senderBalance = State.getAccount(
    evm.message.blockEnv.state,
    evm.message.currentTarget,
  ).balance;

  if (senderBalance.value < value.value) {
    // Insufficient balance
    yield* evm.stack.push(new U256({ value: 0n }));
    yield* Ref.set(evm.returnData, new Bytes({ value: new Uint8Array(0) }));
    evm.gasLeft += messageCallGas.subCall.value;
  } else {
    // Execute generic call with current contract as both caller and target
    yield* genericCall(
      messageCallGas.subCall,
      value,
      evm.message.currentTarget, // caller - current contract
      to, // target - current contract (evm.message.current_target)
      finalCodeAddress, // code_address - the external code to execute
      true, // shouldTransferValue
      false, // isStaticCall
      memoryInputStartPosition,
      memoryInputSize,
      memoryOutputStartPosition,
      memoryOutputSize,
      code,
      disablePrecompiles,
    );
  }

  // PROGRAM COUNTER
  yield* Ref.update(evm.pc, (current) => current + 1);
});
/**
 * DELEGATECALL: Message-call into an account
 *
 * Ported from Python: delegatecall function in osaka/vm/instructions/system.py
 *
 * Gas: Complex calculation including memory expansion and access costs
 * Stack: [gas, code_address, input_start, input_size, output_start, output_size, ...] -> [success, ...]
 */
export const delegatecall = Effect.gen(function* () {
  const evm = yield* Evm;

  // STACK - exact order from Python delegatecall function (6 pops, no value parameter)
  const gas = new Uint({ value: (yield* evm.stack.pop()).value });
  const codeAddress = toAddressMasked(yield* evm.stack.pop());
  const memoryInputStartPosition = yield* evm.stack.pop();
  const memoryInputSize = yield* evm.stack.pop();
  const memoryOutputStartPosition = yield* evm.stack.pop();
  const memoryOutputSize = yield* evm.stack.pop();

  // GAS  delegatecall function
  const memory = yield* Ref.get(evm.memory);
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryInputStartPosition, memoryInputSize],
    [memoryOutputStartPosition, memoryOutputSize],
  ]);

  // Access gas cost calculation - fork-dependent (EIP-2929 and EIP-150)
  const fork = yield* Fork;
  let accessGasCost: Uint;

  if (fork.eip(2929)) {
    // EIP-2929 (Berlin+): warm/cold account access with access lists
    const accessedAddresses = evm.accessedAddresses;
    if (accessedAddresses.has(codeAddress)) {
      accessGasCost = Gas.GAS_WARM_ACCESS; // 100
    } else {
      evm.accessedAddresses.add(codeAddress);
      accessGasCost = Gas.GAS_COLD_ACCOUNT_ACCESS; // 2600
    }
  } else {
    // Pre-EIP-2929: fork-dependent CALL cost (40 for Frontier/Homestead, 700 for Tangerine Whistle+)
    accessGasCost = yield* Gas.GAS_CALL;
  }

  // Access delegation - only for EIP-7702 (Prague+)
  const [disablePrecompiles, finalCodeAddress, code, delegatedAccessGasCost] =
    yield* accessDelegation(evm, codeAddress);
  accessGasCost = new Uint({
    value: accessGasCost.value + delegatedAccessGasCost.value,
  });

  // Calculate message call gas with U256(0) value exactly as Python
  const messageCallGas = Gas.calculateMessageCallGas(
    new Uint({ value: 0n }), // U256(0) converted to Uint - no value transfer in DELEGATECALL
    gas,
    new Uint({ value: evm.gasLeft }),
    extendMemory.cost,
    accessGasCost,
    Gas.GAS_CALL_STIPEND,
    fork.eip(150), // Apply EIP-150 (63/64 rule) only if fork supports it
  );

  // Charge gas
  yield* Gas.chargeGas(
    new Uint({
      value: messageCallGas.cost.value + extendMemory.cost.value,
    }),
  );

  // OPERATION
  // Memory extension
  const currentMemory = yield* Ref.get(evm.memory);
  const newMemory = new Uint8Array(
    currentMemory.length + Number(extendMemory.expandBy.value),
  );
  newMemory.set(currentMemory);
  yield* Ref.set(evm.memory, newMemory);

  // Execute generic call with preserved caller and value
  yield* genericCall(
    messageCallGas.subCall,
    evm.message.value, // evm.message.value preservation exactly as Python
    evm.message.caller, // evm.message.caller preservation exactly as Python
    evm.message.currentTarget, // target as evm.message.current_target exactly as Python
    finalCodeAddress, // code_address
    false, // shouldTransferValue=False exactly as in Python
    false, // isStaticCall=False exactly as in Python
    memoryInputStartPosition,
    memoryInputSize,
    memoryOutputStartPosition,
    memoryOutputSize,
    code,
    disablePrecompiles,
  );

  // PROGRAM COUNTER
  yield* Ref.update(evm.pc, (current) => current + 1);
});

/**
 * STATICCALL: Message-call into an account
 *
 * Ported from Python: staticcall function in osaka/vm/instructions/system.py
 *
 * Gas: Complex calculation including memory expansion and access costs
 * Stack: [gas, to, input_start, input_size, output_start, output_size, ...] -> [success, ...]
 */
export const staticcall = Effect.gen(function* () {
  const evm = yield* Evm;

  // STACK - exact order from Python staticcall function (6 pops, no value parameter)
  const gas = new Uint({ value: (yield* evm.stack.pop()).value });
  const to = toAddressMasked(yield* evm.stack.pop());
  const memoryInputStartPosition = yield* evm.stack.pop();
  const memoryInputSize = yield* evm.stack.pop();
  const memoryOutputStartPosition = yield* evm.stack.pop();
  const memoryOutputSize = yield* evm.stack.pop();

  // GAS  staticcall function
  const memory = yield* Ref.get(evm.memory);
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryInputStartPosition, memoryInputSize],
    [memoryOutputStartPosition, memoryOutputSize],
  ]);

  // Access gas cost calculation - fork-dependent (EIP-2929 and EIP-150)
  const fork = yield* Fork;
  let accessGasCost: Uint;

  if (fork.eip(2929)) {
    // EIP-2929 (Berlin+): warm/cold account access with access lists
    const accessedAddresses = evm.accessedAddresses;
    if (accessedAddresses.has(to)) {
      accessGasCost = Gas.GAS_WARM_ACCESS; // 100
    } else {
      evm.accessedAddresses.add(to);
      accessGasCost = Gas.GAS_COLD_ACCOUNT_ACCESS; // 2600
    }
  } else {
    // Pre-EIP-2929: fork-dependent CALL cost (40 for Frontier/Homestead, 700 for Tangerine Whistle+)
    accessGasCost = yield* Gas.GAS_CALL;
  }

  // Access delegation - only for EIP-7702 (Prague+)
  const codeAddress = to;
  const [disablePrecompiles, finalCodeAddress, code, delegatedAccessGasCost] =
    yield* accessDelegation(evm, codeAddress);
  accessGasCost = new Uint({
    value: accessGasCost.value + delegatedAccessGasCost.value,
  });

  // Calculate message call gas with U256(0) value exactly as Python
  const messageCallGas = Gas.calculateMessageCallGas(
    new Uint({ value: 0n }), // U256(0) converted to Uint - no value transfer in STATICCALL
    gas,
    new Uint({ value: evm.gasLeft }),
    extendMemory.cost,
    accessGasCost,
    Gas.GAS_CALL_STIPEND,
    fork.eip(150), // Apply EIP-150 (63/64 rule) only if fork supports it
  );

  // Charge gas
  yield* Gas.chargeGas(
    new Uint({
      value: messageCallGas.cost.value + extendMemory.cost.value,
    }),
  );

  // OPERATION
  // Memory extension
  const currentMemory = yield* Ref.get(evm.memory);
  const newMemory = new Uint8Array(
    currentMemory.length + Number(extendMemory.expandBy.value),
  );
  newMemory.set(currentMemory);
  yield* Ref.set(evm.memory, newMemory);

  // Execute generic call with U256(0) value and isStaticCall=True
  yield* genericCall(
    messageCallGas.subCall,
    new U256({ value: 0n }), // U256(0) value exactly as Python
    evm.message.currentTarget, // caller - evm.message.current_target exactly as Python
    to, // target - to exactly as Python
    finalCodeAddress, // code_address
    true, // shouldTransferValue=True but with zero value exactly as Python
    true, // isStaticCall=True exactly as in Python
    memoryInputStartPosition,
    memoryInputSize,
    memoryOutputStartPosition,
    memoryOutputSize,
    code,
    disablePrecompiles,
  );

  // PROGRAM COUNTER
  yield* Ref.update(evm.pc, (current) => current + 1);
});

/**
 * CREATE: Create a new account with associated code
 *
 * Ported from Python: create function in osaka/vm/instructions/system.py
 *
 * Gas: 32000 + memory expansion cost + init code cost
 * Stack: [endowment, offset, size, ...] -> [address, ...]
 */
export const create = Effect.gen(function* () {
  const evm = yield* Evm;
  const fork = yield* Fork;

  // STACK - exact order from Python create function
  const endowment = yield* evm.stack.pop();
  const memoryStartPosition = yield* evm.stack.pop();
  const memorySize = yield* evm.stack.pop();

  // GAS  create function
  const memory = yield* Ref.get(evm.memory);
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryStartPosition, memorySize],
  ]);
  // EIP-3860: Init code gas cost (only applies if EIP-3860 is active, introduced in Shanghai)
  const initCodeGas = fork.eip(3860)
    ? Gas.initCodeCost(new Uint({ value: memorySize.value }))
    : new Uint({ value: 0n });

  yield* Gas.chargeGas(
    new Uint({
      value: Gas.GAS_CREATE.value + extendMemory.cost.value + initCodeGas.value,
    }),
  );

  // OPERATION
  // Memory extension
  const currentMemory = yield* Ref.get(evm.memory);
  const newMemory = new Uint8Array(
    currentMemory.length + Number(extendMemory.expandBy.value),
  );
  newMemory.set(currentMemory);
  yield* Ref.set(evm.memory, newMemory);

  // Compute contract address
  const contractAddress = computeContractAddress(
    evm.message.currentTarget,
    State.getAccount(evm.message.blockEnv.state, evm.message.currentTarget)
      .nonce,
  );

  // Execute generic create
  yield* genericCreate(
    endowment,
    contractAddress,
    memoryStartPosition,
    memorySize,
  );

  // PROGRAM COUNTER
  yield* Ref.update(evm.pc, (current) => current + 1);
});
/**
 * CREATE2: Create a new account with associated code
 *
 * Ported from Python: create2 function in osaka/vm/instructions/system.py
 *
 * It's similar to CREATE opcode except that the address of new account
 * depends on the init_code instead of the nonce of sender.
 *
 * Gas: GAS_CREATE + GAS_KECCAK256_WORD * call_data_words + memory expansion + init code cost
 * Stack: [endowment, offset, size, salt, ...] -> [address, ...]
 */
export const create2 = Effect.gen(function* () {
  const evm = yield* Evm;
  const fork = yield* Fork;

  // STACK - exact order from Python create2 function
  const endowment = yield* evm.stack.pop();
  const memoryStartPosition = yield* evm.stack.pop();
  const memorySize = yield* evm.stack.pop();
  const saltU256 = yield* evm.stack.pop();

  // Convert salt to bytes32 exactly as in Python: salt.to_be_bytes32()
  const salt = new Bytes32({ value: saltU256.toBeBytes32().value });

  // GAS  create2 function
  const memory = yield* Ref.get(evm.memory);
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryStartPosition, memorySize],
  ]);

  // Calculate call_data_words exactly as in Python: ceil32(Uint(memory_size)) // Uint(32)
  const callDataWords = new Uint({
    value: Numeric.ceil32(new Uint({ value: memorySize.value })).value / 32n,
  });

  // EIP-3860: Init code gas cost (only applies if EIP-3860 is active, introduced in Shanghai)
  const initCodeGas = fork.eip(3860)
    ? Gas.initCodeCost(new Uint({ value: memorySize.value }))
    : new Uint({ value: 0n });

  // Charge gas exactly as in Python: GAS_CREATE + GAS_KECCAK256_WORD * call_data_words + extend_memory.cost + init_code_gas
  yield* Gas.chargeGas(
    new Uint({
      value:
        Gas.GAS_CREATE.value +
        Gas.GAS_KECCAK256_WORD.value * callDataWords.value +
        extendMemory.cost.value +
        initCodeGas.value,
    }),
  );

  // OPERATION
  // Memory extension
  const currentMemory = yield* Ref.get(evm.memory);
  const newMemory = new Uint8Array(
    currentMemory.length + Number(extendMemory.expandBy.value),
  );
  newMemory.set(currentMemory);
  yield* Ref.set(evm.memory, newMemory);

  // Read init code from memory exactly as in Python
  const initCode = memoryReadBytes(newMemory, memoryStartPosition, memorySize);

  // Compute CREATE2 contract address exactly as in Python
  const contractAddress = computeCreate2ContractAddress(
    evm.message.currentTarget,
    salt,
    initCode,
  );

  // Execute generic create
  yield* genericCreate(
    endowment,
    contractAddress,
    memoryStartPosition,
    memorySize,
  );

  // PROGRAM COUNTER
  yield* Ref.update(evm.pc, (current) => current + 1);
});

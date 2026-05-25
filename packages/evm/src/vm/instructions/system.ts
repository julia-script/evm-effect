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
import { Fork } from "../ForkService.js";
import * as Gas from "../gas.js";
import { GasCosts } from "../gas.js";
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
const accessDelegation = Effect.fn("accessDelegation")(function* (
  evm: Evm["Service"],
  address: Address,
) {
  const fork = yield* Fork;

  const account = yield* State.getAccount(evm.message.blockEnv.state, address);
  const code = account.code;

  if (!fork.eip(7702)) {
    return {
      disablePrecompiles: false,
      codeAddress: address,
      code: code,
      accessGasCost: new Uint({ value: 0n }),
    } as const;
  }

  if (!isValidDelegation(code)) {
    return {
      disablePrecompiles: false,
      codeAddress: address,
      code: code,
      accessGasCost: new Uint({ value: 0n }),
    } as const;
  }

  const delegatedAddressOption = getDelegatedCodeAddress(code);
  if (Option.isNone(delegatedAddressOption)) {
    return {
      disablePrecompiles: false,
      codeAddress: address,
      code: code,
      accessGasCost: new Uint({ value: 0n }),
    } as const;
  }

  const delegatedAddress = delegatedAddressOption.value;

  const delegatedAccount = yield* State.getAccount(
    evm.message.blockEnv.state,
    delegatedAddress,
  );
  const delegatedCode = delegatedAccount.code;

  let accessGasCost: Uint;
  const isWarm = evm.accessedAddresses.has(delegatedAddress);
  if (isWarm) {
    accessGasCost = Gas.GAS_WARM_ACCESS;
  } else {
    evm.accessedAddresses.add(delegatedAddress);
    accessGasCost = Gas.GAS_COLD_ACCOUNT_ACCESS;
  }

  // return [true, delegatedAddress, delegatedCode, accessGasCost] as const;
  return {
    disablePrecompiles: true,
    codeAddress: delegatedAddress,
    code: delegatedCode,
    accessGasCost: accessGasCost,
  } as const;
});

/**
 * Perform the core logic of the `CALL*` family of opcodes.
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
    if (evm.message.depth.value + 1n > STACK_DEPTH_LIMIT.value) {
      evm.setGasLeft(evm.gasLeft + gas.value);
      yield* evm.stack.push(new U256({ value: 0n }));
      return;
    }
    yield* Ref.set(evm.returnData, Bytes.empty);

    const memory = yield* Ref.get(evm.memory);
    const callData = memoryReadBytes(
      memory,
      memoryInputStartPosition,
      memoryInputSize,
    );

    const fork = yield* Fork;
    code = fork.eip(7702)
      ? code
      : yield* State.getAccount(evm.message.blockEnv.state, codeAddress).pipe(
          Effect.map((account) => account.code),
        );
    const childMessage = Message({
      blockEnv: evm.message.blockEnv,
      txEnv: evm.message.txEnv,
      caller: caller,
      target: to,
      gas: gas,
      value: value,
      data: callData,
      code: Code.from(code.value),
      currentTarget: to,
      depth: new Uint({ value: evm.message.depth.value + 1n }),
      codeAddress: codeAddress,
      parentEvm: Option.some(evm),
      accessedAddresses: evm.accessedAddresses.clone(),
      accessedStorageKeys: evm.accessedStorageKeys.clone(),
      disablePrecompiles: disablePrecompiles,
      isStatic: isStaticCall || evm.message.isStatic,
      shouldTransferValue: shouldTransferValue,
    });
    const childEvm = yield* processMessage(childMessage);
    const childError = yield* Ref.get(childEvm.error);
    // child_message = Message(
    //     block_env=evm.message.block_env,
    //     tx_env=evm.message.tx_env,
    //     caller=caller,
    //     target=to,
    //     gas=gas,
    //     value=value,
    //     data=call_data,
    //     code=code,
    //     current_target=to,
    //     depth=evm.message.depth + Uint(1),
    //     code_address=code_address,
    //     parent_evm=evm,
    // )
    // child_evm = process_message(child_message)
    const childOutput = yield* Ref.get(childEvm.output);
    if (Option.isSome(childError)) {
      yield* Interpreter.incorporateChildOnError(evm, childEvm);
      yield* Ref.set(evm.returnData, childOutput);
      yield* evm.stack.push(new U256({ value: 0n }));
    } else {
      yield* Interpreter.incorporateChildOnSuccess(evm, childEvm);
      yield* Ref.set(evm.returnData, childOutput);
      yield* evm.stack.push(new U256({ value: 1n }));
    }

    const actualOutputSize = Math.min(
      Number(memoryOutputSize.value),
      childOutput.value.length,
    );
    const actualOutput = childOutput.value.slice(0, actualOutputSize);
    memoryWrite(
      memory,
      memoryOutputStartPosition,
      new Bytes({ value: actualOutput }),
    );
  });

/**
 * Core logic used by the `CREATE*` family of opcodes.
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

    const memory = yield* Ref.get(evm.memory);
    const callData = memoryReadBytes(memory, memoryStartPosition, memorySize);

    if (callData.value.length > MAX_INIT_CODE_SIZE) {
      return yield* Effect.fail(
        new OutOfGasError({ message: "Init code too large" }),
      );
    }

    let createMessageGas: Uint;

    if (fork.eip(150)) {
      createMessageGas = Gas.maxMessageCallGas(
        new Uint({ value: evm.gasLeft }),
      );
      evm.setGasLeft(evm.gasLeft - createMessageGas.value);
    } else {
      createMessageGas = new Uint({ value: evm.gasLeft });
      evm.setGasLeft(0n);
    }

    if (evm.message.isStatic) {
      return yield* Effect.fail(
        new WriteInStaticContext({
          message: "Cannot CREATE in static context",
        }),
      );
    }

    yield* Ref.set(evm.returnData, new Bytes({ value: new Uint8Array(0) }));

    const senderAddress = evm.message.currentTarget;
    const sender = yield* State.getAccount(
      evm.message.blockEnv.state,
      senderAddress,
    );

    if (
      sender.balance.value < endowment.value ||
      sender.nonce.value === 2n ** 64n - 1n ||
      evm.message.depth.value + 1n > STACK_DEPTH_LIMIT.value
    ) {
      evm.setGasLeft(evm.gasLeft + createMessageGas.value);
      yield* evm.stack.push(new U256({ value: 0n }));
      return;
    }

    if (fork.eip(2929)) {
      evm.accessedAddresses.add(contractAddress);
    }

    if (
      (yield* State.accountHasCodeOrNonce(
        evm.message.blockEnv.state,
        contractAddress,
      )) ||
      (yield* State.accountHasStorage(
        evm.message.blockEnv.state,
        contractAddress,
      ))
    ) {
      yield* State.incrementNonce(
        evm.message.blockEnv.state,
        evm.message.currentTarget,
      );
      yield* evm.stack.push(new U256({ value: 0n }));
      return;
    }

    yield* State.incrementNonce(
      evm.message.blockEnv.state,
      evm.message.currentTarget,
    );

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
      accessedAddresses: evm.accessedAddresses.clone(),
      accessedStorageKeys: evm.accessedStorageKeys.clone(),
      disablePrecompiles: false,
      parentEvm: Option.some(evm),
    });

    const childEvm = yield* processCreateMessage(childMessage);

    const childError = yield* Ref.get(childEvm.error);

    if (Option.isSome(childError)) {
      yield* Interpreter.incorporateChildOnError(evm, childEvm);
      const childOutput = yield* Ref.get(childEvm.output);
      yield* Ref.set(evm.returnData, childOutput);
      yield* evm.stack.push(new U256({ value: 0n }));
    } else {
      yield* Interpreter.incorporateChildOnSuccess(evm, childEvm);
      yield* Ref.set(evm.returnData, new Bytes({ value: new Uint8Array(0) }));
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
    const newMemory = new Uint8Array(
      memory.length + Number(extension.expandBy.value),
    );
    newMemory.set(memory);
    yield* Ref.set(evm.memory, newMemory);

    const start = Number(memoryStartPosition.value);
    const length = Number(memorySize.value);
    const outputBytes = newMemory.slice(start, start + length);
    const output = new Bytes({ value: outputBytes });

    yield* Ref.set(evm.output, output);

    // Stop execution
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

    return yield* Effect.fail(new Revert({ message: "Execution reverted" }));

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
      const accessedAddresses = evm.accessedAddresses;
      if (!accessedAddresses.has(beneficiary)) {
        evm.accessedAddresses.add(beneficiary);
        gasCost = new Uint({
          value: gasCost.value + Gas.GAS_COLD_ACCOUNT_ACCESS.value,
        });
      }
    }

    const originator = evm.message.currentTarget;
    const originatorAccount = yield* State.getAccount(
      evm.message.blockEnv.state,
      originator,
    );

    if (fork.eip(161)) {
      const isAccountAlive = yield* State.isAccountAlive(
        evm.message.blockEnv.state,
        beneficiary,
      );
      if (!isAccountAlive && originatorAccount.balance.value !== 0n) {
        gasCost = new Uint({
          value: gasCost.value + Gas.GAS_SELF_DESTRUCT_NEW_ACCOUNT.value,
        });
      }
    } else if (fork.eip(150)) {
      if (
        !(yield* State.accountExists(evm.message.blockEnv.state, beneficiary))
      ) {
        gasCost = new Uint({
          value: gasCost.value + Gas.GAS_SELF_DESTRUCT_NEW_ACCOUNT.value,
        });
      }
    }

    yield* Gas.chargeGas(gasCost);

    if (evm.message.isStatic) {
      return yield* Effect.fail(
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

    const createdAccountsHasOriginator =
      yield* evm.message.blockEnv.state.createdAccountsHas(originator);
    const shouldDelete = fork.eip(6780) ? createdAccountsHasOriginator : true;

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
      yield* State.setAccountBalance(
        evm.message.blockEnv.state,
        originator,
        new U256({ value: 0n }),
      );
      evm.accountsToDelete.add(originator);
    }

    evm.running = false;

    // PROGRAM COUNTER - no-op (execution halted)
  });

const expandMemory = Effect.fn("expandMemory")(function* (
  evm: Evm["Service"],
  expandBy: Uint,
) {
  const memory = yield* Ref.get(evm.memory);
  const newMemory = new Uint8Array(memory.length + Number(expandBy.value));
  newMemory.set(memory);
  yield* Ref.set(evm.memory, newMemory);
});
/**
 * CALL: Message-call into an account
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

  let codeAddress = to;
  let disablePrecompiles = false;
  let messageCallGas: { cost: Uint; subcall: Uint };
  let code = Bytes.empty;
  // frontier

  const fork = yield* Fork;
  if (fork.eip(2929)) {
    let accessGasCost = GasCosts.WARM_ACCESS;
    if (!evm.accessedAddresses.has(to)) {
      evm.accessedAddresses.add(to);
      accessGasCost = GasCosts.COLD_ACCOUNT_ACCESS;
    }
    if (fork.eip(7702)) {
      const accessDelegationResult = yield* accessDelegation(evm, codeAddress);
      accessGasCost = new Uint({
        value: accessGasCost.value + accessDelegationResult.accessGasCost.value,
      });
      codeAddress = accessDelegationResult.codeAddress;
      disablePrecompiles = accessDelegationResult.disablePrecompiles;
      code = accessDelegationResult.code;
    }

    let createGasCost = GasCosts.NEW_ACCOUNT;
    if (
      value.value === 0n ||
      (yield* State.isAccountAlive(evm.message.blockEnv.state, to))
    ) {
      createGasCost = new Uint({ value: 0n });
    }
    const transferGasCost =
      value.value === 0n ? new Uint({ value: 0n }) : Gas.GasCosts.CALL_VALUE;

    messageCallGas = yield* Gas.calculateMessageCallGas(
      Uint.wrap(value.value),
      gas,
      new Uint({ value: evm.gasLeft }),
      extendMemory.cost,
      Uint.wrap(
        accessGasCost.value + createGasCost.value + transferGasCost.value,
      ),
    );
    yield* Gas.chargeGas(
      new Uint({ value: messageCallGas.cost.value + extendMemory.cost.value }),
    );
  } else if (fork.eip(161)) {
    let createGasCost = GasCosts.NEW_ACCOUNT;
    if (
      value.value === 0n ||
      (yield* State.isAccountAlive(evm.message.blockEnv.state, to))
    ) {
      createGasCost = new Uint({ value: 0n });
    }
    const transferGasCost =
      value.value === 0n ? new Uint({ value: 0n }) : Gas.GasCosts.CALL_VALUE;

    messageCallGas = yield* Gas.calculateMessageCallGas(
      Uint.wrap(value.value),
      gas,
      new Uint({ value: evm.gasLeft }),
      extendMemory.cost,
      Uint.wrap(
        (yield* Gas.GasCosts.OPCODE_CALL_BASE).value +
          createGasCost.value +
          transferGasCost.value,
      ),
    );
    yield* Gas.chargeGas(
      new Uint({ value: messageCallGas.cost.value + extendMemory.cost.value }),
    );
  } else if (fork.eip(150)) {
    const accountExists = yield* State.accountExists(
      evm.message.blockEnv.state,
      to,
    );
    const createGasCost = accountExists
      ? new Uint({ value: 0n })
      : Gas.GasCosts.NEW_ACCOUNT;
    const transferGasCost =
      value.value === 0n ? new Uint({ value: 0n }) : Gas.GasCosts.CALL_VALUE;

    messageCallGas = yield* Gas.calculateMessageCallGas(
      Uint.wrap(value.value),
      gas,
      new Uint({ value: evm.gasLeft }),
      extendMemory.cost,
      Uint.wrap(
        (yield* Gas.GasCosts.OPCODE_CALL_BASE).value +
          createGasCost.value +
          transferGasCost.value,
      ),
    );
    yield* Gas.chargeGas(
      new Uint({ value: messageCallGas.cost.value + extendMemory.cost.value }),
    );
  } else {
    messageCallGas = yield* Gas.calculateMessageCallGasFrontier(
      evm.message.blockEnv.state,
      gas,
      to,
      value,
    );
    yield* Gas.chargeGas(
      new Uint({
        value: messageCallGas.cost.value + extendMemory.cost.value,
      }),
    );
  }
  // Operation

  if (fork.eip(214)) {
    // Note: I couldn't find the exect EIP that triggers this check,
    // EIP-140 doesn't mention any of these checks, but it  introduced static calls
    // so I'm assuming it's the same EIP.
    if (evm.message.isStatic && value.value !== 0n) {
      return yield* Effect.fail(
        new WriteInStaticContext({ message: "Cannot call in static context" }),
      );
    }
  }

  yield* expandMemory(evm, extendMemory.expandBy);
  const senderBalance = yield* State.getAccount(
    evm.message.blockEnv.state,
    evm.message.currentTarget,
  ).pipe(Effect.map((account) => account.balance));

  if (senderBalance.value < value.value) {
    yield* evm.stack.push(new U256({ value: 0n }));
    yield* Ref.set(evm.returnData, Bytes.empty);
    evm.setGasLeft(evm.gasLeft + messageCallGas.subcall.value);
  } else {
    yield* genericCall(
      messageCallGas.subcall,
      value,
      evm.message.currentTarget,
      to,
      codeAddress,
      true,
      false,
      memoryInputStartPosition,
      memoryInputSize,
      memoryOutputStartPosition,
      memoryOutputSize,
      code,
      disablePrecompiles,
    );
  }

  // PROGRAM COUNTER
  yield* evm.incrementPC(1);
});

/**
 * CALLCODE: Message-call into this account with alternative account's code
 *
 *
 * Gas: Complex calculation including memory expansion and access costs
 * Stack: [gas, code_address, value, input_start, input_size, output_start, output_size, ...] -> [success, ...]
 */
export const callcode = Effect.gen(function* () {
  const evm = yield* Evm;

  const gas = new Uint({ value: (yield* evm.stack.pop()).value });
  let codeAddress = toAddressMasked(yield* evm.stack.pop());
  const value = yield* evm.stack.pop();
  const memoryInputStartPosition = yield* evm.stack.pop();
  const memoryInputSize = yield* evm.stack.pop();
  const memoryOutputStartPosition = yield* evm.stack.pop();
  const memoryOutputSize = yield* evm.stack.pop();

  // GAS
  const memory = yield* Ref.get(evm.memory);
  const to = evm.message.currentTarget;
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryInputStartPosition, memoryInputSize],
    [memoryOutputStartPosition, memoryOutputSize],
  ]);
  const fork = yield* Fork;

  let messageCallGas: { cost: Uint; subcall: Uint };
  let disablePrecompiles = false;
  let code = Bytes.empty;

  if (fork.eip(2929)) {
    let accessGasCost = GasCosts.WARM_ACCESS;
    if (!evm.accessedAddresses.has(codeAddress)) {
      evm.accessedAddresses.add(codeAddress);
      accessGasCost = GasCosts.COLD_ACCOUNT_ACCESS;
    }
    if (fork.eip(7702)) {
      const accessDelegationResult = yield* accessDelegation(evm, codeAddress);
      accessGasCost = new Uint({
        value: accessGasCost.value + accessDelegationResult.accessGasCost.value,
      });
      disablePrecompiles = accessDelegationResult.disablePrecompiles;
      codeAddress = accessDelegationResult.codeAddress;
      code = accessDelegationResult.code;
    }
    const transferGasCost = Uint.wrap(
      value.value === 0n ? 0n : Gas.GasCosts.CALL_VALUE.value,
    );
    messageCallGas = yield* Gas.calculateMessageCallGas(
      Uint.wrap(value.value),
      gas,
      new Uint({ value: evm.gasLeft }),
      extendMemory.cost,
      Uint.wrap(accessGasCost.value + transferGasCost.value),
    );
    yield* Gas.chargeGas(
      new Uint({ value: messageCallGas.cost.value + extendMemory.cost.value }),
    );
  } else if (fork.eip(150)) {
    const transferGasCost = Uint.wrap(
      value.value === 0n ? 0n : Gas.GasCosts.CALL_VALUE.value,
    );
    messageCallGas = yield* Gas.calculateMessageCallGas(
      Uint.wrap(value.value),
      gas,
      new Uint({ value: evm.gasLeft }),
      extendMemory.cost,
      Uint.wrap(
        (yield* Gas.GasCosts.OPCODE_CALL_BASE).value + transferGasCost.value,
      ),
    );
    yield* Gas.chargeGas(
      new Uint({ value: messageCallGas.cost.value + extendMemory.cost.value }),
    );
  } else {
    messageCallGas = yield* Gas.calculateMessageCallGasFrontier(
      evm.message.blockEnv.state,
      gas,
      to,
      value,
    );
    yield* Ref.set(evm.returnData, Bytes.empty);
    yield* Gas.chargeGas(
      new Uint({ value: messageCallGas.cost.value + extendMemory.cost.value }),
    );
  }
  // Operation
  yield* expandMemory(evm, extendMemory.expandBy);
  const senderBalance = yield* State.getAccount(
    evm.message.blockEnv.state,
    evm.message.currentTarget,
  ).pipe(Effect.map((account) => account.balance));
  if (senderBalance.value < value.value) {
    yield* evm.stack.push(new U256({ value: 0n }));
    evm.setGasLeft(evm.gasLeft + messageCallGas.subcall.value);
  } else {
    yield* genericCall(
      messageCallGas.subcall,
      value,
      evm.message.currentTarget,
      to,
      codeAddress,
      true,
      false,
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
 * Gas: Complex calculation including memory expansion and access costs
 * Stack: [gas, code_address, input_start, input_size, output_start, output_size, ...] -> [success, ...]
 */
export const delegatecall = Effect.gen(function* () {
  const evm = yield* Evm;

  // STACK
  const gas = new Uint({ value: (yield* evm.stack.pop()).value });
  let codeAddress = toAddressMasked(yield* evm.stack.pop());
  const memoryInputStartPosition = yield* evm.stack.pop();
  const memoryInputSize = yield* evm.stack.pop();
  const memoryOutputStartPosition = yield* evm.stack.pop();
  const memoryOutputSize = yield* evm.stack.pop();

  let code = Bytes.empty;
  let disablePrecompiles = false;
  // GAS
  const memory = yield* Ref.get(evm.memory);
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryInputStartPosition, memoryInputSize],
    [memoryOutputStartPosition, memoryOutputSize],
  ]);
  const fork = yield* Fork;
  let messageCallGas: { cost: Uint; subcall: Uint } | null = null;
  // homestead
  if (fork.eip(2929)) {
    let accessGasCost = GasCosts.WARM_ACCESS;
    if (!evm.accessedAddresses.has(codeAddress)) {
      evm.accessedAddresses.add(codeAddress);
      accessGasCost = GasCosts.COLD_ACCOUNT_ACCESS;
    }
    if (fork.eip(7702)) {
      const accessDelegationResult = yield* accessDelegation(evm, codeAddress);
      accessGasCost = new Uint({
        value: accessGasCost.value + accessDelegationResult.accessGasCost.value,
      });
      codeAddress = accessDelegationResult.codeAddress;
      disablePrecompiles = accessDelegationResult.disablePrecompiles;
      code = accessDelegationResult.code;
    }
    messageCallGas = yield* Gas.calculateMessageCallGas(
      new Uint({ value: 0n }),
      gas,
      new Uint({ value: evm.gasLeft }),
      extendMemory.cost,

      accessGasCost,
    );
    yield* Gas.chargeGas(
      new Uint({ value: messageCallGas.cost.value + extendMemory.cost.value }),
    );
  } else if (fork.eip(150)) {
    messageCallGas = yield* Gas.calculateMessageCallGas(
      new Uint({ value: 0n }),
      gas,
      new Uint({ value: evm.gasLeft }),
      extendMemory.cost,
      Uint.wrap((yield* Gas.GasCosts.OPCODE_CALL_BASE).value),
    );
    yield* Gas.chargeGas(
      new Uint({ value: messageCallGas.cost.value + extendMemory.cost.value }),
    );
  } else {
    yield* Gas.chargeGas(
      new Uint({
        value:
          (yield* GasCosts.OPCODE_CALL_BASE).value +
          gas.value +
          extendMemory.cost.value,
      }),
    );
  }

  yield* expandMemory(evm, extendMemory.expandBy);
  yield* genericCall(
    fork.eip(150) && messageCallGas ? messageCallGas.subcall : gas,
    evm.message.value,
    evm.message.caller,
    evm.message.currentTarget,
    codeAddress,
    false,
    false,
    memoryInputStartPosition,
    memoryInputSize,
    memoryOutputStartPosition,
    memoryOutputSize,
    code,
    disablePrecompiles,
  );

  // PROGRAM COUNTER
  yield* evm.incrementPC(1);
});

/**
 * STATICCALL: Message-call into an account
 *
 *
 * Gas: Complex calculation including memory expansion and access costs
 * Stack: [gas, to, input_start, input_size, output_start, output_size, ...] -> [success, ...]
 */
export const staticcall = Effect.gen(function* () {
  const evm = yield* Evm;

  // STACK
  const gas = new Uint({ value: (yield* evm.stack.pop()).value });
  const to = toAddressMasked(yield* evm.stack.pop());
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

  const fork = yield* Fork;
  let messageCallGas: { cost: Uint; subcall: Uint };

  let codeAddress = to;
  let disablePrecompiles = false;
  let code = Bytes.empty;

  if (fork.eip(2929)) {
    let accessGasCost = GasCosts.WARM_ACCESS;
    if (!evm.accessedAddresses.has(to)) {
      evm.accessedAddresses.add(to);
      accessGasCost = GasCosts.COLD_ACCOUNT_ACCESS;
    }
    if (fork.eip(7702)) {
      const accessDelegationResult = yield* accessDelegation(evm, codeAddress);
      accessGasCost = new Uint({
        value: accessGasCost.value + accessDelegationResult.accessGasCost.value,
      });
      codeAddress = accessDelegationResult.codeAddress;
      disablePrecompiles = accessDelegationResult.disablePrecompiles;
      code = accessDelegationResult.code;
    }
    messageCallGas = yield* Gas.calculateMessageCallGas(
      new Uint({ value: 0n }),
      gas,
      new Uint({ value: evm.gasLeft }),
      extendMemory.cost,
      accessGasCost,
    );
  } else {
    messageCallGas = yield* Gas.calculateMessageCallGas(
      new Uint({ value: 0n }),
      gas,
      new Uint({ value: evm.gasLeft }),
      extendMemory.cost,
      Uint.wrap((yield* Gas.GasCosts.OPCODE_CALL_BASE).value),
    );
  }
  yield* Gas.chargeGas(
    new Uint({ value: messageCallGas.cost.value + extendMemory.cost.value }),
  );

  // OPERATION
  yield* expandMemory(evm, extendMemory.expandBy);
  yield* genericCall(
    messageCallGas.subcall,
    new U256({ value: 0n }),
    evm.message.currentTarget,
    to,
    codeAddress,
    true,
    true,
    memoryInputStartPosition,
    memoryInputSize,
    memoryOutputStartPosition,
    memoryOutputSize,
    code,
    disablePrecompiles,
  );

  // PROGRAM COUNTER
  yield* evm.incrementPC(1);
});

/**
 * CREATE: Create a new account with associated code
 *
 *
 * Gas: 32000 + memory expansion cost + init code cost
 * Stack: [endowment, offset, size, ...] -> [address, ...]
 */
export const create = Effect.gen(function* () {
  const evm = yield* Evm;
  const fork = yield* Fork;

  // STACK
  const endowment = yield* evm.stack.pop();
  const memoryStartPosition = yield* evm.stack.pop();
  const memorySize = yield* evm.stack.pop();

  // GAS
  const memory = yield* Ref.get(evm.memory);
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryStartPosition, memorySize],
  ]);
  const initCodeGas = fork.eip(3860)
    ? Gas.initCodeCost(new Uint({ value: memorySize.value }))
    : new Uint({ value: 0n });

  yield* Gas.chargeGas(
    new Uint({
      value: Gas.GAS_CREATE.value + extendMemory.cost.value + initCodeGas.value,
    }),
  );

  // OPERATION
  const currentMemory = yield* Ref.get(evm.memory);
  const newMemory = new Uint8Array(
    currentMemory.length + Number(extendMemory.expandBy.value),
  );
  newMemory.set(currentMemory);
  yield* Ref.set(evm.memory, newMemory);

  const contractAddress = computeContractAddress(
    evm.message.currentTarget,
    yield* State.getAccount(
      evm.message.blockEnv.state,
      evm.message.currentTarget,
    ).pipe(Effect.map((account) => account.nonce)),
  );

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

  // STACK
  const endowment = yield* evm.stack.pop();
  const memoryStartPosition = yield* evm.stack.pop();
  const memorySize = yield* evm.stack.pop();
  const saltU256 = yield* evm.stack.pop();

  const salt = new Bytes32({ value: saltU256.toBeBytes32().value });

  // GAS
  const memory = yield* Ref.get(evm.memory);
  const extendMemory = Gas.calculateGasExtendMemory(memory, [
    [memoryStartPosition, memorySize],
  ]);

  const callDataWords = new Uint({
    value: Numeric.ceil32(new Uint({ value: memorySize.value })).value / 32n,
  });

  const initCodeGas = fork.eip(3860)
    ? Gas.initCodeCost(new Uint({ value: memorySize.value }))
    : new Uint({ value: 0n });

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
  const currentMemory = yield* Ref.get(evm.memory);
  const newMemory = new Uint8Array(
    currentMemory.length + Number(extendMemory.expandBy.value),
  );
  newMemory.set(currentMemory);
  yield* Ref.set(evm.memory, newMemory);

  const initCode = memoryReadBytes(newMemory, memoryStartPosition, memorySize);

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

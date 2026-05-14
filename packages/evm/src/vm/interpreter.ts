/**
 * Ethereum Virtual Machine (EVM) Interpreter
 *
 * A straightforward interpreter that executes EVM code.
 */

import { type Address, Bytes, U256, Uint } from "@evm-effect/ethereum-types";
import { annotateSafe } from "@evm-effect/shared/annotateSafe";
import { HashSet } from "@evm-effect/shared/hashset";
import { Console, Effect, Option, Ref } from "effect";
import { MessageCallOutput } from "../blocks/system.js";
import {
  AddressCollisionError,
  type EthereumException,
  type ExceptionalHalt,
  ExceptionalHaltTag,
  InvalidContractPrefixError,
  InvalidOpcode,
  OutOfGasError,
  type PrecompileFailure,
  type Revert,
  StackDepthLimitError,
} from "../exceptions.js";
import * as State from "../state.js";
import {
  EvmStop,
  evmTrace,
  evmTraceWith,
  OpEnd,
  OpException,
  OpStart,
  PrecompileEnd,
  PrecompileStart,
  TransactionEnd,
} from "../trace.js";
import type { Log } from "../types/index.js";
import { getDelegatedCodeAddress, setDelegation } from "./eoa_delegation.js";
import { Evm } from "./evm.js";
import { Fork } from "./ForkService.js";
import * as Gas from "./gas.js";
import type { Message } from "./message.js";
import { getOpcodeName, Ops } from "./opcodes.js";
import { Code } from "./runtime.js";

/**
 * Constants for the EVM interpreter
 */
export const STACK_DEPTH_LIMIT = new Uint({ value: 1024n });
const MAX_CODE_SIZE = 0x6000;
export const MAX_INIT_CODE_SIZE = 2 * MAX_CODE_SIZE;

/**
 * Incorporate the state of a successful `childEvm` into the parent `evm`.
 *
 *
 * @param evm - The parent EVM
 * @param childEvm - The child EVM to incorporate
 */
export const incorporateChildOnSuccess = Effect.fn("incorporateChildOnSuccess")(
  function* (evm: Evm["Service"], childEvm: Evm["Service"]) {
    const childGasLeft = childEvm.gasLeft;
    const childLogs = yield* Ref.get(childEvm.logs);
    const childRefundCounter = yield* Ref.get(childEvm.refundCounter);

    evm.setGasLeft(evm.gasLeft + childGasLeft);

    yield* Ref.update(evm.logs, (current) => [...current, ...childLogs]);

    yield* Ref.update(
      evm.refundCounter,
      (current) =>
        new U256({ value: current.value + childRefundCounter.value }),
    );

    for (const addr of childEvm.accountsToDelete) {
      evm.accountsToDelete.add(addr);
    }

    for (const addr of childEvm.touchedAccounts) {
      evm.touchedAccounts.add(addr);
    }
    if (
      yield* State.accountExistsAndIsEmpty(
        evm.message.blockEnv.state,
        childEvm.message.currentTarget,
      )
    ) {
      evm.touchedAccounts.add(childEvm.message.currentTarget);
    }

    for (const addr of childEvm.accessedAddresses) {
      evm.accessedAddresses.add(addr);
    }

    for (const key of childEvm.accessedStorageKeys) {
      evm.accessedStorageKeys.add(key);
    }
  },
);

/**
 * Incorporate the state of an unsuccessful `childEvm` into the parent `evm`.
 *
 *
 * @param evm - The parent EVM
 * @param childEvm - The child EVM to incorporate
 */
export const incorporateChildOnError = Effect.fn("incorporateChildOnError")(
  function* (evm: Evm["Service"], childEvm: Evm["Service"]) {
    evm.setGasLeft(evm.gasLeft + childEvm.gasLeft);
  },
);

/**
 * Execute EVM bytecode
 *
 * This is the main execution loop that:
 * 1. Initializes the EVM with the message
 * 2. Checks if target is a precompiled contract and executes it if so
 * 3. Otherwise, iterates over bytecode instructions
 * 4. Dispatches to opcode implementations
 * 5. Handles errors and exceptional halts
 *
 * @param message - The message containing code and execution context
 * @returns Effect that produces void (EVM state is managed internally via Refs)
 */
export const executeCode = Effect.fn("executeCode")(function* (
  message: Message,
) {
  const fork = yield* Fork;
  const evm = yield* Evm.make({
    message,
  });

  if (message.codeAddress) {
    const precompile = fork.getPrecompiledContract(message.codeAddress);

    if (Option.isSome(precompile) && !message.disablePrecompiles) {
      yield* evmTraceWith(
        evm,
        PrecompileStart({ address: message.codeAddress }),
      );
      yield* precompile.value.pipe(
        Effect.catchIf(
          (error): error is PrecompileFailure =>
            error._tag === "EthereumException/PrecompileFailure",
          (error) =>
            Effect.gen(function* () {
              yield* evmTrace(OpException({ error }));
              // Match go-ethereum Call/CallCode: on precompile `Run` error (not revert),
              // state is reverted and the call frame's remaining gas is exhausted.
              evm.setGasLeft(0n);
              yield* Ref.set(
                evm.output,
                new Bytes({ value: new Uint8Array(0) }),
              );
              yield* Ref.set(evm.error, Option.some<EthereumException>(error));
            }),
        ),
        Effect.catchIf(
          (error): error is ExceptionalHalt =>
            error._tag.startsWith(ExceptionalHaltTag),
          (error) =>
            Effect.gen(function* () {
              yield* evmTrace(OpException({ error }));

              evm.setGasLeft(0n);
              yield* Ref.set(
                evm.output,
                new Bytes({ value: new Uint8Array(0) }),
              );
              yield* Ref.set(evm.error, Option.some<EthereumException>(error));
            }),
        ),
        Effect.provideService(Evm, evm),
      );

      yield* evmTraceWith(evm, PrecompileEnd());
      return evm;
    }
  }

  yield* executeLoop().pipe(
    Effect.catchIf(
      (error): error is ExceptionalHalt =>
        error._tag.startsWith(ExceptionalHaltTag),

      (error) =>
        Effect.gen(function* () {
          yield* evmTrace(OpException({ error }));
          evm.setGasLeft(0n);
          yield* Ref.set(evm.output, new Bytes({ value: new Uint8Array(0) }));
          yield* Ref.set(evm.error, Option.some<EthereumException>(error));
        }),
    ),
    Effect.catchIf(
      (e): e is Revert => e._tag === "EthereumException/Revert",
      (error) =>
        Effect.gen(function* () {
          yield* evmTrace(OpException({ error }));
          yield* Ref.set(evm.error, Option.some<EthereumException>(error));
        }),
    ),
    Effect.provideService(Evm, evm),
  );
  return evm;
});

const encodeProgressBar = (progress: number, width = 20) => {
  const filled = Math.floor(progress * width);
  const bar = `[${"=".repeat(filled)}${" ".repeat(width - filled)}]`;
  return `[${Math.floor(progress * 100)
    .toString()
    .padStart(3, " ")}%] ${bar}`;
};
const executeLoop: () => Effect.Effect<void, EthereumException, Evm | Fork> =
  Effect.fn("executeLoop")(function* executeLoop() {
    const evm = yield* Evm;
    const fork = yield* Fork;

    let i = 0;
    const startTime = Date.now();
    const startGas = evm.gasLeft;
    while (evm.running) {
      const pc = yield* Ref.get(evm.pc);
      const code = evm.code;

      if (pc >= code.value.length) {
        break;
      }

      const opcode = code.opAt(pc) as number;
      const op = fork.getOp(opcode);

      if (!op) {
        return yield* Effect.fail(new InvalidOpcode(opcode));
      }

      yield* evmTrace(OpStart({ op: opcode, invalidOpcode: !op }));
      yield* op.pipe(Effect.withSpan(`[${pc}]${getOpcodeName(opcode)}`));
      yield* evmTrace(OpEnd());

      i++;
      if (i % 100000 === 0) {
        yield* Effect.yieldNow;
        // yield* Console.log(`${i} - ${Date.now() - startTime}ms, gasLeft: ${evm.gasLeft}`)
        const gasUsed = startGas - evm.gasLeft;
        const progress = Number(gasUsed) / Number(startGas);
        const time = Date.now() - startTime;
        const status = `${encodeProgressBar(progress, 30)} gasLeft: ${evm.gasLeft}/${startGas} - ${(time / 1000).toFixed(2)}s`;
        yield* Console.log(status);
      }
    }
    yield* evmTrace(EvmStop({ op: Ops.STOP }));
  });
/**
 * Process a message by executing its code
 *
 * This function:
 * 1. Checks stack depth limit
 * 2. Begins a transaction for rollback capability
 * 3. Transfers value if required
 * 4. Executes the code
 * 5. Commits or rolls back the transaction based on execution result
 *
 * @param message - The message to process
 * @returns Effect that produces the EVM state after execution
 */
export const processMessage = Effect.fn("processMessage")(function* (
  message: Message,
) {
  if (message.depth.value > STACK_DEPTH_LIMIT.value) {
    return yield* Effect.fail(
      new StackDepthLimitError({ message: "Stack depth limit reached" }),
    );
  }

  const state = message.blockEnv.state;
  const transientStorage = message.txEnv.transientStorage;
  yield* state.beginTransaction(transientStorage);

  if (message.depth.value === 0n && state.transactionSnapshotIndex === null) {
    yield* state.markTransactionSnapshot();
  }

  const fork = yield* Fork;
  if (!fork.eip(4895)) {
    yield* State.touchAccount(state, message.currentTarget);
  }

  if (message.shouldTransferValue && message.value.value !== 0n) {
    yield* State.moveEther(
      state,
      message.caller,
      message.currentTarget,
      message.value,
    );
  }

  const evm = yield* executeCode(message);

  const error = yield* Ref.get(evm.error);
  if (Option.isSome(error)) {
    yield* State.rollbackTransaction(state, transientStorage);
  } else {
    yield* state.commitTransaction(transientStorage);
  }

  return evm;
});

/**
 * Process a create message by executing init code and deploying contract
 *
 * This function:
 * 1. Begins a transaction for rollback capability
 * 2. Destroys existing storage at target address (edge case handling)
 * 3. Marks account as created for EIP-6780 compliance
 * 4. Increments nonce
 * 5. Executes init code
 * 6. Validates and deploys contract code on success
 * 7. Commits or rolls back the transaction based on execution result
 *
 * @param message - The create message to process
 * @returns Effect that produces the EVM state after execution
 */
export const processCreateMessage = Effect.fn("processCreateMessage")(
  function* (message: Message) {
    const state = message.blockEnv.state;
    const transientStorage = message.txEnv.transientStorage;

    yield* state.beginTransaction(transientStorage);
    if (message.depth.value === 0n && state.transactionSnapshotIndex === null) {
      yield* state.markTransactionSnapshot();
    }

    yield* State.destroyStorage(state, message.currentTarget);

    yield* state.markAccountCreated(message.currentTarget);

    const fork = yield* Fork;
    if (fork.eip(161)) {
      yield* State.incrementNonce(state, message.currentTarget);
    }

    const evm = yield* processMessage(message);

    const error = yield* Ref.get(evm.error);
    if (Option.isNone(error)) {
      const output = yield* Ref.get(evm.output);
      const contractCode = output.value;

      yield* Effect.gen(function* () {
        const fork = yield* Fork;
        if (
          fork.eip(3541) &&
          contractCode.length > 0 &&
          contractCode[0] === 0xef
        ) {
          return yield* Effect.fail(
            new InvalidContractPrefixError({
              message: "Invalid contract prefix",
            }),
          );
        }

        if (fork.eip(170) && contractCode.length > MAX_CODE_SIZE) {
          return yield* Effect.fail(
            new OutOfGasError({ message: "Contract code too large" }),
          );
        }

        const contractCodeGas = new Uint({
          value: BigInt(contractCode.length) * Gas.GAS_CODE_DEPOSIT.value,
        });

        if (fork.eip(2)) {
          yield* Gas.chargeGas(contractCodeGas).pipe(
            Effect.provideService(Evm, evm),
          );

          yield* State.setCode(
            state,
            message.currentTarget,
            new Bytes({ value: contractCode }),
          );
        } else {
          if (evm.gasLeft >= contractCodeGas.value) {
            evm.setGasLeft(evm.gasLeft - contractCodeGas.value);
            yield* State.setCode(
              state,
              message.currentTarget,
              new Bytes({ value: contractCode }),
            );
          }
        }

        yield* state.commitTransaction(transientStorage);
      }).pipe(
        Effect.catch((deployError) =>
          Effect.gen(function* () {
            yield* State.rollbackTransaction(state, transientStorage);
            evm.setGasLeft(0n);
            yield* Ref.set(evm.output, new Bytes({ value: new Uint8Array(0) }));
            yield* Ref.set(
              evm.error,
              Option.some<EthereumException>(deployError),
            );
          }),
        ),
      );
    } else {
      yield* State.rollbackTransaction(state, transientStorage);
    }

    return evm;
  },
);

export const processMessageCall = Effect.fn("processMessageCall")(function* (
  message: Message,
) {
  const blockEnv = message.blockEnv;
  let refundCounter = new U256({ value: 0n });
  let evm: Evm["Service"];
  if (!message.target) {
    const isCollision =
      (yield* State.accountHasCodeOrNonce(
        blockEnv.state,
        message.currentTarget,
      )) ||
      (yield* State.accountHasStorage(blockEnv.state, message.currentTarget));
    if (isCollision) {
      return yield* Effect.succeed(
        new MessageCallOutput({
          gasLeft: new Uint({ value: 0n }),
          refundCounter: new U256({ value: 0n }),
          logs: [],
          accountsToDelete: HashSet.empty(),
          touchedAccounts: HashSet.empty(),
          error: Option.some(new AddressCollisionError({})),
          returnData: new Bytes({ value: new Uint8Array(0) }),
        }),
      );
    }
    evm = yield* processCreateMessage(message);
  } else {
    const fork = yield* Fork;
    if (fork.eip(7702)) {
      if (message.txEnv.authorizations.length > 0) {
        refundCounter = yield* setDelegation(message);
      }

      const currentCode = yield* State.getAccount(
        message.blockEnv.state,
        message.currentTarget,
      ).pipe(Effect.map((account) => account.code));
      const delegatedAddress = getDelegatedCodeAddress(currentCode).pipe(
        Option.getOrNull,
      );
      if (delegatedAddress) {
        message.disablePrecompiles = true;
        message.accessedAddresses.add(delegatedAddress);
        const delegatedCode = yield* State.getAccount(
          message.blockEnv.state,
          delegatedAddress,
        ).pipe(Effect.map((account) => account.code));
        message.code = Code.from(delegatedCode);
        message.codeAddress = delegatedAddress;
      }
    }

    evm = yield* processMessage(message);
  }

  const evmError = yield* Ref.get(evm.error);
  let logs: readonly Log[] = [];
  let accountsToDelete: HashSet<Address> = HashSet.empty();
  let touchedAccounts: HashSet<Address> = HashSet.empty();

  if (
    yield* State.accountExistsAndIsEmpty(blockEnv.state, message.currentTarget)
  ) {
    evm.touchedAccounts.add(message.currentTarget);
  }

  if (Option.isNone(evmError)) {
    logs = yield* Ref.get(evm.logs);
    accountsToDelete = evm.accountsToDelete;
    touchedAccounts = evm.touchedAccounts;
    const evmRefundCounter = yield* Ref.get(evm.refundCounter);
    refundCounter = new U256({
      value: refundCounter.value + evmRefundCounter.value,
    });
  }
  yield* annotateSafe({
    "txEnd.gasUsed": message.gas.value - evm.gasLeft,
    "txEnd.output": yield* Ref.get(evm.output),
    "txEnd.error": evmError,
  });

  yield* evmTrace(
    TransactionEnd({
      gasUsed: message.gas.value - evm.gasLeft,
      output: yield* Ref.get(evm.output),
      error: Option.getOrNull(evmError),
    }),
  ).pipe(Effect.provideService(Evm, evm));
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

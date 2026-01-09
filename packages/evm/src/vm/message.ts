/**
 * Message and Environment types for EVM execution
 */

import {
  Address,
  Bytes,
  Bytes32,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import { type HashSet, HashSetFromSelf } from "@evm-effect/shared/hashset";
import { Data, Effect, Option, Schema } from "effect";
import * as State from "../state.js";
import { Authorization } from "../types/Account.js";
import type { Transaction } from "../types/Transaction.js";
import { computeContractAddress } from "../utils/address.js";
import { Evm } from "./evm.js";
import { Fork } from "./Fork.js";
import { Code } from "./runtime.js";
import { StorageKey } from "./StorageKey.js";

/**
 * Items external to the virtual machine itself, provided by the environment.
 *
 * Note: This contains non-serializable fields (state), so it cannot be fully RLP encoded.
 * However, using Schema.TaggedClass allows us to serialize subsets if needed.
 */
export class BlockEnvironment extends Schema.TaggedClass<BlockEnvironment>(
  "BlockEnvironment",
)("BlockEnvironment", {
  chainId: U64,
  state: Schema.instanceOf(State.State),
  blockGasLimit: Uint,
  blockHashes: Schema.Array(Bytes32),
  coinbase: Address,
  number: Uint,
  baseFeePerGas: Uint,
  time: U256,
  prevRandao: Bytes32,
  difficulty: Uint, // For pre-Paris forks (DIFFICULTY opcode)
  excessBlobGas: U64,
  parentBeaconBlockRoot: Bytes32,
}) {}

/**
 * Items that are used by contract creation or message call (transaction-level).
 *
 * Note: Contains non-serializable fields (sets, transient storage).
 */
export class TransactionEnvironment extends Schema.TaggedClass<TransactionEnvironment>(
  "TransactionEnvironment",
)("TransactionEnvironment", {
  origin: Address,
  gasPrice: Uint,
  gas: Uint,
  accessListAddresses: HashSetFromSelf(Address),
  accessListStorageKeys: HashSetFromSelf(Schema.instanceOf(StorageKey)), // ReadonlySet<readonly [Address, Bytes32]> - not directly serializable
  transientStorage: Schema.instanceOf(State.TransientStorage),
  blobVersionedHashes: Schema.Array(Bytes32),
  authorizations: Schema.Array(Authorization),
  indexInBlock: Schema.OptionFromSelf(Uint),
  txHash: Schema.OptionFromSelf(Bytes32),
}) {}

export type test = typeof SuspendedEvm extends Schema.suspend<
  Evm,
  infer T,
  never
>
  ? T
  : never;
// type test2 = EvmEncoded satisfies test ? true : false;
const SuspendedEvm = Schema.suspend(
  (): Schema.Schema<Evm, Evm> => Schema.instanceOf(Evm),
);
// const SuspendedEvm = Schema.suspend(():typeof Evm => Evm);
/**
 * Items that are used by contract creation or message call (call-level).
 *
 * Note: Contains non-serializable fields (sets, environments, parent evm).
 */
export type Message = {
  _tag: "Message";
  blockEnv: BlockEnvironment;
  txEnv: TransactionEnvironment;
  caller: Address;
  target?: Address | undefined;
  currentTarget: Address;
  gas: Uint;
  value: U256;
  data: Bytes;
  codeAddress?: Address | undefined;
  code: Code;
  depth: Uint;
  shouldTransferValue: boolean;
  isStatic: boolean;
  accessedAddresses: HashSet<Address>;
  accessedStorageKeys: HashSet<StorageKey>;
  disablePrecompiles: boolean;
  parentEvm: Option.Option<Evm["Type"]>;
};
export const Message = Data.tagged<Message>("Message");

export const prepareMessage: (
  blockEnv: BlockEnvironment,
  txEnv: TransactionEnvironment,
  tx: Transaction,
) => Effect.Effect<Message, never, Fork> = Effect.fn("prepareMessage")(
  function* (
    blockEnv: BlockEnvironment,
    txEnv: TransactionEnvironment,
    tx: Transaction,
  ) {
    const fork = yield* Fork;

    // Start with addresses from the access list
    const accessedAddresses = txEnv.accessListAddresses.clone();
    accessedAddresses.add(txEnv.origin);

    for (const address of fork.precompiledContracts.keys()) {
      accessedAddresses.add(address);
    }

    let currentTarget: Address;
    let msgData: Bytes;
    let code: Bytes;
    let codeAddress: Address | undefined;

    if (!tx.to) {
      const nonce =
        State.getAccount(blockEnv.state, txEnv.origin).nonce.value - 1n; // nonce has been incremented by this point so we need to subtract 1 - 1n; // nonce has been incremented by this point so we need to subtract 1;
      currentTarget = computeContractAddress(
        txEnv.origin,
        new Uint({ value: nonce }),
      );

      msgData = new Bytes({ value: new Uint8Array(0) });
      code = tx.data;
      codeAddress = undefined;
    } else {
      currentTarget = tx.to;
      msgData = tx.data;
      code = State.getAccount(blockEnv.state, tx.to).code;
      codeAddress = tx.to;
    }

    accessedAddresses.add(currentTarget);

    return Message({
      blockEnv,
      txEnv,
      caller: txEnv.origin,
      target: tx.to,
      currentTarget,
      gas: txEnv.gas,
      value: tx.value,
      data: msgData,
      code: Code.from(code.value),
      depth: new Uint({ value: 0n }),
      shouldTransferValue: true,
      isStatic: false,
      accessedAddresses: accessedAddresses.clone(),
      accessedStorageKeys: txEnv.accessListStorageKeys.clone(),
      disablePrecompiles: false,
      parentEvm: Option.none(),
      codeAddress: codeAddress,
    });
  },
);

/**
 * State.
 *
 * Introduction
 * ------------
 *
 * The state contains all information that is preserved between transactions.
 *
 * It consists of a main account trie and storage tries for each contract.
 *
 * There is a distinction between an account that does not exist and
 * `EMPTY_ACCOUNT`.
 */

import type { Root } from "@evm-effect/ethereum-types";
import {
  type Address,
  type Bytes,
  type Bytes32,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import { HashMap } from "@evm-effect/shared/hashmap";
import { HashSet } from "@evm-effect/shared/hashset";
import { annotateSafe } from "@evm-effect/shared/traced";
import { Data, Effect, Either, Equal, Option } from "effect";
import { EMPTY_TRIE_ROOT, Trie, root as trieRoot } from "./trie/trie.js";
import { type Account, EMPTY_ACCOUNT } from "./vm/types.js";

/**
 * Contains all information that is preserved between transactions.
 */
export class State extends Data.TaggedClass("State")<{
  readonly _mainTrie: Trie<Address, Account, Account | null>;
  readonly _storageTries: HashMap<Address, Trie<Bytes32, U256, U256>>;
  readonly _snapshots: Array<
    readonly [
      Trie<Address, Account, Account | null>,
      HashMap<Address, Trie<Bytes32, U256, U256>>,
    ]
  >;
  readonly createdAccounts: HashSet<Address>;
  /**
   * Index of the transaction-level snapshot in _snapshots.
   * This is set when a transaction starts (first beginTransaction after block-level).
   * Used by getStorageOriginal to read the correct "original" value.
   * null means no transaction is currently active (only block-level or no snapshot).
   */
  _transactionSnapshotIndex: number | null;
}> {
  static empty(): State {
    return new State({
      _mainTrie: Trie.empty(true, null),
      _storageTries: HashMap.empty(),
      _snapshots: [],
      createdAccounts: HashSet.empty(),
      _transactionSnapshotIndex: null,
    });
  }
}

/**
 * Contains all information that is preserved between message calls
 * within a transaction.
 */
export class TransientStorage extends Data.TaggedClass("TransientStorage")<{
  readonly _tries: HashMap<Address, Trie<Bytes32, U256, U256>>;
  readonly _snapshots: Array<HashMap<Address, Trie<Bytes32, U256, U256>>>;
}> {
  static empty(): TransientStorage {
    return new TransientStorage({
      _tries: HashMap.empty(),
      _snapshots: [],
    });
  }
}

/**
 * Start a state transaction.
 *
 * Transactions are entirely implicit and can be nested. It is not possible to
 * calculate the state root during a transaction.
 *
 * @param state - The state.
 * @param transientStorage - The transient storage of the transaction.
 */
export const beginTransaction = Effect.fn("beginTransaction")(function* (
  state: State,
  transientStorage: TransientStorage,
) {
  const mainTrieCopy = state._mainTrie.copy();
  const storageTriesCopy = HashMap.empty<Address, Trie<Bytes32, U256, U256>>();
  for (const entry of state._storageTries) {
    storageTriesCopy.set(entry.key, entry.value.copy());
  }

  state._snapshots.push([mainTrieCopy, storageTriesCopy]);
  yield* annotateSafe({ snapshots: state._snapshots });

  const transientTriesCopy = HashMap.empty<
    Address,
    Trie<Bytes32, U256, U256>
  >();
  for (const entry of transientStorage._tries) {
    transientTriesCopy.set(entry.key, entry.value.copy());
  }
  transientStorage._snapshots.push(transientTriesCopy);
});

/**
 * Mark the current snapshot as the transaction-level snapshot.
 * This should be called at the start of a transaction (after beginTransaction),
 * before any nested calls. Used by getStorageOriginal to find the correct
 * "original" storage value for SSTORE gas calculations.
 */
export function markTransactionSnapshot(state: State): void {
  (
    state as { _transactionSnapshotIndex: number | null }
  )._transactionSnapshotIndex = state._snapshots.length - 1;
}

/**
 * Commit a state transaction.
 *
 * @param state - The state.
 * @param transientStorage - The transient storage of the transaction.
 */
export function commitTransaction(
  state: State,
  transientStorage: TransientStorage,
): void {
  state._snapshots.pop();
  if (
    state._transactionSnapshotIndex !== null &&
    state._snapshots.length <= state._transactionSnapshotIndex
  ) {
    (
      state as { _transactionSnapshotIndex: number | null }
    )._transactionSnapshotIndex = null;
    state.createdAccounts.clear();
  }

  if (state._snapshots.length === 0) {
    state.createdAccounts.clear();
  }

  transientStorage._snapshots.pop();
}

/**
 * Rollback a state transaction, resetting the state to the point when the
 * corresponding `beginTransaction()` call was made.
 *
 * @param state - The state.
 * @param transientStorage - The transient storage of the transaction.
 */
export function rollbackTransaction(
  state: State,
  transientStorage: TransientStorage,
): void {
  const snapshot = state._snapshots.pop();
  if (!snapshot) {
    throw new Error("No snapshot to rollback to");
  }

  const [mainTrie, storageTries] = snapshot;
  (state._mainTrie as { _data: typeof mainTrie._data })._data = mainTrie._data;
  state._storageTries.clear();
  for (const entry of storageTries) {
    state._storageTries.set(entry.key, entry.value);
  }

  if (
    state._transactionSnapshotIndex !== null &&
    state._snapshots.length <= state._transactionSnapshotIndex
  ) {
    (
      state as { _transactionSnapshotIndex: number | null }
    )._transactionSnapshotIndex = null;
    state.createdAccounts.clear();
  }

  if (state._snapshots.length === 0) {
    state.createdAccounts.clear();
  }

  const transientSnapshot = transientStorage._snapshots.pop();
  if (!transientSnapshot) {
    throw new Error("No transient storage snapshot to rollback to");
  }

  transientStorage._tries.clear();
  for (const entry of transientSnapshot) {
    transientStorage._tries.set(entry.key, entry.value);
  }
}

/**
 * Get the `Account` object at an address. Returns `EMPTY_ACCOUNT` if there
 * is no account at the address.
 *
 * Use `getAccountOptional()` if you care about the difference between a
 * non-existent account and `EMPTY_ACCOUNT`.
 *
 * @param state - The state
 * @param address - Address to lookup.
 * @returns Account at address.
 */
export function getAccount(state: State, address: Address): Account {
  const account = getAccountOptional(state, address);
  if (account === null) {
    return EMPTY_ACCOUNT;
  }
  return account;
}

/**
 * Get the `Account` object at an address. Returns `null` (rather than
 * `EMPTY_ACCOUNT`) if there is no account at the address.
 *
 * @param state - The state
 * @param address - Address to lookup.
 * @returns Account at address or null.
 */
export function getAccountOptional(
  state: State,
  address: Address,
): Account | null {
  return state._mainTrie.get(address);
}

/**
 * Set the `Account` object at an address. Setting to `null` deletes
 * the account (but not its storage, see `destroyAccount()`).
 *
 * @param state - The state
 * @param address - Address to set.
 * @param account - Account to set at address.
 */
export const setAccount = Effect.fn(
  "setAccount",
  {},
)(function* (state: State, address: Address, account: Account | null) {
  state._mainTrie.set(address, account);
});

/**
 * Completely remove the account at `address` and all of its storage.
 *
 * This function is made available exclusively for the `SELFDESTRUCT`
 * opcode. It is expected that `SELFDESTRUCT` will be disabled in a future
 * hardfork and this function will be removed.
 *
 * @param state - The state
 * @param address - Address of account to destroy.
 */
export const destroyAccount = Effect.fn("destroyAccount")(function* (
  state: State,
  address: Address,
) {
  yield* destroyStorage(state, address);
  yield* setAccount(state, address, null);
});

/**
 * Completely remove the storage at `address`.
 *
 * @param state - The state
 * @param address - Address of account whose storage is to be deleted.
 */
export const destroyStorage = Effect.fn("destroyStorage")(function* (
  state: State,
  address: Address,
) {
  state._storageTries.remove(address);
});

/**
 * Mark an account as having been created in the current transaction.
 * This information is used by `getStorageOriginal()` to handle an obscure
 * edgecase, and to respect the constraints added to SELFDESTRUCT by
 * EIP-6780.
 *
 * The marker is not removed even if the account creation reverts. Since the
 * account cannot have had code prior to its creation and can't call
 * `getStorageOriginal()`, this is harmless.
 *
 * @param state - The state
 * @param address - Address of the account that has been created.
 */
export const markAccountCreated = Effect.fn("markAccountCreated")(function* (
  state: State,
  address: Address,
) {
  state.createdAccounts.add(address);
});

/**
 * Get a value at a storage key on an account. Returns `U256(0)` if the
 * storage key has not been set previously.
 *
 * @param state - The state
 * @param address - Address of the account.
 * @param key - Key to lookup.
 * @returns Value at the key.
 */
export function getStorage(state: State, address: Address, key: Bytes32): U256 {
  const trie = state._storageTries.get(address);
  if (!trie) {
    return new U256({ value: 0n });
  }

  const value = trie.get(key);
  if (!(value instanceof U256)) {
    throw new Error("Storage value must be U256");
  }
  return value;
}

/**
 * Set a value at a storage key on an account. Setting to `U256(0)` deletes
 * the key.
 *
 * @param state - The state
 * @param address - Address of the account.
 * @param key - Key to set.
 * @param value - Value to set at the key.
 */
export const setStorage = Effect.fn("setStorage")(function* (
  state: State,
  address: Address,
  key: Bytes32,
  value: U256,
) {
  const account = state._mainTrie.get(address);
  if (account === null) {
    throw new Error("Account must exist to set storage");
  }

  const trie = state._storageTries.get(address);
  const actualTrie: Trie<Bytes32, U256, U256> = !trie
    ? Trie.empty<Bytes32, U256, U256>(true, new U256({ value: 0n }))
    : trie;

  if (!trie) {
    state._storageTries.set(address, actualTrie);
  }

  actualTrie.set(key, value);

  if (actualTrie._data.size === 0) {
    state._storageTries.remove(address);
  }
});

/**
 * Calculate the storage root of an account.
 *
 * @param state - The state
 * @param address - Address of the account.
 * @returns Storage root of the account.
 */
function storageRoot(state: State, address: Address): Root {
  const trie = state._storageTries.get(address);
  if (!trie) {
    return EMPTY_TRIE_ROOT;
  }

  const rootResult = trieRoot(trie, Option.none());
  if (Either.isLeft(rootResult)) {
    throw new Error(
      `Failed to calculate storage root: ${rootResult.left.message}`,
    );
  }
  return rootResult.right;
}

/**
 * Calculate the state root.
 *
 * @param state - The current state.
 * @returns The state root.
 */
export function stateRoot(state: State): Root {
  const rootResult = trieRoot(
    state._mainTrie,
    Option.some((address: Address) => storageRoot(state, address)),
  );
  if (Either.isLeft(rootResult)) {
    throw new Error(
      `Failed to calculate state root: ${rootResult.left.message}`,
    );
  }
  return rootResult.right;
}

/**
 * Checks if an account exists in the state trie.
 *
 * @param state - The state
 * @param address - Address of the account that needs to be checked.
 * @returns True if account exists in the state trie, False otherwise
 */
export function accountExists(state: State, address: Address): boolean {
  return getAccountOptional(state, address) !== null;
}

/**
 * Checks if an account has non zero nonce or non empty code.
 *
 * @param state - The state
 * @param address - Address of the account that needs to be checked.
 * @returns True if the account has non zero nonce or non empty code, False otherwise.
 */
export function accountHasCodeOrNonce(state: State, address: Address): boolean {
  const account = getAccount(state, address);
  return account.nonce.value !== 0n || account.code.value.length > 0;
}

/**
 * Checks if an account has storage.
 *
 * @param state - The state
 * @param address - Address of the account that needs to be checked.
 * @returns True if the account has storage, False otherwise.
 */
export function accountHasStorage(state: State, address: Address): boolean {
  return state._storageTries.has(address);
}

/**
 * Check whether an account is both in the state and non-empty.
 *
 * @param state - The state
 * @param address - Address of the account that needs to be checked.
 * @returns True if the account is alive.
 */
export function isAccountAlive(state: State, address: Address): boolean {
  const account = getAccountOptional(state, address);
  return account !== null && !Equal.equals(account, EMPTY_ACCOUNT);
}

/**
 * Check whether an account exists in the state and is empty.
 *
 * An empty account has zero nonce, empty code, and zero balance.
 * This is used for EIP-161 state trie clearing.
 *
 * @param state - The state
 * @param address - Address of the account to check.
 * @returns True if the account exists and is empty.
 */
export function accountExistsAndIsEmpty(
  state: State,
  address: Address,
): boolean {
  const account = getAccountOptional(state, address);
  return account !== null && Equal.equals(account, EMPTY_ACCOUNT);
}

/**
 * Initializes an account to state if it doesn't exist.
 *
 * This function is used to "touch" an account, creating an empty account
 * entry in the state trie if one doesn't already exist. This is important
 * for message calls to ensure the target account exists.
 *
 * @param state - The state
 * @param address - Address of the account that needs to be initialized.
 */
export const touchAccount = Effect.fn("touchAccount")(function* (
  state: State,
  address: Address,
) {
  if (!accountExists(state, address)) {
    yield* setAccount(state, address, EMPTY_ACCOUNT);
  }
});

/**
 * Modify an `Account` in the `State`. If, after modification, the account
 * exists and has zero nonce, empty code, and zero balance, it is destroyed
 * (only for EIP-161 / Spurious Dragon and later).
 *
 * @param state - The state
 * @param address - Address of the account to modify.
 * @param f - Function to modify the account.
 */
const modifyState = Effect.fn("modifyState")(function* <E, R>(
  state: State,
  address: Address,
  f: (account: Account) => Effect.Effect<Account, E, R>,
) {
  const account = getAccount(state, address);
  const modifiedAccount = yield* f(account);
  yield* setAccount(state, address, modifiedAccount);

  const { Fork } = yield* Effect.promise(() => import("./vm/Fork.js"));
  const fork = yield* Fork;
  if (fork.eip(161)) {
    const updatedAccount = getAccountOptional(state, address);
    const accountExistsAndIsEmpty =
      updatedAccount !== null &&
      updatedAccount.nonce.value === 0n &&
      updatedAccount.code.value.length === 0 &&
      updatedAccount.balance.value === 0n;

    if (accountExistsAndIsEmpty) {
      yield* destroyAccount(state, address);
    }
  }
});

/**
 * Move funds between accounts.
 *
 * @param state - The state
 * @param senderAddress - Address of the sender.
 * @param recipientAddress - Address of the recipient.
 * @param amount - Amount to transfer.
 */
export const moveEther = Effect.fn("moveEther")(function* (
  state: State,
  senderAddress: Address,
  recipientAddress: Address,
  amount: U256,
) {
  yield* modifyState(state, senderAddress, (sender) =>
    Effect.gen(function* () {
      if (sender.balance.value < amount.value) {
        yield* Effect.die(
          new Error(
            "unreachable, tried to update balance of account with insufficient balance",
          ),
        );
      }
      return sender.withBalance(
        new U256({ value: sender.balance.value - amount.value }),
      );
    }),
  );
  yield* modifyState(state, recipientAddress, (recipient) =>
    Effect.gen(function* () {
      return recipient.withBalance(
        new U256({ value: recipient.balance.value + amount.value }),
      );
    }),
  );
});

/**
 * Sets the balance of an account.
 *
 * @param state - The current state.
 * @param address - Address of the account whose balance needs to be set.
 * @param amount - The amount that needs to set in balance.
 */
export const setAccountBalance = Effect.fn("setAccountBalance")(function* (
  state: State,
  address: Address,
  amount: U256,
) {
  yield* annotateSafe({
    address: address,
    "balance.before": getAccount(state, address).balance,
    "balance.after": amount,
  });
  return yield* modifyState(state, address, (account) =>
    Effect.gen(function* () {
      return account.withBalance(amount);
    }),
  );
});

export const updateAccountBalance = Effect.fn("updateAccountBalance")(
  function* (state: State, address: Address, f: (balance: U256) => U256) {
    return yield* modifyState(state, address, (account) =>
      Effect.gen(function* () {
        return account.withBalance(f(account.balance));
      }),
    );
  },
);

/**
 * Increments the nonce of an account.
 *
 * @param state - The current state.
 * @param address - Address of the account whose nonce needs to be incremented.
 */
export const incrementNonce = Effect.fn("incrementNonce")(function* (
  state: State,
  address: Address,
) {
  return yield* modifyState(state, address, (sender) =>
    Effect.gen(function* () {
      return sender.withNonce(new Uint({ value: sender.nonce.value + 1n }));
    }),
  );
});

/**
 * Sets Account code.
 *
 * @param state - The current state.
 * @param address - Address of the account whose code needs to be updated.
 * @param code - The bytecode that needs to be set.
 */
export const setCode = Effect.fn("setCode")(function* (
  state: State,
  address: Address,
  code: Bytes,
) {
  return yield* modifyState(state, address, (sender) =>
    Effect.gen(function* () {
      return sender.withCode(code);
    }),
  );
});
/**
 * Get the original value in a storage slot i.e. the value before the current
 * transaction began. This function reads the value from the snapshots taken
 * before executing the transaction.
 *
 * @param state - The current state.
 * @param address - Address of the account to read the value from.
 * @param key - Key of the storage slot.
 * @returns The original value.
 */
export const getStorageOriginal = Effect.fn("getStorageOriginal", {
  captureStackTrace: true,
})(function* (state: State, address: Address, key: Bytes32) {
  if (state.createdAccounts.has(address)) {
    return new U256({ value: 0n });
  }

  if (state._snapshots.length === 0) {
    return yield* Effect.die(
      new Error("No snapshots available to get original storage"),
    );
  }

  const snapshotIndex = state._transactionSnapshotIndex ?? 0;
  const [, originalTrie] = state._snapshots[snapshotIndex];
  const originalAccountTrie = originalTrie.get(address);

  let originalValue: U256;
  if (!originalAccountTrie) {
    originalValue = new U256({ value: 0n });
  } else {
    const value = originalAccountTrie.get(key);
    originalValue = value;
  }

  return originalValue;
});

/**
 * Get a value at a storage key on an account from transient storage.
 * Returns `U256(0)` if the storage key has not been set previously.
 *
 * @param transientStorage - The transient storage
 * @param address - Address of the account.
 * @param key - Key to lookup.
 * @returns Value at the key.
 */
export function getTransientStorage(
  transientStorage: TransientStorage,
  address: Address,
  key: Bytes32,
): U256 {
  const trie = transientStorage._tries.get(address);
  if (!trie) {
    return new U256({ value: 0n });
  }

  const value = trie.get(key);
  if (!(value instanceof U256)) {
    throw new Error("Transient storage value must be U256");
  }
  return value;
}

/**
 * Set a value at a storage key on an account. Setting to `U256(0)` deletes
 * the key.
 *
 * @param transientStorage - The transient storage
 * @param address - Address of the account.
 * @param key - Key to set.
 * @param value - Value to set at the key.
 */
export function setTransientStorage(
  transientStorage: TransientStorage,
  address: Address,
  key: Bytes32,
  value: U256,
): void {
  const trie = transientStorage._tries.get(address);
  const actualTrie: Trie<Bytes32, U256, U256> = !trie
    ? Trie.empty<Bytes32, U256, U256>(true, new U256({ value: 0n }))
    : trie;

  if (!trie) {
    transientStorage._tries.set(address, actualTrie);
  }

  actualTrie.set(key, value);

  if (actualTrie._data.size === 0) {
    transientStorage._tries.remove(address);
  }
}

/**
 * Destroy all touched accounts that are empty.
 *
 * This is used for EIP-161 state trie clearing after transaction processing.
 *
 * @param state - The state
 * @param touchedAccounts - All accounts that have been touched in the current transaction.
 */
export const destroyTouchedEmptyAccounts = Effect.fn(
  "destroyTouchedEmptyAccounts",
)(function* (state: State, touchedAccounts: Iterable<Address>) {
  for (const address of touchedAccounts) {
    if (accountExistsAndIsEmpty(state, address)) {
      yield* destroyAccount(state, address);
    }
  }
});

export default {
  empty: State.empty,
  TransientStorage,
  beginTransaction,
  markTransactionSnapshot,
  commitTransaction,
  rollbackTransaction,
  getAccount,
  getAccountOptional,
  updateAccountBalance,
  setAccount,
  destroyAccount,
  destroyStorage,
  markAccountCreated,
  getStorage,
  setStorage,
  storageRoot,
  stateRoot,
  accountExists,
  accountHasCodeOrNonce,
  accountHasStorage,
  isAccountAlive,
  accountExistsAndIsEmpty,
  destroyTouchedEmptyAccounts,
  touchAccount,
  modifyState,
  moveEther,
  setAccountBalance,
  incrementNonce,
  setCode,
  getStorageOriginal,
  getTransientStorage,
  setTransientStorage,
};

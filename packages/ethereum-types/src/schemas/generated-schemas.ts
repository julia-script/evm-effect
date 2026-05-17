import { Schema, Tuple } from 'effect';
import * as EthTypes from './base-types.js';

/**
 * AccessListEntry
 *
 * Access list entry
 */
export const AccessListEntry = Schema.Struct({
  /**
   * address
   */
  address: EthTypes.AddressFromString,
  /**
   * storageKeys
   */
  storageKeys: Schema.Array(EthTypes.Bytes32FromString),
});

/**
 * AccessList
 *
 * Access list
 */
export const AccessList = Schema.Array(AccessListEntry);

/**
 * AccountStorage
 *
 * Storage slots for an account
 */
export const AccountStorage = EthTypes.EntriesFromRecord(
  EthTypes.Bytes32FromString,
  EthTypes.Bytes32FromString,
);

/**
 * AccountOverrideState
 *
 * Account override with whole storage replacement
 * It is possible to override any kind of address (EOA's, contracts and precompiles)
 */
export const AccountOverrideState = Schema.Struct({
  /**
   * balance
   *
   * Balance
   */
  balance: EthTypes.U256FromString.pipe(Schema.optional),
  /**
   * code
   *
   * Code
   */
  code: EthTypes.BytesFromString.pipe(Schema.optional),
  /**
   * movePrecompileToAddress
   *
   * MovePrecompileToAddress
   * Moves addresses precompile into the specified address. This move is done before the 'code' override is set. When the specified address is not a precompile, the behaviour is undefined and different clients might behave differently.
   */
  movePrecompileToAddress: EthTypes.AddressFromString.pipe(Schema.optional),
  /**
   * nonce
   *
   * Nonce
   */
  nonce: EthTypes.U64FromString.pipe(Schema.optional),
  /**
   * state
   *
   * Storage
   * Key-value mapping to override all slots in the account storage before executing the call. This functions similar to eth_call's state parameter.
   */
  state: AccountStorage,
});

/**
 * AccountOverrideStateDiff
 *
 * Account override with partial storage modification
 */
export const AccountOverrideStateDiff = Schema.Struct({
  /**
   * balance
   *
   * Balance
   */
  balance: EthTypes.U256FromString.pipe(Schema.optional),
  /**
   * code
   *
   * Code
   */
  code: EthTypes.BytesFromString.pipe(Schema.optional),
  /**
   * movePrecompileToAddress
   *
   * MovePrecompileToAddress
   * Moves addresses precompile into the specified address. This move is done before the 'code' override is set. Can only move precompiles.
   */
  movePrecompileToAddress: EthTypes.AddressFromString.pipe(Schema.optional),
  /**
   * nonce
   *
   * Nonce
   */
  nonce: EthTypes.U64FromString.pipe(Schema.optional),
  /**
   * stateDiff
   *
   * Storage difference
   * Key-value mapping to override individual slots in the account storage before executing the call. This functions similar to eth_call's state parameter.
   */
  stateDiff: AccountStorage,
});

/**
 * AccountOverride
 *
 * Details of an account to be overridden
 */
export const AccountOverride = Schema.Union([
  AccountOverrideState,
  AccountOverrideStateDiff,
]);

/**
 * AuthorizationList
 *
 * Authorization List
 * List of authorizations for the transaction
 */
export const AuthorizationList = Schema.Array(
  Schema.Struct({
    /**
     * address
     */
    address: EthTypes.AddressFromString,
    /**
     * chainId
     *
     * chainId
     * Chain ID on which this transaction is valid
     */
    chainId: EthTypes.UintFromString,
    /**
     * nonce
     *
     * nonce
     */
    nonce: EthTypes.UintFromString,
    /**
     * r
     *
     * r
     */
    r: EthTypes.U256FromString,
    /**
     * s
     *
     * s
     */
    s: EthTypes.U256FromString,
    /**
     * yParity
     *
     * yParity
     * The parity (0 for even, 1 for odd) of the y-value of the secp256k1 signature
     */
    yParity: EthTypes.U8FromString,
  }),
);

/**
 * BalanceChange
 *
 * Balance change
 */
export const BalanceChange = Schema.Struct({
  /**
   * index
   */
  index: EthTypes.U32FromString,
  /**
   * value
   */
  value: EthTypes.U256FromString,
});

/**
 * BlobAndProofV1
 *
 * Blob and proof object V1
 */
export const BlobAndProofV1 = Schema.Struct({
  /**
   * blob
   *
   * Blob
   */
  blob: EthTypes.BytesFromString,
  /**
   * proof
   *
   * proof
   */
  proof: EthTypes.BytesFromString,
});

/**
 * BlobAndProofV2
 *
 * Blob and proof object V2
 */
export const BlobAndProofV2 = Schema.Struct({
  /**
   * blob
   *
   * Blob
   */
  blob: EthTypes.BytesFromString,
  /**
   * proofs
   *
   * Cell Proofs
   */
  proofs: Schema.Array(EthTypes.BytesFromString),
});

/**
 * BlobCellsAndProofsV1
 *
 * Blob cells and proofs object V1
 */
export const BlobCellsAndProofsV1 = Schema.Struct({
  /**
   * blob_cells
   *
   * Blob Cells
   */
  blob_cells: Schema.Array(
    Schema.Union([EthTypes.BytesFromString, Schema.Null]),
  ),
  /**
   * proofs
   *
   * Cell Proofs
   */
  proofs: Schema.Array(Schema.Union([EthTypes.BytesFromString, Schema.Null])),
});

/**
 * BlobsBundleV1
 *
 * Blobs bundle object V1
 */
export const BlobsBundleV1 = Schema.Struct({
  /**
   * blobs
   *
   * Blobs
   */
  blobs: Schema.Array(EthTypes.BytesFromString),
  /**
   * commitments
   *
   * Commitments
   */
  commitments: Schema.Array(EthTypes.BytesFromString),
  /**
   * proofs
   *
   * Proofs
   */
  proofs: Schema.Array(EthTypes.BytesFromString),
});

/**
 * BlobsBundleV2
 *
 * Blobs bundle object V2
 */
export const BlobsBundleV2 = Schema.Struct({
  /**
   * blobs
   *
   * Blobs
   */
  blobs: Schema.Array(EthTypes.BytesFromString),
  /**
   * commitments
   *
   * Commitments
   */
  commitments: Schema.Array(EthTypes.BytesFromString),
  /**
   * proofs
   *
   * Proofs
   */
  proofs: Schema.Array(EthTypes.BytesFromString),
});

/**
 * BlockStateCalls
 *
 * Array of block state calls to be executed at specific, optional block/state.
 * The size of this array may be limited depending on the client as a DOS protection. 256 is a common/recommended limit as it is the same limit used by BLOCKHASH opcode.
 */
export const BlockStateCalls = Schema.Array(Schema.Struct({}));

/**
 * BlockTag
 *
 * Block tag
 * `earliest`: The lowest numbered block the client has available; `finalized`: The most recent crypto-economically secure block, cannot be re-orged outside of manual intervention driven by community coordination; `safe`: The most recent block that is safe from re-orgs under honest majority and certain synchronicity assumptions; `latest`: The most recent block in the canonical chain observed by the client, this block may be re-orged out of the canonical chain even under healthy/normal conditions; `pending`: A sample next block built by the client on top of `latest` and containing the set of transactions usually taken from local mempool. Before the merge transition is finalized, any call querying for `finalized` or `safe` block MUST be responded to with `-39001: Unknown block` error
 */
export const BlockTag = Schema.Literals([
  "earliest",
  "finalized",
  "safe",
  "latest",
  "pending",
]);

/**
 * BlockNumberOrTag
 *
 * Block number or tag
 */
export const BlockNumberOrTag = Schema.Union([
  EthTypes.UintFromString,
  BlockTag,
]);

/**
 * BlockNumberOrTagOrHash
 *
 * Block number, tag, or block hash
 */
export const BlockNumberOrTagOrHash = Schema.Union([
  EthTypes.UintFromString,
  BlockTag,
  EthTypes.Bytes32FromString,
]);

/**
 * CallResultFailure
 *
 * Result of call failure
 * The error messages are suggestions, and clients might implement different error messages. However, the error codes are enforced by the spec.
 */
export const CallResultFailure = Schema.Struct({
  /**
   * error
   */
  error: Schema.Union([
    Schema.Struct({
      /**
       * code
       */
      code: Schema.Literal(3),
      /**
       * message
       */
      message: Schema.String,
    }),
    Schema.Struct({
      /**
       * code
       */
      code: Schema.Literal(-32015).pipe(Schema.optional),
      /**
       * message
       */
      message: Schema.String.pipe(Schema.optional),
    }),
  ]),
  /**
   * gasUsed
   *
   * Return gasUsed
   */
  gasUsed: EthTypes.U64FromString,
  /**
   * maxUsedGas
   *
   * Maximum gas used during execution before refunds
   */
  maxUsedGas: EthTypes.U64FromString.pipe(Schema.optional),
  /**
   * returnData
   *
   * Return data
   */
  returnData: EthTypes.BytesFromString,
  /**
   * status
   *
   * Call Status Failure
   */
  status: EthTypes.BigIntFromString.pipe(
    Schema.refine((value): value is 0n => value === 0n),
  ),
});

/**
 * CodeChange
 *
 * Code change
 */
export const CodeChange = Schema.Struct({
  /**
   * code
   */
  code: EthTypes.BytesFromString,
  /**
   * index
   */
  index: EthTypes.U32FromString,
});

/**
 * EthSimulatePayload
 *
 * Arguments for eth_simulate
 */
export const EthSimulatePayload = Schema.Struct({
  /**
   * blockStateCalls
   *
   * Block State Calls
   * Definition of blocks that can contain calls and overrides
   */
  blockStateCalls: BlockStateCalls,
  /**
   * returnFullTransactions
   *
   * Return Full Transactions
   * When true, the method returns full transaction objects, otherwise, just hashes are returned.
   */
  returnFullTransactions: Schema.Boolean.pipe(Schema.optional),
  /**
 * traceTransfers
 *
 * Trace ETH Transfers
 * Adds ETH transfers as ERC20 transfer events to the logs. These transfers have emitter contract parameter set as address(0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee).
Default: false.
 */
  traceTransfers: Schema.Boolean.pipe(Schema.optional),
  /**
 * validation
 *
 * Validation
 * When true, the eth_simulateV1 does all validations that a normal EVM would do, except contract sender and signature checks. When false, eth_simulateV1 behaves like eth_call.
Default: false.
 */
  validation: Schema.Boolean.pipe(Schema.optional),
});

/**
 * ExecutionPayloadV1
 *
 * Execution payload object V1
 */
export const ExecutionPayloadV1 = Schema.Struct({
  /**
   * baseFeePerGas
   *
   * Base fee per gas
   */
  baseFeePerGas: EthTypes.U256FromString,
  /**
   * blockHash
   *
   * Block hash
   */
  blockHash: EthTypes.Bytes32FromString,
  /**
   * blockNumber
   *
   * Block number
   */
  blockNumber: EthTypes.U64FromString,
  /**
   * extraData
   *
   * Extra data
   */
  extraData: EthTypes.BytesFromString,
  /**
   * feeRecipient
   *
   * Recipient of transaction priority fees
   */
  feeRecipient: EthTypes.AddressFromString,
  /**
   * gasLimit
   *
   * Gas limit
   */
  gasLimit: EthTypes.U64FromString,
  /**
   * gasUsed
   *
   * Gas used
   */
  gasUsed: EthTypes.U64FromString,
  /**
   * logsBloom
   *
   * Bloom filter
   */
  logsBloom: EthTypes.Bytes256FromString,
  /**
   * parentHash
   *
   * Parent block hash
   */
  parentHash: EthTypes.Bytes32FromString,
  /**
   * prevRandao
   *
   * Previous randao value
   */
  prevRandao: EthTypes.Bytes32FromString,
  /**
   * receiptsRoot
   *
   * Receipts root
   */
  receiptsRoot: EthTypes.Bytes32FromString,
  /**
   * stateRoot
   *
   * State root
   */
  stateRoot: EthTypes.Bytes32FromString,
  /**
   * timestamp
   *
   * Timestamp
   */
  timestamp: EthTypes.U64FromString,
  /**
   * transactions
   *
   * Transactions
   */
  transactions: Schema.Array(EthTypes.BytesFromString),
});

/**
 * FilterTopic
 *
 * Filter Topic List Entry
 */
export const FilterTopic = Schema.Union([
  EthTypes.Bytes32FromString,
  Schema.Array(EthTypes.Bytes32FromString),
]);

/**
 * FilterTopics
 *
 * Filter Topics
 */
export const FilterTopics = Schema.Union([
  Schema.Null,
  Schema.Array(FilterTopic),
]);

/**
 * Filter
 *
 * filter
 */
export const Filter = Schema.Union([
  Schema.Struct({
    /**
     * address
     *
     * Address(es)
     */
    address: Schema.Union([
      Schema.Null,
      EthTypes.AddressFromString,
      Schema.Array(EthTypes.AddressFromString),
    ]).pipe(Schema.optional),
    /**
     * fromBlock
     *
     * from block
     */
    fromBlock: EthTypes.UintFromString.pipe(Schema.optional),
    /**
     * toBlock
     *
     * to block
     */
    toBlock: EthTypes.UintFromString.pipe(Schema.optional),
    /**
     * topics
     *
     * Topics
     */
    topics: FilterTopics.pipe(Schema.optional),
  }),
  Schema.Struct({
    /**
     * address
     *
     * Address(es)
     */
    address: Schema.Union([
      Schema.Null,
      EthTypes.AddressFromString,
      Schema.Array(EthTypes.AddressFromString),
    ]).pipe(Schema.optional),
    /**
     * blockHash
     *
     * block hash
     */
    blockHash: EthTypes.Bytes32FromString,
    /**
     * topics
     *
     * Topics
     */
    topics: FilterTopics.pipe(Schema.optional),
  }),
]);

/**
 * ForkchoiceStateV1
 *
 * Forkchoice state object V1
 */
export const ForkchoiceStateV1 = Schema.Struct({
  /**
   * finalizedBlockHash
   *
   * Finalized block hash
   */
  finalizedBlockHash: EthTypes.Bytes32FromString,
  /**
   * headBlockHash
   *
   * Head block hash
   */
  headBlockHash: EthTypes.Bytes32FromString,
  /**
   * safeBlockHash
   *
   * Safe block hash
   */
  safeBlockHash: EthTypes.Bytes32FromString,
});

/**
 * GenericCallTransaction
 *
 * Transaction object type for call
 */
export const GenericCallTransaction = Schema.Struct({
  /**
 * accessList
 *
 * accessList
 * EIP-2930 access list
Default: []
 */
  accessList: AccessList.pipe(Schema.optional),
  /**
 * blobVersionedHashes
 *
 * Blob versioned hashes
 * EIP-4844 versioned hashes
Default: []
 */
  blobVersionedHashes: EthTypes.Bytes32FromString.pipe(Schema.optional),
  /**
   * from
   *
   * from address
   * Default: null
   */
  from: EthTypes.AddressFromString.pipe(Schema.optional),
  /**
   * gas
   *
   * gas limit
   * Default: Remaining gas in the current block
   */
  gas: EthTypes.U64FromString.pipe(Schema.optional),
  /**
 * gasPrice
 *
 * gas price
 * The gas price willing to be paid by the sender in wei
Default: 0
 */
  gasPrice: EthTypes.U256FromString.pipe(Schema.optional),
  /**
   * input
   *
   * input data
   * Default: no data
   */
  input: EthTypes.BytesFromString.pipe(Schema.optional),
  /**
 * maxFeePerBlobGas
 *
 * max fee per blob gas
 * The maximum total fee per blob gas the sender is willing to pay in wei
Default: 0
 */
  maxFeePerBlobGas: EthTypes.U256FromString.pipe(Schema.optional),
  /**
 * maxFeePerGas
 *
 * max fee per gas
 * The maximum total fee per gas the sender is willing to pay (includes the network / base fee and miner / priority fee) in wei
Default: 0
 */
  maxFeePerGas: EthTypes.U256FromString.pipe(Schema.optional),
  /**
 * maxPriorityFeePerGas
 *
 * max priority fee per gas
 * Maximum fee per gas the sender is willing to pay to miners in wei
Default: 0
 */
  maxPriorityFeePerGas: EthTypes.U256FromString.pipe(Schema.optional),
  /**
   * nonce
   *
   * nonce
   * Default: Defaults to correct nonce
   */
  nonce: EthTypes.U64FromString.pipe(Schema.optional),
  /**
   * to
   *
   * to address
   * Default: 0x0
   */
  to: EthTypes.AddressFromString.pipe(Schema.optional),
  /**
   * type
   *
   * type
   * Default: 0x2
   */
  type: EthTypes.U8FromString.pipe(Schema.optional),
  /**
   * value
   *
   * value
   * Default: 0
   */
  value: EthTypes.U256FromString.pipe(Schema.optional),
});

/**
 * GenericTransaction
 *
 * Transaction object generic to all types
 */
export const GenericTransaction = Schema.Struct({
  /**
   * accessList
   *
   * accessList
   * EIP-2930 access list
   */
  accessList: AccessList.pipe(Schema.optional),
  /**
   * authorizationList
   *
   * authorizationList
   * EIP-7702 authorization list
   */
  authorizationList: AuthorizationList.pipe(Schema.optional),
  /**
   * blobVersionedHashes
   *
   * blobVersionedHashes
   * List of versioned blob hashes associated with the transaction's EIP-4844 data blobs.
   */
  blobVersionedHashes: Schema.Array(EthTypes.Bytes32FromString).pipe(
    Schema.optional,
  ),
  /**
   * blobs
   *
   * blobs
   * Raw blob data.
   */
  blobs: Schema.Array(EthTypes.BytesFromString).pipe(Schema.optional),
  /**
   * chainId
   *
   * chainId
   * Chain ID that this transaction is valid on.
   */
  chainId: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * from
   *
   * from address
   */
  from: EthTypes.AddressFromString.pipe(Schema.optional),
  /**
   * gas
   *
   * gas limit
   */
  gas: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * gasPrice
   *
   * gas price
   * The gas price willing to be paid by the sender in wei
   */
  gasPrice: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * input
   *
   * input data
   */
  input: EthTypes.BytesFromString.pipe(Schema.optional),
  /**
   * maxFeePerBlobGas
   *
   * max fee per blob gas
   * The maximum total fee per gas the sender is willing to pay for blob gas in wei
   */
  maxFeePerBlobGas: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * maxFeePerGas
   *
   * max fee per gas
   * The maximum total fee per gas the sender is willing to pay (includes the network / base fee and miner / priority fee) in wei
   */
  maxFeePerGas: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * maxPriorityFeePerGas
   *
   * max priority fee per gas
   * Maximum fee per gas the sender is willing to pay to miners in wei
   */
  maxPriorityFeePerGas: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * nonce
   *
   * nonce
   */
  nonce: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * to
   *
   * to address
   */
  to: Schema.Union([Schema.Null, EthTypes.AddressFromString]).pipe(
    Schema.optional,
  ),
  /**
   * type
   *
   * type
   */
  type: EthTypes.U8FromString.pipe(Schema.optional),
  /**
   * value
   *
   * value
   */
  value: EthTypes.UintFromString.pipe(Schema.optional),
});

/**
 * Log
 *
 * log
 */
export const Log = Schema.Struct({
  /**
   * address
   *
   * address
   */
  address: EthTypes.AddressFromString.pipe(Schema.optional),
  /**
   * blockHash
   *
   * block hash
   */
  blockHash: EthTypes.Bytes32FromString.pipe(Schema.optional),
  /**
   * blockNumber
   *
   * block number
   */
  blockNumber: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * blockTimestamp
   *
   * block timestamp
   */
  blockTimestamp: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * data
   *
   * data
   */
  data: EthTypes.BytesFromString.pipe(Schema.optional),
  /**
   * logIndex
   *
   * log index
   */
  logIndex: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * removed
   *
   * removed
   */
  removed: Schema.Boolean.pipe(Schema.optional),
  /**
   * topics
   *
   * topics
   */
  topics: Schema.Array(EthTypes.Bytes32FromString).pipe(Schema.optional),
  /**
   * transactionHash
   *
   * transaction hash
   */
  transactionHash: EthTypes.Bytes32FromString,
  /**
   * transactionIndex
   *
   * transaction index
   */
  transactionIndex: EthTypes.UintFromString.pipe(Schema.optional),
});

/**
 * CallResultSuccess
 *
 * Result of call success
 */
export const CallResultSuccess = Schema.Struct({
  /**
   * gasUsed
   *
   * Return gasUsed
   */
  gasUsed: EthTypes.U64FromString,
  /**
   * logs
   *
   * Return logs
   */
  logs: Schema.Array(Log),
  /**
   * maxUsedGas
   *
   * Maximum gas used during execution before refunds
   */
  maxUsedGas: EthTypes.U64FromString.pipe(Schema.optional),
  /**
   * returnData
   *
   * Return data
   */
  returnData: EthTypes.BytesFromString,
  /**
   * status
   *
   * Call Status Success
   */
  status: EthTypes.BigIntFromString.pipe(
    Schema.refine((value): value is 1n => value === 1n),
  ),
});

/**
 * CallResults
 *
 * Results of eth_simulate within block
 */
export const CallResults = Schema.Array(
  Schema.Union([CallResultFailure, CallResultSuccess]),
);

/**
 * FilterResults
 *
 * Filter results
 */
export const FilterResults = Schema.Union([
  Schema.Array(EthTypes.Bytes32FromString),
  Schema.Array(Log),
]);

/**
 * NonceChange
 *
 * Nonce change
 */
export const NonceChange = Schema.Struct({
  /**
   * index
   */
  index: EthTypes.U32FromString,
  /**
   * value
   */
  value: EthTypes.U64FromString,
});

/**
 * PayloadAttributesV1
 *
 * Payload attributes object V1
 */
export const PayloadAttributesV1 = Schema.Struct({
  /**
   * prevRandao
   *
   * Previous randao value
   */
  prevRandao: EthTypes.Bytes32FromString,
  /**
   * suggestedFeeRecipient
   *
   * Suggested fee recipient
   */
  suggestedFeeRecipient: EthTypes.AddressFromString,
  /**
   * timestamp
   *
   * Timestamp
   */
  timestamp: EthTypes.U64FromString,
});

/**
 * PayloadStatusNoInvalidBlockHash
 *
 * Payload status object deprecating INVALID_BLOCK_HASH status
 */
export const PayloadStatusNoInvalidBlockHash = Schema.Struct({
  /**
   * latestValidHash
   */
  latestValidHash: EthTypes.Bytes32FromString.pipe(Schema.optional),
  /**
   * status
   */
  status: Schema.Literals([
    "VALID",
    "INVALID",
    "SYNCING",
    "ACCEPTED",
    "INVALID_BLOCK_HASH",
  ]).pipe(Schema.optional),
  /**
   * validationError
   */
  validationError: Schema.String.pipe(Schema.optional),
});

/**
 * PayloadStatusV1
 *
 * Payload status object V1
 */
export const PayloadStatusV1 = Schema.Struct({
  /**
   * latestValidHash
   *
   * The hash of the most recent valid block
   */
  latestValidHash: EthTypes.Bytes32FromString.pipe(Schema.optional),
  /**
   * status
   *
   * Payload validation status
   */
  status: Schema.Literals([
    "VALID",
    "INVALID",
    "SYNCING",
    "ACCEPTED",
    "INVALID_BLOCK_HASH",
  ]),
  /**
   * validationError
   *
   * Validation error message
   */
  validationError: Schema.String.pipe(Schema.optional),
});

/**
 * ReceiptInfo
 *
 * Receipt information
 */
export const ReceiptInfo = Schema.Struct({
  /**
   * blobGasPrice
   *
   * blob gas price
   * The actual value per gas deducted from the sender's account for blob gas. Only specified for blob transactions as defined by EIP-4844.
   */
  blobGasPrice: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * blobGasUsed
   *
   * blob gas used
   * The amount of blob gas used for this specific transaction. Only specified for blob transactions as defined by EIP-4844.
   */
  blobGasUsed: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * blockHash
   *
   * block hash
   */
  blockHash: EthTypes.Bytes32FromString,
  /**
   * blockNumber
   *
   * block number
   */
  blockNumber: EthTypes.UintFromString,
  /**
   * contractAddress
   *
   * contract address
   * The contract address created, if the transaction was a contract creation, otherwise null.
   */
  contractAddress: Schema.Union([EthTypes.AddressFromString, Schema.Null]).pipe(
    Schema.optional,
  ),
  /**
   * cumulativeGasUsed
   *
   * cumulative gas used
   * The sum of gas used by this transaction and all preceding transactions in the same block.
   */
  cumulativeGasUsed: EthTypes.UintFromString,
  /**
   * effectiveGasPrice
   *
   * effective gas price
   * The actual value per gas deducted from the sender's account. Before EIP-1559, this is equal to the transaction's gas price. After, it is equal to baseFeePerGas + min(maxFeePerGas - baseFeePerGas, maxPriorityFeePerGas).
   */
  effectiveGasPrice: EthTypes.UintFromString,
  /**
   * from
   *
   * from
   */
  from: EthTypes.AddressFromString,
  /**
   * gasUsed
   *
   * gas used
   * The amount of gas used for this specific transaction alone.
   */
  gasUsed: EthTypes.UintFromString,
  /**
   * logs
   *
   * logs
   */
  logs: Schema.Array(Log),
  /**
   * logsBloom
   *
   * logs bloom
   */
  logsBloom: EthTypes.Bytes256FromString,
  /**
   * root
   *
   * state root
   * The post-transaction state root. Only specified for transactions included before the Byzantium upgrade.
   */
  root: EthTypes.Bytes32FromString.pipe(Schema.optional),
  /**
   * status
   *
   * status
   * Either 1 (success) or 0 (failure). Only specified for transactions included after the Byzantium upgrade.
   */
  status: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * to
   *
   * to
   * Address of the receiver or null in a contract creation transaction.
   */
  to: Schema.Union([Schema.Null, EthTypes.AddressFromString]).pipe(
    Schema.optional,
  ),
  /**
   * transactionHash
   *
   * transaction hash
   */
  transactionHash: EthTypes.Bytes32FromString,
  /**
   * transactionIndex
   *
   * transaction index
   */
  transactionIndex: EthTypes.UintFromString,
  /**
   * type
   *
   * type
   */
  type: EthTypes.U8FromString.pipe(Schema.optional),
});

/**
 * RestrictedPayloadStatusV1
 */
export const RestrictedPayloadStatusV1 = Schema.Struct({
  /**
   * latestValidHash
   */
  latestValidHash: EthTypes.Bytes32FromString.pipe(Schema.optional),
  /**
   * status
   *
   * Set of possible values is restricted to VALID, INVALID, SYNCING
   */
  status: Schema.Literals([
    "VALID",
    "INVALID",
    "SYNCING",
    "ACCEPTED",
    "INVALID_BLOCK_HASH",
  ]).pipe(Schema.optional),
  /**
   * validationError
   */
  validationError: Schema.String.pipe(Schema.optional),
});

/**
 * ForkchoiceUpdatedResponseV1
 *
 * Forkchoice updated response
 */
export const ForkchoiceUpdatedResponseV1 = Schema.Struct({
  /**
   * payloadId
   *
   * Payload id
   */
  payloadId: EthTypes.Bytes8FromString.pipe(Schema.optional),
  /**
   * payloadStatus
   *
   * Payload status
   */
  payloadStatus: RestrictedPayloadStatusV1,
});

/**
 * StateOverrides
 *
 * Dictionary of addresses in the state to be overridden
 */
export const StateOverrides = EthTypes.EntriesFromRecord(
  EthTypes.AddressFromString,
  AccountOverride,
);

/**
 * StorageChange
 *
 * Storage change
 */
export const StorageChange = Schema.Struct({
  /**
   * index
   */
  index: EthTypes.U32FromString,
  /**
   * value
   */
  value: EthTypes.Bytes32FromString,
});

/**
 * SlotChanges
 *
 * Slot changes
 */
export const SlotChanges = Schema.Struct({
  /**
   * changes
   */
  changes: Schema.Array(StorageChange),
  /**
   * key
   */
  key: EthTypes.Bytes32FromString,
});

/**
 * AccountAccess
 *
 * Account access
 */
export const AccountAccess = Schema.Struct({
  /**
   * address
   */
  address: EthTypes.AddressFromString,
  /**
   * balanceChanges
   */
  balanceChanges: Schema.Array(BalanceChange).pipe(Schema.optional),
  /**
   * codeChanges
   */
  codeChanges: Schema.Array(CodeChange).pipe(Schema.optional),
  /**
   * nonceChanges
   */
  nonceChanges: Schema.Array(NonceChange).pipe(Schema.optional),
  /**
   * storageChanges
   */
  storageChanges: Schema.Array(SlotChanges).pipe(Schema.optional),
  /**
   * storageReads
   */
  storageReads: Schema.Array(EthTypes.Bytes32FromString).pipe(Schema.optional),
});

/**
 * BlockAccessList
 *
 * Block access list
 */
export const BlockAccessList = Schema.Array(AccountAccess);

/**
 * StorageProof
 *
 * Storage proof
 */
export const StorageProof = Schema.Struct({
  /**
   * key
   *
   * key
   */
  key: EthTypes.BytesFromString,
  /**
   * proof
   *
   * proof
   */
  proof: Schema.Array(EthTypes.BytesFromString),
  /**
   * value
   *
   * value
   */
  value: EthTypes.U256FromString,
});

/**
 * AccountProof
 *
 * Account proof
 */
export const AccountProof = Schema.Struct({
  /**
   * accountProof
   *
   * accountProof
   */
  accountProof: Schema.Array(EthTypes.BytesFromString),
  /**
   * address
   *
   * address
   */
  address: EthTypes.AddressFromString,
  /**
   * balance
   *
   * balance
   */
  balance: EthTypes.U256FromString,
  /**
   * codeHash
   *
   * codeHash
   */
  codeHash: EthTypes.Bytes32FromString,
  /**
   * nonce
   *
   * nonce
   */
  nonce: EthTypes.U64FromString,
  /**
   * storageHash
   *
   * storageHash
   */
  storageHash: EthTypes.Bytes32FromString,
  /**
   * storageProof
   *
   * Storage proofs
   */
  storageProof: Schema.Array(StorageProof),
});

/**
 * SyncingStatus
 *
 * Syncing status
 */
export const SyncingStatus = Schema.Union([
  Schema.Struct({
    /**
     * currentBlock
     *
     * Current block
     */
    currentBlock: EthTypes.UintFromString.pipe(Schema.optional),
    /**
     * highestBlock
     *
     * Highest block
     */
    highestBlock: EthTypes.UintFromString.pipe(Schema.optional),
    /**
     * startingBlock
     *
     * Starting block
     */
    startingBlock: EthTypes.UintFromString.pipe(Schema.optional),
  }),
  Schema.Boolean,
]);

/**
 * Transaction1559Unsigned
 *
 * EIP-1559 transaction.
 */
export const Transaction1559Unsigned = Schema.Struct({
  /**
   * accessList
   *
   * accessList
   * EIP-2930 access list
   */
  accessList: AccessList,
  /**
   * chainId
   *
   * chainId
   * Chain ID that this transaction is valid on.
   */
  chainId: EthTypes.UintFromString,
  /**
   * gas
   *
   * gas limit
   */
  gas: EthTypes.UintFromString,
  /**
   * gasPrice
   *
   * gas price
   * The effective gas price paid by the sender in wei. For transactions not yet included in a block, this value should be set equal to the max fee per gas. This field is DEPRECATED, please transition to using effectiveGasPrice in the receipt object going forward.
   */
  gasPrice: EthTypes.UintFromString,
  /**
   * input
   *
   * input data
   */
  input: EthTypes.BytesFromString,
  /**
   * maxFeePerGas
   *
   * max fee per gas
   * The maximum total fee per gas the sender is willing to pay (includes the network / base fee and miner / priority fee) in wei
   */
  maxFeePerGas: EthTypes.UintFromString,
  /**
   * maxPriorityFeePerGas
   *
   * max priority fee per gas
   * Maximum fee per gas the sender is willing to pay to miners in wei
   */
  maxPriorityFeePerGas: EthTypes.UintFromString,
  /**
   * nonce
   *
   * nonce
   */
  nonce: EthTypes.UintFromString,
  /**
   * to
   *
   * to address
   */
  to: Schema.Union([Schema.Null, EthTypes.AddressFromString]).pipe(
    Schema.optional,
  ),
  /**
   * type
   *
   * type
   */
  type: EthTypes.BigIntFromString.pipe(
    Schema.refine((value): value is 2n => value === 2n),
  ),
  /**
   * value
   *
   * value
   */
  value: EthTypes.UintFromString,
});

/**
 * Transaction1559Signed
 *
 * Signed 1559 Transaction
 */
export const Transaction1559Signed = Transaction1559Unsigned.mapFields(
  (fields) => ({
    ...fields,
    r: EthTypes.UintFromString,
    s: EthTypes.UintFromString,
    v: EthTypes.U8FromString.pipe(Schema.optional),
    yParity: EthTypes.U8FromString,
  }),
);

/**
 * Transaction2930Unsigned
 *
 * EIP-2930 transaction.
 */
export const Transaction2930Unsigned = Schema.Struct({
  /**
   * accessList
   *
   * accessList
   * EIP-2930 access list
   */
  accessList: AccessList,
  /**
   * chainId
   *
   * chainId
   * Chain ID that this transaction is valid on.
   */
  chainId: EthTypes.UintFromString,
  /**
   * gas
   *
   * gas limit
   */
  gas: EthTypes.UintFromString,
  /**
   * gasPrice
   *
   * gas price
   * The gas price willing to be paid by the sender in wei
   */
  gasPrice: EthTypes.UintFromString,
  /**
   * input
   *
   * input data
   */
  input: EthTypes.BytesFromString,
  /**
   * nonce
   *
   * nonce
   */
  nonce: EthTypes.UintFromString,
  /**
   * to
   *
   * to address
   */
  to: Schema.Union([Schema.Null, EthTypes.AddressFromString]).pipe(
    Schema.optional,
  ),
  /**
   * type
   *
   * type
   */
  type: EthTypes.BigIntFromString.pipe(
    Schema.refine((value): value is 1n => value === 1n),
  ),
  /**
   * value
   *
   * value
   */
  value: EthTypes.UintFromString,
});

/**
 * Transaction2930Signed
 *
 * Signed 2930 Transaction
 */
export const Transaction2930Signed = Transaction2930Unsigned.mapFields(
  (fields) => ({
    ...fields,
    r: EthTypes.UintFromString,
    s: EthTypes.UintFromString,
    v: EthTypes.U8FromString.pipe(Schema.optional),
    yParity: EthTypes.U8FromString,
  }),
);

/**
 * Transaction4844Unsigned
 *
 * EIP-4844 transaction.
 */
export const Transaction4844Unsigned = Schema.Struct({
  /**
   * accessList
   *
   * accessList
   * EIP-2930 access list
   */
  accessList: AccessList,
  /**
   * blobVersionedHashes
   *
   * blobVersionedHashes
   * List of versioned blob hashes associated with the transaction's EIP-4844 data blobs
   */
  blobVersionedHashes: Schema.Array(EthTypes.Bytes32FromString),
  /**
   * chainId
   *
   * chainId
   * Chain ID that this transaction is valid on
   */
  chainId: EthTypes.UintFromString,
  /**
   * gas
   *
   * gas limit
   */
  gas: EthTypes.UintFromString,
  /**
   * gasPrice
   *
   * gas price
   * The effective gas price paid by the sender in wei. For transactions not yet included in a block, this value should be set equal to the max fee per gas. This field is DEPRECATED, please transition to using effectiveGasPrice in the receipt object going forward.
   */
  gasPrice: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * input
   *
   * input data
   */
  input: EthTypes.BytesFromString,
  /**
   * maxFeePerBlobGas
   *
   * max fee per blob gas
   * The maximum total fee per gas the sender is willing to pay for blob gas in wei
   */
  maxFeePerBlobGas: EthTypes.UintFromString,
  /**
   * maxFeePerGas
   *
   * max fee per gas
   * The maximum total fee per gas the sender is willing to pay (includes the network / base fee and miner / priority fee) in wei
   */
  maxFeePerGas: EthTypes.UintFromString,
  /**
   * maxPriorityFeePerGas
   *
   * max priority fee per gas
   * Maximum fee per gas the sender is willing to pay to miners in wei
   */
  maxPriorityFeePerGas: EthTypes.UintFromString,
  /**
   * nonce
   *
   * nonce
   */
  nonce: EthTypes.UintFromString,
  /**
   * to
   *
   * to address
   */
  to: EthTypes.AddressFromString,
  /**
   * type
   *
   * type
   */
  type: EthTypes.BigIntFromString.pipe(
    Schema.refine((value): value is 3n => value === 3n),
  ),
  /**
   * value
   *
   * value
   */
  value: EthTypes.UintFromString,
});

/**
 * Transaction4844Signed
 *
 * Signed 4844 Transaction
 */
export const Transaction4844Signed = Transaction4844Unsigned.mapFields(
  (fields) => ({
    ...fields,
    r: EthTypes.UintFromString,
    s: EthTypes.UintFromString,
    v: EthTypes.U8FromString.pipe(Schema.optional),
    yParity: EthTypes.U8FromString,
  }),
);

/**
 * Transaction7702Unsigned
 *
 * EIP-7702 transaction
 */
export const Transaction7702Unsigned = Schema.Struct({
  /**
   * accessList
   *
   * accessList
   * EIP-2930 access lists
   */
  accessList: AccessList,
  /**
   * authorizationList
   *
   * authorizationList
   */
  authorizationList: AuthorizationList,
  /**
   * chainId
   *
   * chainId
   * Chain ID that this transaction is valid on
   */
  chainId: EthTypes.UintFromString,
  /**
   * gas
   *
   * gas limit
   */
  gas: EthTypes.UintFromString,
  /**
   * gasPrice
   *
   * gas price
   * The effective gas price paid by the sender in wei. For transactions not yet included in a block, this value should be set equal to the max fee per gas. This field is DEPRECATED, please transition to using effectiveGasPrice in the receipt object going forward.
   */
  gasPrice: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * input
   *
   * input data
   */
  input: EthTypes.BytesFromString,
  /**
   * maxFeePerGas
   *
   * max fee per gas
   * The maximum total fee per gas the sender is willing to pay (includes the network / base fee and miner / priority fee) in wei
   */
  maxFeePerGas: EthTypes.UintFromString,
  /**
   * maxPriorityFeePerGas
   *
   * max priority fee per gas
   * Maximum fee per gas the sender is willing to pay to miners in wei
   */
  maxPriorityFeePerGas: EthTypes.UintFromString,
  /**
   * nonce
   *
   * nonce
   */
  nonce: EthTypes.UintFromString,
  /**
   * to
   *
   * to address
   */
  to: EthTypes.AddressFromString,
  /**
   * type
   *
   * type
   */
  type: EthTypes.BigIntFromString.pipe(
    Schema.refine((value): value is 4n => value === 4n),
  ),
  /**
   * value
   *
   * value
   */
  value: EthTypes.UintFromString,
});

/**
 * Transaction7702Signed
 *
 * Signed 7702 Transaction
 */
export const Transaction7702Signed = Transaction7702Unsigned.mapFields(
  (fields) => ({
    ...fields,
    r: EthTypes.UintFromString,
    s: EthTypes.UintFromString,
    v: EthTypes.U8FromString.pipe(Schema.optional),
    yParity: EthTypes.U8FromString,
  }),
);

/**
 * TransactionLegacyUnsigned
 *
 * Legacy transaction.
 */
export const TransactionLegacyUnsigned = Schema.Struct({
  /**
   * chainId
   *
   * chainId
   * Chain ID that this transaction is valid on.
   */
  chainId: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * gas
   *
   * gas limit
   */
  gas: EthTypes.UintFromString,
  /**
   * gasPrice
   *
   * gas price
   * The gas price willing to be paid by the sender in wei
   */
  gasPrice: EthTypes.UintFromString,
  /**
   * input
   *
   * input data
   */
  input: EthTypes.BytesFromString,
  /**
   * nonce
   *
   * nonce
   */
  nonce: EthTypes.UintFromString,
  /**
   * to
   *
   * to address
   */
  to: Schema.Union([Schema.Null, EthTypes.AddressFromString]).pipe(
    Schema.optional,
  ),
  /**
   * type
   *
   * type
   */
  type: EthTypes.BigIntFromString.pipe(
    Schema.refine((value): value is 0n => value === 0n),
  ),
  /**
   * value
   *
   * value
   */
  value: EthTypes.UintFromString,
});

/**
 * TransactionLegacySigned
 *
 * Signed Legacy Transaction
 */
export const TransactionLegacySigned = TransactionLegacyUnsigned.mapFields(
  (fields) => ({
    ...fields,
    r: EthTypes.UintFromString,
    s: EthTypes.UintFromString,
    v: EthTypes.UintFromString,
  }),
);

/**
 * TransactionSigned
 */
export const TransactionSigned = Schema.Union([
  Transaction7702Signed,
  Transaction4844Signed,
  Transaction1559Signed,
  Transaction2930Signed,
  TransactionLegacySigned,
]);

/**
 * PendingTransactionInfo
 *
 * Pending transaction information
 * Transaction in the pool, not yet included in a block.
 */
export const PendingTransactionInfo = TransactionSigned.mapMembers(
  Tuple.map(
    Schema.fieldsAssign({
      blockHash: Schema.Null.pipe(Schema.optional),
      blockNumber: Schema.Null.pipe(Schema.optional),
      blockTimestamp: Schema.Null.pipe(Schema.optional),
      from: EthTypes.AddressFromString,
      hash: EthTypes.Bytes32FromString,
      transactionIndex: Schema.Null.pipe(Schema.optional),
    }),
  ),
);

/**
 * TransactionInfo
 *
 * Transaction information
 */
export const TransactionInfo = TransactionSigned.mapMembers(
  Tuple.map(
    Schema.fieldsAssign({
      blockHash: EthTypes.Bytes32FromString,
      blockNumber: EthTypes.UintFromString,
      blockTimestamp: EthTypes.UintFromString,
      from: EthTypes.AddressFromString,
      hash: EthTypes.Bytes32FromString,
      transactionIndex: EthTypes.UintFromString,
    }),
  ),
);

/**
 * TransactionUnsigned
 */
export const TransactionUnsigned = Schema.Union([
  Transaction7702Unsigned,
  Transaction4844Unsigned,
  Transaction1559Unsigned,
  Transaction2930Unsigned,
  TransactionLegacyUnsigned,
]);

/**
 * TransitionConfigurationV1
 *
 * Transition configuration object
 */
export const TransitionConfigurationV1 = Schema.Struct({
  /**
   * terminalBlockHash
   *
   * Terminal block hash
   */
  terminalBlockHash: EthTypes.Bytes32FromString,
  /**
   * terminalBlockNumber
   *
   * Terminal block number
   */
  terminalBlockNumber: EthTypes.U64FromString,
  /**
   * terminalTotalDifficulty
   *
   * Terminal total difficulty
   */
  terminalTotalDifficulty: EthTypes.U256FromString,
});

/**
 * TxpoolContentAddressMap
 *
 * Transactions by address
 * Map of address to transactions grouped by nonce
 */
export const TxpoolContentAddressMap = Schema.Struct({});

/**
 * TxpoolContent
 *
 * Transaction pool content
 * All pending and queued transactions in the pool, grouped by address and nonce.
 */
export const TxpoolContent = Schema.Struct({
  /**
   * pending
   *
   * pending transactions
   * Transactions ready for inclusion in the next block(s)
   */
  pending: TxpoolContentAddressMap,
  /**
   * queued
   *
   * queued transactions
   * Transactions with nonce gaps awaiting preceding transactions before they can be executed
   */
  queued: TxpoolContentAddressMap,
});

/**
 * TxpoolContentByAddress
 *
 * Transactions by nonce
 * Map of nonce to transaction object
 */
export const TxpoolContentByAddress = Schema.Struct({});

/**
 * TxpoolContentFromResult
 *
 * Transaction pool content from address
 * Pending and queued transactions from a specific address, grouped by nonce.
 */
export const TxpoolContentFromResult = Schema.Struct({
  /**
   * pending
   *
   * pending transactions
   * Transactions ready for inclusion in the next block(s)
   */
  pending: TxpoolContentByAddress,
  /**
   * queued
   *
   * queued transactions
   * Transactions with nonce gaps awaiting preceding transactions before they can be executed
   */
  queued: TxpoolContentByAddress,
});

/**
 * TxpoolStatus
 *
 * Transaction pool status
 * The number of pending and queued transactions in the pool.
 */
export const TxpoolStatus = Schema.Struct({
  /**
   * pending
   *
   * pending count
   * Number of transactions ready for inclusion in the next block(s)
   */
  pending: EthTypes.UintFromString,
  /**
   * queued
   *
   * queued count
   * Number of transactions with nonce gaps awaiting preceding transactions before they can be executed
   */
  queued: EthTypes.UintFromString,
});

/**
 * Withdrawal
 *
 * Validator withdrawal
 */
export const Withdrawal = Schema.Struct({
  /**
   * address
   *
   * recipient address for withdrawal value
   */
  address: EthTypes.AddressFromString,
  /**
   * amount
   *
   * value contained in withdrawal
   */
  amount: EthTypes.U256FromString,
  /**
   * index
   *
   * index of withdrawal
   */
  index: EthTypes.U64FromString,
  /**
   * validatorIndex
   *
   * index of validator that generated withdrawal
   */
  validatorIndex: EthTypes.U64FromString,
});

/**
 * Block
 *
 * Block object
 */
export const Block = Schema.Struct({
  /**
   * baseFeePerGas
   *
   * Base fee per gas
   */
  baseFeePerGas: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * blobGasUsed
   *
   * Blob gas used
   */
  blobGasUsed: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * blockAccessListHash
   *
   * EIP-7928 block access list hash
   */
  blockAccessListHash: EthTypes.Bytes32FromString.pipe(Schema.optional),
  /**
   * difficulty
   *
   * Difficulty
   */
  difficulty: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * excessBlobGas
   *
   * Excess blob gas
   */
  excessBlobGas: EthTypes.UintFromString.pipe(Schema.optional),
  /**
   * extraData
   *
   * Extra data
   */
  extraData: EthTypes.BytesFromString,
  /**
   * gasLimit
   *
   * Gas limit
   */
  gasLimit: EthTypes.UintFromString,
  /**
   * gasUsed
   *
   * Gas used
   */
  gasUsed: EthTypes.UintFromString,
  /**
   * hash
   *
   * Hash
   */
  hash: EthTypes.Bytes32FromString,
  /**
   * logsBloom
   *
   * Bloom filter
   */
  logsBloom: EthTypes.Bytes256FromString,
  /**
   * miner
   *
   * Coinbase
   */
  miner: EthTypes.AddressFromString,
  /**
   * mixHash
   *
   * Mix hash
   */
  mixHash: EthTypes.Bytes32FromString,
  /**
   * nonce
   *
   * Nonce
   */
  nonce: EthTypes.Bytes8FromString,
  /**
   * number
   *
   * Number
   */
  number: EthTypes.UintFromString,
  /**
   * parentBeaconBlockRoot
   *
   * Parent Beacon Block Root
   */
  parentBeaconBlockRoot: EthTypes.Bytes32FromString.pipe(Schema.optional),
  /**
   * parentHash
   *
   * Parent block hash
   */
  parentHash: EthTypes.Bytes32FromString,
  /**
   * receiptsRoot
   *
   * Receipts root
   */
  receiptsRoot: EthTypes.Bytes32FromString,
  /**
   * requestsHash
   *
   * EIP-7685 requests hash
   */
  requestsHash: EthTypes.Bytes32FromString.pipe(Schema.optional),
  /**
   * sha3Uncles
   *
   * Ommers hash
   */
  sha3Uncles: EthTypes.Bytes32FromString,
  /**
   * size
   *
   * Block size
   */
  size: EthTypes.UintFromString,
  /**
   * stateRoot
   *
   * State root
   */
  stateRoot: EthTypes.Bytes32FromString,
  /**
   * timestamp
   *
   * Timestamp
   */
  timestamp: EthTypes.UintFromString,
  /**
   * transactions
   */
  transactions: Schema.Union([
    Schema.Array(EthTypes.Bytes32FromString),
    Schema.Array(TransactionInfo),
  ]),
  /**
   * transactionsRoot
   *
   * Transactions root
   */
  transactionsRoot: EthTypes.Bytes32FromString,
  /**
   * uncles
   *
   * Uncles
   */
  uncles: Schema.Array(EthTypes.Bytes32FromString),
  /**
   * withdrawals
   *
   * Withdrawals
   */
  withdrawals: Schema.Array(Withdrawal).pipe(Schema.optional),
  /**
   * withdrawalsRoot
   *
   * Withdrawals root
   */
  withdrawalsRoot: EthTypes.Bytes32FromString.pipe(Schema.optional),
});

/**
 * BadBlock
 *
 * Bad block
 */
export const BadBlock = Schema.Struct({
  /**
   * block
   *
   * Block
   */
  block: Block,
  /**
   * hash
   *
   * Hash
   */
  hash: EthTypes.Bytes32FromString,
  /**
   * rlp
   *
   * RLP
   */
  rlp: EthTypes.BytesFromString,
});

/**
 * EthSimulateBlockResultSingleSuccess
 *
 * Result of eth_simulate block-level, with array of calls
 */
export const EthSimulateBlockResultSingleSuccess = Block.mapFields(
  (fields) => ({
    ...fields,
    calls: CallResults,
  }),
);

/**
 * EthSimulateResult
 *
 * Full results of eth_simulate
 */
export const EthSimulateResult = Schema.Array(
  EthSimulateBlockResultSingleSuccess,
);

/**
 * WithdrawalV1
 *
 * Withdrawal object V1
 */
export const WithdrawalV1 = Schema.Struct({
  /**
   * address
   *
   * Withdrawal address
   */
  address: EthTypes.AddressFromString,
  /**
   * amount
   *
   * Withdrawal amount
   */
  amount: EthTypes.U64FromString,
  /**
   * index
   *
   * Withdrawal index
   */
  index: EthTypes.U64FromString,
  /**
   * validatorIndex
   *
   * Validator index
   */
  validatorIndex: EthTypes.U64FromString,
});

/**
 * ExecutionPayloadBodyV1
 *
 * Execution payload body object V1
 */
export const ExecutionPayloadBodyV1 = Schema.Struct({
  /**
   * transactions
   */
  transactions: Schema.Array(EthTypes.BytesFromString),
  /**
   * withdrawals
   *
   * Withdrawals
   */
  withdrawals: Schema.Array(WithdrawalV1).pipe(Schema.optional),
});

/**
 * ExecutionPayloadBodyV2
 *
 * Execution payload body object V2
 */
export const ExecutionPayloadBodyV2 = Schema.Struct({
  /**
   * blockAccessList
   *
   * Block access list
   * RLP-encoded block access list as defined in EIP-7928, or null if unavailable
   */
  blockAccessList: Schema.Union([EthTypes.BytesFromString, Schema.Null]).pipe(
    Schema.optional,
  ),
  /**
   * transactions
   */
  transactions: Schema.Array(EthTypes.BytesFromString),
  /**
   * withdrawals
   *
   * Withdrawals
   */
  withdrawals: Schema.Array(WithdrawalV1).pipe(Schema.optional),
});

/**
 * ExecutionPayloadV2
 *
 * Execution payload object V2
 */
export const ExecutionPayloadV2 = Schema.Struct({
  /**
   * baseFeePerGas
   */
  baseFeePerGas: EthTypes.U256FromString,
  /**
   * blockHash
   */
  blockHash: EthTypes.Bytes32FromString,
  /**
   * blockNumber
   */
  blockNumber: EthTypes.U64FromString,
  /**
   * extraData
   */
  extraData: EthTypes.BytesFromString,
  /**
   * feeRecipient
   */
  feeRecipient: EthTypes.AddressFromString,
  /**
   * gasLimit
   */
  gasLimit: EthTypes.U64FromString,
  /**
   * gasUsed
   */
  gasUsed: EthTypes.U64FromString,
  /**
   * logsBloom
   */
  logsBloom: EthTypes.Bytes256FromString,
  /**
   * parentHash
   */
  parentHash: EthTypes.Bytes32FromString,
  /**
   * prevRandao
   */
  prevRandao: EthTypes.Bytes32FromString,
  /**
   * receiptsRoot
   */
  receiptsRoot: EthTypes.Bytes32FromString,
  /**
   * stateRoot
   */
  stateRoot: EthTypes.Bytes32FromString,
  /**
   * timestamp
   */
  timestamp: EthTypes.U64FromString,
  /**
   * transactions
   */
  transactions: Schema.Array(EthTypes.BytesFromString),
  /**
   * withdrawals
   *
   * Withdrawals
   */
  withdrawals: Schema.Array(WithdrawalV1),
});

/**
 * ExecutionPayloadV3
 *
 * Execution payload object V3
 */
export const ExecutionPayloadV3 = Schema.Struct({
  /**
   * baseFeePerGas
   */
  baseFeePerGas: EthTypes.U256FromString,
  /**
   * blobGasUsed
   *
   * Blob gas used
   */
  blobGasUsed: EthTypes.U64FromString,
  /**
   * blockHash
   */
  blockHash: EthTypes.Bytes32FromString,
  /**
   * blockNumber
   */
  blockNumber: EthTypes.U64FromString,
  /**
   * excessBlobGas
   *
   * Excess blob gas
   */
  excessBlobGas: EthTypes.U64FromString,
  /**
   * extraData
   */
  extraData: EthTypes.BytesFromString,
  /**
   * feeRecipient
   */
  feeRecipient: EthTypes.AddressFromString,
  /**
   * gasLimit
   */
  gasLimit: EthTypes.U64FromString,
  /**
   * gasUsed
   */
  gasUsed: EthTypes.U64FromString,
  /**
   * logsBloom
   */
  logsBloom: EthTypes.Bytes256FromString,
  /**
   * parentHash
   */
  parentHash: EthTypes.Bytes32FromString,
  /**
   * prevRandao
   */
  prevRandao: EthTypes.Bytes32FromString,
  /**
   * receiptsRoot
   */
  receiptsRoot: EthTypes.Bytes32FromString,
  /**
   * stateRoot
   */
  stateRoot: EthTypes.Bytes32FromString,
  /**
   * timestamp
   */
  timestamp: EthTypes.U64FromString,
  /**
   * transactions
   */
  transactions: Schema.Array(EthTypes.BytesFromString),
  /**
   * withdrawals
   */
  withdrawals: Schema.Array(WithdrawalV1),
});

/**
 * ExecutionPayloadV4
 *
 * Execution payload object V4
 */
export const ExecutionPayloadV4 = Schema.Struct({
  /**
   * baseFeePerGas
   */
  baseFeePerGas: EthTypes.U256FromString,
  /**
   * blobGasUsed
   */
  blobGasUsed: EthTypes.U64FromString,
  /**
   * blockAccessList
   *
   * Block access list
   */
  blockAccessList: EthTypes.BytesFromString,
  /**
   * blockHash
   */
  blockHash: EthTypes.Bytes32FromString,
  /**
   * blockNumber
   */
  blockNumber: EthTypes.U64FromString,
  /**
   * excessBlobGas
   */
  excessBlobGas: EthTypes.U64FromString,
  /**
   * extraData
   */
  extraData: EthTypes.BytesFromString,
  /**
   * feeRecipient
   */
  feeRecipient: EthTypes.AddressFromString,
  /**
   * gasLimit
   */
  gasLimit: EthTypes.U64FromString,
  /**
   * gasUsed
   */
  gasUsed: EthTypes.U64FromString,
  /**
   * logsBloom
   */
  logsBloom: EthTypes.Bytes256FromString,
  /**
   * parentHash
   */
  parentHash: EthTypes.Bytes32FromString,
  /**
   * prevRandao
   */
  prevRandao: EthTypes.Bytes32FromString,
  /**
   * receiptsRoot
   */
  receiptsRoot: EthTypes.Bytes32FromString,
  /**
   * slotNumber
   *
   * Slot number
   */
  slotNumber: EthTypes.U64FromString,
  /**
   * stateRoot
   */
  stateRoot: EthTypes.Bytes32FromString,
  /**
   * timestamp
   */
  timestamp: EthTypes.U64FromString,
  /**
   * transactions
   */
  transactions: Schema.Array(EthTypes.BytesFromString),
  /**
   * withdrawals
   */
  withdrawals: Schema.Array(WithdrawalV1),
});

/**
 * PayloadAttributesV2
 *
 * Payload attributes object V2
 */
export const PayloadAttributesV2 = Schema.Struct({
  /**
   * prevRandao
   */
  prevRandao: EthTypes.Bytes32FromString,
  /**
   * suggestedFeeRecipient
   */
  suggestedFeeRecipient: EthTypes.AddressFromString,
  /**
   * timestamp
   */
  timestamp: EthTypes.U64FromString,
  /**
   * withdrawals
   *
   * Withdrawals
   */
  withdrawals: Schema.Array(WithdrawalV1),
});

/**
 * PayloadAttributesV3
 *
 * Payload attributes object V3
 */
export const PayloadAttributesV3 = Schema.Struct({
  /**
   * parentBeaconBlockRoot
   *
   * Parent beacon block root
   */
  parentBeaconBlockRoot: EthTypes.Bytes32FromString,
  /**
   * prevRandao
   */
  prevRandao: EthTypes.Bytes32FromString,
  /**
   * suggestedFeeRecipient
   */
  suggestedFeeRecipient: EthTypes.AddressFromString,
  /**
   * timestamp
   */
  timestamp: EthTypes.U64FromString,
  /**
   * withdrawals
   */
  withdrawals: Schema.Array(WithdrawalV1),
});

/**
 * PayloadAttributesV4
 *
 * Payload attributes object V4
 */
export const PayloadAttributesV4 = Schema.Struct({
  /**
   * parentBeaconBlockRoot
   */
  parentBeaconBlockRoot: EthTypes.Bytes32FromString,
  /**
   * prevRandao
   */
  prevRandao: EthTypes.Bytes32FromString,
  /**
   * slotNumber
   *
   * Slot number
   */
  slotNumber: EthTypes.U64FromString,
  /**
   * suggestedFeeRecipient
   */
  suggestedFeeRecipient: EthTypes.AddressFromString,
  /**
   * timestamp
   */
  timestamp: EthTypes.U64FromString,
  /**
   * withdrawals
   */
  withdrawals: Schema.Array(WithdrawalV1),
});

/**
 * Withdrawals
 *
 * Validator withdrawals list
 * This array can have a maximum length of 16.
 */
export const Withdrawals = Schema.Array(Withdrawal);

/**
 * BlockOverrides
 *
 * Context fields related to the block being executed
 */
export const BlockOverrides = Schema.Struct({
  /**
   * baseFeePerGas
   *
   * Base fee per unit of gas
   */
  baseFeePerGas: EthTypes.U256FromString.pipe(Schema.optional),
  /**
   * blobBaseFee
   *
   * Base fee per unit of blob gas
   */
  blobBaseFee: EthTypes.U64FromString.pipe(Schema.optional),
  /**
   * feeRecipient
   *
   * Fee Recipient (also known as coinbase)
   */
  feeRecipient: EthTypes.AddressFromString.pipe(Schema.optional),
  /**
   * gasLimit
   *
   * Gas limit
   */
  gasLimit: EthTypes.U64FromString.pipe(Schema.optional),
  /**
   * number
   *
   * Number
   * When overriding block numbers across multiple blocks, block number need to be increasing. Skipping over blocks numbers is possible. If block number is not specified, it's incremented by one for each block.
   */
  number: EthTypes.U64FromString.pipe(Schema.optional),
  /**
   * prevRandao
   *
   * The Previous value of randomness beacon
   */
  prevRandao: EthTypes.U256FromString.pipe(Schema.optional),
  /**
   * time
   *
   * Time
   * Time must either increase or remain constant relative to the previous block. If time is not specified, it's incremented by one for each block.
   */
  time: EthTypes.U64FromString.pipe(Schema.optional),
  /**
   * withdrawals
   *
   * Withdrawals made by validators
   */
  withdrawals: Withdrawals.pipe(Schema.optional),
});


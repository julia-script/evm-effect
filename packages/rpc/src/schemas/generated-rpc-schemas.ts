import EthTypes from "@evm-effect/ethereum-types";
import { Schema } from "effect";
import * as Components from "./generated-schemas.js";

/**
 * debug_getBadBlocks RPC method
 *
 * Returns an array of recent bad blocks that the client has seen on the network.
 */
export const debug_getBadBlocks = {
  method: "debug_getBadBlocks" as const,
  params: Schema.Tuple([]),
  /**
   * Blocks
   */
  result: Schema.Array(Components.BadBlock),
};

/**
 * debug_getRawBlock RPC method
 *
 * Returns an RLP-encoded block.
 */
export const debug_getRawBlock = {
  method: "debug_getRawBlock" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTag,
  ]),
  /**
   * Block RLP
   */
  result: EthTypes.HexString,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * debug_getRawBlockAccessList RPC method
 *
 * Returns the RLP-encoded EIP-7928 block access list for a given block.
 */
export const debug_getRawBlockAccessList = {
  method: "debug_getRawBlockAccessList" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTag,
  ]),
  /**
   * Block access list RLP
   */
  result: EthTypes.HexString,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32001),
      message: Schema.Literal("Resource not found"),
    }),
  ]),
};

/**
 * debug_getRawHeader RPC method
 *
 * Returns an RLP-encoded header.
 */
export const debug_getRawHeader = {
  method: "debug_getRawHeader" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTag,
  ]),
  /**
   * Header RLP
   */
  result: EthTypes.HexString,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * debug_getRawReceipts RPC method
 *
 * Returns an array of EIP-2718 binary-encoded receipts.
 */
export const debug_getRawReceipts = {
  method: "debug_getRawReceipts" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTag,
  ]),
  /**
   * Receipts
   */
  result: Schema.Array(EthTypes.HexString),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * debug_getRawTransaction RPC method
 *
 * Returns an array of EIP-2718 binary-encoded transactions.
 */
export const debug_getRawTransaction = {
  method: "debug_getRawTransaction" as const,
  params: Schema.Tuple([
    /**
     * Transaction hash
     */
    EthTypes.HexString,
  ]),
  /**
   * EIP-2718 binary-encoded transaction
   */
  result: EthTypes.HexString,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * engine_exchangeCapabilities RPC method
 *
 * Exchanges list of supported Engine API methods
 */
export const engine_exchangeCapabilities = {
  method: "engine_exchangeCapabilities" as const,
  params: Schema.Tuple([
    /**
     * Consensus client methods
     */
    Schema.Array(Schema.String),
  ]),
  /**
   * Execution client methods
   */
  result: Schema.Array(Schema.String),
};

/**
 * engine_exchangeTransitionConfigurationV1 RPC method
 *
 * Exchanges transition configuration
 */
export const engine_exchangeTransitionConfigurationV1 = {
  method: "engine_exchangeTransitionConfigurationV1" as const,
  params: Schema.Tuple([
    /**
     * Consensus client configuration
     */
    Components.TransitionConfigurationV1,
  ]),
  /**
   * Execution client configuration
   */
  result: Components.TransitionConfigurationV1,
};

/**
 * engine_forkchoiceUpdatedV1 RPC method
 *
 * Updates the forkchoice state
 */
export const engine_forkchoiceUpdatedV1 = {
  method: "engine_forkchoiceUpdatedV1" as const,
  params: Schema.Tuple([
    /**
     * Forkchoice state
     */
    Components.ForkchoiceStateV1,
    /**
     * Payload attributes
     */
    Components.PayloadAttributesV1,
  ]),
  /**
   * Response object
   */
  result: Components.ForkchoiceUpdatedResponseV1,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38002),
      message: Schema.Literal("Invalid forkchoice state"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38003),
      message: Schema.Literal("Invalid payload attributes"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38006),
      message: Schema.Literal("Too deep reorg"),
    }),
  ]),
};

/**
 * engine_forkchoiceUpdatedV2 RPC method
 *
 * Updates the forkchoice state
 */
export const engine_forkchoiceUpdatedV2 = {
  method: "engine_forkchoiceUpdatedV2" as const,
  params: Schema.Tuple([
    /**
     * Forkchoice state
     */
    Components.ForkchoiceStateV1,
    /**
     * Payload attributes
     */
    Components.PayloadAttributesV2,
  ]),
  /**
   * Response object
   */
  result: Components.ForkchoiceUpdatedResponseV1,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38002),
      message: Schema.Literal("Invalid forkchoice state"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38003),
      message: Schema.Literal("Invalid payload attributes"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38006),
      message: Schema.Literal("Too deep reorg"),
    }),
  ]),
};

/**
 * engine_forkchoiceUpdatedV3 RPC method
 *
 * Updates the forkchoice state
 */
export const engine_forkchoiceUpdatedV3 = {
  method: "engine_forkchoiceUpdatedV3" as const,
  params: Schema.Tuple([
    /**
     * Forkchoice state
     */
    Components.ForkchoiceStateV1,
    /**
     * Payload attributes
     */
    Components.PayloadAttributesV3,
  ]),
  /**
   * Response object
   */
  result: Components.ForkchoiceUpdatedResponseV1,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38002),
      message: Schema.Literal("Invalid forkchoice state"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38003),
      message: Schema.Literal("Invalid payload attributes"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Invalid params"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38006),
      message: Schema.Literal("Too deep reorg"),
    }),
  ]),
};

/**
 * engine_forkchoiceUpdatedV4 RPC method
 *
 * Updates the forkchoice state
 */
export const engine_forkchoiceUpdatedV4 = {
  method: "engine_forkchoiceUpdatedV4" as const,
  params: Schema.Tuple([
    /**
     * Forkchoice state
     */
    Components.ForkchoiceStateV1,
    /**
     * Payload attributes
     */
    Components.PayloadAttributesV4,
    /**
     * Custody columns
     */
    Schema.Union([EthTypes.HexString, Schema.Null]),
  ]),
  /**
   * Response object
   */
  result: Components.ForkchoiceUpdatedResponseV1,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38002),
      message: Schema.Literal("Invalid forkchoice state"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38003),
      message: Schema.Literal("Invalid payload attributes"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Invalid params"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38006),
      message: Schema.Literal("Too deep reorg"),
    }),
  ]),
};

/**
 * engine_getBlobsV1 RPC method
 *
 * Fetches blobs from the blob pool
 */
export const engine_getBlobsV1 = {
  method: "engine_getBlobsV1" as const,
  params: Schema.Tuple([
    /**
     * Blob versioned hashes
     */
    Schema.Array(EthTypes.HexString),
  ]),
  /**
   * List of blobs and proofs
   */
  result: Schema.Array(Components.BlobAndProofV1),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38004),
      message: Schema.Literal("Too large request"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * engine_getBlobsV2 RPC method
 *
 * Fetch blobs from the blob mempool
 */
export const engine_getBlobsV2 = {
  method: "engine_getBlobsV2" as const,
  params: Schema.Tuple([
    /**
     * Blob versioned hashes
     */
    Schema.Array(EthTypes.HexString),
  ]),
  /**
   * List of blobs and corresponding cell proofs
   */
  result: Schema.Array(Components.BlobAndProofV2),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38004),
      message: Schema.Literal("Too large request"),
    }),
  ]),
};

/**
 * engine_getBlobsV3 RPC method
 *
 * Fetch blobs from the blob mempool, returning partial hits
 */
export const engine_getBlobsV3 = {
  method: "engine_getBlobsV3" as const,
  params: Schema.Tuple([
    /**
     * Blob versioned hashes
     */
    Schema.Array(EthTypes.HexString),
  ]),
  /**
   * List of blobs and corresponding cell proofs, with positional nulls for missing blobs
   */
  result: Schema.Union([
    Schema.Array(Schema.Union([Components.BlobAndProofV2, Schema.Null])),
    Schema.Null,
  ]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38004),
      message: Schema.Literal("Too large request"),
    }),
  ]),
};

/**
 * engine_getBlobsV4 RPC method
 *
 * Retrieve blob cells from the Execution layer blobpool
 */
export const engine_getBlobsV4 = {
  method: "engine_getBlobsV4" as const,
  params: Schema.Tuple([
    /**
     * Blob versioned hashes
     */
    Schema.Array(EthTypes.HexString),
    /**
     * Cell indices bitarray
     */
    EthTypes.HexString,
  ]),
  /**
   * List of requested blob cells and proofs, with positional nulls for missing blobs
   */
  result: Schema.Union([
    Schema.Array(Schema.Union([Components.BlobCellsAndProofsV1, Schema.Null])),
    Schema.Null,
  ]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38004),
      message: Schema.Literal("Too large request"),
    }),
  ]),
};

/**
 * engine_getPayloadBodiesByHashV1 RPC method
 *
 * Given block hashes returns bodies of the corresponding execution payloads
 */
export const engine_getPayloadBodiesByHashV1 = {
  method: "engine_getPayloadBodiesByHashV1" as const,
  params: Schema.Tuple([
    /**
     * Array of block hashes
     */
    Schema.Array(EthTypes.HexString),
  ]),
  /**
   * Execution payload bodies
   */
  result: Schema.Array(Components.ExecutionPayloadBodyV1),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38004),
      message: Schema.Literal("Too large request"),
    }),
  ]),
};

/**
 * engine_getPayloadBodiesByHashV2 RPC method
 *
 * Given block hashes returns bodies of the corresponding execution payloads including block access lists
 */
export const engine_getPayloadBodiesByHashV2 = {
  method: "engine_getPayloadBodiesByHashV2" as const,
  params: Schema.Tuple([
    /**
     * Array of block hashes
     */
    Schema.Array(EthTypes.HexString),
  ]),
  /**
   * Execution payload bodies
   */
  result: Schema.Array(Components.ExecutionPayloadBodyV2),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38004),
      message: Schema.Literal("Too large request"),
    }),
  ]),
};

/**
 * engine_getPayloadBodiesByRangeV1 RPC method
 *
 * Given a range of block numbers returns bodies of the corresponding execution payloads
 */
export const engine_getPayloadBodiesByRangeV1 = {
  method: "engine_getPayloadBodiesByRangeV1" as const,
  params: Schema.Tuple([
    /**
     * Starting block number
     */
    EthTypes.BigIntFromString,
    /**
     * Number of blocks to return
     */
    EthTypes.BigIntFromString,
  ]),
  /**
   * Execution payload bodies
   */
  result: Schema.Array(Components.ExecutionPayloadBodyV1),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38004),
      message: Schema.Literal("Too large request"),
    }),
  ]),
};

/**
 * engine_getPayloadBodiesByRangeV2 RPC method
 *
 * Given a range of block numbers returns bodies of the corresponding execution payloads including block access lists
 */
export const engine_getPayloadBodiesByRangeV2 = {
  method: "engine_getPayloadBodiesByRangeV2" as const,
  params: Schema.Tuple([
    /**
     * Starting block number
     */
    EthTypes.BigIntFromString,
    /**
     * Number of blocks to return
     */
    EthTypes.BigIntFromString,
  ]),
  /**
   * Execution payload bodies
   */
  result: Schema.Array(Components.ExecutionPayloadBodyV2),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38004),
      message: Schema.Literal("Too large request"),
    }),
  ]),
};

/**
 * engine_getPayloadV1 RPC method
 *
 * Obtains execution payload from payload build process
 */
export const engine_getPayloadV1 = {
  method: "engine_getPayloadV1" as const,
  params: Schema.Tuple([
    /**
     * Payload id
     */
    EthTypes.HexString,
  ]),
  /**
   * Execution payload
   */
  result: Components.ExecutionPayloadV1,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38001),
      message: Schema.Literal("Unknown payload"),
    }),
  ]),
};

/**
 * engine_getPayloadV2 RPC method
 *
 * Obtains execution payload from payload build process
 */
export const engine_getPayloadV2 = {
  method: "engine_getPayloadV2" as const,
  params: Schema.Tuple([
    /**
     * Payload id
     */
    EthTypes.HexString,
  ]),
  /**
   * Response object
   */
  result: Schema.Struct({
    /**
     * blockValue
     *
     * Expected fee value
     */
    blockValue: EthTypes.BigIntFromString,
    /**
     * executionPayload
     *
     * Execution payload
     */
    executionPayload: Schema.Union([
      Components.ExecutionPayloadV1,
      Components.ExecutionPayloadV2,
    ]),
  }),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38001),
      message: Schema.Literal("Unknown payload"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * engine_getPayloadV3 RPC method
 *
 * Obtains execution payload from payload build process
 */
export const engine_getPayloadV3 = {
  method: "engine_getPayloadV3" as const,
  params: Schema.Tuple([
    /**
     * Payload id
     */
    EthTypes.HexString,
  ]),
  /**
   * Response object
   */
  result: Schema.Struct({
    /**
     * blobsBundle
     *
     * Blobs bundle
     */
    blobsBundle: Components.BlobsBundleV1,
    /**
     * blockValue
     *
     * Expected fee value
     */
    blockValue: EthTypes.BigIntFromString,
    /**
     * executionPayload
     *
     * Execution payload
     */
    executionPayload: Components.ExecutionPayloadV3,
    /**
     * shouldOverrideBuilder
     *
     * Should override builder flag
     */
    shouldOverrideBuilder: Schema.Boolean,
  }),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38001),
      message: Schema.Literal("Unknown payload"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * engine_getPayloadV4 RPC method
 *
 * Obtains execution payload from payload build process
 */
export const engine_getPayloadV4 = {
  method: "engine_getPayloadV4" as const,
  params: Schema.Tuple([
    /**
     * Payload id
     */
    EthTypes.HexString,
  ]),
  /**
   * Response object
   */
  result: Schema.Struct({
    /**
     * blobsBundle
     *
     * Blobs bundle
     */
    blobsBundle: Components.BlobsBundleV1,
    /**
     * blockValue
     *
     * Expected fee value
     */
    blockValue: EthTypes.BigIntFromString,
    /**
     * executionPayload
     *
     * Execution payload
     */
    executionPayload: Components.ExecutionPayloadV3,
    /**
     * executionRequests
     *
     * Execution requests
     */
    executionRequests: Schema.Array(EthTypes.HexString),
    /**
     * shouldOverrideBuilder
     *
     * Should override builder flag
     */
    shouldOverrideBuilder: Schema.Boolean,
  }),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38001),
      message: Schema.Literal("Unknown payload"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * engine_getPayloadV5 RPC method
 *
 * Obtains execution payload from payload build process
 */
export const engine_getPayloadV5 = {
  method: "engine_getPayloadV5" as const,
  params: Schema.Tuple([
    /**
     * Payload id
     */
    EthTypes.HexString,
  ]),
  /**
   * Response object
   */
  result: Schema.Struct({
    /**
     * blobsBundle
     *
     * Blobs bundle
     */
    blobsBundle: Components.BlobsBundleV2,
    /**
     * blockValue
     *
     * Expected fee value
     */
    blockValue: EthTypes.BigIntFromString,
    /**
     * executionPayload
     *
     * Execution payload
     */
    executionPayload: Components.ExecutionPayloadV3,
    /**
     * executionRequests
     *
     * Execution requests
     */
    executionRequests: Schema.Array(EthTypes.HexString),
    /**
     * shouldOverrideBuilder
     *
     * Should override builder flag
     */
    shouldOverrideBuilder: Schema.Boolean,
  }),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38001),
      message: Schema.Literal("Unknown payload"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * engine_getPayloadV6 RPC method
 *
 * Obtains execution payload from payload build process
 */
export const engine_getPayloadV6 = {
  method: "engine_getPayloadV6" as const,
  params: Schema.Tuple([
    /**
     * Payload id
     */
    EthTypes.HexString,
  ]),
  /**
   * Response object
   */
  result: Schema.Struct({
    /**
     * blobsBundle
     */
    blobsBundle: Components.BlobsBundleV2,
    /**
     * blockValue
     */
    blockValue: EthTypes.BigIntFromString,
    /**
     * executionPayload
     */
    executionPayload: Components.ExecutionPayloadV4,
    /**
     * executionRequests
     */
    executionRequests: Schema.Array(EthTypes.HexString),
    /**
     * shouldOverrideBuilder
     */
    shouldOverrideBuilder: Schema.Boolean,
  }),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-38001),
      message: Schema.Literal("Unknown payload"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * engine_newPayloadV1 RPC method
 *
 * Runs execution payload validation
 */
export const engine_newPayloadV1 = {
  method: "engine_newPayloadV1" as const,
  params: Schema.Tuple([
    /**
     * Execution payload
     */
    Components.ExecutionPayloadV1,
  ]),
  /**
   * Payload status
   */
  result: Components.PayloadStatusV1,
};

/**
 * engine_newPayloadV2 RPC method
 *
 * Runs execution payload validation
 */
export const engine_newPayloadV2 = {
  method: "engine_newPayloadV2" as const,
  params: Schema.Tuple([
    /**
     * Execution payload
     */
    Schema.Union([
      Components.ExecutionPayloadV1,
      Components.ExecutionPayloadV2,
    ]),
  ]),
  /**
   * Payload status
   */
  result: Components.PayloadStatusNoInvalidBlockHash,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Invalid params"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * engine_newPayloadV3 RPC method
 *
 * Runs execution payload validation
 */
export const engine_newPayloadV3 = {
  method: "engine_newPayloadV3" as const,
  params: Schema.Tuple([
    /**
     * Execution payload
     */
    Components.ExecutionPayloadV3,
    /**
     * Expected blob versioned hashes
     */
    Schema.Array(EthTypes.HexString),
    /**
     * Root of the parent beacon block
     */
    EthTypes.HexString,
  ]),
  /**
   * Payload status
   */
  result: Components.PayloadStatusNoInvalidBlockHash,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Invalid params"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * engine_newPayloadV4 RPC method
 *
 * Runs execution payload validation
 */
export const engine_newPayloadV4 = {
  method: "engine_newPayloadV4" as const,
  params: Schema.Tuple([
    /**
     * Execution payload
     */
    Components.ExecutionPayloadV3,
    /**
     * Expected blob versioned hashes
     */
    Schema.Array(EthTypes.HexString),
    /**
     * Root of the parent beacon block
     */
    EthTypes.HexString,
    /**
     * Execution requests
     */
    Schema.Array(EthTypes.HexString),
  ]),
  /**
   * Payload status
   */
  result: Components.PayloadStatusNoInvalidBlockHash,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Invalid params"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * engine_newPayloadV5 RPC method
 *
 * Runs execution payload validation
 */
export const engine_newPayloadV5 = {
  method: "engine_newPayloadV5" as const,
  params: Schema.Tuple([
    /**
     * Execution payload
     */
    Components.ExecutionPayloadV4,
    /**
     * Expected blob versioned hashes
     */
    Schema.Array(EthTypes.HexString),
    /**
     * Parent beacon block root
     */
    EthTypes.HexString,
    /**
     * Execution requests
     */
    Schema.Array(EthTypes.HexString),
  ]),
  /**
   * Payload status
   */
  result: Components.PayloadStatusNoInvalidBlockHash,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Invalid params"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38005),
      message: Schema.Literal("Unsupported fork"),
    }),
  ]),
};

/**
 * eth_accounts RPC method
 *
 * Returns a list of addresses owned by client.
 */
export const eth_accounts = {
  method: "eth_accounts" as const,
  params: Schema.Tuple([]),
  /**
   * Accounts
   */
  result: Schema.Array(EthTypes.HexString),
};

/**
 * eth_blobBaseFee RPC method
 *
 * Returns the base fee per blob gas in wei.
 */
export const eth_blobBaseFee = {
  method: "eth_blobBaseFee" as const,
  params: Schema.Tuple([]),
  /**
   * Blob gas base fee
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_blockNumber RPC method
 *
 * Returns the number of most recent block.
 */
export const eth_blockNumber = {
  method: "eth_blockNumber" as const,
  params: Schema.Tuple([]),
  /**
   * Block number
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_call RPC method
 *
 * Executes a new message call immediately without creating a transaction on the block chain.
 */
export const eth_call = {
  method: "eth_call" as const,
  params: Schema.Tuple([
    /**
     * Transaction
     */
    Components.GenericTransaction,
    /**
     * Block
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Return data
   */
  result: EthTypes.HexString,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(3),
      message: Schema.Literal("execution reverted"),
    }),
  ]),
};

/**
 * eth_chainId RPC method
 *
 * Returns the chain ID of the current network.
 */
export const eth_chainId = {
  method: "eth_chainId" as const,
  params: Schema.Tuple([]),
  /**
   * Chain ID
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_coinbase RPC method
 *
 * Returns the client coinbase address.
 */
export const eth_coinbase = {
  method: "eth_coinbase" as const,
  params: Schema.Tuple([]),
  /**
   * Coinbase address
   */
  result: EthTypes.HexString,
};

/**
 * eth_createAccessList RPC method
 *
 * Generates an access list for a transaction.
 */
export const eth_createAccessList = {
  method: "eth_createAccessList" as const,
  params: Schema.Tuple([
    /**
     * Transaction
     */
    Components.GenericTransaction,
    /**
     * Block
     */
    Components.BlockNumberOrTag,
  ]),
  /**
   * Gas used
   */
  result: Schema.Struct({
    /**
     * accessList
     *
     * accessList
     */
    accessList: Components.AccessList.pipe(Schema.optional),
    /**
     * error
     *
     * error
     */
    error: Schema.String.pipe(Schema.optional),
    /**
     * gasUsed
     *
     * Gas used
     */
    gasUsed: EthTypes.BigIntFromString.pipe(Schema.optional),
  }),
};

/**
 * eth_estimateGas RPC method
 *
 * Generates and returns an estimate of how much gas is necessary to allow the transaction to complete.
 */
export const eth_estimateGas = {
  method: "eth_estimateGas" as const,
  params: Schema.Tuple([
    /**
     * Transaction
     */
    Components.GenericTransaction,
    /**
     * Block
     */
    Components.BlockNumberOrTag,
  ]),
  /**
   * Gas used
   */
  result: EthTypes.BigIntFromString,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(3),
      message: Schema.Literal("execution reverted"),
    }),
  ]),
};

/**
 * eth_feeHistory RPC method
 *
 * Transaction fee history
 *
 * Returns transaction base fee per gas and effective priority fee per gas for the requested/supported block range.
 */
export const eth_feeHistory = {
  method: "eth_feeHistory" as const,
  params: Schema.Tuple([
    /**
     * blockCount
     *
     * Requested range of blocks. Clients will return less than the requested range if not all blocks are available.
     */
    EthTypes.BigIntFromString,
    /**
     * newestBlock
     *
     * Highest block of the requested range.
     */
    Components.BlockNumberOrTag,
    /**
     * rewardPercentiles
     *
     * A monotonically increasing list of percentile values. For each block in the requested range, the transactions will be sorted in ascending order by effective tip per gas and the corresponding effective tip for the percentile will be determined, accounting for gas consumed.
     */
    Schema.Array(Schema.Number),
  ]),
  /**
   * Fee history result
   *
   * Fee history for the returned block range. This can be a subsection of the requested range if not all blocks are available.
   */
  result: Schema.Struct({
    /**
     * baseFeePerBlobGas
     *
     * baseFeePerBlobGasArray
     * An array of block base fees per blob gas. This includes the next block after the newest of the returned range, because this value can be derived from the newest block. Zeroes are returned for pre-EIP-4844 blocks.
     */
    baseFeePerBlobGas: Schema.Array(EthTypes.BigIntFromString).pipe(
      Schema.optional,
    ),
    /**
     * baseFeePerGas
     *
     * baseFeePerGasArray
     * An array of block base fees per gas. This includes the next block after the newest of the returned range, because this value can be derived from the newest block. Zeroes are returned for pre-EIP-1559 blocks.
     */
    baseFeePerGas: Schema.Array(EthTypes.BigIntFromString),
    /**
     * blobGasUsedRatio
     *
     * blobGasUsedRatio
     * An array of block blob gas used ratios. These are calculated as the ratio of blobGasUsed and the max blob gas per block.
     */
    blobGasUsedRatio: Schema.Array(Components.ratio).pipe(Schema.optional),
    /**
     * gasUsedRatio
     *
     * gasUsedRatio
     * An array of block gas used ratios. These are calculated as the ratio of gasUsed and gasLimit.
     */
    gasUsedRatio: Schema.Array(Components.ratio),
    /**
     * oldestBlock
     *
     * oldestBlock
     * Lowest number block of returned range.
     */
    oldestBlock: EthTypes.BigIntFromString,
    /**
     * reward
     *
     * rewardArray
     * A two-dimensional array of effective priority fees per gas at the requested block percentiles.
     */
    reward: Schema.Array(Schema.Array(EthTypes.BigIntFromString)).pipe(
      Schema.optional,
    ),
  }),
};

/**
 * eth_gasPrice RPC method
 *
 * Returns the current price per gas in wei.
 */
export const eth_gasPrice = {
  method: "eth_gasPrice" as const,
  params: Schema.Tuple([]),
  /**
   * Gas price
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_getBalance RPC method
 *
 * Returns the balance of the account of given address.
 */
export const eth_getBalance = {
  method: "eth_getBalance" as const,
  params: Schema.Tuple([
    /**
     * Address
     */
    EthTypes.HexString,
    /**
     * Block
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Balance
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_getBlockAccessList RPC method
 *
 * Returns the block access list for a given block.
 */
export const eth_getBlockAccessList = {
  method: "eth_getBlockAccessList" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Block access list
   */
  result: Schema.Union([Components.notFound, Components.BlockAccessList]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32001),
      message: Schema.Literal("Resource not found"),
    }),
  ]),
};

/**
 * eth_getBlockByHash RPC method
 *
 * Returns information about a block by hash.
 */
export const eth_getBlockByHash = {
  method: "eth_getBlockByHash" as const,
  params: Schema.Tuple([
    /**
     * Block hash
     */
    EthTypes.HexString,
    /**
     * Hydrated transactions
     */
    Schema.Boolean,
  ]),
  /**
   * Block information
   */
  result: Schema.Union([Components.notFound, Components.Block]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getBlockByNumber RPC method
 *
 * Returns information about a block by number.
 */
export const eth_getBlockByNumber = {
  method: "eth_getBlockByNumber" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTag,
    /**
     * Hydrated transactions
     */
    Schema.Boolean,
  ]),
  /**
   * Block information
   */
  result: Schema.Union([Components.notFound, Components.Block]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getBlockReceipts RPC method
 *
 * Returns the receipts of a block by number or hash.
 */
export const eth_getBlockReceipts = {
  method: "eth_getBlockReceipts" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Receipts information
   */
  result: Schema.Union([
    Components.notFound,
    Schema.Array(Components.ReceiptInfo),
  ]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getBlockTransactionCountByHash RPC method
 *
 * Returns the number of transactions in a block from a block matching the given block hash.
 */
export const eth_getBlockTransactionCountByHash = {
  method: "eth_getBlockTransactionCountByHash" as const,
  params: Schema.Tuple([
    /**
     * Block hash
     */
    EthTypes.HexString,
  ]),
  /**
   * Transaction count
   */
  result: Schema.Union([Components.notFound, EthTypes.BigIntFromString]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getBlockTransactionCountByNumber RPC method
 *
 * Returns the number of transactions in a block matching the given block number.
 */
export const eth_getBlockTransactionCountByNumber = {
  method: "eth_getBlockTransactionCountByNumber" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTag,
  ]),
  /**
   * Transaction count
   */
  result: Schema.Union([Components.notFound, EthTypes.BigIntFromString]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getCode RPC method
 *
 * Returns code at a given address.
 */
export const eth_getCode = {
  method: "eth_getCode" as const,
  params: Schema.Tuple([
    /**
     * Address
     */
    EthTypes.HexString,
    /**
     * Block
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Bytecode
   */
  result: EthTypes.HexString,
};

/**
 * eth_getFilterChanges RPC method
 *
 * Polling method for the filter with the given ID (created using `eth_newFilter`). Returns an array of logs, block hashes, or transaction hashes since last poll, depending on the installed filter.
 */
export const eth_getFilterChanges = {
  method: "eth_getFilterChanges" as const,
  params: Schema.Tuple([
    /**
     * Filter identifier
     */
    EthTypes.BigIntFromString,
  ]),
  /**
   * Log objects
   */
  result: Components.FilterResults,
};

/**
 * eth_getFilterLogs RPC method
 *
 * Returns an array of all logs matching the filter with the given ID (created using `eth_newFilter`).
 */
export const eth_getFilterLogs = {
  method: "eth_getFilterLogs" as const,
  params: Schema.Tuple([
    /**
     * Filter identifier
     */
    EthTypes.BigIntFromString,
  ]),
  /**
   * Log objects
   */
  result: Components.FilterResults,
};

/**
 * eth_getLogs RPC method
 *
 * Returns an array of all logs matching the specified filter.
 */
export const eth_getLogs = {
  method: "eth_getLogs" as const,
  params: Schema.Tuple([
    /**
     * Filter
     */
    Components.Filter,
  ]),
  /**
   * Log objects
   */
  result: Components.FilterResults,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getProof RPC method
 *
 * Returns the merkle proof for a given account and optionally some storage keys.
 */
export const eth_getProof = {
  method: "eth_getProof" as const,
  params: Schema.Tuple([
    /**
     * Address
     */
    EthTypes.HexString,
    /**
     * StorageKeys
     */
    Schema.Array(EthTypes.HexString),
    /**
     * Block
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Account
   */
  result: Components.AccountProof,
};

/**
 * eth_getStorageAt RPC method
 *
 * Returns the value from a storage position at a given address.
 */
export const eth_getStorageAt = {
  method: "eth_getStorageAt" as const,
  params: Schema.Tuple([
    /**
     * Address
     */
    EthTypes.HexString,
    /**
     * Storage slot
     */
    EthTypes.HexString,
    /**
     * Block
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Value
   */
  result: EthTypes.HexString,
};

/**
 * eth_getStorageValues RPC method
 *
 * Returns the values of multiple storage slots for multiple accounts in a single request.
 */
export const eth_getStorageValues = {
  method: "eth_getStorageValues" as const,
  params: Schema.Tuple([
    /**
     * Requests
     */
    Schema.Struct({}),
    /**
     * Block
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Values
   */
  result: Schema.Struct({}),
};

/**
 * eth_getTransactionByBlockHashAndIndex RPC method
 *
 * Returns information about a transaction by block hash and transaction index position.
 */
export const eth_getTransactionByBlockHashAndIndex = {
  method: "eth_getTransactionByBlockHashAndIndex" as const,
  params: Schema.Tuple([
    /**
     * Block hash
     */
    EthTypes.HexString,
    /**
     * Transaction index
     */
    EthTypes.BigIntFromString,
  ]),
  /**
   * Transaction information
   */
  result: Schema.Union([Components.notFound, Components.TransactionInfo]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getTransactionByBlockNumberAndIndex RPC method
 *
 * Returns information about a transaction by block number and transaction index position.
 */
export const eth_getTransactionByBlockNumberAndIndex = {
  method: "eth_getTransactionByBlockNumberAndIndex" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTag,
    /**
     * Transaction index
     */
    EthTypes.BigIntFromString,
  ]),
  /**
   * Transaction information
   */
  result: Schema.Union([Components.notFound, Components.TransactionInfo]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getTransactionByHash RPC method
 *
 * Returns the information about a transaction requested by transaction hash.
 */
export const eth_getTransactionByHash = {
  method: "eth_getTransactionByHash" as const,
  params: Schema.Tuple([
    /**
     * Transaction hash
     */
    EthTypes.HexString,
  ]),
  /**
   * Transaction information
   */
  result: Schema.Union([Components.notFound, Components.TransactionInfo]),
};

/**
 * eth_getTransactionCount RPC method
 *
 * Returns the nonce of an account in the state. NOTE: The name eth_getTransactionCount reflects the historical fact that an account's nonce and sent transaction count were the same. After the Pectra fork, with the inclusion of EIP-7702, this is no longer true.
 */
export const eth_getTransactionCount = {
  method: "eth_getTransactionCount" as const,
  params: Schema.Tuple([
    /**
     * Address
     */
    EthTypes.HexString,
    /**
     * Block
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Account nonce
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_getTransactionReceipt RPC method
 *
 * Returns the receipt of a transaction by transaction hash.
 */
export const eth_getTransactionReceipt = {
  method: "eth_getTransactionReceipt" as const,
  params: Schema.Tuple([
    /**
     * Transaction hash
     */
    EthTypes.HexString,
  ]),
  /**
   * Receipt information
   */
  result: Schema.Union([Components.notFound, Components.ReceiptInfo]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getUncleCountByBlockHash RPC method
 *
 * Returns the number of uncles in a block from a block matching the given block hash.
 */
export const eth_getUncleCountByBlockHash = {
  method: "eth_getUncleCountByBlockHash" as const,
  params: Schema.Tuple([
    /**
     * Block hash
     */
    EthTypes.HexString,
  ]),
  /**
   * Uncle count
   */
  result: Schema.Union([Components.notFound, EthTypes.BigIntFromString]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_getUncleCountByBlockNumber RPC method
 *
 * Returns the number of transactions in a block matching the given block number.
 */
export const eth_getUncleCountByBlockNumber = {
  method: "eth_getUncleCountByBlockNumber" as const,
  params: Schema.Tuple([
    /**
     * Block
     */
    Components.BlockNumberOrTag,
  ]),
  /**
   * Uncle count
   */
  result: Schema.Union([Components.notFound, EthTypes.BigIntFromString]),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(4444),
      message: Schema.Literal("Pruned history unavailable"),
    }),
  ]),
};

/**
 * eth_maxPriorityFeePerGas RPC method
 *
 * Returns the current maxPriorityFeePerGas per gas in wei.
 */
export const eth_maxPriorityFeePerGas = {
  method: "eth_maxPriorityFeePerGas" as const,
  params: Schema.Tuple([]),
  /**
   * Max priority fee per gas
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_newBlockFilter RPC method
 *
 * Creates a filter in the node, allowing for later polling. Registers client interest in new blocks, and returns an identifier.
 */
export const eth_newBlockFilter = {
  method: "eth_newBlockFilter" as const,
  params: Schema.Tuple([]),
  /**
   * Filter identifier
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_newFilter RPC method
 *
 * Install a log filter in the server, allowing for later polling. Registers client interest in logs matching the filter, and returns an identifier.
 */
export const eth_newFilter = {
  method: "eth_newFilter" as const,
  params: Schema.Tuple([
    /**
     * Filter
     */
    Components.Filter,
  ]),
  /**
   * Filter identifier
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_newPendingTransactionFilter RPC method
 *
 * Creates a filter in the node, allowing for later polling. Registers client interest in new transactions, and returns an identifier.
 */
export const eth_newPendingTransactionFilter = {
  method: "eth_newPendingTransactionFilter" as const,
  params: Schema.Tuple([]),
  /**
   * Filter identifier
   */
  result: EthTypes.BigIntFromString,
};

/**
 * eth_sendRawTransaction RPC method
 *
 * Submits a raw transaction. You can create and sign a transaction externally using a library such as [web3.js](https://web3js.readthedocs.io/) or [ethers.js](https://docs.ethers.org/). For [EIP-4844](https://eips.ethereum.org/EIPS/eip-4844) transactions, the raw form must be the network form. This means it includes the blobs, KZG commitments, and KZG proofs. For [EIP-7594](https://eips.ethereum.org/EIPS/eip-7594) transactions, the raw format must be the network form. This means it includes the blobs, KZG commitments, and cell proofs. The logic for handling the new transaction during fork boundaries are 1. When receiving an encoded transaction with cell proofs before the PeerDAS fork activates, we reject it. Only blob proofs are accepted into the pool. 2. At the time of fork activation, the implementer could (not mandatory) - Drop all old-format transactions - Convert old proofs to new format (computationally expensive) - Convert only when including in a locally produced block 3. After the fork has activated, only txs with cell proofs are accepted via p2p relay. 4. On RPC (eth_sendRawTransaction), txs with blob proofs may still be accepted and will be auto-converted by the node. At implementer discretion, this facility can be deprecated later when users have switched to new client libraries that can create cell proofs.
 */
export const eth_sendRawTransaction = {
  method: "eth_sendRawTransaction" as const,
  params: Schema.Tuple([
    /**
     * Transaction
     */
    EthTypes.HexString,
  ]),
  /**
   * Transaction hash
   */
  result: EthTypes.HexString,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-32700),
      message: Schema.Literal("Parse error"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32600),
      message: Schema.Literal("Invalid request"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32601),
      message: Schema.Literal("Method not found"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Invalid params"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32603),
      message: Schema.Literal("Internal error"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32000),
      message: Schema.Literal("Invalid input"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32001),
      message: Schema.Literal("Resource not found"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32002),
      message: Schema.Literal("Resource unavailable"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32003),
      message: Schema.Literal("Transaction rejected"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32004),
      message: Schema.Literal("Method not supported"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32005),
      message: Schema.Literal("Limit exceeded"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32006),
      message: Schema.Literal("JSON-RPC version not supported"),
    }),
    Schema.Struct({
      code: Schema.Literal(800),
      message: Schema.Literal(
        "Intrinsic gas too low / Intrinsic gas exceeds gas limit",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(801),
      message: Schema.Literal("Transaction ran out of gas"),
    }),
    Schema.Struct({
      code: Schema.Literal(802),
      message: Schema.Literal(
        "Gas price too low / Gas price below configured minimum",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(803),
      message: Schema.Literal("Tx gas limit exceeds max block gas limit"),
    }),
    Schema.Struct({
      code: Schema.Literal(804),
      message: Schema.Literal(
        "Max priority fee per gas higher than max fee per gas",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(805),
      message: Schema.Literal("Gas uint64 overflow"),
    }),
    Schema.Struct({
      code: Schema.Literal(806),
      message: Schema.Literal("Max fee per gas less than block base fee"),
    }),
    Schema.Struct({
      code: Schema.Literal(807),
      message: Schema.Literal("Max priority fee per gas higher than 2^256-1"),
    }),
    Schema.Struct({
      code: Schema.Literal(808),
      message: Schema.Literal("Max fee per gas higher than 2^256-1"),
    }),
    Schema.Struct({
      code: Schema.Literal(809),
      message: Schema.Literal("Insufficient funds for gas * price + value"),
    }),
    Schema.Struct({
      code: Schema.Literal(1),
      message: Schema.Literal("Nonce too low"),
    }),
    Schema.Struct({
      code: Schema.Literal(2),
      message: Schema.Literal("Nonce too high"),
    }),
    Schema.Struct({
      code: Schema.Literal(3),
      message: Schema.Literal("Execution reverted"),
    }),
    Schema.Struct({
      code: Schema.Literal(4),
      message: Schema.Literal("Invalid opcode"),
    }),
    Schema.Struct({
      code: Schema.Literal(1000),
      message: Schema.Literal("Already known transaction"),
    }),
    Schema.Struct({
      code: Schema.Literal(1001),
      message: Schema.Literal("Invalid sender"),
    }),
  ]),
};

/**
 * eth_sendTransaction RPC method
 *
 * Signs and submits a transaction.
 */
export const eth_sendTransaction = {
  method: "eth_sendTransaction" as const,
  params: Schema.Tuple([
    /**
     * Transaction
     */
    Components.GenericTransaction,
  ]),
  /**
   * Transaction hash
   */
  result: EthTypes.HexString,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-32700),
      message: Schema.Literal("Parse error"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32600),
      message: Schema.Literal("Invalid request"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32601),
      message: Schema.Literal("Method not found"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Invalid params"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32603),
      message: Schema.Literal("Internal error"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32000),
      message: Schema.Literal("Invalid input"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32001),
      message: Schema.Literal("Resource not found"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32002),
      message: Schema.Literal("Resource unavailable"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32003),
      message: Schema.Literal("Transaction rejected"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32004),
      message: Schema.Literal("Method not supported"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32005),
      message: Schema.Literal("Limit exceeded"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32006),
      message: Schema.Literal("JSON-RPC version not supported"),
    }),
    Schema.Struct({
      code: Schema.Literal(800),
      message: Schema.Literal(
        "Intrinsic gas too low / Intrinsic gas exceeds gas limit",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(801),
      message: Schema.Literal("Transaction ran out of gas"),
    }),
    Schema.Struct({
      code: Schema.Literal(802),
      message: Schema.Literal(
        "Gas price too low / Gas price below configured minimum",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(803),
      message: Schema.Literal("Tx gas limit exceeds max block gas limit"),
    }),
    Schema.Struct({
      code: Schema.Literal(804),
      message: Schema.Literal(
        "Max priority fee per gas higher than max fee per gas",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(805),
      message: Schema.Literal("Gas uint64 overflow"),
    }),
    Schema.Struct({
      code: Schema.Literal(806),
      message: Schema.Literal("Max fee per gas less than block base fee"),
    }),
    Schema.Struct({
      code: Schema.Literal(807),
      message: Schema.Literal("Max priority fee per gas higher than 2^256-1"),
    }),
    Schema.Struct({
      code: Schema.Literal(808),
      message: Schema.Literal("Max fee per gas higher than 2^256-1"),
    }),
    Schema.Struct({
      code: Schema.Literal(809),
      message: Schema.Literal("Insufficient funds for gas * price + value"),
    }),
    Schema.Struct({
      code: Schema.Literal(1),
      message: Schema.Literal("Nonce too low"),
    }),
    Schema.Struct({
      code: Schema.Literal(2),
      message: Schema.Literal("Nonce too high"),
    }),
    Schema.Struct({
      code: Schema.Literal(3),
      message: Schema.Literal("Execution reverted"),
    }),
    Schema.Struct({
      code: Schema.Literal(4),
      message: Schema.Literal("Invalid opcode"),
    }),
    Schema.Struct({
      code: Schema.Literal(1000),
      message: Schema.Literal("Already known transaction"),
    }),
    Schema.Struct({
      code: Schema.Literal(1001),
      message: Schema.Literal("Invalid sender"),
    }),
  ]),
};

/**
 * eth_sign RPC method
 *
 * Returns an EIP-191 signature over the provided data.
 */
export const eth_sign = {
  method: "eth_sign" as const,
  params: Schema.Tuple([
    /**
     * Address
     */
    EthTypes.HexString,
    /**
     * Message
     */
    EthTypes.HexString,
  ]),
  /**
   * Signature
   */
  result: EthTypes.HexString,
};

/**
 * eth_signTransaction RPC method
 *
 * Returns an RLP encoded transaction signed by the specified account.
 */
export const eth_signTransaction = {
  method: "eth_signTransaction" as const,
  params: Schema.Tuple([
    /**
     * Transaction
     */
    Components.GenericTransaction,
  ]),
  /**
   * Encoded transaction
   */
  result: EthTypes.HexString,
};

/**
 * eth_simulateV1 RPC method
 *
 * Executes a sequence of message calls building on each other's state without creating transactions on the block chain, optionally overriding block and state data
 */
export const eth_simulateV1 = {
  method: "eth_simulateV1" as const,
  params: Schema.Tuple([
    /**
     * Payload
     */
    Components.EthSimulatePayload,
    /**
     * Block tag
     *
     * default: 'latest'
     */
    Components.BlockNumberOrTagOrHash,
  ]),
  /**
   * Result of calls
   */
  result: Components.EthSimulateResult,
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-32000),
      message: Schema.Literal("Invalid request"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Missing or invalid parameters"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32005),
      message: Schema.Literal("Transactions maxFeePerGas is too low"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32015),
      message: Schema.Literal("Execution error"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32016),
      message: Schema.Literal("Timeout"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32603),
      message: Schema.Literal(
        "The Ethereum node encountered an internal error",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(-38010),
      message: Schema.Literal("Transactions nonce is too low"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38011),
      message: Schema.Literal("Transactions nonce is too high"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38012),
      message: Schema.Literal("Transactions baseFeePerGas is too low"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38013),
      message: Schema.Literal(
        "Not enough gas provided to pay for intrinsic gas for a transaction",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(-38014),
      message: Schema.Literal(
        "Insufficient funds to pay for gas fees and value for a transaction",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(-38015),
      message: Schema.Literal(
        "Block gas limit exceeded by the block's transactions",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(-38020),
      message: Schema.Literal("Block number in sequence did not increase"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38021),
      message: Schema.Literal(
        "Block timestamp in sequence did not increase or stay the same",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(-38022),
      message: Schema.Literal(
        "MovePrecompileToAddress referenced itself in replacement",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(-38023),
      message: Schema.Literal(
        "Multiple MovePrecompileToAddress referencing the same address to replace",
      ),
    }),
    Schema.Struct({
      code: Schema.Literal(-38024),
      message: Schema.Literal("Sender is not an EOA"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38025),
      message: Schema.Literal("Max init code size exceeded"),
    }),
    Schema.Struct({
      code: Schema.Literal(-38026),
      message: Schema.Literal("Client adjustable limit exceeded"),
    }),
  ]),
};

/**
 * eth_syncing RPC method
 *
 * Returns an object with data about the sync status or false.
 */
export const eth_syncing = {
  method: "eth_syncing" as const,
  params: Schema.Tuple([]),
  /**
   * Syncing status
   */
  result: Components.SyncingStatus,
};

/**
 * eth_uninstallFilter RPC method
 *
 * Uninstalls a filter with given id.
 */
export const eth_uninstallFilter = {
  method: "eth_uninstallFilter" as const,
  params: Schema.Tuple([
    /**
     * Filter identifier
     */
    EthTypes.BigIntFromString,
  ]),
  /**
   * Success
   */
  result: Schema.Boolean,
};

/**
 * net_version RPC method
 *
 * Returns the current network ID. This is usually equivalent to the chainID, but may differ from it for some legacy networks or special testnets.
 */
export const net_version = {
  method: "net_version" as const,
  params: Schema.Tuple([]),
  /**
   * Network ID
   */
  result: Schema.BigInt,
};

/**
 * testing_buildBlockV1 RPC method
 *
 * Builds a block on top of a given parentHash using the provided parameters. This is a testing-only method for generating test fixtures.
 *
 * This method is a debugging and testing tool that simplifies the block production process into a single call.

**Specification:**
- The client MUST build a new execution payload using the block specified by `parentBlockHash` as its parent.
- The client MUST use the provided `payloadAttributes` to define the context of the new block.
- If the `transactions` parameter is an empty array `[]`, the client MUST build an empty block (no transactions).
- If the `transactions` parameter is JSON `null`, the client MAY build a block from its local transaction pool (mempool).
- If the `transactions` parameter is a non-empty array, the client MUST include all transactions from the array on the block's transaction list, in the order they were provided, and MUST NOT include any transactions from its local transaction pool.
- If `extraData` is provided, the client MUST set the `extraData` field of the resulting payload to this value.
- This method MUST NOT modify the client's canonical chain or head block. It is a read-only method for payload generation.

**Security Considerations:**
- This method is intended for testing environments ONLY and MUST NOT be exposed on public-facing RPC APIs.
- It is strongly recommended that this method be disabled by default.
 */
export const testing_buildBlockV1 = {
  method: "testing_buildBlockV1" as const,
  params: Schema.Tuple([
    /**
     * Parent block hash
     */
    EthTypes.HexString,
    /**
     * Payload attributes
     */
    Schema.Struct({
      /**
       * parentBeaconBlockRoot
       */
      parentBeaconBlockRoot: EthTypes.HexString.pipe(Schema.optional),
      /**
       * prevRandao
       */
      prevRandao: EthTypes.HexString.pipe(Schema.optional),
      /**
       * suggestedFeeRecipient
       */
      suggestedFeeRecipient: EthTypes.HexString.pipe(Schema.optional),
      /**
       * timestamp
       */
      timestamp: EthTypes.BigIntFromString.pipe(Schema.optional),
      /**
       * withdrawals
       *
       * Withdrawals
       */
      withdrawals: Schema.Array(Components.Withdrawal).pipe(Schema.optional),
    }),
    /**
 * Transactions
 *
 * An array of raw, signed transactions (hex-encoded) to include in the generated block, or null.
- If an empty array `[]`: The client MUST build an empty block (no transactions).
- If `null`: The client MAY build a block from its local transaction pool (mempool).
- If a non-empty array: The client MUST include ALL transactions from this array in the resulting block, in the order provided, and MUST NOT include any transactions from its local mempool.
 */
    Schema.Union([Schema.Array(EthTypes.HexString), Schema.Null]),
    /**
     * Extra data
     *
     * Data to be set as the extraData field of the built block. If provided, the client MUST use this exact value.
     */
    Schema.Union([EthTypes.HexString, Schema.Null]),
  ]),
  /**
   * Response object
   */
  result: Schema.Struct({
    /**
     * blobsBundle
     *
     * Blobs bundle
     */
    blobsBundle: Components.BlobsBundleV2,
    /**
     * blockValue
     *
     * Expected block value
     */
    blockValue: EthTypes.BigIntFromString,
    /**
     * executionPayload
     *
     * Execution payload
     */
    executionPayload: Components.ExecutionPayloadV3,
    /**
     * executionRequests
     *
     * Execution requests
     */
    executionRequests: Schema.Array(EthTypes.HexString).pipe(Schema.optional),
    /**
     * shouldOverrideBuilder
     *
     * Should override builder flag
     */
    shouldOverrideBuilder: Schema.Boolean,
  }),
  errors: Schema.Union([
    Schema.Struct({
      code: Schema.Literal(-32602),
      message: Schema.Literal("Invalid parameters"),
    }),
    Schema.Struct({
      code: Schema.Literal(-32603),
      message: Schema.Literal("Internal error"),
    }),
  ]),
};

/**
 * txpool_content RPC method
 *
 * Returns the contents of the transaction pool.
 *
 * Returns an object containing all pending and queued transactions in the pool,
grouped by origin address and sorted by nonce. Pending transactions are ready
for inclusion in the next block(s). Queued transactions have nonce gaps and
are scheduled for future execution.
 */
export const txpool_content = {
  method: "txpool_content" as const,
  params: Schema.Tuple([]),
  /**
   * Transaction pool content
   */
  result: Components.TxpoolContent,
};

/**
 * txpool_contentFrom RPC method
 *
 * Returns the transactions in the pool from a specific address.
 *
 * Returns an object containing pending and queued transactions from the specified
address, grouped by nonce. This is a filtered version of txpool_content.
 */
export const txpool_contentFrom = {
  method: "txpool_contentFrom" as const,
  params: Schema.Tuple([
    /**
     * address
     */
    EthTypes.HexString,
  ]),
  /**
   * Transaction pool content from address
   */
  result: Components.TxpoolContentFromResult,
};

/**
 * txpool_status RPC method
 *
 * Returns the number of pending and queued transactions in the pool.
 *
 * Returns an object containing the count of transactions currently pending for
inclusion in the next block(s), as well as ones that are scheduled for future
execution (transactions with nonce gaps).
 */
export const txpool_status = {
  method: "txpool_status" as const,
  params: Schema.Tuple([]),
  /**
   * Transaction pool status
   */
  result: Components.TxpoolStatus,
};

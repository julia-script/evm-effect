import { Address, Bytes, Bytes20, Uint } from "@evm-effect/ethereum-types";
import { bufferFromHex } from "@evm-effect/shared/bytes";
// import { HashMapFromRecord } from "@evm-effect/shared/hashmap";
import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";
import { isBigInt, isString, isUint8Array } from "effect/Predicate";

const FixtureFormat = Schema.Union([
  Schema.Literal("blockchain_test_engine_x"),
  Schema.Literal("blockchain_test"),
  Schema.Literal("blockchain_test_engine"),
  Schema.Literal("transaction_test"),
  Schema.Literal("state_test"),
]);

const ForkFix = Schema.Union([
  Schema.Literal("Osaka"),
  Schema.Literal("Frontier"),
  Schema.Literal("Cancun"),
  Schema.Literal("Prague"),
  Schema.Literal("ConstantinopleFix"),
  Schema.Literal("ShanghaiToCancunAtTime15k"),
  Schema.Literal("ParisToShanghaiAtTime15k"),
  Schema.Literal("Paris"),
  Schema.Literal("Homestead"),
  Schema.Literal("Berlin"),
  Schema.Literal("Shanghai"),
  Schema.Literal("Istanbul"),
  Schema.Literal("Byzantium"),
  Schema.Literal("CancunToPragueAtTime15k"),
  Schema.Literal("London"),
]);

export const IndexEntry = Schema.Struct({
  id: Schema.String,
  fixture_hash: Schema.String,
  fork: ForkFix,
  format: FixtureFormat,
  pre_hash: Schema.NullOr(Schema.String),
  json_path: Schema.String,
});
export const Index = Schema.Struct({
  root_hash: Schema.String,
  created_at: Schema.String,
  test_count: Schema.Number,
  forks: Schema.Array(ForkFix),
  fixture_formats: Schema.Array(FixtureFormat),
  test_cases: Schema.Array(IndexEntry),
});

const BigIntFromHex = Schema.String.pipe(
  Schema.decodeTo(Schema.BigInt, {
    decode: SchemaGetter.transformOrFail((fromA) => {
      try {
        return Effect.succeed(BigInt(fromA));
      } catch (_error) {
        return Effect.fail(new SchemaIssue.InvalidValue(Option.some(fromA)));
      }
    }),
    encode: SchemaGetter.transformOrFail((toI) =>
      Effect.succeed(`0x${toI.toString(16)}`),
    ),
  }),
);

const UintFromHex = BigIntFromHex.pipe(
  Schema.decodeTo(Uint, {
    decode: SchemaGetter.transformOrFail((fromA) => {
      if (!isBigInt(fromA)) {
        return Effect.fail(new SchemaIssue.InvalidValue(Option.some(fromA)));
      }
      return Effect.succeed(new Uint({ value: fromA }));
    }),
    encode: SchemaGetter.transformOrFail((toI) => Effect.succeed(toI.value)),
  }),
);

const Uint8ArrayFromHex = Schema.String.pipe(
  Schema.decodeTo(Schema.Uint8Array, {
    decode: SchemaGetter.transformOrFail((fromA) => {
      if (!isString(fromA)) {
        return Effect.fail(new SchemaIssue.InvalidValue(Option.some(fromA)));
      }
      if (fromA.startsWith("0x")) {
        fromA = fromA.slice(2);
      }
      return Effect.succeed(Uint8Array.fromHex(fromA));
    }),
    encode: SchemaGetter.transformOrFail((toI) =>
      Effect.succeed(`0x${toI.toHex()}`),
    ),
  }),
);

const BytesFromHex = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Bytes, {
    decode: SchemaGetter.transformOrFail((fromA) => {
      if (!isUint8Array(fromA)) {
        return Effect.fail(new SchemaIssue.InvalidValue(Option.some(fromA)));
      }
      return Effect.succeed(new Bytes({ value: fromA }));
    }),
    encode: SchemaGetter.transformOrFail((toI) => Effect.succeed(toI.value)),
  }),
);

const AddressFromHex = Uint8ArrayFromHex.pipe(
  Schema.decodeTo(Address, {
    decode: SchemaGetter.transformOrFail((fromA) => {
      if (!isUint8Array(fromA)) {
        return Effect.fail(new SchemaIssue.InvalidValue(Option.some(fromA)));
      }
      return Effect.succeed(
        new Address({ value: new Bytes20({ value: fromA }) }),
      );
    }),
    encode: SchemaGetter.transformOrFail((toI) =>
      Effect.succeed(new Uint8Array(toI.value.value)),
    ),
  }),
);

const AccessListFix = Schema.Struct({
  address: AddressFromHex,
  storageKeys: Schema.Array(BytesFromHex),
});

export const AuthorizationFix = Schema.Struct({
  chainId: UintFromHex,
  address: AddressFromHex,
  nonce: UintFromHex,
  v: UintFromHex.pipe(Schema.optional),
  yParity: UintFromHex.pipe(Schema.optional),
  r: UintFromHex,
  s: UintFromHex,
  signer: AddressFromHex.pipe(Schema.optional),
});

const TransactionFix = Schema.Struct({
  nonce: UintFromHex,
  gasPrice: Schema.optional(UintFromHex),
  maxPriorityFeePerGas: Schema.optional(UintFromHex),
  maxFeePerGas: Schema.optional(UintFromHex),
  gasLimit: Schema.Array(UintFromHex),
  to: Schema.String.pipe(
    Schema.decodeTo(Address.pipe(Schema.optional), {
      decode: SchemaGetter.transform((value) =>
        value
          ? new Address({ value: new Bytes20({ value: bufferFromHex(value) }) })
          : undefined,
      ),
      encode: SchemaGetter.transform((value) =>
        value ? `0x${value.value.value.toHex()}` : "",
      ),
    }),
    Schema.optional,
  ),

  value: Schema.Array(UintFromHex),
  data: Schema.Array(BytesFromHex),
  accessLists: Schema.optional(Schema.Array(Schema.Array(AccessListFix))),
  authorizationList: Schema.Array(AuthorizationFix).pipe(Schema.optional),
  initcodes: Schema.Array(BytesFromHex).pipe(Schema.optional),
  maxFeePerBlobGas: Schema.optional(UintFromHex),
  blobVersionedHashes: Schema.Array(BytesFromHex).pipe(Schema.optional),
  sender: Schema.optional(AddressFromHex),
  secretKey: Schema.optional(BytesFromHex),
});

const AccountStateFix = Schema.Struct({
  nonce: UintFromHex,
  balance: UintFromHex,
  code: BytesFromHex,
  storage: Schema.Record(Schema.String, BytesFromHex),
});
const AllocFix = Schema.Record(Schema.String, AccountStateFix);
const PostByForkFix = Schema.Struct({
  hash: BytesFromHex,
  logs: BytesFromHex,
  txbytes: BytesFromHex,
  indexes: Schema.Struct({
    data: Schema.Number,
    gas: Schema.Number,
    value: Schema.Number,
  }),
  state: AllocFix,
  expectException: Schema.optional(Schema.String),
});
/**
 * FixtureHeader - Block header from fixtures
 * Contains all header fields as defined in blockchain_test.md spec
 * Fork-specific fields are marked optional
 */
const FixtureHeader = Schema.Struct({
  parentHash: BytesFromHex,
  uncleHash: BytesFromHex,
  coinbase: AddressFromHex,
  stateRoot: BytesFromHex,
  transactionsTrie: BytesFromHex,
  receiptTrie: BytesFromHex,
  bloom: BytesFromHex,
  difficulty: UintFromHex,
  number: UintFromHex,
  gasLimit: UintFromHex,
  gasUsed: UintFromHex,
  timestamp: UintFromHex,
  extraData: BytesFromHex,
  mixHash: BytesFromHex,
  nonce: BytesFromHex,
  hash: BytesFromHex,
  baseFeePerGas: UintFromHex.pipe(Schema.optional), // London+
  withdrawalsRoot: BytesFromHex.pipe(Schema.optional), // Shanghai+
  blobGasUsed: UintFromHex.pipe(Schema.optional), // Cancun+
  excessBlobGas: UintFromHex.pipe(Schema.optional), // Cancun+
  parentBeaconBlockRoot: BytesFromHex.pipe(Schema.optional), // Cancun+
  requestsHash: BytesFromHex.pipe(Schema.optional), // Prague+
});

/**
 * FixtureTransaction - Decoded transaction from block
 * Per blockchain_test.md FixtureTransaction section
 */
const FixtureTransaction = Schema.Struct({
  type: UintFromHex.pipe(Schema.optional),
  chainId: UintFromHex.pipe(Schema.optional),
  nonce: UintFromHex,
  gasPrice: UintFromHex.pipe(Schema.optional),
  maxPriorityFeePerGas: UintFromHex.pipe(Schema.optional),
  maxFeePerGas: UintFromHex.pipe(Schema.optional),
  gasLimit: UintFromHex,
  to: Schema.NullOr(AddressFromHex),
  value: UintFromHex,
  data: BytesFromHex,
  accessList: Schema.Array(AccessListFix).pipe(Schema.optional),
  maxFeePerBlobGas: UintFromHex.pipe(Schema.optional),
  blobVersionedHashes: Schema.Array(BytesFromHex).pipe(Schema.optional),
  v: UintFromHex,
  r: UintFromHex,
  s: UintFromHex,
  sender: AddressFromHex,
  secretKey: BytesFromHex.pipe(Schema.optional),
});

/**
 * FixtureWithdrawal - Withdrawal included in block
 * Per blockchain_test.md FixtureWithdrawal section
 */
const FixtureWithdrawal = Schema.Struct({
  index: UintFromHex,
  validatorIndex: UintFromHex,
  address: AddressFromHex,
  amount: UintFromHex,
});

/**
 * DecodedBlockContents - Contents of a decoded block (without the rlp field)
 * Used inside rlp_decoded in InvalidFixtureBlock
 */
const DecodedBlockContents = Schema.Struct({
  blockHeader: FixtureHeader,
  blocknumber: Schema.String,
  transactions: Schema.Array(FixtureTransaction),
  uncleHeaders: Schema.Array(FixtureHeader),
  withdrawals: Schema.Array(FixtureWithdrawal).pipe(Schema.optional),
});

/**
 * FixtureBlock - Valid block in the blocks array
 * Per blockchain_test.md FixtureBlock section
 */
const FixtureBlock = Schema.Struct({
  rlp: BytesFromHex,
  blockHeader: FixtureHeader,
  blocknumber: Schema.String,
  transactions: Schema.Array(FixtureTransaction),
  uncleHeaders: Schema.Array(FixtureHeader),
  withdrawals: Schema.Array(FixtureWithdrawal).pipe(Schema.optional),
});

/**
 * InvalidFixtureBlock - Block with expected exception
 * Per blockchain_test.md InvalidFixtureBlock section
 */
const InvalidFixtureBlock = Schema.Struct({
  expectException: Schema.String,
  rlp: BytesFromHex,
  rlp_decoded: DecodedBlockContents.pipe(Schema.optional),
});

/**
 * Union type for blocks array - discriminated by presence of expectException
 */
const FixtureBlockOrInvalid = Schema.Union([InvalidFixtureBlock, FixtureBlock]);
/**
 * Config for StateTest (original)
 */
const StateTestConfig = Schema.Struct({
  blobSchedule: Schema.Record(
    Schema.String,
    Schema.Struct({
      target: UintFromHex,
      max: UintFromHex,
      baseFeeUpdateFraction: UintFromHex,
    }),
  ).pipe(Schema.optional),
  chainid: UintFromHex,
});

/**
 * FixtureConfig for BlockchainTest
 * Per blockchain_test.md FixtureConfig section
 */
const BlockchainTestConfig = Schema.Struct({
  network: ForkFix,
  chainid: UintFromHex,
  blobSchedule: Schema.Record(
    Schema.String,
    Schema.Struct({
      target: UintFromHex,
      max: UintFromHex,
      baseFeeUpdateFraction: UintFromHex,
    }),
  ).pipe(Schema.optional),
});
const Info = Schema.Struct({
  hash: BytesFromHex,
  comment: Schema.String,
  "filling-transition-tool": Schema.String,
  description: Schema.String,
  url: Schema.String,
  "reference-spec": Schema.String.pipe(Schema.optional),
  "reference-spec-version": Schema.String.pipe(Schema.optional),
  "eels-resolution": Schema.Struct({
    "git-url": Schema.String,
    branch: Schema.String,
    commit: Schema.String,
  }).pipe(Schema.optional),
});

const EnvironmentFix = Schema.Struct({
  currentCoinbase: AddressFromHex,
  currentGasLimit: UintFromHex,
  currentNumber: UintFromHex,
  currentTimestamp: UintFromHex,
  currentRandom: Schema.optional(BytesFromHex),
  currentDifficulty: Schema.optional(UintFromHex),
  currentBaseFee: Schema.optional(UintFromHex),
  currentExcessBlobGas: Schema.optional(UintFromHex),
  parentDifficulty: Schema.optional(UintFromHex),
  parentTimestamp: Schema.optional(UintFromHex),
  parentBaseFee: Schema.optional(UintFromHex),
  parentGasUsed: Schema.optional(UintFromHex),
  parentGasLimit: Schema.optional(UintFromHex),
});
export const StateTestFix = Schema.Struct({
  _info: Schema.Struct({
    "fixture-format": Schema.Literal("state_test"),
    ...Info.fields,
  }),
  env: EnvironmentFix,
  pre: AllocFix,
  post: Schema.Record(Schema.String, Schema.Array(PostByForkFix)),
  config: StateTestConfig,
  transaction: TransactionFix,
}).pipe((schema) =>
  schema.mapFields((f) => ({
    ...f,
    k: Schema.tagDefaultOmit("state_test"),
  })),
);

/**
 * BlockchainTest fixture schema
 * Per blockchain_test.md Fixture section
 */
export const BlockchainTest = Schema.Struct({
  network: ForkFix,
  pre: AllocFix,
  genesisRLP: BytesFromHex,
  genesisBlockHeader: FixtureHeader,
  blocks: Schema.Array(FixtureBlockOrInvalid),
  postState: AllocFix,
  lastblockhash: BytesFromHex,
  config: BlockchainTestConfig,
  sealEngine: Schema.String.pipe(Schema.optional),
  _info: Schema.Struct({
    "fixture-format": Schema.Literal("blockchain_test"),
    ...Info.fields,
  }),
}).pipe((schema) =>
  schema.mapFields((f) => ({
    ...f,
    k: Schema.tagDefaultOmit("blockchain_test"),
  })),
);

const BlockchainTestEngine = Schema.Struct({
  _info: Schema.Struct({
    "fixture-format": Schema.Literal("blockchain_test_engine"),
  }),
}).pipe((schema) =>
  schema.mapFields((f) => ({
    ...f,
    k: Schema.tagDefaultOmit("blockchain_test_engine"),
  })),
);

const TransactionTest = Schema.Struct({
  _info: Schema.Struct({
    "fixture-format": Schema.Literal("transaction_test"),
  }),
}).pipe((schema) =>
  schema.mapFields((f) => ({
    ...f,
    k: Schema.tagDefaultOmit("transaction_test"),
  })),
);

const BlockchainTestEngineX = Schema.Struct({
  _info: Schema.Struct({
    "fixture-format": Schema.Literal("blockchain_test_engine_x"),
  }),
}).pipe((schema) =>
  schema.mapFields((f) => ({
    ...f,
    k: Schema.tagDefaultOmit("blockchain_test_engine_x"),
  })),
);

const TestCase = Schema.Union([
  StateTestFix,
  BlockchainTest,
  BlockchainTestEngine,
  TransactionTest,
  BlockchainTestEngineX,
]);

const _TestCaseFile = Schema.Record(Schema.String, TestCase);
export function* flattenStateTestFixtures(fixture: typeof StateTestFix.Type) {
  for (const [fork, postByFork] of Object.entries(fixture.post)) {
    if (!postByFork) continue;
    yield* postByFork.map((post, index: number) => {
      const { transaction, ...rest } = fixture;
      return {
        ...rest,
        fork,
        hash: fixture._info.hash.value.toHex().slice(0, 8),
        transaction: {
          ...transaction,
          gasLimit: transaction.gasLimit[index],
          value: transaction.value[index],
          data: transaction.data[index],
          accessList: transaction.accessLists?.[index],
        },
        post: post,
      };
    });
  }
}

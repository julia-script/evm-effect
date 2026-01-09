import {
  Address,
  Bytes,
  Bytes20,
  Bytes32,
  U8,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import { HashMapFromRecord } from "@evm-effect/shared/hashmap";
import { Effect, ParseResult, Schema } from "effect";

const FixtureFormat = Schema.Union(
  Schema.Literal("blockchain_test_engine_x"),
  Schema.Literal("blockchain_test"),
  Schema.Literal("blockchain_test_engine"),
  Schema.Literal("transaction_test"),
  Schema.Literal("state_test"),
);

const ForkFix = Schema.Union(
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
);

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

const UintFromHex = Schema.transform(Schema.BigInt, Uint, {
  decode: (fromA) => {
    return new Uint({ value: fromA });
  },
  encode: (toI) => {
    return toI.value;
  },
  strict: false,
});
const _U8FromHex = Schema.transform(Schema.BigInt, U8, {
  decode: (fromA) => {
    return new U8({ value: fromA });
  },
  encode: (toI) => {
    return toI.value;
  },
  strict: false,
});

const _U64FromHex = Schema.transform(Schema.BigInt, U64, {
  decode: (fromA) => {
    return new U64({ value: fromA });
  },
  encode: (toI) => {
    return toI.value;
  },
  strict: false,
});

const _U256FromHex = Schema.transform(Schema.BigInt, U256, {
  decode: (fromA) => {
    return new U256({ value: fromA });
  },
  encode: (toI) => {
    return toI.value;
  },
  strict: false,
});

const Uint8ArrayFromHex = Schema.transformOrFail(
  Schema.String,
  Schema.instanceOf(Uint8Array),
  {
    decode: (fromA) => {
      if (fromA.startsWith("0x")) {
        fromA = fromA.slice(2);
      }
      return Effect.succeed(Uint8Array.fromHex(fromA));
    },
    encode: (toI) => {
      return Effect.succeed(`0x${toI.toHex()}`);
    },
    strict: true,
  },
);

const BytesFromHex = Schema.transformOrFail(Uint8ArrayFromHex, Bytes, {
  decode: (fromA, _options, _ast, _fromI) => {
    return Effect.succeed(new Bytes({ value: fromA }));
  },
  encode: (toI) => {
    return Effect.succeed(toI.value);
  },
  strict: false,
});

const _Bytes32FromHex = Schema.transformOrFail(Uint8ArrayFromHex, Bytes32, {
  decode: (fromA) => {
    return Effect.succeed(new Bytes32({ value: fromA }));
  },
  encode: (toI) => {
    return Effect.succeed(toI.value);
  },
  strict: false,
});
const AddressFromHex = Schema.transformOrFail(Uint8ArrayFromHex, Address, {
  decode: (fromA) => {
    return Effect.succeed(
      new Address({ value: new Bytes20({ value: fromA }) }),
    );
  },
  encode: (toI) => {
    return Effect.succeed(new Uint8Array(toI.value.value));
  },
  strict: false,
});

const _entriesFromRecrod = <
  K extends Schema.Schema.Any,
  V extends Schema.Schema.Any,
>(options: {
  key: K;
  value: V;
}) =>
  Schema.transformOrFail(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
    Schema.Array(Schema.Tuple(options.key, options.value)),
    {
      decode: (fromA) => {
        return ParseResult.decodeUnknown(
          Schema.Array(Schema.Tuple(options.key, options.value)),
        )(fromA);
        // return Object.entries(fromA);
      },
      encode: (toI) => {
        return Object.fromEntries(toI);
      },
      strict: false,
    },
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
  to: Schema.transform(Schema.String, Schema.UndefinedOr(Address), {
    decode: (fromA) => {
      if (fromA === "") {
        return undefined;
      }
      return new Address({
        value: new Bytes20({ value: Uint8Array.fromHex(fromA.slice(2)) }),
      });
    },
    encode: (toI) => {
      if (toI === undefined) {
        return;
      }
      return `0x${Buffer.from(toI.value.value).toString("hex")}`;
    },
    strict: false,
  }).pipe(Schema.optional),
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
  storage: HashMapFromRecord(BytesFromHex, BytesFromHex),
});
const AllocFix = HashMapFromRecord(AddressFromHex, AccountStateFix);
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
const FixtureBlockOrInvalid = Schema.Union(InvalidFixtureBlock, FixtureBlock);
/**
 * Config for StateTest (original)
 */
const StateTestConfig = Schema.Struct({
  blobSchedule: Schema.Record({
    key: ForkFix,
    value: Schema.Struct({
      target: UintFromHex,
      max: UintFromHex,
      baseFeeUpdateFraction: UintFromHex,
    }),
  }).pipe(Schema.partial, Schema.optional),
  chainid: UintFromHex,
});

/**
 * FixtureConfig for BlockchainTest
 * Per blockchain_test.md FixtureConfig section
 */
const BlockchainTestConfig = Schema.Struct({
  network: ForkFix,
  chainid: UintFromHex,
  blobSchedule: Schema.Record({
    key: ForkFix,
    value: Schema.Struct({
      target: UintFromHex,
      max: UintFromHex,
      baseFeeUpdateFraction: UintFromHex,
    }),
  }).pipe(Schema.partial, Schema.optional),
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
  post: Schema.Record({
    key: ForkFix,
    value: Schema.Array(PostByForkFix),
  }).pipe(Schema.partial),
  config: StateTestConfig,
  transaction: TransactionFix,
}).pipe(Schema.attachPropertySignature("_tag", "state_test"));

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
}).pipe(Schema.attachPropertySignature("_tag", "blockchain_test"));

const BlockchainTestEngine = Schema.Struct({
  _info: Schema.Struct({
    "fixture-format": Schema.Literal("blockchain_test_engine"),
  }),
}).pipe(Schema.attachPropertySignature("_tag", "blockchain_test_engine"));

const TransactionTest = Schema.Struct({
  _info: Schema.Struct({
    "fixture-format": Schema.Literal("transaction_test"),
  }),
}).pipe(Schema.attachPropertySignature("_tag", "transaction_test"));

const BlockchainTestEngineX = Schema.Struct({
  _info: Schema.Struct({
    "fixture-format": Schema.Literal("blockchain_test_engine_x"),
  }),
}).pipe(Schema.attachPropertySignature("_tag", "blockchain_test_engine_x"));

const TestCase = Schema.Union(
  StateTestFix,
  BlockchainTest,
  BlockchainTestEngine,
  TransactionTest,
  BlockchainTestEngineX,
);

const _TestCaseFile = Schema.Record({
  key: Schema.String,
  value: TestCase,
});
export function* flattenStateTestFixtures(
  fixture: (typeof StateTestFix)["Type"],
) {
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

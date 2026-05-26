import * as path from "node:path";
import { Bytes0, EthTypes } from "@evm-effect/ethereum-types";
import { Console, Effect, Schema, SchemaGetter } from "effect";
import { FileSystem } from "effect/FileSystem";
import { omit } from "effect/Struct";
import { testFixturesRoot } from "../constants.js";
// import { Effect } from "effect";

// test_count: 220583,
// forks: [
//   'Amsterdam',
//   'BPO1ToBPO2AtTime15k',
//   'BPO2ToAmsterdamAtTime15k',
//   'Berlin',
//   'Byzantium',
//   'Cancun',
//   'CancunToPragueAtTime15k',
//   'ConstantinopleFix',
//   'Frontier',
//   'Homestead',
//   'Istanbul',
//   'London',
//   'Osaka',
//   'OsakaToBPO1AtTime15k',
//   'Paris',
//   'ParisToShanghaiAtTime15k',
//   'Prague',
//   'PragueToOsakaAtTime15k',
//   'Shanghai',
//   'ShanghaiToCancunAtTime15k'
// ],
export const Forks = Schema.Literals([
  "Amsterdam",
  "ArrowGlacier",
  "BPO1ToBPO2AtTime15k",
  "BPO2ToAmsterdamAtTime15k",
  "Berlin",
  "BerlinToLondonAt5",
  "Byzantium",
  "Cancun",
  "CancunToPragueAtTime15k",
  "Constantinople",
  "ConstantinopleFix",
  "Frontier",
  "GrayGlacier",
  "Homestead",
  "Istanbul",
  "London",
  "Merge",
  "MergeToShanghaiAtTime15k",
  "MuirGlacier",
  "Osaka",
  "OsakaToBPO1AtTime15k",
  "Paris",
  "ParisToShanghaiAtTime15k",
  "Prague",
  "PragueToOsakaAtTime15k",
  "Shanghai",
  "ShanghaiToCancunAtTime15k",
]);
export const FixtureFormat = Schema.Literals([
  "blockchain_test_engine_x",
  "blockchain_test",
  "blockchain_test_engine",
  "transaction_test",
  "state_test",
  "blockchain_test_sync",
]);

export const IndexEntry = Schema.Struct({
  id: Schema.String,
  fixture_hash: EthTypes.HexFromString,
  fork: Forks,
  format: FixtureFormat,
  pre_hash: Schema.NullOr(Schema.String),
  json_path: Schema.String,
});
export const Index = Schema.Struct({
  root_hash: EthTypes.HexFromString,
  created_at: Schema.String,
  test_count: Schema.Number,
  forks: Schema.Array(Forks),
  fixture_formats: Schema.Array(FixtureFormat),
  test_cases: Schema.Array(IndexEntry),
});

const readFile = Effect.fn("readFile")(function* (path: string) {
  const fs = yield* FileSystem;
  return yield* fs.readFileString(path);
});
export const testFixturesIndexPath = path.join(
  testFixturesRoot,
  "fixtures",
  ".meta",
  "index.json",
);
export const readTestFixturesIndex = Effect.fn("readTestFixturesIndex")(
  function* () {
    return yield* readFile(testFixturesIndexPath).pipe(
      Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(Index))),
    );
  },
);

const takeFirst = <T extends Schema.Top>(schema: T) =>
  schema.pipe(
    Schema.Array,
    Schema.decodeTo(Schema.toType(schema), {
      decode: SchemaGetter.transform((value) => value[0]),
      encode: SchemaGetter.transform((value) => [value]),
    }),
  );
const Info = Schema.Struct({
  hash: EthTypes.HexFromString,
  comment: Schema.String,
  description: Schema.String,
  url: Schema.String,
  "reference-spec": Schema.String.pipe(Schema.optional),
  "reference-spec-version": Schema.String.pipe(Schema.optional),
});

export const Env = Schema.Struct({
  currentCoinbase: EthTypes.AddressFromString,
  currentGasLimit: EthTypes.UintFromString,
  currentNumber: EthTypes.UintFromString,
  currentTimestamp: EthTypes.U256FromString,
  currentRandom: Schema.optional(EthTypes.Bytes32FromString),
  currentDifficulty: Schema.optional(EthTypes.UintFromString),
  currentBaseFee: Schema.optional(EthTypes.UintFromString),
  currentExcessBlobGas: Schema.optional(EthTypes.U64FromString),
});

const BlobSchedule = Schema.Struct({
  target: EthTypes.BigIntFromString,
  max: EthTypes.BigIntFromString,
  baseFeeUpdateFraction: EthTypes.BigIntFromString,
});
export const Config = Schema.Struct({
  blobSchedule: Schema.Record(Forks, BlobSchedule.pipe(Schema.optional)).pipe(
    Schema.optional,
  ),
  chainid: EthTypes.BigIntFromString,
});

export const Alloc = EthTypes.EntriesFromRecord(
  EthTypes.AddressFromString,
  Schema.Struct({
    balance: EthTypes.U256FromString,
    code: EthTypes.BytesFromString,
    nonce: EthTypes.UintFromString,
    storage: EthTypes.EntriesFromRecord(
      EthTypes.Bytes32FromString,
      EthTypes.U256FromString,
    ),
  }),
);
export const PostEntry = Schema.Struct({
  hash: EthTypes.HexFromString,
  logs: EthTypes.BytesFromString,
  txbytes: EthTypes.BytesFromString,
  state: Alloc.pipe(Schema.optional),
  expectException: Schema.String.pipe(Schema.optional),
  indexes: Schema.Struct({
    data: Schema.Number,
    gas: Schema.Number,
    value: Schema.Number,
  }).pipe(Schema.optional),
});
export const Post = Schema.Record(
  Forks,
  PostEntry.pipe(takeFirst, Schema.optionalKey),
);

export const TransactionFixture = Schema.Struct({
  nonce: EthTypes.BigIntFromString,
  gasPrice: EthTypes.BigIntFromString.pipe(Schema.optional),
  maxPriorityFeePerGas: EthTypes.BigIntFromString.pipe(Schema.optional),
  maxFeePerGas: EthTypes.BigIntFromString.pipe(Schema.optional),
  gasLimit: EthTypes.BigIntFromString.pipe(takeFirst, Schema.optional),
  to: Schema.Union([
    Schema.Literal("").pipe(
      Schema.decodeTo(Bytes0, {
        decode: SchemaGetter.transform(() => Bytes0.empty),
        encode: SchemaGetter.transform(() => ""),
      }),
    ),
    EthTypes.AddressFromString,
  ]),
  sender: EthTypes.AddressFromString.pipe(Schema.optional),
  value: EthTypes.BigIntFromString.pipe(takeFirst),
  data: EthTypes.BytesFromString.pipe(takeFirst, Schema.optional),
  accessLists: Schema.Array(
    Schema.Struct({
      address: EthTypes.AddressFromString,
      storageKeys: Schema.Array(EthTypes.Bytes32FromString),
    }),
  ).pipe(Schema.optional, takeFirst),
  secretKey: EthTypes.Bytes32FromString,
  blobVersionedHashes: Schema.Array(EthTypes.Bytes32FromString).pipe(
    Schema.optional,
  ),
  maxFeePerBlobGas: EthTypes.BigIntFromString.pipe(Schema.optional),
  authorizationList: Schema.Array(
    Schema.Struct({
      chainId: EthTypes.U256FromString,
      address: EthTypes.AddressFromString,
      nonce: EthTypes.U64FromString,
      yParity: EthTypes.U8FromString,
      r: EthTypes.U256FromString,
      s: EthTypes.U256FromString,
    }),
  ).pipe(Schema.optional),
  signer: EthTypes.AddressFromString.pipe(Schema.optional),
});
export const StateTest = Schema.Struct({
  _info: Info,
  env: Env,
  config: Config,
  pre: Alloc,
  post: Post,
  transaction: TransactionFixture,
});
export const TestsFilePartial = Schema.Record(Schema.String, Schema.Unknown);

export const decodeStateTest = Schema.decodeUnknownEffect(StateTest);
export const readStateTest = Effect.fn("readStateTest")(function* (
  testCase: (typeof IndexEntry)["Type"],
) {
  const file = yield* readFile(
    path.join(testFixturesRoot, "fixtures", testCase.json_path),
  );
  const result = yield* Schema.decodeEffect(
    Schema.fromJsonString(TestsFilePartial),
  )(file);
  const test = result[testCase.id];
  if (!test) {
    return yield* Effect.die(new Error(`Test ${testCase.id} not found`));
  }
  const decoded = yield* decodeStateTest(test, {
    onExcessProperty: "preserve",
    errors: "first",
  }).pipe(Effect.tapError((error) => Console.error(error.message)));
  return { ...decoded, _raw: JSON.stringify(test, null, 2) };
});

export const BlockChainTestTransaction = Schema.Struct({
  type: EthTypes.UintFromString,
  chainId: EthTypes.UintFromString,
  nonce: EthTypes.UintFromString,
  gasPrice: EthTypes.UintFromString.pipe(Schema.optional),
  maxPriorityFeePerGas: EthTypes.UintFromString.pipe(Schema.optional),
  maxFeePerGas: EthTypes.UintFromString.pipe(Schema.optional),
  gasLimit: EthTypes.UintFromString.pipe(Schema.optional),
  to: EthTypes.AddressFromString.pipe(Schema.optional),
  value: EthTypes.UintFromString,
  data: EthTypes.BytesFromString,
  accessList: Schema.Array(
    Schema.Struct({
      address: EthTypes.AddressFromString,
      storageKeys: Schema.Array(EthTypes.Bytes32FromString),
    }),
  ).pipe(Schema.optional),
  v: EthTypes.BigIntFromString,
  r: EthTypes.BigIntFromString,
  s: EthTypes.BigIntFromString,
  sender: EthTypes.AddressFromString.pipe(Schema.optional),
});

export const BlockHeader = Schema.Struct({
  parentHash: EthTypes.Bytes32FromString,
  uncleHash: EthTypes.Bytes32FromString,
  coinbase: EthTypes.AddressFromString,
  stateRoot: EthTypes.Bytes32FromString,
  transactionsTrie: EthTypes.Bytes32FromString,
  baseFeePerGas: EthTypes.UintFromString.pipe(Schema.optional),
  blobGasUsed: EthTypes.U64FromString.pipe(Schema.optional),
  excessBlobGas: EthTypes.U64FromString.pipe(Schema.optional),
  receiptTrie: EthTypes.Bytes32FromString,
  bloom: EthTypes.Bytes256FromString,
  difficulty: EthTypes.UintFromString,
  number: EthTypes.UintFromString,
  gasLimit: EthTypes.UintFromString,
  gasUsed: EthTypes.UintFromString,
  timestamp: EthTypes.U256FromString,
  extraData: EthTypes.BytesFromString,
  mixHash: EthTypes.Bytes32FromString,
  nonce: EthTypes.Bytes8FromString,
  hash: EthTypes.Bytes32FromString,
  withdrawalsRoot: EthTypes.Bytes32FromString.pipe(Schema.optional),
  parentBeaconBlockRoot: EthTypes.Bytes32FromString.pipe(Schema.optional),
  requestsHash: EthTypes.Bytes32FromString.pipe(Schema.optional),
});
export const Block = Schema.Struct({
  blockHeader: BlockHeader,
  transactions: Schema.Array(BlockChainTestTransaction),
  uncleHeaders: Schema.Array(BlockHeader),
  rlp: EthTypes.BytesFromString,
  blocknumber: EthTypes.BigIntFromString,

  // uncleHeaders: Schema.Array(BlockHeader),
  // withdrawals: Schema.Array(Withdrawal),
});
export const FailedToDecodeBlock = Schema.Struct({
  expectException: Schema.String,
  rlp: EthTypes.BytesFromString,
  rlp_decoded: Schema.Struct({
    ...omit(Block.fields, ["rlp"]),
  }).pipe(Schema.optional),
});
export const BlockchainTest = Schema.Struct({
  network: Forks,
  genesisBlockHeader: BlockHeader,
  pre: Alloc,
  postState: Alloc,
  lastblockhash: EthTypes.Bytes32FromString,
  config: Schema.Struct({
    network: Forks,
    chainid: EthTypes.BigIntFromString,
  }),
  blocks: Schema.Array(Schema.Union([Block, FailedToDecodeBlock])),
  genesisRLP: EthTypes.BytesFromString,
  sealEngine: Schema.String.pipe(Schema.optional),
  _info: Info,
});
export const decodeBlockchainTest = Schema.decodeUnknownEffect(BlockchainTest);
export const readBlockchainTest = Effect.fn("readBlockchainTest")(function* (
  testCase: (typeof IndexEntry)["Type"],
) {
  const file = yield* readFile(
    path.join(testFixturesRoot, "fixtures", testCase.json_path),
  );
  const result = yield* Schema.decodeEffect(
    Schema.fromJsonString(TestsFilePartial),
  )(file);
  const test = result[testCase.id];
  if (!test) {
    return yield* Effect.die(new Error(`Test ${testCase.id} not found`));
  }
  const decoded = yield* decodeBlockchainTest(test, {
    onExcessProperty: "preserve",
    errors: "first",
  }).pipe(Effect.tapError((error) => Console.error(error.message)));
  return { ...decoded, _raw: JSON.stringify(test, null, 2) };
});

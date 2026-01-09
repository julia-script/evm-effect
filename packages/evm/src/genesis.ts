// enesisConfiguration:
//     """
//     Configuration for the first block of an Ethereum chain.

import {
  Address,
  Bytes,
  Bytes8,
  U64,
  U256,
  Uint,
} from "@evm-effect/ethereum-types";
import { Schema } from "effect";

const InitialAccount = Schema.Struct({
  balance: U256,
  code: Bytes,
  nonce: Uint,
  storageRoot: Bytes,
});

export const GenesisConfig = Schema.Struct({
  chainId: U64,
  difficulty: Uint,
  extraData: Bytes,
  gasLimit: Uint,
  nonce: Bytes8,
  timestamp: U256,
  initialAccounts: Schema.HashMap({
    key: Address,
    value: InitialAccount,
  }),
});

// def check_gas_limit(gas_limit: Uint, parent_gas_limit: Uint) -> bool:
//     """
//     Validates the gas limit for a block.

import { keccak256 } from "@evm-effect/crypto";
import { Address, type Hash32 } from "@evm-effect/ethereum-types/domain";
import { U64, Uint } from "@evm-effect/ethereum-types/numeric";
import rlp from "@evm-effect/rlp";
import { Either } from "effect";
import type { BlockChain } from "../blockchain.js";
import { Header } from "../types/Block.js";
export const BASE_FEE_MAX_CHANGE_DENOMINATOR = new Uint({
  value: 8n,
});
export const ELASTICITY_MULTIPLIER = new Uint({
  value: 2n,
});
export const GAS_LIMIT_ADJUSTMENT_FACTOR = new Uint({
  value: 1024n,
});
export const GAS_LIMIT_MINIMUM = new Uint({
  value: 5000n,
});
export const EMPTY_OMMER_HASH = keccak256(rlp.encode([]));
export const SYSTEM_ADDRESS = new Address(
  "0xfffffffffffffffffffffffffffffffffffffffe",
);
export const BEACON_ROOTS_ADDRESS = new Address(
  "0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02",
);
export const SYSTEM_TRANSACTION_GAS = new Uint({
  value: 30000000n,
});
export const MAX_BLOB_GAS_PER_BLOCK = new U64({
  value: 1179648n,
});
export const VERSIONED_HASH_VERSION_KZG = new Uint8Array([0x01]);

export const WITHDRAWAL_REQUEST_PREDEPLOY_ADDRESS = new Address(
  "0x00000961Ef480Eb55e80D19ad83579A64c007002",
);
export const CONSOLIDATION_REQUEST_PREDEPLOY_ADDRESS = new Address(
  "0x0000BBdDc7CE488642fb579F8B00f3a590007251",
);
export const HISTORY_STORAGE_ADDRESS = new Address(
  "0x0000F90827F1C53a10cb7A02335B175320002935",
);
export const MAX_BLOCK_SIZE = 10_485_760;
export const SAFETY_MARGIN = 2_097_152;
export const MAX_RLP_BLOCK_SIZE = MAX_BLOCK_SIZE - SAFETY_MARGIN;
export const BLOB_COUNT_LIMIT = 6;
//     The bounds of the gas limit, ``max_adjustment_delta``, is set as the
//     quotient of the parent block's gas limit and the
//     ``GAS_LIMIT_ADJUSTMENT_FACTOR``. Therefore, if the gas limit that is
//     passed through as a parameter is greater than or equal to the *sum* of
//     the parent's gas and the adjustment delta then the limit for gas is too
//     high and fails this function's check. Similarly, if the limit is less
//     than or equal to the *difference* of the parent's gas and the adjustment
//     delta *or* the predefined ``GAS_LIMIT_MINIMUM`` then this function's
//     check fails because the gas limit doesn't allow for a sufficient or
//     reasonable amount of gas to be used on a block.

//     Parameters
//     ----------
//     gas_limit :
//         Gas limit to validate.

//     parent_gas_limit :
//         Gas limit of the parent block.

//     Returns
//     -------
//     check : `bool`
//         True if gas limit constraints are satisfied, False otherwise.

//     """
//     max_adjustment_delta = parent_gas_limit // GAS_LIMIT_ADJUSTMENT_FACTOR
//     if gas_limit >= parent_gas_limit + max_adjustment_delta:
//         return False
//     if gas_limit <= parent_gas_limit - max_adjustment_delta:
//         return False
//     if gas_limit < GAS_LIMIT_MINIMUM:
//         return False

//     return True

// def process_withdrawals(
//   block_env: vm.BlockEnvironment,
//   block_output: vm.BlockOutput,
//   withdrawals: Tuple[Withdrawal, ...],
// ) -> None:
//   """
//   Increase the balance of the withdrawing account.
//   """

//   def increase_recipient_balance(recipient: Account) -> None:
//       recipient.balance += wd.amount * U256(10**9)

//   for i, wd in enumerate(withdrawals):
//       trie_set(
//           block_output.withdrawals_trie,
//           rlp.encode(Uint(i)),
//           rlp.encode(wd),
//       )

//       modify_state(block_env.state, wd.address, increase_recipient_balance)

// def calculate_base_fee_per_gas(
//   block_gas_limit: Uint,
//   parent_gas_limit: Uint,
//   parent_gas_used: Uint,
//   parent_base_fee_per_gas: Uint,
// ) -> Uint:
//   """
//   Calculates the base fee per gas for the block.

//   Parameters
//   ----------
//   block_gas_limit :
//       Gas limit of the block for which the base fee is being calculated.
//   parent_gas_limit :
//       Gas limit of the parent block.
//   parent_gas_used :
//       Gas used in the parent block.
//   parent_base_fee_per_gas :
//       Base fee per gas of the parent block.

//   Returns
//   -------
//   base_fee_per_gas : `Uint`
//       Base fee per gas for the block.

//   """

export const _validateHeader = (_chain: BlockChain, _header: Header) => {
  // def validate_header(chain: BlockChain, header: Header) -> None:
  //     """
  //     Verifies a block header.
  //     In order to consider a block's header valid, the logic for the
  //     quantities in the header should match the logic for the block itself.
  //     For example the header timestamp should be greater than the block's parent
  //     timestamp because the block was created *after* the parent block.
  //     Additionally, the block's number should be directly following the parent
  //     block's number since it is the next block in the sequence.
  //     Parameters
  //     ----------
  //     chain :
  //         History and current state.
  //     header :
  //         Header to check for correctness.
  //     """
  // if (header.number.value < 1n) {
  //   return Either.left(
  //     new InvalidBlock({ message: "Block number must be at least 1" }),
  //   );
  // }
  // const parentHeader = chain.blocks[chain.blocks.length - 1].header;
  // if (parentHeader.number.value !== header.number.value - 1n) {
  //   return Either.left(
  //     new InvalidBlock({ message: "Block number must be parent number + 1" }),
  //   );
  // }
  //     if header.number < Uint(1):
  //         raise InvalidBlock
  //     parent_header = chain.blocks[-1].header
  //     excess_blob_gas = calculate_excess_blob_gas(parent_header)
  //     if header.excess_blob_gas != excess_blob_gas:
  //         raise InvalidBlock
  //     if header.gas_used > header.gas_limit:
  //         raise InvalidBlock
  //     expected_base_fee_per_gas = calculate_base_fee_per_gas(
  //         header.gas_limit,
  //         parent_header.gas_limit,
  //         parent_header.gas_used,
  //         parent_header.base_fee_per_gas,
  //     )
  //     if expected_base_fee_per_gas != header.base_fee_per_gas:
  //         raise InvalidBlock
  //     if header.timestamp <= parent_header.timestamp:
  //         raise InvalidBlock
  //     if header.number != parent_header.number + Uint(1):
  //         raise InvalidBlock
  //     if len(header.extra_data) > 32:
  //         raise InvalidBlock
  //     if header.difficulty != 0:
  //         raise InvalidBlock
  //     if header.nonce != b"\x00\x00\x00\x00\x00\x00\x00\x00":
  //         raise InvalidBlock
  //     if header.ommers_hash != EMPTY_OMMER_HASH:
  //         raise InvalidBlock
  //     block_parent_hash = keccak256(rlp.encode(parent_header))
  //     if header.parent_hash != block_parent_hash:
  //         raise InvalidBlock
};
export const getLast256BlockHashes = (chain: BlockChain) => {
  const recentBlocks = chain.blocks.slice(-255);
  if (recentBlocks.length === 0) {
    return [];
  }
  const recentBlockHashes: Hash32[] = [];
  for (const block of recentBlocks) {
    recentBlockHashes.push(block.header.parentHash);
  }
  const encodedHeader = rlp.encodeTo(
    Header,
    recentBlocks[recentBlocks.length - 1].header,
  );
  if (Either.isLeft(encodedHeader)) {
    throw new Error("unreachable");
  }
  const mostRecentBlockHash = keccak256(encodedHeader.right);
  recentBlockHashes.push(mostRecentBlockHash);
  return recentBlockHashes;
};
export const checkGasLimit = (gasLimit: Uint, parentGasLimit: Uint) => {
  const maxAdjustmentDelta = new Uint({
    value: parentGasLimit.value / GAS_LIMIT_ADJUSTMENT_FACTOR.value,
  });

  if (gasLimit.value >= parentGasLimit.value + maxAdjustmentDelta.value) {
    return false;
  }
  if (gasLimit.value <= parentGasLimit.value - maxAdjustmentDelta.value) {
    return false;
  }
  if (gasLimit.value < GAS_LIMIT_MINIMUM.value) {
    return false;
  }
  return true;
};

// const max = (a: bigint, b: bigint) => {
//   return a > b ? a : b;
// };
// export const calculateBaseFeePerGas = (
//   blockGasLimit: Uint,
//   parentGasLimit: Uint,
//   parentGasUsed: Uint,
//   parentBaseFeePerGas: Uint,
// ) => {
//   const parentGasTarget = new Uint({
//     value: parentGasLimit.value / ELASTICITY_MULTIPLIER.value,
//   });
//   if (!checkGasLimit(blockGasLimit, parentGasLimit)) {
//     return Either.left(new InvalidBlock({ message: "Invalid gas limit" }));
//   }
//   if (parentGasUsed.value === parentGasTarget.value) {
//     return Either.right(parentBaseFeePerGas);
//   }

//   if (parentGasUsed.value > parentGasTarget.value) {
//     const gasUsedDelta = new Uint({
//       value: parentGasUsed.value - parentGasTarget.value,
//     });
//     const parentFeeGasDelta = new Uint({
//       value: parentBaseFeePerGas.value * gasUsedDelta.value,
//     });
//     const targetFeeGasDelta = new Uint({
//       value: parentFeeGasDelta.value / parentGasTarget.value,
//     });
//     const baseFeePerGasDelta = new Uint({
//       value: max(
//         targetFeeGasDelta.value / BASE_FEE_MAX_CHANGE_DENOMINATOR.value,
//         1n,
//       ),
//     });
//     return Either.right(
//       new Uint({ value: parentBaseFeePerGas.value + baseFeePerGasDelta.value }),
//     );
//   }

//   const gasUsedDelta = new Uint({
//     value: parentGasTarget.value - parentGasUsed.value,
//   });
//   const parentFeeGasDelta = new Uint({
//     value: parentBaseFeePerGas.value * gasUsedDelta.value,
//   });
//   const targetFeeGasDelta = new Uint({
//     value: parentFeeGasDelta.value / parentGasTarget.value,
//   });
//   const baseFeePerGasDelta = new Uint({
//     value: targetFeeGasDelta.value / BASE_FEE_MAX_CHANGE_DENOMINATOR.value,
//   });
//   return Either.right(
//     new Uint({ value: parentBaseFeePerGas.value - baseFeePerGasDelta.value }),
//   );
// };

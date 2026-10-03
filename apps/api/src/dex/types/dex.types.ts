export const DEX_TRANSACTION_TYPES = {
  SWAP: 'SWAP',
  ADD_LIQUIDITY: 'ADD_LIQUIDITY',
  REMOVE_LIQUIDITY: 'REMOVE_LIQUIDITY',
} as const;

export type DexTransactionType =
  (typeof DEX_TRANSACTION_TYPES)[keyof typeof DEX_TRANSACTION_TYPES];

export type DexNetwork = 'devnet' | 'mainnet-beta';

import { PublicKey } from "@solana/web3.js";

export const USEFECT_PROGRAM_ID = new PublicKey(
  "FLYaSSPbQKzqq3BYNF7Jgn7CxPyEK7YTtr8jMmQtivfa",
);

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

export const SOLANA_COMMITMENT = "confirmed" as const;

export const DEX_TOKEN_A_ADDRESS =
  process.env.NEXT_PUBLIC_DEX_TOKEN_A ?? "";

export const DEX_TOKEN_B_ADDRESS =
  process.env.NEXT_PUBLIC_DEX_TOKEN_B ?? "";

export function getDexTokenAddresses(): {
  tokenA: PublicKey;
  tokenB: PublicKey;
} | null {
  if (!DEX_TOKEN_A_ADDRESS || !DEX_TOKEN_B_ADDRESS) {
    return null;
  }

  try {
    const tokenA = new PublicKey(DEX_TOKEN_A_ADDRESS);
    const tokenB = new PublicKey(DEX_TOKEN_B_ADDRESS);

    if (tokenA.equals(tokenB)) {
      return null;
    }

    return {
      tokenA,
      tokenB,
    };
  } catch {
    return null;
  }
}

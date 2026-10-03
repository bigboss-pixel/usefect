import { PublicKey } from "@solana/web3.js";

function requireEnv(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(
      `Missing required DEX environment variable: ${name}`,
    );
  }

  return value;
}

export const DEX_NETWORK =
  process.env.NEXT_PUBLIC_DEX_NETWORK ?? "devnet";

export const USEFECT_PROGRAM_ID = new PublicKey(
  requireEnv(
    "NEXT_PUBLIC_DEX_PROGRAM_ID",
    process.env.NEXT_PUBLIC_DEX_PROGRAM_ID,
  ),
);

export const SOLANA_RPC_URL = requireEnv(
  "NEXT_PUBLIC_SOLANA_RPC_URL",
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
);

export const SOLANA_COMMITMENT = "confirmed" as const;

export const DEX_TOKEN_A_ADDRESS = requireEnv(
  "NEXT_PUBLIC_DEX_TOKEN_A",
  process.env.NEXT_PUBLIC_DEX_TOKEN_A,
);

export const DEX_TOKEN_B_ADDRESS = requireEnv(
  "NEXT_PUBLIC_DEX_TOKEN_B",
  process.env.NEXT_PUBLIC_DEX_TOKEN_B,
);

export const DEX_POOL_ADDRESS =
  process.env.NEXT_PUBLIC_DEX_POOL_ADDRESS ?? "";

export function getDexTokenAddresses(): {
  tokenA: PublicKey;
  tokenB: PublicKey;
} | null {
  try {
    const tokenA = new PublicKey(
      DEX_TOKEN_A_ADDRESS,
    );

    const tokenB = new PublicKey(
      DEX_TOKEN_B_ADDRESS,
    );

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

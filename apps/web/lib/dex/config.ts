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

function assertValidPublicKey(
  value: string,
  name: string,
): void {
  try {
    new PublicKey(value);
  } catch {
    throw new Error(`${name} is not a valid Solana public key.`);
  }
}


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


export function assertDexEnvironment(): void {
  const allowedNetworks = new Set([
    "devnet",
    "testnet",
    "mainnet-beta",
    "localnet",
  ]);

  if (!allowedNetworks.has(DEX_NETWORK)) {
    throw new Error(`Unsupported DEX network: ${DEX_NETWORK}`);
  }

  if (
    DEX_NETWORK === "mainnet-beta" &&
    (SOLANA_RPC_URL.includes("localhost") ||
      SOLANA_RPC_URL.includes("127.0.0.1") ||
      SOLANA_RPC_URL.includes("0.0.0.0"))
  ) {
    throw new Error(
      "Mainnet DEX cannot use a local RPC endpoint.",
    );
  }

  if (DEX_NETWORK === "mainnet-beta") {
    if (!DEX_TOKEN_A_ADDRESS || !DEX_TOKEN_B_ADDRESS) {
      throw new Error(
        "Mainnet DEX token addresses are not configured.",
      );
    }

    if (!DEX_POOL_ADDRESS) {
      throw new Error(
        "Mainnet DEX pool address is not configured.",
      );
    }

    assertValidPublicKey(
      process.env.NEXT_PUBLIC_DEX_PROGRAM_ID ?? "",
      "NEXT_PUBLIC_DEX_PROGRAM_ID",
    );

    assertValidPublicKey(
      DEX_TOKEN_A_ADDRESS,
      "NEXT_PUBLIC_DEX_TOKEN_A_ADDRESS",
    );

    assertValidPublicKey(
      DEX_TOKEN_B_ADDRESS,
      "NEXT_PUBLIC_DEX_TOKEN_B_ADDRESS",
    );

    assertValidPublicKey(
      DEX_POOL_ADDRESS,
      "NEXT_PUBLIC_DEX_POOL_ADDRESS",
    );
  }
}

import { PublicKey } from "@solana/web3.js";

import {
  DEX_NETWORK,
  DEX_POOL_ADDRESS,
  DEX_TOKEN_A_ADDRESS,
  DEX_TOKEN_B_ADDRESS,
  SOLANA_RPC_URL,
  USEFECT_PROGRAM_ID,
} from "./config";
import { getDexConfigPda } from "./pdas";
import type { DexConfigSnapshot } from "./dex-config";
import type { DexPoolSnapshot } from "./pool";

function isDefaultPublicKey(key: PublicKey): boolean {
  return key.equals(PublicKey.default);
}

function isLocalRpc(url: string): boolean {
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("0.0.0.0")
  );
}

export function validateDexEnvironment(): void {
  const allowedNetworks = new Set([
    "devnet",
    "testnet",
    "mainnet-beta",
    "localnet",
  ]);

  if (!allowedNetworks.has(DEX_NETWORK)) {
    throw new Error(`Unsupported DEX network: ${DEX_NETWORK}`);
  }

  if (DEX_NETWORK === "mainnet-beta" && isLocalRpc(SOLANA_RPC_URL)) {
    throw new Error(
      "Mainnet DEX cannot use a local RPC endpoint.",
    );
  }

  if (DEX_NETWORK === "mainnet-beta") {
    if (!DEX_TOKEN_A_ADDRESS || !DEX_TOKEN_B_ADDRESS) {
      throw new Error(
        "Mainnet DEX token configuration is incomplete.",
      );
    }

    if (!DEX_POOL_ADDRESS) {
      throw new Error(
        "Mainnet DEX pool configuration is incomplete.",
      );
    }
  }

  if (isDefaultPublicKey(USEFECT_PROGRAM_ID)) {
    throw new Error("Invalid USEFECT program ID.");
  }
}

export function validateDexConfig(
  dexConfig: DexConfigSnapshot,
): void {
  if (isDefaultPublicKey(dexConfig.authority)) {
    throw new Error("DEX authority is invalid.");
  }

  if (isDefaultPublicKey(dexConfig.treasury)) {
    throw new Error("DEX treasury is invalid.");
  }

  if (
    !Number.isInteger(dexConfig.feeBps) ||
    dexConfig.feeBps < 0 ||
    dexConfig.feeBps > 10_000
  ) {
    throw new Error("DEX fee configuration is invalid.");
  }

  if (
    !Number.isInteger(dexConfig.protocolFeeBps) ||
    dexConfig.protocolFeeBps < 0 ||
    dexConfig.protocolFeeBps > dexConfig.feeBps
  ) {
    throw new Error(
      "DEX protocol fee configuration is invalid.",
    );
  }
}

export function validateDexPool(
  pool: DexPoolSnapshot,
): void {
  const [expectedDexConfig] = getDexConfigPda();

  if (!pool.dex.equals(expectedDexConfig)) {
    throw new Error(
      "Pool belongs to a different DEX configuration.",
    );
  }

  if (pool.tokenA.equals(pool.tokenB)) {
    throw new Error("Pool contains identical token mints.");
  }

  const tokenABytes = pool.tokenA.toBytes();
  const tokenBBytes = pool.tokenB.toBytes();

  let tokenOrder = 0;

  for (let i = 0; i < tokenABytes.length; i += 1) {
    if (tokenABytes[i] < tokenBBytes[i]) {
      tokenOrder = -1;
      break;
    }

    if (tokenABytes[i] > tokenBBytes[i]) {
      tokenOrder = 1;
      break;
    }
  }

  if (tokenOrder >= 0) {
    throw new Error("Pool token ordering is invalid.");
  }

  if (isDefaultPublicKey(pool.vaultA)) {
    throw new Error("Pool Token A vault is invalid.");
  }

  if (isDefaultPublicKey(pool.vaultB)) {
    throw new Error("Pool Token B vault is invalid.");
  }

  if (isDefaultPublicKey(pool.lpMint)) {
    throw new Error("Pool LP mint is invalid.");
  }

  if (
    !Number.isInteger(pool.feeBps) ||
    pool.feeBps < 0 ||
    pool.feeBps > 10_000
  ) {
    throw new Error("Pool fee configuration is invalid.");
  }

  if (
    !Number.isInteger(pool.tokenADecimals) ||
    pool.tokenADecimals < 0 ||
    pool.tokenADecimals > 18
  ) {
    throw new Error("Token A decimals are invalid.");
  }

  if (
    !Number.isInteger(pool.tokenBDecimals) ||
    pool.tokenBDecimals < 0 ||
    pool.tokenBDecimals > 18
  ) {
    throw new Error("Token B decimals are invalid.");
  }

  if (pool.status !== 0 && pool.status !== 1) {
    throw new Error("Pool status is invalid.");
  }

  if (DEX_TOKEN_A_ADDRESS && DEX_TOKEN_B_ADDRESS) {
    const configuredA = new PublicKey(DEX_TOKEN_A_ADDRESS);
    const configuredB = new PublicKey(DEX_TOKEN_B_ADDRESS);

    if (
      !pool.tokenA.equals(configuredA) ||
      !pool.tokenB.equals(configuredB)
    ) {
      throw new Error(
        "Loaded pool tokens do not match DEX configuration.",
      );
    }
  }

  if (DEX_POOL_ADDRESS) {
    const configuredPool = new PublicKey(DEX_POOL_ADDRESS);

    if (!pool.address.equals(configuredPool)) {
      throw new Error(
        "Loaded pool does not match configured pool address.",
      );
    }
  }
}

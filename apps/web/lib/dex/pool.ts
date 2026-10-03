import { BorshAccountsCoder } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import idl from "./idl/programs_usefect.json";
import { solanaConnection } from "./connection";
import { getPoolPda } from "./pdas";

const poolCoder = new BorshAccountsCoder(
  idl as unknown as Idl,
);

export type DexPoolSnapshot = {
  address: PublicKey;
  dex: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  lpMint: PublicKey;
  reserveA: bigint;
  reserveB: bigint;
  lpSupply: bigint;
  feeBps: number;
  tokenADecimals: number;
  tokenBDecimals: number;
  status: number;
  bump: number;
};

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value
  ) {
    return BigInt(String(value));
  }

  return BigInt(String(value));
}

export async function fetchDexPool(
  tokenA: PublicKey,
  tokenB: PublicKey,
): Promise<DexPoolSnapshot | null> {
  const [address] = getPoolPda(tokenA, tokenB);

  const account =
    await solanaConnection.getAccountInfo(address);

  if (!account) {
    return null;
  }

  const decoded = poolCoder.decode(
    "Pool",
    account.data,
  ) as {
    dex: PublicKey;
    token_a: PublicKey;
    token_b: PublicKey;
    vault_a: PublicKey;
    vault_b: PublicKey;
    lp_mint: PublicKey;
    reserve_a: unknown;
    reserve_b: unknown;
    lp_supply: unknown;
    fee_bps: number;
    token_a_decimals: number;
    token_b_decimals: number;
    status: number;
    bump: number;
  };

  return {
    address,
    dex: decoded.dex,
    tokenA: decoded.token_a,
    tokenB: decoded.token_b,
    vaultA: decoded.vault_a,
    vaultB: decoded.vault_b,
    lpMint: decoded.lp_mint,
    reserveA: toBigInt(decoded.reserve_a),
    reserveB: toBigInt(decoded.reserve_b),
    lpSupply: toBigInt(decoded.lp_supply),
    feeBps: decoded.fee_bps,
    tokenADecimals: decoded.token_a_decimals,
    tokenBDecimals: decoded.token_b_decimals,
    status: decoded.status,
    bump: decoded.bump,
  };
}

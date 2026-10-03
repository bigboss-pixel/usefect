import { PublicKey } from "@solana/web3.js";

import { USEFECT_PROGRAM_ID } from "./config";

const DEX_CONFIG_SEED = Buffer.from("dex-config");
const POOL_SEED = Buffer.from("pool");
const VAULT_A_SEED = Buffer.from("vault-a");
const VAULT_B_SEED = Buffer.from("vault-b");
const LP_MINT_SEED = Buffer.from("lp-mint");
const LP_LOCK_SEED = Buffer.from("lp-lock");

export function getDexConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [DEX_CONFIG_SEED],
    USEFECT_PROGRAM_ID,
  );
}

export function getPoolPda(
  tokenA: PublicKey,
  tokenB: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      POOL_SEED,
      tokenA.toBuffer(),
      tokenB.toBuffer(),
    ],
    USEFECT_PROGRAM_ID,
  );
}

export function getVaultAPda(
  pool: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_A_SEED, pool.toBuffer()],
    USEFECT_PROGRAM_ID,
  );
}

export function getVaultBPda(
  pool: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_B_SEED, pool.toBuffer()],
    USEFECT_PROGRAM_ID,
  );
}

export function getLpMintPda(
  pool: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [LP_MINT_SEED, pool.toBuffer()],
    USEFECT_PROGRAM_ID,
  );
}

export function getLpLockPda(
  pool: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [LP_LOCK_SEED, pool.toBuffer()],
    USEFECT_PROGRAM_ID,
  );
}

import { BN } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import type {
  Connection,
} from "@solana/web3.js";
import type {
  WalletContextState,
} from "@solana/wallet-adapter-react";

import { createDexProgram } from "./program";
import {
  getDexConfigPda,
  getVaultAPda,
  getVaultBPda,
} from "./pdas";
import type { DexPoolSnapshot } from "./pool";
import type { DexSwapQuote } from "./quote";

export type ExecuteSwapParams = {
  connection: Connection;
  wallet: Pick<
    WalletContextState,
    "publicKey" | "sendTransaction" | "signTransaction"
  >;
  pool: DexPoolSnapshot;
  quote: DexSwapQuote;
  slippageBps?: bigint;
};

export async function executeSwap({
  connection,
  wallet,
  pool,
  quote,
  slippageBps = BigInt(50),
}: ExecuteSwapParams): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet is not connected");
  }

  if (!wallet.signTransaction) {
    throw new Error(
      "Wallet does not support transaction signing",
    );
  }

  if (slippageBps < BigInt(0) || slippageBps > BigInt(10_000)) {
    throw new Error("Invalid slippage");
  }

  if (quote.pool.equals(pool.address) === false) {
    throw new Error("Quote does not match pool");
  }

  if (
    !quote.inputMint.equals(pool.tokenA) &&
    !quote.inputMint.equals(pool.tokenB)
  ) {
    throw new Error(
      "Quote input token does not belong to pool",
    );
  }

  const aToB = quote.inputMint.equals(pool.tokenA);

  const inputMint = aToB
    ? pool.tokenA
    : pool.tokenB;

  const outputMint = aToB
    ? pool.tokenB
    : pool.tokenA;

  if (!inputMint.equals(quote.inputMint)) {
    throw new Error("Invalid input mint");
  }

  if (!outputMint.equals(quote.outputMint)) {
    throw new Error("Invalid output mint");
  }

  const amountOutMin =
    quote.amountOut -
    (quote.amountOut * slippageBps) /
      BigInt(10_000);

  if (amountOutMin <= BigInt(0)) {
    throw new Error(
      "Minimum output amount must be greater than zero",
    );
  }

  const userTokenA =
    await getAssociatedTokenAddress(
      pool.tokenA,
      wallet.publicKey,
    );

  const userTokenB =
    await getAssociatedTokenAddress(
      pool.tokenB,
      wallet.publicKey,
    );

  const [dexConfig] = getDexConfigPda();
  const [vaultA] = getVaultAPda(pool.address);
  const [vaultB] = getVaultBPda(pool.address);

  const program = createDexProgram(
    connection,
    wallet,
  );

  const transaction = new Transaction();

  const [userTokenAInfo, userTokenBInfo] =
    await Promise.all([
      connection.getAccountInfo(userTokenA),
      connection.getAccountInfo(userTokenB),
    ]);

  if (!userTokenAInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userTokenA,
        wallet.publicKey,
        pool.tokenA,
      ),
    );
  }

  if (!userTokenBInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userTokenB,
        wallet.publicKey,
        pool.tokenB,
      ),
    );
  }

  const swapInstruction =
    await program.methods
      .swap(
        new BN(quote.amountIn.toString()),
        new BN(amountOutMin.toString()),
        aToB,
      )
      .accounts({
        dexConfig,
        pool: pool.address,
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        vaultA,
        vaultB,
        userTokenA,
        userTokenB,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

  transaction.add(swapInstruction);

  const signature =
    await wallet.sendTransaction(
      transaction,
      connection,
      {
        preflightCommitment: "confirmed",
      },
    );

  await connection.confirmTransaction(
    signature,
    "confirmed",
  );

  return signature;
}

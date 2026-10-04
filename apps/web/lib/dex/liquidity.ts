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

import { createDexProgram } from "./program";
import { getDexConfigPda, getLpLockPda } from "./pdas";
import { solanaConnection } from "./connection";
import type { DexPoolSnapshot } from "./pool";

const BPS_DENOMINATOR = BigInt(10_000);
const MINIMUM_LIQUIDITY = BigInt(1_000);

export type LiquidityQuote = {
  amountA: bigint;
  amountB: bigint;
  lpAmount: bigint;
  lpAmountMin: bigint;
  initial: boolean;
};

export type RemoveLiquidityQuote = {
  lpAmount: bigint;
  amountA: bigint;
  amountB: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
};

function requirePositive(value: bigint, message: string): void {
  if (value <= BigInt(0)) {
    throw new Error(message);
  }
}

function applySlippageDown(
  amount: bigint,
  slippageBps: number,
): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10_000) {
    throw new Error("Invalid slippage");
  }

  return (
    amount * (BPS_DENOMINATOR - BigInt(slippageBps))
  ) / BPS_DENOMINATOR;
}

function integerSqrt(value: bigint): bigint {
  if (value < BigInt(0)) {
    throw new Error("Cannot calculate square root of a negative number");
  }

  if (value < BigInt(2)) {
    return value;
  }

  let x = value;
  let y = (x + BigInt(1)) / BigInt(2);

  while (y < x) {
    x = y;
    y = (x + value / x) / BigInt(2);
  }

  return x;
}

export function quoteAddLiquidity(
  pool: DexPoolSnapshot,
  amountA: bigint,
  amountB: bigint,
  slippageBps: number,
): LiquidityQuote {
  requirePositive(amountA, "Amount A must be greater than zero");
  requirePositive(amountB, "Amount B must be greater than zero");

  const initial =
    pool.reserveA === BigInt(0) &&
    pool.reserveB === BigInt(0) &&
    pool.lpSupply === BigInt(0);

  let lpAmount: bigint;

  if (initial) {
    const product = amountA * amountB;
    const root = integerSqrt(product);

    if (root <= MINIMUM_LIQUIDITY) {
      throw new Error("Initial liquidity is too small");
    }

    lpAmount = root - MINIMUM_LIQUIDITY;
  } else {
    if (
      pool.reserveA <= BigInt(0) ||
      pool.reserveB <= BigInt(0) ||
      pool.lpSupply <= BigInt(0)
    ) {
      throw new Error("Invalid pool liquidity state");
    }

    const lpFromA =
      (amountA * pool.lpSupply) / pool.reserveA;

    const lpFromB =
      (amountB * pool.lpSupply) / pool.reserveB;

    lpAmount =
      lpFromA < lpFromB ? lpFromA : lpFromB;

    if (lpAmount <= BigInt(0)) {
      throw new Error("Liquidity amount is too small");
    }
  }

  return {
    amountA,
    amountB,
    lpAmount,
    lpAmountMin: applySlippageDown(
      lpAmount,
      slippageBps,
    ),
    initial,
  };
}

export function quoteRemoveLiquidity(
  pool: DexPoolSnapshot,
  lpAmount: bigint,
  slippageBps: number,
): RemoveLiquidityQuote {
  requirePositive(lpAmount, "LP amount must be greater than zero");

  if (pool.lpSupply <= BigInt(0)) {
    throw new Error("Invalid LP supply");
  }

  const amountA =
    (lpAmount * pool.reserveA) / pool.lpSupply;

  const amountB =
    (lpAmount * pool.reserveB) / pool.lpSupply;

  if (amountA <= BigInt(0) || amountB <= BigInt(0)) {
    throw new Error("LP amount is too small");
  }

  return {
    lpAmount,
    amountA,
    amountB,
    amountAMin: applySlippageDown(
      amountA,
      slippageBps,
    ),
    amountBMin: applySlippageDown(
      amountB,
      slippageBps,
    ),
  };
}

type LiquidityWallet = {
  publicKey: PublicKey | null;
  signTransaction: NonNullable<
    import("@solana/wallet-adapter-react").WalletContextState["signTransaction"]
  >;
  sendTransaction: NonNullable<
    import("@solana/wallet-adapter-react").WalletContextState["sendTransaction"]
  >;
};

async function ensureAta(
  transaction: Transaction,
  owner: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> {
  const ata = await getAssociatedTokenAddress(
    mint,
    owner,
  );

  const accountInfo =
    await solanaConnection.getAccountInfo(
      ata,
      "confirmed",
    );

  if (!accountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        owner,
        ata,
        owner,
        mint,
      ),
    );
  }

  return ata;
}

export async function executeAddLiquidity(params: {
  wallet: LiquidityWallet;
  pool: DexPoolSnapshot;
  amountA: bigint;
  amountB: bigint;
  slippageBps: number;
}): Promise<{
  signature: string;
  quote: LiquidityQuote;
}> {
  const {
    wallet,
    pool,
    amountA,
    amountB,
    slippageBps,
  } = params;

  if (!wallet.publicKey) {
    throw new Error("Wallet is not connected");
  }

  if (pool.status !== 1) {
    throw new Error("Pool is currently inactive.");
  }

  const quote = quoteAddLiquidity(
    pool,
    amountA,
    amountB,
    slippageBps,
  );

  const user = wallet.publicKey;

  const [dexConfig] = getDexConfigPda();
  const [lpLockAccount] = getLpLockPda(pool.address);

  const transaction = new Transaction();

  const userTokenA =
    await ensureAta(transaction, user, pool.tokenA);

  const userTokenB =
    await ensureAta(transaction, user, pool.tokenB);

  const userLpTokenAccount =
    await ensureAta(transaction, user, pool.lpMint);

  const program = createDexProgram(
    solanaConnection,
    wallet,
  );

  const instruction =
    await program.methods
      .addLiquidity(
        new BN(amountA.toString()),
        new BN(amountB.toString()),
        new BN(quote.lpAmountMin.toString()),
      )
      .accounts({
        provider: user,
        dexConfig,
        pool: pool.address,
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        vaultA: pool.vaultA,
        vaultB: pool.vaultB,
        userTokenA,
        userTokenB,
        lpMint: pool.lpMint,
        userLpTokenAccount,
        lpLockAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

  transaction.add(instruction);

  const signature =
    await wallet.sendTransaction(
      transaction,
      solanaConnection,
      {
        preflightCommitment: "confirmed",
      },
    );

  await solanaConnection.confirmTransaction(
    signature,
    "confirmed",
  );

  return {
    signature,
    quote,
  };
}

export async function executeRemoveLiquidity(params: {
  wallet: LiquidityWallet;
  pool: DexPoolSnapshot;
  lpAmount: bigint;
  slippageBps: number;
}): Promise<{
  signature: string;
  quote: RemoveLiquidityQuote;
}> {
  const {
    wallet,
    pool,
    lpAmount,
    slippageBps,
  } = params;

  if (!wallet.publicKey) {
    throw new Error("Wallet is not connected");
  }

  if (pool.status !== 1) {
    throw new Error("Pool is currently inactive.");
  }

  const quote = quoteRemoveLiquidity(
    pool,
    lpAmount,
    slippageBps,
  );

  const user = wallet.publicKey;

  const [dexConfig] = getDexConfigPda();

  const transaction = new Transaction();

  const userLpTokenAccount =
    await ensureAta(transaction, user, pool.lpMint);

  const userTokenA =
    await ensureAta(transaction, user, pool.tokenA);

  const userTokenB =
    await ensureAta(transaction, user, pool.tokenB);

  const program = createDexProgram(
    solanaConnection,
    wallet,
  );

  const instruction =
    await program.methods
      .removeLiquidity(
        new BN(lpAmount.toString()),
        new BN(quote.amountAMin.toString()),
        new BN(quote.amountBMin.toString()),
      )
      .accounts({
        dexConfig,
        pool: pool.address,
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        vaultA: pool.vaultA,
        vaultB: pool.vaultB,
        lpMint: pool.lpMint,
        userLpTokenAccount,
        userTokenA,
        userTokenB,
        provider: user,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

  transaction.add(instruction);

  const signature =
    await wallet.sendTransaction(
      transaction,
      solanaConnection,
      {
        preflightCommitment: "confirmed",
      },
    );

  await solanaConnection.confirmTransaction(
    signature,
    "confirmed",
  );

  return {
    signature,
    quote,
  };
}

import { PublicKey } from "@solana/web3.js";

import {
  calculatePriceImpact,
  calculateSwapOutput,
  formatTokenAmount,
} from "./math";
import type { DexPoolSnapshot } from "./pool";

export type DexSwapQuote = {
  pool: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  amountIn: bigint;
  amountOut: bigint;
  reserveIn: bigint;
  reserveOut: bigint;
  feeBps: number;
  feeAmount: bigint;
  priceImpact: number;
  executionPrice: number;
  spotPrice: number;
  inputDecimals: number;
  outputDecimals: number;
  formattedAmountIn: string;
  formattedAmountOut: string;
};

function getSwapDirection(
  pool: DexPoolSnapshot,
  inputMint: PublicKey,
) {
  if (inputMint.equals(pool.tokenA)) {
    return {
      inputMint: pool.tokenA,
      outputMint: pool.tokenB,
      reserveIn: pool.reserveA,
      reserveOut: pool.reserveB,
      inputDecimals: pool.tokenADecimals,
      outputDecimals: pool.tokenBDecimals,
    };
  }

  if (inputMint.equals(pool.tokenB)) {
    return {
      inputMint: pool.tokenB,
      outputMint: pool.tokenA,
      reserveIn: pool.reserveB,
      reserveOut: pool.reserveA,
      inputDecimals: pool.tokenBDecimals,
      outputDecimals: pool.tokenADecimals,
    };
  }

  throw new Error("Input token is not part of this pool");
}

export function buildSwapQuote(params: {
  pool: DexPoolSnapshot;
  inputMint: PublicKey;
  amountIn: bigint;
}): DexSwapQuote {
  const {
    pool,
    inputMint,
    amountIn,
  } = params;

  if (amountIn <= BigInt(0)) {
    throw new Error("Input amount must be greater than zero");
  }

  if (pool.status !== 1) {
    throw new Error("Pool is inactive");
  }

  if (pool.reserveA <= BigInt(0) || pool.reserveB <= BigInt(0)) {
    throw new Error("Pool has no liquidity");
  }

  const direction = getSwapDirection(
    pool,
    inputMint,
  );

  const feeBps = BigInt(pool.feeBps);

  const amountOut = calculateSwapOutput({
    amountIn,
    reserveIn: direction.reserveIn,
    reserveOut: direction.reserveOut,
    feeBps,
  });

  if (amountOut <= BigInt(0)) {
    throw new Error("Swap output is zero");
  }

  const feeAmount =
    (amountIn * feeBps) / BigInt(10_000);

  const priceImpact = calculatePriceImpact({
    amountIn,
    amountOut,
    reserveIn: direction.reserveIn,
    reserveOut: direction.reserveOut,
  });

  const spotPrice =
    Number(direction.reserveOut) /
    Number(direction.reserveIn);

  const executionPrice =
    Number(amountOut) /
    Number(amountIn);

  return {
    pool: pool.address,
    inputMint: direction.inputMint,
    outputMint: direction.outputMint,
    amountIn,
    amountOut,
    reserveIn: direction.reserveIn,
    reserveOut: direction.reserveOut,
    feeBps: pool.feeBps,
    feeAmount,
    priceImpact,
    executionPrice,
    spotPrice,
    inputDecimals: direction.inputDecimals,
    outputDecimals: direction.outputDecimals,
    formattedAmountIn: formatTokenAmount(
      amountIn,
      direction.inputDecimals,
    ),
    formattedAmountOut: formatTokenAmount(
      amountOut,
      direction.outputDecimals,
    ),
  };
}

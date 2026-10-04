import type { DexPoolSnapshot } from "./pool";

export interface DexMarketData {
  reserveA: bigint;
  reserveB: bigint;
  lpSupply: bigint;
  feeBps: number;
  protocolFeeBps: number;
  tokenADecimals: number;
  tokenBDecimals: number;

  priceAToB: number | null;
  priceBToA: number | null;

  totalLiquidityA: number;
  totalLiquidityB: number;

  walletLpBalance: bigint;
  walletLpShare: number;
  walletLiquidityA: number;
  walletLiquidityB: number;

  poolActive: boolean;
}

function toUiAmount(amount: bigint, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}

function safeRatio(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) {
    return null;
  }

  return a / b;
}

export function buildDexMarketData(
  pool: DexPoolSnapshot,
  walletLpBalance: bigint,
  protocolFeeBps = 0,
): DexMarketData {
  const reserveA = pool.reserveA;
  const reserveB = pool.reserveB;
  const lpSupply = pool.lpSupply;

  const reserveAUi = toUiAmount(reserveA, pool.tokenADecimals);
  const reserveBUi = toUiAmount(reserveB, pool.tokenBDecimals);

  const priceAToB = safeRatio(reserveBUi, reserveAUi);
  const priceBToA = safeRatio(reserveAUi, reserveBUi);

  const walletLpShare =
    lpSupply > BigInt(0)
      ? Number(walletLpBalance * BigInt(10000) / lpSupply) / 100
      : 0;

  const walletLiquidityA =
    reserveAUi * (walletLpShare / 100);

  const walletLiquidityB =
    reserveBUi * (walletLpShare / 100);

  return {
    reserveA,
    reserveB,
    lpSupply,
    feeBps: pool.feeBps,
    protocolFeeBps,

    tokenADecimals: pool.tokenADecimals,
    tokenBDecimals: pool.tokenBDecimals,

    priceAToB,
    priceBToA,

    totalLiquidityA: reserveAUi,
    totalLiquidityB: reserveBUi,

    walletLpBalance,
    walletLpShare,
    walletLiquidityA,
    walletLiquidityB,

    poolActive: pool.status === 1,
  };
}

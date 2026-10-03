"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";

import {
  DEX_NETWORK,
  getDexTokenAddresses,
} from "../../lib/dex/config";
import {
  formatTokenAmount,
  parseTokenAmount,
} from "../../lib/dex/math";
import {
  fetchDexPool,
  type DexPoolSnapshot,
} from "../../lib/dex/pool";
import {
  buildSwapQuote,
  type DexSwapQuote,
} from "../../lib/dex/quote";
import { executeSwap } from "../../lib/dex/swap";
import {
  executeAddLiquidity,
  executeRemoveLiquidity,
  quoteAddLiquidity,
  quoteRemoveLiquidity,
  type LiquidityQuote,
  type RemoveLiquidityQuote,
} from "../../lib/dex/liquidity";
import { fetchWalletTokenBalance } from "../../lib/dex/token";

const tokenConfig = getDexTokenAddresses();

const DEFAULT_SLIPPAGE_BPS = 50;

type DexTab = "swap" | "liquidity";
type LiquidityMode = "add" | "remove";

type DexActivity = {
  id: string;
  type: "swap" | "add" | "remove";
  description: string;
  signature: string;
  timestamp: number;
};

function shortKey(value: PublicKey | null): string {
  if (!value) return "—";

  const text = value.toBase58();

  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function extractErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const normalized = message.toLowerCase();

  if (
    normalized.includes("user rejected") ||
    normalized.includes("user declined") ||
    normalized.includes("rejected the request")
  ) {
    return "Transaction was cancelled in your wallet.";
  }

  if (
    normalized.includes("insufficient funds") ||
    normalized.includes("insufficient lamports") ||
    normalized.includes("insufficient balance")
  ) {
    return "Insufficient balance to complete this transaction.";
  }

  if (
    normalized.includes("blockhash") ||
    normalized.includes("block height exceeded") ||
    normalized.includes("transaction expired")
  ) {
    return "The transaction expired before confirmation. Please try again.";
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network error") ||
    normalized.includes("failed to connect") ||
    normalized.includes("timeout")
  ) {
    return "Network connection failed. Please check your connection and try again.";
  }

  if (
    normalized.includes("429") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return "The Solana RPC is temporarily rate-limited. Please try again shortly.";
  }

  if (
    normalized.includes("pool account not found") ||
    normalized.includes("pool is not available")
  ) {
    return "The liquidity pool is currently unavailable.";
  }

  return "The transaction or DEX request could not be completed. Please try again.";
}

export default function DexPage() {
  const { connection } = useConnection();

  const {
    publicKey,
    connected,
    sendTransaction,
    signTransaction,
  } = useWallet();

  const [pool, setPool] =
    useState<DexPoolSnapshot | null>(null);

  const [activeTab, setActiveTab] =
    useState<DexTab>("swap");

  const [liquidityMode, setLiquidityMode] =
    useState<LiquidityMode>("add");

  const [inputMint, setInputMint] =
    useState<PublicKey | null>(
      tokenConfig?.tokenA ?? null,
    );

  const [inputValue, setInputValue] =
    useState("");
  const [slippageBps, setSlippageBps] =
    useState(DEFAULT_SLIPPAGE_BPS);
  const [customSlippage, setCustomSlippage] =
    useState("");

  const [inputBalance, setInputBalance] =
    useState(BigInt(0));

  const [outputBalance, setOutputBalance] =
    useState(BigInt(0));

  const [tokenABalance, setTokenABalance] =
    useState(BigInt(0));

  const [tokenBBalance, setTokenBBalance] =
    useState(BigInt(0));

  const [lpBalance, setLpBalance] =
    useState(BigInt(0));

  const [swapQuote, setSwapQuote] =
    useState<DexSwapQuote | null>(null);

  const [liquidityAmountA, setLiquidityAmountA] =
    useState("");

  const [liquidityAmountB, setLiquidityAmountB] =
    useState("");

  const [liquidityLpInput, setLiquidityLpInput] =
    useState("");

  const [liquidityQuote, setLiquidityQuote] =
    useState<LiquidityQuote | null>(null);

  const [removeQuote, setRemoveQuote] =
    useState<RemoveLiquidityQuote | null>(null);

  const [loadingPool, setLoadingPool] =
    useState(false);

  const [loadingBalances, setLoadingBalances] =
    useState(false);

  const [swapping, setSwapping] =
    useState(false);

  const [liquidityLoading, setLiquidityLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [successSignature, setSuccessSignature] =
    useState<string | null>(null);

  const [activities, setActivities] =
    useState<DexActivity[]>([]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const outputMint = useMemo(() => {
    if (!tokenConfig || !inputMint) {
      return null;
    }

    return inputMint.equals(tokenConfig.tokenA)
      ? tokenConfig.tokenB
      : tokenConfig.tokenA;
  }, [inputMint]);

  const inputDecimals = useMemo(() => {
    if (!pool || !inputMint) {
      return 0;
    }

    return inputMint.equals(pool.tokenA)
      ? pool.tokenADecimals
      : pool.tokenBDecimals;
  }, [pool, inputMint]);

  const outputDecimals = useMemo(() => {
    if (!pool || !outputMint) {
      return 0;
    }

    return outputMint.equals(pool.tokenA)
      ? pool.tokenADecimals
      : pool.tokenBDecimals;
  }, [pool, outputMint]);

  const loadPool = useCallback(async () => {
    if (!tokenConfig) {
      setPool(null);
      return;
    }

    setLoadingPool(true);

    try {
      const nextPool = await fetchDexPool(
        tokenConfig.tokenA,
        tokenConfig.tokenB,
      );

      setPool(nextPool);
    } catch (err) {
      setPool(null);
      setError(extractErrorMessage(err));
    } finally {
      setLoadingPool(false);
    }
  }, []);

  const loadBalances = useCallback(async () => {
    if (!connected || !publicKey || !tokenConfig) {
      setInputBalance(BigInt(0));
      setOutputBalance(BigInt(0));
      setTokenABalance(BigInt(0));
      setTokenBBalance(BigInt(0));
      setLpBalance(BigInt(0));
      return;
    }

    setLoadingBalances(true);

    try {
      const balances = await Promise.all([
        fetchWalletTokenBalance(
          publicKey,
          tokenConfig.tokenA,
        ),
        fetchWalletTokenBalance(
          publicKey,
          tokenConfig.tokenB,
        ),
        pool
          ? fetchWalletTokenBalance(
              publicKey,
              pool.lpMint,
            )
          : Promise.resolve(null),
      ]);

      const [tokenA, tokenB, lp] = balances;

      setTokenABalance(tokenA.amount);
      setTokenBBalance(tokenB.amount);

      if (lp) {
        setLpBalance(lp.amount);
      } else {
        setLpBalance(BigInt(0));
      }

      const nextInput =
        inputMint?.equals(tokenConfig.tokenA)
          ? tokenA.amount
          : tokenB.amount;

      const nextOutput =
        inputMint?.equals(tokenConfig.tokenA)
          ? tokenB.amount
          : tokenA.amount;

      setInputBalance(nextInput);
      setOutputBalance(nextOutput);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoadingBalances(false);
    }
  }, [
    connected,
    publicKey,
    inputMint,
    pool,
  ]);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (
        !pool ||
        !inputMint ||
        !inputValue.trim()
      ) {
        setSwapQuote(null);
        return;
      }

      try {
        const amountIn = parseTokenAmount(
          inputValue,
          inputDecimals,
        );

        if (amountIn <= BigInt(0)) {
          setSwapQuote(null);
          return;
        }

        const nextQuote = buildSwapQuote({
          pool,
          inputMint,
          amountIn,
        });

        setSwapQuote(nextQuote);
        setError(null);
      } catch (err) {
        setSwapQuote(null);
        setError(extractErrorMessage(err));
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    pool,
    inputMint,
    inputValue,
    inputDecimals,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (
        activeTab !== "liquidity" ||
        liquidityMode !== "add" ||
        !pool ||
        !liquidityAmountA.trim() ||
        !liquidityAmountB.trim()
      ) {
        setLiquidityQuote(null);
        return;
      }

      try {
        const amountA = parseTokenAmount(
          liquidityAmountA,
          pool.tokenADecimals,
        );

        const amountB = parseTokenAmount(
          liquidityAmountB,
          pool.tokenBDecimals,
        );

        const nextQuote = quoteAddLiquidity(
          pool,
          amountA,
          amountB,
          DEFAULT_SLIPPAGE_BPS,
        );

        setLiquidityQuote(nextQuote);
        setError(null);
      } catch (err) {
        setLiquidityQuote(null);
        setError(extractErrorMessage(err));
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    liquidityMode,
    pool,
    liquidityAmountA,
    liquidityAmountB,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (
        activeTab !== "liquidity" ||
        liquidityMode !== "remove" ||
        !pool ||
        !liquidityLpInput.trim()
      ) {
        setRemoveQuote(null);
        return;
      }

      try {
        const lpAmount = parseTokenAmount(
          liquidityLpInput,
          9,
        );

        const nextQuote = quoteRemoveLiquidity(
          pool,
          lpAmount,
          DEFAULT_SLIPPAGE_BPS,
        );

        setRemoveQuote(nextQuote);
        setError(null);
      } catch (err) {
        setRemoveQuote(null);
        setError(extractErrorMessage(err));
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    liquidityMode,
    pool,
    liquidityLpInput,
  ]);

  function flipTokens() {
    setInputMint(outputMint);
    setInputValue("");
    setSwapQuote(null);
    setError(null);
    setSuccessSignature(null);
  }

  function setMaxInput() {
    setInputValue(
      formatTokenAmount(
        inputBalance,
        inputDecimals,
      ),
    );
  }

  function setMaxLiquidityA() {
    if (!pool) return;

    setLiquidityAmountA(
      formatTokenAmount(
        tokenABalance,
        pool.tokenADecimals,
      ),
    );
  }

  function setMaxLiquidityB() {
    if (!pool) return;

    setLiquidityAmountB(
      formatTokenAmount(
        tokenBBalance,
        pool.tokenBDecimals,
      ),
    );
  }

  function setMaxLp() {
    setLiquidityLpInput(
      formatTokenAmount(lpBalance, 9),
    );
  }

  async function handleSwap() {
    setError(null);
    setSuccessSignature(null);

    if (
      !connected ||
      !publicKey ||
      !sendTransaction ||
      !signTransaction
    ) {
      setError("Connect your wallet first.");
      return;
    }

    if (!pool) {
      setError("Pool is not available.");
      return;
    }

    if (!swapQuote) {
      setError("Enter a valid amount first.");
      return;
    }

    if (swapQuote.amountIn > inputBalance) {
      setError("Insufficient token balance.");
      return;
    }

    if (swapQuote.amountOut <= BigInt(0)) {
      setError("Swap output is zero.");
      return;
    }

    setSwapping(true);

    try {
      const signature = await executeSwap({
        connection,
        wallet: {
          publicKey,
          sendTransaction,
          signTransaction,
        },
        pool,
        quote: swapQuote,
        slippageBps: BigInt(slippageBps),
      });

      setSuccessSignature(signature);

      setActivities((current) => [
        {
          id: signature,
          type: "swap" as const,
          description: `${inputValue || formatTokenAmount(
            swapQuote.amountIn,
            inputDecimals,
          )} ${shortKey(inputMint)} → ${swapQuote.formattedAmountOut} ${shortKey(outputMint)}`,
          signature,
          timestamp: Date.now(),
        },
        ...current,
      ].slice(0, 5));

      setInputValue("");
      setSwapQuote(null);

      await loadPool();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSwapping(false);
      await loadBalances();
    }
  }

  async function handleAddLiquidity() {
    setError(null);
    setSuccessSignature(null);

    if (
      !connected ||
      !publicKey ||
      !sendTransaction ||
      !signTransaction
    ) {
      setError("Connect your wallet first.");
      return;
    }

    if (!pool || !liquidityQuote) {
      setError("Enter valid liquidity amounts first.");
      return;
    }

    const amountA = liquidityQuote.amountA;
    const amountB = liquidityQuote.amountB;

    if (amountA > tokenABalance) {
      setError("Insufficient Token A balance.");
      return;
    }

    if (amountB > tokenBBalance) {
      setError("Insufficient Token B balance.");
      return;
    }

    setLiquidityLoading(true);

    try {
      const result = await executeAddLiquidity({
        wallet: {
          publicKey,
          sendTransaction,
          signTransaction,
        },
        pool,
        amountA,
        amountB,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
      });

      setSuccessSignature(result.signature);

      setActivities((current) => [
        {
          id: result.signature,
          type: "add" as const,
          description: `Add ${formatTokenAmount(
            amountA,
            pool.tokenADecimals,
          )} ${shortKey(pool.tokenA)} + ${formatTokenAmount(
            amountB,
            pool.tokenBDecimals,
          )} ${shortKey(pool.tokenB)}`,
          signature: result.signature,
          timestamp: Date.now(),
        },
        ...current,
      ].slice(0, 5));

      setLiquidityAmountA("");
      setLiquidityAmountB("");
      setLiquidityQuote(null);

      await loadPool();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLiquidityLoading(false);
      await loadBalances();
    }
  }

  async function handleRemoveLiquidity() {
    setError(null);
    setSuccessSignature(null);

    if (
      !connected ||
      !publicKey ||
      !sendTransaction ||
      !signTransaction
    ) {
      setError("Connect your wallet first.");
      return;
    }

    if (!pool || !removeQuote) {
      setError("Enter a valid LP amount first.");
      return;
    }

    if (removeQuote.lpAmount > lpBalance) {
      setError("Insufficient LP token balance.");
      return;
    }

    setLiquidityLoading(true);

    try {
      const result = await executeRemoveLiquidity({
        wallet: {
          publicKey,
          sendTransaction,
          signTransaction,
        },
        pool,
        lpAmount: removeQuote.lpAmount,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
      });

      setSuccessSignature(result.signature);

      setActivities((current) => [
        {
          id: result.signature,
          type: "remove" as const,
          description: `Remove ${formatTokenAmount(
            removeQuote.lpAmount,
            9,
          )} LP`,
          signature: result.signature,
          timestamp: Date.now(),
        },
        ...current,
      ].slice(0, 5));

      setLiquidityLpInput("");
      setRemoveQuote(null);

      await loadPool();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLiquidityLoading(false);
      await loadBalances();
    }
  }

  const poolPrice = swapQuote?.spotPrice ?? 0;
  const executionPrice =
    swapQuote?.executionPrice ?? 0;

  const priceImpact =
    swapQuote?.priceImpact ?? 0;

  const priceImpactLevel =
    priceImpact >= 3
      ? "high"
      : priceImpact >= 1
        ? "medium"
        : "low";

  const insufficientSwapBalance =
    swapQuote !== null &&
    swapQuote.amountIn > inputBalance;

  const swapDisabled =
    swapping ||
    !connected ||
    !pool ||
    !swapQuote ||
    insufficientSwapBalance ||
    inputBalance <= BigInt(0);

  const insufficientAddA =
    liquidityQuote !== null &&
    liquidityQuote.amountA > tokenABalance;

  const insufficientAddB =
    liquidityQuote !== null &&
    liquidityQuote.amountB > tokenBBalance;

  const addDisabled =
    liquidityLoading ||
    !connected ||
    !pool ||
    !liquidityQuote ||
    insufficientAddA ||
    insufficientAddB;

  const insufficientLp =
    removeQuote !== null &&
    removeQuote.lpAmount > lpBalance;

  const removeDisabled =
    liquidityLoading ||
    !connected ||
    !pool ||
    !removeQuote ||
    insufficientLp ||
    lpBalance <= BigInt(0);

  const reserveAUi = pool
    ? Number(pool.reserveA) / 10 ** pool.tokenADecimals
    : 0;

  const reserveBUi = pool
    ? Number(pool.reserveB) / 10 ** pool.tokenBDecimals
    : 0;

  const reserveTotal = reserveAUi + reserveBUi;

  const reserveAShare =
    reserveTotal > 0
      ? Math.min(100, Math.max(0, (reserveAUi / reserveTotal) * 100))
      : 50;

  const reserveBShare = 100 - reserveAShare;

  const slippagePercent = slippageBps / 100;

  function applySlippage(nextBps: number) {
    if (!Number.isFinite(nextBps)) return;

    const safeBps = Math.min(
      5000,
      Math.max(1, Math.round(nextBps)),
    );

    setSlippageBps(safeBps);
    setCustomSlippage("");
  }

  function applyCustomSlippage(value: string) {
    setCustomSlippage(value);

    if (!value.trim()) {
      return;
    }

    const percent = Number(value);

    if (!Number.isFinite(percent) || percent <= 0) {
      return;
    }

    const bps = Math.round(percent * 100);

    if (bps >= 1 && bps <= 5000) {
      setSlippageBps(bps);
    }
  }

  return (
    <main className="usefect-dex text-white">
      <div className="usefect-dex-shell mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="usefect-dex-header -mx-4 mb-8 flex items-center justify-between gap-4 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div>
            <p className="text-sm font-medium tracking-wide text-cyan-400">
              USEFECT DEX
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {activeTab === "swap"
                ? "Swap"
                : "Liquidity"}
            </h1>
          </div>

          {mounted ? (
            <WalletMultiButton />
          ) : (
            <div className="h-10 w-40 rounded-xl bg-white/10" />
          )}
        </header>

        <section className="flex flex-1 items-start justify-center pb-12 pt-2">
          <div className="grid w-full grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="usefect-dex-panel usefect-dex-fade w-full rounded-[28px] p-4 sm:p-6 lg:p-7">
            <div className="mb-5 flex rounded-2xl border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("swap");
                  setError(null);
                  setSuccessSignature(null);
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "swap"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Swap
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("liquidity");
                  setError(null);
                  setSuccessSignature(null);
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "liquidity"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Liquidity
              </button>
            </div>

            {!tokenConfig ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
                Configure{" "}
                <code>NEXT_PUBLIC_DEX_TOKEN_A</code>{" "}
                and{" "}
                <code>NEXT_PUBLIC_DEX_TOKEN_B</code>{" "}
                in <code>.env.local</code>.
              </div>
            ) : activeTab === "swap" ? (
              <>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Swap tokens
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Solana-native constant-product AMM.
                    </p>
                  </div>

                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    {swapping
                      ? "Swapping…"
                      : "Live quote"}
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-400">
                      Sell
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">
                        Balance{" "}
                        {formatTokenAmount(
                          inputBalance,
                          inputDecimals,
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={setMaxInput}
                        disabled={
                          !connected ||
                          inputBalance <= BigInt(0)
                        }
                        className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-slate-600"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      inputMode="decimal"
                      value={inputValue}
                      onChange={(event) =>
                        setInputValue(
                          event.target.value,
                        )
                      }
                      placeholder="0.00"
                      disabled={swapping}
                      className="min-w-0 flex-1 bg-transparent text-3xl font-semibold outline-none placeholder:text-slate-700 disabled:opacity-60"
                    />

                    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/15 text-[9px] font-bold text-cyan-300">
                        A
                      </span>

                      <span className="text-sm font-semibold text-slate-200">
                        {shortKey(inputMint)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 -my-3 flex justify-center">
                  <button
                    type="button"
                    onClick={flipTokens}
                    disabled={swapping}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-900/95 text-sm font-semibold text-slate-300 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-300 active:translate-y-0 disabled:opacity-50"
                    aria-label="Switch tokens"
                  >
                    ↕
                  </button>
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-400">
                      Receive
                    </span>

                    <span className="text-slate-500">
                      Balance{" "}
                      {formatTokenAmount(
                        outputBalance,
                        outputDecimals,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1 truncate text-3xl font-semibold text-slate-200">
                      {swapQuote?.formattedAmountOut ??
                        "0.00"}
                    </div>

                    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-400/15 text-[9px] font-bold text-violet-300">
                        B
                      </span>

                      <span className="text-sm font-semibold text-slate-200">
                        {shortKey(outputMint)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Pool
                    </span>

                    <span className="font-mono text-slate-300">
                      {pool
                        ? shortKey(pool.address)
                        : loadingPool
                          ? "Loading…"
                          : "Not found"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">
                        Rate
                      </p>

                      <p className="mt-1 text-slate-200">
                        {poolPrice > 0
                          ? poolPrice.toFixed(6)
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Execution
                      </p>

                      <p className="mt-1 text-slate-200">
                        {executionPrice > 0
                          ? executionPrice.toFixed(6)
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Fee
                      </p>

                      <p className="mt-1 text-slate-200">
                        {swapQuote
                          ? `${swapQuote.feeBps} bps`
                          : "—"}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-500">
                          Slippage tolerance
                        </p>

                        <span className="font-medium text-slate-200">
                          {slippagePercent.toFixed(2)}%
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {[10, 50, 100, 300].map((bps) => (
                          <button
                            key={bps}
                            type="button"
                            onClick={() => applySlippage(bps)}
                            disabled={swapping}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                              slippageBps === bps &&
                              customSlippage === ""
                                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                                : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20 hover:text-slate-300"
                            }`}
                          >
                            {(bps / 100).toFixed(2)}%
                          </button>
                        ))}

                        <div
                          className={`flex items-center rounded-lg border px-2 ${
                            customSlippage !== ""
                              ? "border-cyan-400/40 bg-cyan-400/10"
                              : "border-white/10 bg-white/[0.03]"
                          }`}
                        >
                          <input
                            inputMode="decimal"
                            value={customSlippage}
                            onChange={(event) =>
                              applyCustomSlippage(
                                event.target.value,
                              )
                            }
                            placeholder="Custom"
                            disabled={swapping}
                            className="w-16 bg-transparent py-1 text-xs text-white outline-none placeholder:text-slate-600"
                            aria-label="Custom slippage percentage"
                          />

                          <span className="text-xs text-slate-500">
                            %
                          </span>
                        </div>
                      </div>

                      {slippageBps >= 1000 && (
                        <p className="mt-2 text-[11px] text-amber-300">
                          High slippage tolerance. Your minimum
                          received amount will be less protected.
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Price impact
                      </p>

                      <p
                        className={`mt-1 font-medium ${
                          !swapQuote
                            ? "text-slate-200"
                            : priceImpactLevel === "high"
                              ? "text-rose-300"
                              : priceImpactLevel === "medium"
                                ? "text-amber-300"
                                : "text-emerald-300"
                        }`}
                      >
                        {swapQuote
                          ? formatPercent(priceImpact)
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Pool status
                      </p>

                      <p className="mt-1 text-emerald-300">
                        {pool?.status === 1
                          ? "Active"
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {swapQuote && priceImpactLevel === "medium" && (
                  <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5">
                    <p className="text-xs font-medium text-amber-300">
                      Price impact is noticeable.
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-amber-200/60">
                      A larger trade relative to the pool reserves
                      may result in a less favorable execution price.
                    </p>
                  </div>
                )}

                {swapQuote && priceImpactLevel === "high" && (
                  <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2.5">
                    <p className="text-xs font-semibold text-rose-300">
                      High price impact
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-rose-200/60">
                      This trade is large relative to the pool reserves.
                      Review the amount before confirming the swap.
                    </p>
                  </div>
                )}

                {insufficientSwapBalance && (
                  <p className="mt-3 text-sm text-rose-300">
                    Insufficient token balance.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleSwap()}
                  disabled={swapDisabled}
                  className="mt-3 w-full rounded-2xl bg-cyan-400 px-4 py-3.5 text-sm font-bold tracking-wide text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-xl hover:shadow-cyan-500/15 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500 disabled:shadow-none"
                >
                  {swapping
                    ? "Confirming swap…"
                    : !connected
                      ? "Connect Wallet"
                      : !swapQuote
                        ? "Enter Amount"
                        : insufficientSwapBalance
                          ? "Insufficient Balance"
                          : priceImpactLevel === "high"
                            ? "Review High Price Impact"
                            : "Swap"}
                </button>
              </>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">
                    Liquidity Pool
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Provide or remove liquidity from the
                    USEFECT AMM pool.
                  </p>
                </div>

                <div className="mb-4 flex rounded-2xl border border-white/10 bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLiquidityMode("add");
                      setError(null);
                      setSuccessSignature(null);
                    }}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      liquidityMode === "add"
                        ? "bg-white/10 text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Add
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLiquidityMode("remove");
                      setError(null);
                      setSuccessSignature(null);
                    }}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      liquidityMode === "remove"
                        ? "bg-white/10 text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Remove
                  </button>
                </div>

                {liquidityMode === "add" ? (
                  <>
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Token A</span>

                          <button
                            type="button"
                            onClick={setMaxLiquidityA}
                            disabled={
                              !connected ||
                              tokenABalance <= BigInt(0)
                            }
                            className="text-cyan-400 disabled:text-slate-600"
                          >
                            Balance:{" "}
                            {formatTokenAmount(
                              tokenABalance,
                              pool?.tokenADecimals ?? 0,
                            )}
                          </button>
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <input
                            inputMode="decimal"
                            value={liquidityAmountA}
                            onChange={(event) =>
                              setLiquidityAmountA(
                                event.target.value,
                              )
                            }
                            placeholder="0.00"
                            disabled={liquidityLoading}
                            className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-slate-700"
                          />

                          <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-mono">
                            {shortKey(
                              tokenConfig.tokenA,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-center text-slate-600">
                        +
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Token B</span>

                          <button
                            type="button"
                            onClick={setMaxLiquidityB}
                            disabled={
                              !connected ||
                              tokenBBalance <= BigInt(0)
                            }
                            className="text-cyan-400 disabled:text-slate-600"
                          >
                            Balance:{" "}
                            {formatTokenAmount(
                              tokenBBalance,
                              pool?.tokenBDecimals ?? 0,
                            )}
                          </button>
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <input
                            inputMode="decimal"
                            value={liquidityAmountB}
                            onChange={(event) =>
                              setLiquidityAmountB(
                                event.target.value,
                              )
                            }
                            placeholder="0.00"
                            disabled={liquidityLoading}
                            className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-slate-700"
                          />

                          <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-mono">
                            {shortKey(
                              tokenConfig.tokenB,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          LP received
                        </span>

                        <span className="font-medium">
                          {liquidityQuote
                            ? formatTokenAmount(
                                liquidityQuote.lpAmount,
                                9,
                              )
                            : "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-400">
                          Minimum LP
                        </span>

                        <span className="font-medium">
                          {liquidityQuote
                            ? formatTokenAmount(
                                liquidityQuote.lpAmountMin,
                                9,
                              )
                            : "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-400">
                          Slippage
                        </span>

                        <span>0.50%</span>
                      </div>

                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-400">
                          Your LP balance
                        </span>

                        <span>
                          {formatTokenAmount(
                            lpBalance,
                            9,
                          )}
                        </span>
                      </div>
                    </div>

                    {(insufficientAddA ||
                      insufficientAddB) && (
                      <p className="mt-3 text-sm text-rose-300">
                        Insufficient token balance.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        void handleAddLiquidity()
                      }
                      disabled={addDisabled}
                      className="mt-4 w-full rounded-2xl bg-cyan-500 px-4 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                    >
                      {liquidityLoading
                        ? "Confirming liquidity…"
                        : !connected
                          ? "Connect Wallet"
                          : !liquidityQuote
                            ? "Enter Amounts"
                            : insufficientAddA ||
                                insufficientAddB
                              ? "Insufficient Balance"
                              : "Add Liquidity"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>LP tokens</span>

                        <button
                          type="button"
                          onClick={setMaxLp}
                          disabled={
                            !connected ||
                            lpBalance <= BigInt(0)
                          }
                          className="text-cyan-400 disabled:text-slate-600"
                        >
                          Balance:{" "}
                          {formatTokenAmount(
                            lpBalance,
                            9,
                          )}
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <input
                          inputMode="decimal"
                          value={liquidityLpInput}
                          onChange={(event) =>
                            setLiquidityLpInput(
                              event.target.value,
                            )
                          }
                          placeholder="0.00"
                          disabled={liquidityLoading}
                          className="min-w-0 flex-1 bg-transparent text-3xl font-semibold outline-none placeholder:text-slate-700"
                        />

                        <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-mono">
                          LP
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          Token A received
                        </span>

                        <span>
                          {removeQuote
                            ? formatTokenAmount(
                                removeQuote.amountA,
                                pool?.tokenADecimals ?? 0,
                              )
                            : "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-400">
                          Token B received
                        </span>

                        <span>
                          {removeQuote
                            ? formatTokenAmount(
                                removeQuote.amountB,
                                pool?.tokenBDecimals ?? 0,
                              )
                            : "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-400">
                          Minimum A
                        </span>

                        <span>
                          {removeQuote
                            ? formatTokenAmount(
                                removeQuote.amountAMin,
                                pool?.tokenADecimals ?? 0,
                              )
                            : "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-400">
                          Minimum B
                        </span>

                        <span>
                          {removeQuote
                            ? formatTokenAmount(
                                removeQuote.amountBMin,
                                pool?.tokenBDecimals ?? 0,
                              )
                            : "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-400">
                          Slippage
                        </span>

                        <span>0.50%</span>
                      </div>
                    </div>

                    {insufficientLp && (
                      <p className="mt-3 text-sm text-rose-300">
                        Insufficient LP token balance.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        void handleRemoveLiquidity()
                      }
                      disabled={removeDisabled}
                      className="mt-4 w-full rounded-2xl bg-cyan-500 px-4 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                    >
                      {liquidityLoading
                        ? "Confirming removal…"
                        : !connected
                          ? "Connect Wallet"
                          : !removeQuote
                            ? "Enter LP Amount"
                            : insufficientLp
                              ? "Insufficient LP Balance"
                              : "Remove Liquidity"}
                    </button>
                  </>
                )}
              </>
            )}

            {successSignature && (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-sm font-medium text-emerald-300">
                  Transaction confirmed.
                </p>

                <a
                  href={`https://explorer.solana.com/tx/${successSignature}${
                    DEX_NETWORK === "devnet"
                      ? "?cluster=devnet"
                      : DEX_NETWORK === "testnet"
                        ? "?cluster=testnet"
                        : ""
                  }`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block truncate text-xs text-emerald-400 underline"
                >
                  {successSignature}
                </a>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
                <p className="text-sm text-rose-300">
                  {error}
                </p>
              </div>
            )}

            {activities.length > 0 && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
                      Activity
                    </p>

                    <h3 className="mt-1 text-sm font-semibold text-white">
                      Recent transactions
                    </h3>
                  </div>

                  <span className="text-[10px] text-slate-600">
                    This session
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-3"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          activity.type === "swap"
                            ? "bg-cyan-400/10 text-cyan-300"
                            : activity.type === "add"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-violet-400/10 text-violet-300"
                        }`}
                      >
                        {activity.type === "swap"
                          ? "↕"
                          : activity.type === "add"
                            ? "+"
                            : "−"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-200">
                          {activity.description}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-600">
                          Confirmed just now
                        </p>
                      </div>

                      <a
                        href={`https://explorer.solana.com/tx/${activity.signature}${
                          DEX_NETWORK === "devnet"
                            ? "?cluster=devnet"
                            : DEX_NETWORK === "testnet"
                              ? "?cluster=testnet"
                              : ""
                        }`}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-[10px] font-semibold text-cyan-400 transition hover:text-cyan-300"
                      >
                        View ↗️
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Network</span>

                <span className="text-emerald-400">
                  Solana{" "}
                  {DEX_NETWORK === "mainnet-beta"
                    ? "Mainnet"
                    : DEX_NETWORK === "testnet"
                      ? "Testnet"
                      : "Devnet"}
                </span>
              </div>

              <p className="mt-2 truncate text-xs text-slate-600">
                {connection.rpcEndpoint}
              </p>

              {loadingBalances && (
                <p className="mt-2 text-xs text-slate-500">
                  Loading wallet balances…
                </p>
              )}
            </div>
            </div>

            <aside className="usefect-dex-sidebar-card w-full rounded-[28px] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400">
                    Liquidity Pool
                  </p>

                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                    Pool Overview
                  </h2>
                </div>

                <span
                  className={`usefect-dex-status ${
                    pool?.status === 1
                      ? "text-emerald-300"
                      : "text-slate-400"
                  }`}
                >
                  <span
                    className={`usefect-dex-status-dot ${
                      pool?.status === 1
                        ? "bg-emerald-400"
                        : "bg-slate-500"
                    }`}
                  />
                  {pool?.status === 1 ? "Active" : "Unavailable"}
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Pair
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-slate-500">
                    AMM
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="usefect-dex-token-icon">
                    A
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {pool
                        ? shortKey(pool.tokenA)
                        : tokenConfig
                          ? shortKey(tokenConfig.tokenA)
                          : "Token A"}
                    </p>

                    <p className="mt-0.5 truncate font-mono text-[10px] text-slate-600">
                      {pool
                        ? pool.tokenA.toBase58()
                        : tokenConfig
                          ? tokenConfig.tokenA.toBase58()
                          : "—"}
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-slate-600">
                    /
                  </span>

                  <div className="usefect-dex-token-icon">
                    B
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {pool
                        ? shortKey(pool.tokenB)
                        : tokenConfig
                          ? shortKey(tokenConfig.tokenB)
                          : "Token B"}
                    </p>

                    <p className="mt-0.5 truncate font-mono text-[10px] text-slate-600">
                      {pool
                        ? pool.tokenB.toBase58()
                        : tokenConfig
                          ? tokenConfig.tokenB.toBase58()
                          : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Reserve composition
                  </span>

                  <span className="text-[10px] text-slate-600">
                    Based on pool reserves
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="flex h-full">
                    <div
                      className="h-full rounded-l-full bg-cyan-400/80 transition-all duration-500"
                      style={{
                        width: `${reserveAShare}%`,
                      }}
                    />

                    <div
                      className="h-full rounded-r-full bg-violet-400/80 transition-all duration-500"
                      style={{
                        width: `${reserveBShare}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-cyan-300">
                    A {reserveAShare.toFixed(1)}%
                  </span>

                  <span className="text-violet-300">
                    B {reserveBShare.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="usefect-dex-metric">
                  <p className="usefect-dex-metric-label">
                    Reserve A
                  </p>

                  <p className="usefect-dex-metric-value mt-1">
                    {pool
                      ? formatTokenAmount(
                          pool.reserveA,
                          pool.tokenADecimals,
                        )
                      : "—"}
                  </p>
                </div>

                <div className="usefect-dex-metric">
                  <p className="usefect-dex-metric-label">
                    Reserve B
                  </p>

                  <p className="usefect-dex-metric-value mt-1">
                    {pool
                      ? formatTokenAmount(
                          pool.reserveB,
                          pool.tokenBDecimals,
                        )
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="usefect-dex-metric">
                  <p className="usefect-dex-metric-label">
                    LP Supply
                  </p>

                  <p className="usefect-dex-metric-value mt-1">
                    {pool
                      ? formatTokenAmount(pool.lpSupply, 9)
                      : "—"}
                  </p>
                </div>

                <div className="usefect-dex-metric">
                  <p className="usefect-dex-metric-label">
                    Swap Fee
                  </p>

                  <p className="usefect-dex-metric-value mt-1">
                    {pool ? `${pool.feeBps} bps` : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-500">
                    Pool address
                  </span>

                  {pool && (
                    <a
                      href={`https://explorer.solana.com/address/${pool.address.toBase58()}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-semibold text-cyan-400 transition hover:text-cyan-300"
                    >
                      Explorer ↗️
                    </a>
                  )}
                </div>

                <p className="mt-2 truncate font-mono text-[11px] text-slate-500">
                  {pool
                    ? pool.address.toBase58()
                    : loadingPool
                      ? "Loading pool…"
                      : "Pool not found"}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04] px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Protocol
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-200">
                    USEFECT AMM
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Network
                  </p>

                  <p className="mt-1 text-sm font-semibold text-cyan-300">
                    Solana Devnet
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

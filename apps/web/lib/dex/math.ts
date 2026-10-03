const ZERO = BigInt(0);
const BPS_DENOMINATOR = BigInt(10_000);

export function calculateSwapOutput(params: {
  amountIn: bigint;
  reserveIn: bigint;
  reserveOut: bigint;
  feeBps: bigint;
}): bigint {
  const {
    amountIn,
    reserveIn,
    reserveOut,
    feeBps,
  } = params;

  if (amountIn <= ZERO) {
    return ZERO;
  }

  if (reserveIn <= ZERO || reserveOut <= ZERO) {
    return ZERO;
  }

  if (feeBps < ZERO || feeBps >= BPS_DENOMINATOR) {
    return ZERO;
  }

  const feeMultiplier = BPS_DENOMINATOR - feeBps;

  const amountInAfterFee =
    (amountIn * feeMultiplier) / BPS_DENOMINATOR;

  if (amountInAfterFee <= ZERO) {
    return ZERO;
  }

  const numerator = reserveOut * amountInAfterFee;
  const denominator = reserveIn + amountInAfterFee;

  if (denominator <= ZERO) {
    return ZERO;
  }

  const amountOut = numerator / denominator;

  if (amountOut >= reserveOut) {
    return reserveOut > ZERO
      ? reserveOut - BigInt(1)
      : ZERO;
  }

  return amountOut;
}

export function calculatePriceImpact(params: {
  amountIn: bigint;
  amountOut: bigint;
  reserveIn: bigint;
  reserveOut: bigint;
}): number {
  const {
    amountIn,
    amountOut,
    reserveIn,
    reserveOut,
  } = params;

  if (
    amountIn <= ZERO ||
    amountOut <= ZERO ||
    reserveIn <= ZERO ||
    reserveOut <= ZERO
  ) {
    return 0;
  }

  const spotNumerator = amountIn * reserveOut;
  const spotDenominator = reserveIn * amountOut;

  if (
    spotNumerator <= ZERO ||
    spotDenominator <= ZERO
  ) {
    return 0;
  }

  const ratio =
    Number(spotDenominator) /
    Number(spotNumerator);

  const impact = 1 - ratio;

  return Math.max(0, Math.min(1, impact));
}

export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxFractionDigits = 6,
): string {
  if (decimals < 0) {
    throw new Error("Token decimals cannot be negative");
  }

  if (amount === ZERO) {
    return "0";
  }

  const negative = amount < ZERO;
  const absolute = negative ? -amount : amount;

  const base = BigInt(10) ** BigInt(decimals);
  const integerPart = absolute / base;
  const fractionalPart = absolute % base;

  if (fractionalPart === ZERO) {
    return `${negative ? "-" : ""}${integerPart}`;
  }

  const fraction = fractionalPart
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFractionDigits)
    .replace(/0+$/, "");

  return `${negative ? "-" : ""}${integerPart}.${fraction}`;
}

export function parseTokenAmount(
  value: string,
  decimals: number,
): bigint {
  const normalized = value.trim();

  if (!normalized) {
    return ZERO;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid token amount");
  }

  const [whole, fraction = ""] =
    normalized.split(".");

  if (fraction.length > decimals) {
    throw new Error(
      `Maximum ${decimals} decimal places allowed`,
    );
  }

  const paddedFraction =
    fraction.padEnd(decimals, "0");

  return (
    BigInt(whole) *
      (BigInt(10) ** BigInt(decimals)) +
    BigInt(paddedFraction || "0")
  );
}

use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the counter authority can update this counter")]
    Unauthorized,
    #[msg("Counter has reached the maximum value")]
    CounterOverflow,
    #[msg("Fee cannot exceed 10000 basis points")]
    InvalidFee,
    #[msg("Protocol fee cannot exceed the swap fee")]
    InvalidProtocolFee,
    #[msg("Invalid pool status")]
    InvalidPoolStatus,

    #[msg("Pool does not belong to this DEX")]
    InvalidPool,
    #[msg("Invalid token pair")]
    InvalidTokenPair,


    #[msg("Treasury address is invalid")]
    InvalidTreasury,
    #[msg("Authority address is invalid")]
    InvalidAuthority,

    #[msg("Invalid protocol fee token account")]
    InvalidProtocolFeeAccount,

    #[msg("The DEX is currently paused")]
    DexPaused,

    #[msg("Token A and Token B cannot be the same")]
    SameToken,

    #[msg("Token A must be ordered before Token B")]
    InvalidTokenOrder,
    #[msg("Liquidity amount must be greater than zero")]
    ZeroLiquidityAmount,
    #[msg("Initial liquidity is too small")]
    InsufficientInitialLiquidity,
    #[msg("Requested LP amount is below the minimum")]
    InsufficientLpOutput,
    #[msg("Pool is not active")]
    PoolInactive,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Insufficient LP token balance")]
    InsufficientLpBalance,
    #[msg("Token output is below the minimum requested amount")]
    InsufficientTokenOutput,

    #[msg("Launch token mint is invalid")]
    InvalidLaunchMint,
    #[msg("Launch treasury is invalid")]
    InvalidLaunchTreasury,
    #[msg("Launch allocation is invalid")]
    InvalidLaunchAllocation,
    #[msg("Launch price configuration is invalid")]
    InvalidLaunchPrice,
    #[msg("Launch duration is invalid")]
    InvalidLaunchDuration,

    #[msg("Invalid launch decimals")]
    InvalidLaunchDecimals,
    #[msg("Invalid launch vault")]
    InvalidLaunchVault,
    #[msg("Launch funding amount is zero")]
    ZeroLaunchFunding,
    #[msg("Launch funding exceeds remaining allocation")]
    LaunchFundingExceedsAllocation,
    #[msg("Launch is not live")]
    LaunchNotLive,
    #[msg("Launch has expired")]
    LaunchExpired,
    #[msg("Launch is already expired")]
    LaunchAlreadyExpired,
    #[msg("Launch buy amount is zero")]
    ZeroLaunchBuy,
    #[msg("Launch allocation exceeded")]
    LaunchAllocationExceeded,
    #[msg("Launch inventory is insufficient")]
    InsufficientLaunchInventory,
    #[msg("Launch cost is zero")]
    ZeroLaunchCost,
    #[msg("Launch slippage limit exceeded")]
    LaunchSlippageExceeded,
    #[msg("Sell amount exceeds tokens currently sold")]
    LaunchSellExceedsSold,
    #[msg("Launch has insufficient SOL for this sell")]
    InsufficientLaunchSol,

    #[msg("Launch is not ready for graduation")]
    LaunchNotReadyForGraduation,
    #[msg("Graduation allocation is not fully funded")]
    InsufficientGraduationInventory,
    #[msg("Graduation liquidity is too small for minimum LP liquidity")]
    InsufficientGraduationLiquidity,

    #[msg("Graduation SOL liquidity amount is zero")]
    ZeroGraduationLiquidity,
    #[msg("Graduation SOL liquidity exceeds available launch SOL")]
    GraduationLiquidityExceedsAvailableSol,
    #[msg("Graduation pool already exists")]
    GraduationPoolAlreadyExists,
    #[msg("Invalid graduation temporary account")]
    InvalidGraduationAccount,
}

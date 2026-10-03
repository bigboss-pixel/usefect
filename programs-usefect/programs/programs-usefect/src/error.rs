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
}

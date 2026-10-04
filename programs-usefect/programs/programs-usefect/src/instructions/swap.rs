use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::{
    constants::{DEX_CONFIG_SEED, POOL_SEED, POOL_STATUS_ACTIVE},
    error::ErrorCode,
    state::{DexConfig, Pool},
};

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        seeds = [DEX_CONFIG_SEED],
        bump = dex_config.bump,
    )]
    pub dex_config: Box<Account<'info, DexConfig>>,

    #[account(
        mut,
        seeds = [
            POOL_SEED,
            pool.token_a.as_ref(),
            pool.token_b.as_ref(),
        ],
        bump = pool.bump,
        constraint = pool.dex == dex_config.key(),
        constraint = pool.status == POOL_STATUS_ACTIVE @ ErrorCode::PoolInactive,
    )]
    pub pool: Box<Account<'info, Pool>>,

    #[account(address = pool.token_a)]
    pub token_a: Box<Account<'info, Mint>>,

    #[account(address = pool.token_b)]
    pub token_b: Box<Account<'info, Mint>>,

    #[account(
        mut,
        address = pool.vault_a,
        constraint = vault_a.mint == token_a.key(),
        constraint = vault_a.owner == pool.key(),
    )]
    pub vault_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        address = pool.vault_b,
        constraint = vault_b.mint == token_b.key(),
        constraint = vault_b.owner == pool.key(),
    )]
    pub vault_b: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_a.mint == token_a.key(),
        constraint = user_token_a.owner == user.key(),
    )]
    pub user_token_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_b.mint == token_b.key(),
        constraint = user_token_b.owner == user.key(),
    )]
    pub user_token_b: Box<Account<'info, TokenAccount>>,

    /// Token-A protocol fee destination.
    /// Must belong to the configured treasury.
    #[account(
        mut,
        constraint = protocol_fee_token_a.mint == token_a.key()
            @ ErrorCode::InvalidProtocolFeeAccount,
        constraint = protocol_fee_token_a.owner == dex_config.treasury
            @ ErrorCode::InvalidProtocolFeeAccount,
    )]
    pub protocol_fee_token_a: Box<Account<'info, TokenAccount>>,

    /// Token-B protocol fee destination.
    /// Must belong to the configured treasury.
    #[account(
        mut,
        constraint = protocol_fee_token_b.mint == token_b.key()
            @ ErrorCode::InvalidProtocolFeeAccount,
        constraint = protocol_fee_token_b.owner == dex_config.treasury
            @ ErrorCode::InvalidProtocolFeeAccount,
    )]
    pub protocol_fee_token_b: Box<Account<'info, TokenAccount>>,

    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_swap(
    ctx: Context<Swap>,
    amount_in: u64,
    amount_out_min: u64,
    a_to_b: bool,
) -> Result<()> {
    require!(amount_in > 0, ErrorCode::ZeroLiquidityAmount);
    require!(!ctx.accounts.dex_config.paused, ErrorCode::DexPaused);

    let pool_account_info = ctx.accounts.pool.to_account_info();
    let pool = &mut ctx.accounts.pool;

    require!(pool.reserve_a > 0, ErrorCode::MathOverflow);
    require!(pool.reserve_b > 0, ErrorCode::MathOverflow);
    require!(pool.fee_bps <= 10_000, ErrorCode::InvalidFee);

    let fee_bps = pool.fee_bps as u128;
    let amount_in_u128 = amount_in as u128;

    let fee_denominator = 10_000u128;
    let fee_multiplier = fee_denominator
        .checked_sub(fee_bps)
        .ok_or(ErrorCode::InvalidFee)?;

    let amount_in_after_fee = amount_in_u128
        .checked_mul(fee_multiplier)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(fee_denominator)
        .ok_or(ErrorCode::MathOverflow)?;

    require!(amount_in_after_fee > 0, ErrorCode::InsufficientTokenOutput);

    /*
     * Total trading fee is the difference between the gross input
     * and the amount used by the constant-product curve.
     *
     * protocol_fee_bps is a share of the trading fee, not an
     * additional fee charged on top of fee_bps.
     */
    let total_fee = amount_in_u128
        .checked_sub(amount_in_after_fee)
        .ok_or(ErrorCode::MathOverflow)?;

    let protocol_fee = if ctx.accounts.dex_config.protocol_fee_bps == 0 {
        0u128
    } else {
        total_fee
            .checked_mul(ctx.accounts.dex_config.protocol_fee_bps as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(fee_bps)
            .ok_or(ErrorCode::MathOverflow)?
    };

    let protocol_fee_u64 =
        u64::try_from(protocol_fee).map_err(|_| error!(ErrorCode::MathOverflow))?;

    let (reserve_in, reserve_out) = if a_to_b {
        (pool.reserve_a as u128, pool.reserve_b as u128)
    } else {
        (pool.reserve_b as u128, pool.reserve_a as u128)
    };

    let denominator = reserve_in
        .checked_add(amount_in_after_fee)
        .ok_or(ErrorCode::MathOverflow)?;

    let amount_out_u128 = reserve_out
        .checked_mul(amount_in_after_fee)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(denominator)
        .ok_or(ErrorCode::MathOverflow)?;

    let amount_out = u64::try_from(amount_out_u128).map_err(|_| error!(ErrorCode::MathOverflow))?;

    require!(amount_out > 0, ErrorCode::InsufficientTokenOutput);

    require!(
        amount_out >= amount_out_min,
        ErrorCode::InsufficientTokenOutput
    );

    require!(
        amount_out < u64::try_from(reserve_out).map_err(|_| error!(ErrorCode::MathOverflow))?,
        ErrorCode::InsufficientTokenOutput
    );

    let token_a_key = pool.token_a;
    let token_b_key = pool.token_b;
    let pool_bump = [pool.bump];

    let signer_seeds: &[&[u8]] = &[
        POOL_SEED,
        token_a_key.as_ref(),
        token_b_key.as_ref(),
        &pool_bump,
    ];

    let signer = &[signer_seeds];

    if a_to_b {
        let transfer_in_ctx = CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.user_token_a.to_account_info(),
                mint: ctx.accounts.token_a.to_account_info(),
                to: ctx.accounts.vault_a.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );

        token::transfer_checked(transfer_in_ctx, amount_in, pool.token_a_decimals)?;

        if protocol_fee_u64 > 0 {
            // Pool PDA signs the transfer from the pool vault.
            token::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    TransferChecked {
                        from: ctx.accounts.vault_a.to_account_info(),
                        mint: ctx.accounts.token_a.to_account_info(),
                        to: ctx.accounts.protocol_fee_token_a.to_account_info(),
                        authority: pool_account_info.clone(),
                    },
                    signer,
                ),
                protocol_fee_u64,
                pool.token_a_decimals,
            )?;
        }

        let transfer_out_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.vault_b.to_account_info(),
                mint: ctx.accounts.token_b.to_account_info(),
                to: ctx.accounts.user_token_b.to_account_info(),
                authority: pool_account_info,
            },
            signer,
        );

        token::transfer_checked(transfer_out_ctx, amount_out, pool.token_b_decimals)?;

        pool.reserve_a = pool
            .reserve_a
            .checked_add(
                u64::try_from(
                    amount_in_u128
                        .checked_sub(protocol_fee)
                        .ok_or(ErrorCode::MathOverflow)?,
                )
                .map_err(|_| error!(ErrorCode::MathOverflow))?,
            )
            .ok_or(ErrorCode::MathOverflow)?;

        pool.reserve_b = pool
            .reserve_b
            .checked_sub(amount_out)
            .ok_or(ErrorCode::MathOverflow)?;
    } else {
        let transfer_in_ctx = CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.user_token_b.to_account_info(),
                mint: ctx.accounts.token_b.to_account_info(),
                to: ctx.accounts.vault_b.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );

        token::transfer_checked(transfer_in_ctx, amount_in, pool.token_b_decimals)?;

        if protocol_fee_u64 > 0 {
            token::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    TransferChecked {
                        from: ctx.accounts.vault_b.to_account_info(),
                        mint: ctx.accounts.token_b.to_account_info(),
                        to: ctx.accounts.protocol_fee_token_b.to_account_info(),
                        authority: pool_account_info.clone(),
                    },
                    signer,
                ),
                protocol_fee_u64,
                pool.token_b_decimals,
            )?;
        }

        let transfer_out_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.vault_a.to_account_info(),
                mint: ctx.accounts.token_a.to_account_info(),
                to: ctx.accounts.user_token_a.to_account_info(),
                authority: pool_account_info,
            },
            signer,
        );

        token::transfer_checked(transfer_out_ctx, amount_out, pool.token_a_decimals)?;

        pool.reserve_b = pool
            .reserve_b
            .checked_add(
                u64::try_from(
                    amount_in_u128
                        .checked_sub(protocol_fee)
                        .ok_or(ErrorCode::MathOverflow)?,
                )
                .map_err(|_| error!(ErrorCode::MathOverflow))?,
            )
            .ok_or(ErrorCode::MathOverflow)?;

        pool.reserve_a = pool
            .reserve_a
            .checked_sub(amount_out)
            .ok_or(ErrorCode::MathOverflow)?;
    }

    Ok(())
}

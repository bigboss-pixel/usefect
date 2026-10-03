use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, TransferChecked};

use crate::{
    constants::{DEX_CONFIG_SEED, POOL_SEED, POOL_STATUS_ACTIVE},
    error::ErrorCode,
    state::{DexConfig, Pool},
};

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
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

    #[account(
        address = pool.token_a,
    )]
    pub token_a: Box<Account<'info, Mint>>,

    #[account(
        address = pool.token_b,
    )]
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
        address = pool.lp_mint,
    )]
    pub lp_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = user_lp_token_account.mint == lp_mint.key(),
        constraint = user_lp_token_account.owner == provider.key(),
    )]
    pub user_lp_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_a.mint == token_a.key(),
        constraint = user_token_a.owner == provider.key(),
    )]
    pub user_token_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_b.mint == token_b.key(),
        constraint = user_token_b.owner == provider.key(),
    )]
    pub user_token_b: Box<Account<'info, TokenAccount>>,

    pub provider: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_remove_liquidity(
    ctx: Context<RemoveLiquidity>,
    lp_amount: u64,
    amount_a_min: u64,
    amount_b_min: u64,
) -> Result<()> {
    require!(lp_amount > 0, ErrorCode::ZeroLiquidityAmount);

    require!(!ctx.accounts.dex_config.paused, ErrorCode::DexPaused);

    let pool_account_info = ctx.accounts.pool.to_account_info();
    let pool = &mut ctx.accounts.pool;

    require!(pool.lp_supply > 0, ErrorCode::MathOverflow);

    let user_lp_balance = ctx.accounts.user_lp_token_account.amount;

    require!(
        lp_amount <= user_lp_balance,
        ErrorCode::InsufficientLpBalance
    );

    // The permanently locked minimum liquidity is part of total
    // lp_supply but can never be redeemed by a provider.
    require!(
        pool.lp_supply > crate::constants::MINIMUM_LIQUIDITY,
        ErrorCode::MathOverflow
    );

    let amount_a = (lp_amount as u128)
        .checked_mul(pool.reserve_a as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(pool.lp_supply as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let amount_b = (lp_amount as u128)
        .checked_mul(pool.reserve_b as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(pool.lp_supply as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let amount_a = u64::try_from(amount_a).map_err(|_| error!(ErrorCode::MathOverflow))?;

    let amount_b = u64::try_from(amount_b).map_err(|_| error!(ErrorCode::MathOverflow))?;

    require!(amount_a >= amount_a_min, ErrorCode::InsufficientTokenOutput);

    require!(amount_b >= amount_b_min, ErrorCode::InsufficientTokenOutput);

    require!(
        amount_a > 0 && amount_b > 0,
        ErrorCode::InsufficientTokenOutput
    );

    require!(amount_a <= pool.reserve_a, ErrorCode::MathOverflow);

    require!(amount_b <= pool.reserve_b, ErrorCode::MathOverflow);

    // ---------------------------------------------------------
    // 1. Burn provider LP
    // ---------------------------------------------------------

    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        Burn {
            mint: ctx.accounts.lp_mint.to_account_info(),
            from: ctx.accounts.user_lp_token_account.to_account_info(),
            authority: ctx.accounts.provider.to_account_info(),
        },
    );

    token::burn(burn_ctx, lp_amount)?;

    // ---------------------------------------------------------
    // 2. Pool PDA signs transfers from vaults
    // ---------------------------------------------------------

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

    let transfer_a_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        TransferChecked {
            from: ctx.accounts.vault_a.to_account_info(),
            mint: ctx.accounts.token_a.to_account_info(),
            to: ctx.accounts.user_token_a.to_account_info(),
            authority: pool_account_info.clone(),
        },
        signer,
    );

    token::transfer_checked(transfer_a_ctx, amount_a, pool.token_a_decimals)?;

    let transfer_b_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        TransferChecked {
            from: ctx.accounts.vault_b.to_account_info(),
            mint: ctx.accounts.token_b.to_account_info(),
            to: ctx.accounts.user_token_b.to_account_info(),
            authority: pool_account_info,
        },
        signer,
    );

    token::transfer_checked(transfer_b_ctx, amount_b, pool.token_b_decimals)?;

    // ---------------------------------------------------------
    // 3. Update pool state
    // ---------------------------------------------------------

    pool.reserve_a = pool
        .reserve_a
        .checked_sub(amount_a)
        .ok_or(ErrorCode::MathOverflow)?;

    pool.reserve_b = pool
        .reserve_b
        .checked_sub(amount_b)
        .ok_or(ErrorCode::MathOverflow)?;

    pool.lp_supply = pool
        .lp_supply
        .checked_sub(lp_amount)
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(())
}

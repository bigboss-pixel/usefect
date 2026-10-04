use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{
    DEX_CONFIG_SEED, LP_LOCK_SEED, LP_MINT_DECIMALS, LP_MINT_SEED, POOL_SEED, POOL_STATUS_ACTIVE,
    VAULT_A_SEED, VAULT_B_SEED,
};
use crate::error::ErrorCode;
use crate::state::{DexConfig, Pool};

pub fn handle_initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
    require!(
        ctx.accounts.token_a.key() != ctx.accounts.token_b.key(),
        ErrorCode::InvalidTokenPair
    );

    require!(
        ctx.accounts.token_a.key().to_bytes()
            < ctx.accounts.token_b.key().to_bytes(),
        ErrorCode::InvalidTokenOrder
    );

    let dex_config = &ctx.accounts.dex_config;

    require!(!dex_config.paused, ErrorCode::DexPaused);

    let token_a = ctx.accounts.token_a.key();
    let token_b = ctx.accounts.token_b.key();

    require!(token_a != token_b, ErrorCode::SameToken);

    require!(
        token_a.to_bytes() < token_b.to_bytes(),
        ErrorCode::InvalidTokenOrder
    );

    let pool = &mut ctx.accounts.pool;

    pool.dex = dex_config.key();
    pool.token_a = token_a;
    pool.token_b = token_b;
    pool.vault_a = ctx.accounts.vault_a.key();
    pool.vault_b = ctx.accounts.vault_b.key();
    pool.lp_mint = ctx.accounts.lp_mint.key();

    pool.reserve_a = 0;
    pool.reserve_b = 0;
    pool.lp_supply = 0;

    pool.fee_bps = dex_config.fee_bps;

    pool.token_a_decimals = ctx.accounts.token_a.decimals;
    pool.token_b_decimals = ctx.accounts.token_b.decimals;

    pool.status = POOL_STATUS_ACTIVE;
    pool.bump = ctx.bumps.pool;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [DEX_CONFIG_SEED],
        bump = dex_config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub dex_config: Account<'info, DexConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + Pool::INIT_SPACE,
        seeds = [
            POOL_SEED,
            token_a.key().as_ref(),
            token_b.key().as_ref()
        ],
        bump
    )]
    pub pool: Account<'info, Pool>,

    pub token_a: Account<'info, Mint>,

    pub token_b: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = token_a,
        token::authority = pool,
        seeds = [
            VAULT_A_SEED,
            pool.key().as_ref()
        ],
        bump
    )]
    pub vault_a: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        token::mint = token_b,
        token::authority = pool,
        seeds = [
            VAULT_B_SEED,
            pool.key().as_ref()
        ],
        bump
    )]
    pub vault_b: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        mint::decimals = LP_MINT_DECIMALS,
        mint::authority = pool,
        seeds = [
            LP_MINT_SEED,
            pool.key().as_ref()
        ],
        bump
    )]
    pub lp_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = lp_mint,
        token::authority = system_program,
        seeds = [
            LP_LOCK_SEED,
            pool.key().as_ref()
        ],
        bump
    )]
    pub lp_lock_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, TransferChecked};

use crate::constants::{
    DEX_CONFIG_SEED, LP_LOCK_SEED, MINIMUM_LIQUIDITY, POOL_SEED, POOL_STATUS_ACTIVE,
};
use crate::error::ErrorCode;
use crate::state::{DexConfig, Pool};

pub fn handle_add_liquidity(
    ctx: Context<AddLiquidity>,
    amount_a: u64,
    amount_b: u64,
    lp_amount_min: u64,
) -> Result<()> {
    require!(amount_a > 0, ErrorCode::ZeroLiquidityAmount);
    require!(amount_b > 0, ErrorCode::ZeroLiquidityAmount);

    let dex_config = &ctx.accounts.dex_config;
    require!(!dex_config.paused, ErrorCode::DexPaused);

    let pool_account_info = ctx.accounts.pool.to_account_info();
    let pool = &mut ctx.accounts.pool;
    require!(pool.status == POOL_STATUS_ACTIVE, ErrorCode::PoolInactive);

    let reserve_a = pool.reserve_a;
    let reserve_b = pool.reserve_b;
    let lp_supply = pool.lp_supply;

    let (lp_to_provider, lp_to_lock) = if reserve_a == 0 && reserve_b == 0 && lp_supply == 0 {
        let product = (amount_a as u128)
            .checked_mul(amount_b as u128)
            .ok_or(ErrorCode::MathOverflow)?;

        let root = integer_sqrt(product);

        require!(
            root > MINIMUM_LIQUIDITY as u128,
            ErrorCode::InsufficientInitialLiquidity
        );

        let provider_lp = root
            .checked_sub(MINIMUM_LIQUIDITY as u128)
            .ok_or(ErrorCode::MathOverflow)?;

        (
            u64::try_from(provider_lp).map_err(|_| ErrorCode::MathOverflow)?,
            MINIMUM_LIQUIDITY,
        )
    } else {
        require!(reserve_a > 0, ErrorCode::MathOverflow);
        require!(reserve_b > 0, ErrorCode::MathOverflow);
        require!(lp_supply > 0, ErrorCode::MathOverflow);

        let lp_from_a = (amount_a as u128)
            .checked_mul(lp_supply as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(reserve_a as u128)
            .ok_or(ErrorCode::MathOverflow)?;

        let lp_from_b = (amount_b as u128)
            .checked_mul(lp_supply as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(reserve_b as u128)
            .ok_or(ErrorCode::MathOverflow)?;

        let provider_lp = lp_from_a.min(lp_from_b);

        require!(provider_lp > 0, ErrorCode::InsufficientLpOutput);

        (
            u64::try_from(provider_lp).map_err(|_| ErrorCode::MathOverflow)?,
            0,
        )
    };

    require!(
        lp_to_provider >= lp_amount_min,
        ErrorCode::InsufficientLpOutput
    );

    token::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.user_token_a.to_account_info(),
                mint: ctx.accounts.token_a.to_account_info(),
                to: ctx.accounts.vault_a.to_account_info(),
                authority: ctx.accounts.provider.to_account_info(),
            },
        ),
        amount_a,
        ctx.accounts.token_a.decimals,
    )?;

    token::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.user_token_b.to_account_info(),
                mint: ctx.accounts.token_b.to_account_info(),
                to: ctx.accounts.vault_b.to_account_info(),
                authority: ctx.accounts.provider.to_account_info(),
            },
        ),
        amount_b,
        ctx.accounts.token_b.decimals,
    )?;

    let bump = [pool.bump];
    let pool_seeds: &[&[u8]] = &[
        POOL_SEED,
        pool.token_a.as_ref(),
        pool.token_b.as_ref(),
        &bump,
    ];
    let signer_seeds: &[&[&[u8]]] = &[pool_seeds];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.user_lp_token_account.to_account_info(),
                authority: pool_account_info.clone(),
            },
            signer_seeds,
        ),
        lp_to_provider,
    )?;

    if lp_to_lock > 0 {
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                MintTo {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    to: ctx.accounts.lp_lock_account.to_account_info(),
                    authority: pool_account_info.clone(),
                },
                signer_seeds,
            ),
            lp_to_lock,
        )?;
    }

    pool.reserve_a = reserve_a
        .checked_add(amount_a)
        .ok_or(ErrorCode::MathOverflow)?;

    pool.reserve_b = reserve_b
        .checked_add(amount_b)
        .ok_or(ErrorCode::MathOverflow)?;

    pool.lp_supply = lp_supply
        .checked_add(lp_to_provider)
        .and_then(|v| v.checked_add(lp_to_lock))
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(())
}

fn integer_sqrt(value: u128) -> u128 {
    if value == 0 {
        return 0;
    }

    let mut x = value;
    let mut y = x.div_ceil(2);

    while y < x {
        x = y;
        y = (x + value / x) / 2;
    }

    x
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,

    #[account(
        seeds = [DEX_CONFIG_SEED],
        bump = dex_config.bump
    )]
    pub dex_config: Box<Account<'info, DexConfig>>,

    #[account(
        mut,
        seeds = [
            POOL_SEED,
            pool.token_a.as_ref(),
            pool.token_b.as_ref()
        ],
        bump = pool.bump,
        constraint = pool.dex == dex_config.key() @ ErrorCode::Unauthorized
    )]
    pub pool: Box<Account<'info, Pool>>,

    #[account(address = pool.token_a @ ErrorCode::InvalidTokenOrder)]
    pub token_a: Box<Account<'info, Mint>>,

    #[account(address = pool.token_b @ ErrorCode::InvalidTokenOrder)]
    pub token_b: Box<Account<'info, Mint>>,

    #[account(
        mut,
        address = pool.vault_a @ ErrorCode::InvalidTokenOrder,
        constraint = vault_a.mint == token_a.key() @ ErrorCode::InvalidTokenOrder,
        constraint = vault_a.owner == pool.key() @ ErrorCode::InvalidTokenOrder
    )]
    pub vault_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        address = pool.vault_b @ ErrorCode::InvalidTokenOrder,
        constraint = vault_b.mint == token_b.key() @ ErrorCode::InvalidTokenOrder,
        constraint = vault_b.owner == pool.key() @ ErrorCode::InvalidTokenOrder
    )]
    pub vault_b: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_a.owner == provider.key() @ ErrorCode::Unauthorized,
        constraint = user_token_a.mint == token_a.key() @ ErrorCode::InvalidTokenOrder
    )]
    pub user_token_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_b.owner == provider.key() @ ErrorCode::Unauthorized,
        constraint = user_token_b.mint == token_b.key() @ ErrorCode::InvalidTokenOrder
    )]
    pub user_token_b: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        address = pool.lp_mint @ ErrorCode::InvalidTokenOrder
    )]
    pub lp_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = user_lp_token_account.owner == provider.key() @ ErrorCode::Unauthorized,
        constraint = user_lp_token_account.mint == lp_mint.key() @ ErrorCode::InvalidTokenOrder
    )]
    pub user_lp_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [LP_LOCK_SEED, pool.key().as_ref()],
        bump
    )]
    pub lp_lock_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

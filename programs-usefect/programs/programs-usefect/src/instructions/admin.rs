use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{DexConfig, Pool},
};

#[derive(Accounts)]
pub struct SetTreasury<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub dex_config: Account<'info, DexConfig>,

    pub authority: Signer<'info>,
}

pub fn handle_set_treasury(
    ctx: Context<SetTreasury>,
    treasury: Pubkey,
) -> Result<()> {
    require!(
        treasury != Pubkey::default(),
        ErrorCode::InvalidTreasury
    );

    ctx.accounts.dex_config.treasury = treasury;

    Ok(())
}

#[derive(Accounts)]
pub struct SetFees<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub dex_config: Account<'info, DexConfig>,

    pub authority: Signer<'info>,
}

pub fn handle_set_fees(
    ctx: Context<SetFees>,
    fee_bps: u16,
    protocol_fee_bps: u16,
) -> Result<()> {
    require!(fee_bps <= 10_000, ErrorCode::InvalidFee);

    require!(
        protocol_fee_bps <= fee_bps,
        ErrorCode::InvalidProtocolFee
    );

    ctx.accounts.dex_config.fee_bps = fee_bps;
    ctx.accounts.dex_config.protocol_fee_bps = protocol_fee_bps;

    Ok(())
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub dex_config: Account<'info, DexConfig>,

    pub authority: Signer<'info>,
}

pub fn handle_transfer_authority(
    ctx: Context<TransferAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    require!(
        new_authority != Pubkey::default(),
        ErrorCode::InvalidAuthority
    );

    ctx.accounts.dex_config.authority = new_authority;

    Ok(())
}

#[derive(Accounts)]
pub struct SetDexPause<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub dex_config: Account<'info, DexConfig>,

    pub authority: Signer<'info>,
}

pub fn handle_set_dex_pause(
    ctx: Context<SetDexPause>,
    paused: bool,
) -> Result<()> {
    ctx.accounts.dex_config.paused = paused;

    Ok(())
}

#[derive(Accounts)]
pub struct SetPoolStatus<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub dex_config: Account<'info, DexConfig>,

    #[account(
        mut,
        constraint = pool.dex == dex_config.key()
            @ ErrorCode::InvalidPool,
    )]
    pub pool: Account<'info, Pool>,

    pub authority: Signer<'info>,
}

pub fn handle_set_pool_status(
    ctx: Context<SetPoolStatus>,
    status: u8,
) -> Result<()> {
    require!(
        status == crate::constants::POOL_STATUS_INACTIVE
            || status == crate::constants::POOL_STATUS_ACTIVE,
        ErrorCode::InvalidPoolStatus
    );

    ctx.accounts.pool.status = status;

    Ok(())
}

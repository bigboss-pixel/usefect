use anchor_lang::prelude::*;

use crate::constants::DEX_CONFIG_SEED;
use crate::error::ErrorCode;
use crate::state::DexConfig;

pub fn handle_initialize_dex(
    ctx: Context<InitializeDex>,
    fee_bps: u16,
    protocol_fee_bps: u16,
) -> Result<()> {
    require!(fee_bps <= 10_000, ErrorCode::InvalidFee);
    require!(protocol_fee_bps <= fee_bps, ErrorCode::InvalidProtocolFee);

    let dex_config = &mut ctx.accounts.dex_config;

    dex_config.authority = ctx.accounts.authority.key();
    dex_config.fee_bps = fee_bps;
    dex_config.protocol_fee_bps = protocol_fee_bps;
    dex_config.paused = false;
    dex_config.bump = ctx.bumps.dex_config;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeDex<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + DexConfig::INIT_SPACE,
        seeds = [DEX_CONFIG_SEED],
        bump
    )]
    pub dex_config: Account<'info, DexConfig>,

    pub system_program: Program<'info, System>,
}

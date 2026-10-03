use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub count: u64,
    pub authority: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct DexConfig {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub protocol_fee_bps: u16,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub dex: Pubkey,
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub lp_mint: Pubkey,
    pub reserve_a: u64,
    pub reserve_b: u64,
    pub lp_supply: u64,
    pub fee_bps: u16,
    pub token_a_decimals: u8,
    pub token_b_decimals: u8,
    pub status: u8,
    pub bump: u8,
}

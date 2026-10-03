use anchor_lang::prelude::*;

#[constant]
pub const COUNTER_SEED: &[u8] = b"counter";

#[constant]
pub const HELLO_WORLD_LAMPORTS: u64 = 1;

#[constant]
pub const MAX_COUNT: u64 = 10;

#[constant]
pub const DEX_CONFIG_SEED: &[u8] = b"dex-config";

pub const DEFAULT_SWAP_FEE_BPS: u16 = 30;
pub const DEFAULT_PROTOCOL_FEE_BPS: u16 = 0;

#[constant]
pub const POOL_SEED: &[u8] = b"pool";

#[constant]
pub const VAULT_A_SEED: &[u8] = b"vault-a";

#[constant]
pub const VAULT_B_SEED: &[u8] = b"vault-b";

#[constant]
pub const LP_MINT_SEED: &[u8] = b"lp-mint";

pub const LP_MINT_DECIMALS: u8 = 9;
pub const POOL_STATUS_ACTIVE: u8 = 1;

#[constant]
pub const LP_LOCK_SEED: &[u8] = b"lp-lock";

pub const MINIMUM_LIQUIDITY: u64 = 1_000;

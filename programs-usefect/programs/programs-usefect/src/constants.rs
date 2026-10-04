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
pub const POOL_STATUS_INACTIVE: u8 = 0;
pub const POOL_STATUS_ACTIVE: u8 = 1;

#[constant]
pub const LP_LOCK_SEED: &[u8] = b"lp-lock";

pub const MINIMUM_LIQUIDITY: u64 = 1_000;

#[constant]
pub const LAUNCH_SEED: &[u8] = b"launch";

pub const LAUNCH_USE_VAULT_SEED: &[u8] = b"use-vault";
pub const LAUNCH_SOL_VAULT_SEED: &[u8] = b"sol-vault";
pub const LAUNCH_GRADUATION_VAULT_SEED: &[u8] = b"graduation-vault";
pub const LAUNCH_GRADUATION_USE_TEMP_SEED: &[u8] = b"graduation-use-temp";
pub const LAUNCH_GRADUATION_WSOL_TEMP_SEED: &[u8] = b"graduation-wsol-temp";
pub const LAUNCH_GRADUATION_LP_TEMP_SEED: &[u8] = b"graduation-lp-temp";
pub const USE_TOKEN_DECIMALS: u8 = 9;
pub const USE_TOKEN_BASE_UNITS: u64 = 1_000_000_000;

pub const LAUNCH_STATUS_LIVE: u8 = 1;
pub const LAUNCH_STATUS_GRADUATION_PENDING: u8 = 2;
pub const LAUNCH_STATUS_GRADUATED: u8 = 3;
pub const LAUNCH_STATUS_EXPIRED: u8 = 4;

pub const MAX_LAUNCH_DURATION_SECONDS: u64 = 30 * 24 * 60 * 60;

// V1 USE public bonding-curve allocation: 700M USE with 9 decimals.
pub const USE_LAUNCH_ALLOCATION: u64 = 700_000_000_000_000_000;

// V1 linear curve target:
// 0.000005 SOL/USE -> 0.000015 SOL/USE.
pub const USE_LAUNCH_START_PRICE_LAMPORTS_PER_TOKEN: u64 = 5_000;
pub const USE_LAUNCH_END_PRICE_LAMPORTS_PER_TOKEN: u64 = 15_000;

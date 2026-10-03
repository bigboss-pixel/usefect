pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("FLYaSSPbQKzqq3BYNF7Jgn7CxPyEK7YTtr8jMmQtivfa");

#[program]
pub mod programs_usefect {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        crate::instructions::initialize::handle_initialize(ctx)
    }

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        crate::instructions::initialize_pool::handle_initialize_pool(ctx)
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount_a: u64,
        amount_b: u64,
        lp_amount_min: u64,
    ) -> Result<()> {
        crate::instructions::add_liquidity::handle_add_liquidity(
            ctx,
            amount_a,
            amount_b,
            lp_amount_min,
        )
    }

    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_amount: u64,
        amount_a_min: u64,
        amount_b_min: u64,
    ) -> Result<()> {
        crate::instructions::remove_liquidity::handle_remove_liquidity(
            ctx,
            lp_amount,
            amount_a_min,
            amount_b_min,
        )
    }

    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        amount_out_min: u64,
        a_to_b: bool,
    ) -> Result<()> {
        crate::instructions::swap::handle_swap(ctx, amount_in, amount_out_min, a_to_b)
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        crate::instructions::increment::handle_increment(ctx)
    }

    pub fn initialize_dex(
        ctx: Context<InitializeDex>,
        fee_bps: u16,
        protocol_fee_bps: u16,
    ) -> Result<()> {
        crate::instructions::initialize_dex::handle_initialize_dex(ctx, fee_bps, protocol_fee_bps)
    }
}

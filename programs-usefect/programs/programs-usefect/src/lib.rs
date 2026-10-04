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

    pub fn set_treasury(
        ctx: Context<SetTreasury>,
        treasury: Pubkey,
    ) -> Result<()> {
        crate::instructions::admin::handle_set_treasury(ctx, treasury)
    }

    pub fn set_fees(
        ctx: Context<SetFees>,
        fee_bps: u16,
        protocol_fee_bps: u16,
    ) -> Result<()> {
        crate::instructions::admin::handle_set_fees(ctx, fee_bps, protocol_fee_bps)
    }

    pub fn transfer_authority(
        ctx: Context<TransferAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        crate::instructions::admin::handle_transfer_authority(ctx, new_authority)
    }

    pub fn set_dex_pause(
        ctx: Context<SetDexPause>,
        paused: bool,
    ) -> Result<()> {
        crate::instructions::admin::handle_set_dex_pause(ctx, paused)
    }

    pub fn set_pool_status(
        ctx: Context<SetPoolStatus>,
        status: u8,
    ) -> Result<()> {
        crate::instructions::admin::handle_set_pool_status(ctx, status)
    }

    pub fn initialize_launch(
        ctx: Context<InitializeLaunch>,
        token_mint: Pubkey,
        treasury: Pubkey,
        total_allocation: u64,
        graduation_allocation: u64,
        start_price_lamports_per_token: u64,
        end_price_lamports_per_token: u64,
        duration_seconds: u64,
    ) -> Result<()> {
        crate::instructions::launch::handle_initialize_launch(
            ctx,
            token_mint,
            treasury,
            total_allocation,
            graduation_allocation,
            start_price_lamports_per_token,
            end_price_lamports_per_token,
            duration_seconds,
        )
    }

    pub fn fund_launch(ctx: Context<FundLaunch>, amount: u64) -> Result<()> {
        crate::instructions::launch::handle_fund_launch(ctx, amount)
    }

    pub fn fund_graduation_liquidity(
        ctx: Context<FundGraduationLiquidity>,
        amount: u64,
    ) -> Result<()> {
        crate::instructions::launch::handle_fund_graduation_liquidity(ctx, amount)
    }

    pub fn graduate_launch(
        ctx: Context<GraduateLaunch>,
        sol_liquidity_amount: u64,
    ) -> Result<()> {
        crate::instructions::graduate_launch::handle_graduate_launch(
            ctx,
            sol_liquidity_amount,
        )
    }

    pub fn buy(ctx: Context<Buy>, amount_use_tokens: u64, max_sol_in: u64) -> Result<()> {
        crate::instructions::launch::handle_buy(ctx, amount_use_tokens, max_sol_in)
    }

    pub fn sell(ctx: Context<Sell>, amount_use_tokens: u64, min_sol_out: u64) -> Result<()> {
        crate::instructions::launch::handle_sell(ctx, amount_use_tokens, min_sol_out)
    }

    pub fn expire_launch(ctx: Context<ExpireLaunch>) -> Result<()> {
        crate::instructions::launch::handle_expire_launch(ctx)
    }
}

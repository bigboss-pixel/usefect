use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::{constants::*, error::ErrorCode, state::Launch};

#[derive(Accounts)]
#[instruction(token_mint: Pubkey)]
pub struct InitializeLaunch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Launch::INIT_SPACE,
        seeds = [LAUNCH_SEED, token_mint.as_ref()],
        bump,
    )]
    pub launch: Account<'info, Launch>,

    #[account(
        address = token_mint @ ErrorCode::InvalidLaunchMint,
        constraint = token_mint_account.decimals == USE_TOKEN_DECIMALS
            @ ErrorCode::InvalidLaunchDecimals,
    )]
    pub token_mint_account: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [LAUNCH_USE_VAULT_SEED, launch.key().as_ref()],
        bump,
        token::mint = token_mint_account,
        token::authority = launch,
    )]
    pub use_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [LAUNCH_GRADUATION_VAULT_SEED, launch.key().as_ref()],
        bump,
        token::mint = token_mint_account,
        token::authority = launch,
    )]
    pub graduation_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_launch(
    ctx: Context<InitializeLaunch>,
    token_mint: Pubkey,
    treasury: Pubkey,
    total_allocation: u64,
    graduation_allocation: u64,
    start_price_lamports_per_token: u64,
    end_price_lamports_per_token: u64,
    duration_seconds: u64,
) -> Result<()> {
    require!(
        token_mint != Pubkey::default(),
        ErrorCode::InvalidLaunchMint
    );

    require!(
        treasury != Pubkey::default(),
        ErrorCode::InvalidLaunchTreasury
    );

    require!(total_allocation > 0, ErrorCode::InvalidLaunchAllocation);

    require!(
        graduation_allocation > 0,
        ErrorCode::InvalidLaunchAllocation
    );

    require!(
        graduation_allocation % USE_TOKEN_BASE_UNITS == 0,
        ErrorCode::InvalidLaunchAllocation
    );

    require!(
        total_allocation % USE_TOKEN_BASE_UNITS == 0,
        ErrorCode::InvalidLaunchAllocation
    );

    require!(
        start_price_lamports_per_token > 0,
        ErrorCode::InvalidLaunchPrice
    );

    require!(
        end_price_lamports_per_token > start_price_lamports_per_token,
        ErrorCode::InvalidLaunchPrice
    );

    require!(
        duration_seconds > 0 && duration_seconds <= MAX_LAUNCH_DURATION_SECONDS,
        ErrorCode::InvalidLaunchDuration
    );

    let clock = Clock::get()?;

    let duration_i64 =
        i64::try_from(duration_seconds).map_err(|_| error!(ErrorCode::InvalidLaunchDuration))?;

    let deadline = clock
        .unix_timestamp
        .checked_add(duration_i64)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let launch = &mut ctx.accounts.launch;

    launch.authority = ctx.accounts.authority.key();
    launch.token_mint = token_mint;
    launch.treasury = treasury;
    launch.use_vault = ctx.accounts.use_vault.key();
    launch.graduation_vault = ctx.accounts.graduation_vault.key();

    launch.total_allocation = total_allocation;
    launch.graduation_allocation = graduation_allocation;
    launch.tokens_sold = 0;
    launch.sol_raised = 0;

    launch.start_price_lamports_per_token = start_price_lamports_per_token;

    launch.end_price_lamports_per_token = end_price_lamports_per_token;

    launch.started_at = clock.unix_timestamp;
    launch.deadline = deadline;

    launch.status = LAUNCH_STATUS_LIVE;
    launch.bump = ctx.bumps.launch;

    msg!("USE Launch initialized");
    msg!("Launch: {}", launch.key());
    msg!("USE mint: {}", launch.token_mint);
    msg!("USE vault: {}", launch.use_vault);
    msg!("Allocation: {}", launch.total_allocation);
    msg!("Start price: {}", launch.start_price_lamports_per_token);
    msg!("End price: {}", launch.end_price_lamports_per_token);

    Ok(())
}

#[derive(Accounts)]
pub struct FundLaunch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub launch: Account<'info, Launch>,

    #[account(
        address = launch.token_mint @ ErrorCode::InvalidLaunchMint,
        constraint = token_mint.decimals == USE_TOKEN_DECIMALS
            @ ErrorCode::InvalidLaunchDecimals,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = launch.use_vault @ ErrorCode::InvalidLaunchVault,
        token::mint = token_mint,
        token::authority = launch,
    )]
    pub use_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = authority,
    )]
    pub authority_use_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_fund_launch(ctx: Context<FundLaunch>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::ZeroLaunchFunding);

    let available_allocation = ctx
        .accounts
        .launch
        .total_allocation
        .checked_sub(ctx.accounts.launch.tokens_sold)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let already_funded = ctx.accounts.use_vault.amount;

    let max_fundable = available_allocation
        .checked_sub(already_funded)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    require!(
        amount <= max_fundable,
        ErrorCode::LaunchFundingExceedsAllocation
    );

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.authority_use_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.use_vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    token::transfer_checked(
        CpiContext::new(ctx.accounts.token_program.key(), transfer_accounts),
        amount,
        ctx.accounts.token_mint.decimals,
    )?;

    msg!("Launch funded: {} base units", amount);

    Ok(())
}


#[derive(Accounts)]
pub struct FundGraduationLiquidity<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub launch: Account<'info, Launch>,

    #[account(
        address = launch.token_mint @ ErrorCode::InvalidLaunchMint,
        constraint = token_mint.decimals == USE_TOKEN_DECIMALS
            @ ErrorCode::InvalidLaunchDecimals,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = launch.graduation_vault @ ErrorCode::InvalidLaunchVault,
        token::mint = token_mint,
        token::authority = launch,
    )]
    pub graduation_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = authority,
    )]
    pub authority_use_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_fund_graduation_liquidity(
    ctx: Context<FundGraduationLiquidity>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, ErrorCode::ZeroLaunchFunding);

    let already_funded = ctx.accounts.graduation_vault.amount;

    let max_fundable = ctx
        .accounts
        .launch
        .graduation_allocation
        .checked_sub(already_funded)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    require!(
        amount <= max_fundable,
        ErrorCode::LaunchFundingExceedsAllocation
    );

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.authority_use_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.graduation_vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    token::transfer_checked(
        CpiContext::new(ctx.accounts.token_program.key(), transfer_accounts),
        amount,
        ctx.accounts.token_mint.decimals,
    )?;

    msg!("Graduation liquidity funded: {} base units", amount);

    Ok(())
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [LAUNCH_SEED, launch.token_mint.as_ref()],
        bump = launch.bump,
    )]
    pub launch: Account<'info, Launch>,

    #[account(
        address = launch.token_mint @ ErrorCode::InvalidLaunchMint,
        constraint = token_mint.decimals == USE_TOKEN_DECIMALS
            @ ErrorCode::InvalidLaunchDecimals,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = launch.use_vault @ ErrorCode::InvalidLaunchVault,
        token::mint = token_mint,
        token::authority = launch,
    )]
    pub use_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = buyer,
    )]
    pub buyer_use_account: Account<'info, TokenAccount>,

    /// CHECK: System-owned SOL vault PDA. It is created on the first buy.
    #[account(
        mut,
        seeds = [LAUNCH_SOL_VAULT_SEED, launch.key().as_ref()],
        bump,
    )]
    pub sol_vault: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_buy(ctx: Context<Buy>, amount_use_tokens: u64, max_sol_in: u64) -> Result<()> {
    require!(
        ctx.accounts.launch.status == LAUNCH_STATUS_LIVE,
        ErrorCode::LaunchNotLive
    );

    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp <= ctx.accounts.launch.deadline,
        ErrorCode::LaunchExpired
    );

    require!(amount_use_tokens > 0, ErrorCode::ZeroLaunchBuy);

    let allocation_tokens = ctx
        .accounts
        .launch
        .total_allocation
        .checked_div(USE_TOKEN_BASE_UNITS)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let sold_tokens = ctx
        .accounts
        .launch
        .tokens_sold
        .checked_div(USE_TOKEN_BASE_UNITS)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let new_sold_tokens = sold_tokens
        .checked_add(amount_use_tokens)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    require!(
        new_sold_tokens <= allocation_tokens,
        ErrorCode::LaunchAllocationExceeded
    );

    let amount_base_units = amount_use_tokens
        .checked_mul(USE_TOKEN_BASE_UNITS)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    require!(
        ctx.accounts.use_vault.amount >= amount_base_units,
        ErrorCode::InsufficientLaunchInventory
    );

    /*
     * Linear bonding curve:
     *
     * P(q) = P0 + (P1 - P0) * q / Q
     *
     * Buy from q0 to q1:
     *
     * cost = integral P(q) dq
     *
     * We calculate the exact trapezoid area using integer arithmetic.
     */

    let p0 = ctx.accounts.launch.start_price_lamports_per_token as u128;

    let p1 = ctx.accounts.launch.end_price_lamports_per_token as u128;

    let q_max = allocation_tokens as u128;
    let q0 = sold_tokens as u128;
    let amount = amount_use_tokens as u128;
    let q1 = q0
        .checked_add(amount)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let delta_p = p1
        .checked_sub(p0)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let price_q0 = p0
        .checked_mul(q_max)
        .and_then(|v| delta_p.checked_mul(q0)?.checked_add(v))
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let price_q1 = p0
        .checked_mul(q_max)
        .and_then(|v| delta_p.checked_mul(q1)?.checked_add(v))
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let numerator = amount
        .checked_mul(
            price_q0
                .checked_add(price_q1)
                .ok_or_else(|| error!(ErrorCode::MathOverflow))?,
        )
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let denominator = q_max
        .checked_mul(2)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let sol_cost_u128 = numerator
        .checked_add(denominator - 1)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?
        .checked_div(denominator)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let sol_cost = u64::try_from(sol_cost_u128).map_err(|_| error!(ErrorCode::MathOverflow))?;

    require!(sol_cost > 0, ErrorCode::ZeroLaunchCost);

    require!(sol_cost <= max_sol_in, ErrorCode::LaunchSlippageExceeded);

    /*
     * Move SOL from buyer into the dedicated System-owned SOL vault.
     * The vault is created on the first buy and remains System-owned.
     */
    let sol_vault_info = ctx.accounts.sol_vault.to_account_info();
    let sol_vault_bump = [ctx.bumps.sol_vault];
    let launch_key = ctx.accounts.launch.key();
    let sol_vault_seeds: &[&[u8]] = &[
        LAUNCH_SOL_VAULT_SEED,
        launch_key.as_ref(),
        &sol_vault_bump,
    ];

    let rent_for_vault = Rent::get()?.minimum_balance(0);

    if sol_vault_info.lamports() == 0 {
        let create_vault_ix = anchor_lang::solana_program::system_instruction::create_account(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.sol_vault.key(),
            rent_for_vault
                .checked_add(sol_cost)
                .ok_or_else(|| error!(ErrorCode::MathOverflow))?,
            0,
            &anchor_lang::solana_program::system_program::ID,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &create_vault_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                sol_vault_info.clone(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[sol_vault_seeds],
        )?;
    } else {
        let sol_transfer = anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: sol_vault_info.clone(),
        };

        anchor_lang::system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.key(), sol_transfer),
            sol_cost,
        )?;
    }

    /*
     * Then move USE from Launch-controlled vault to buyer.
     */
    let mint_key = ctx.accounts.launch.token_mint;
    let bump = ctx.accounts.launch.bump;

    let signer_seeds: &[&[&[u8]]] = &[&[LAUNCH_SEED, mint_key.as_ref(), &[bump]]];

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.use_vault.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.buyer_use_account.to_account_info(),
        authority: ctx.accounts.launch.to_account_info(),
    };

    token::transfer_checked(
        CpiContext::new(ctx.accounts.token_program.key(), transfer_accounts)
            .with_signer(signer_seeds),
        amount_base_units,
        ctx.accounts.token_mint.decimals,
    )?;

    ctx.accounts.launch.tokens_sold = new_sold_tokens
        .checked_mul(USE_TOKEN_BASE_UNITS)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    ctx.accounts.launch.sol_raised = ctx
        .accounts
        .launch
        .sol_raised
        .checked_add(sol_cost)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    if new_sold_tokens == allocation_tokens {
        ctx.accounts.launch.status = LAUNCH_STATUS_GRADUATION_PENDING;
        msg!("USE Launch reached graduation target");
        msg!("Graduation is pending liquidity settlement");
    }

    msg!("BUY: {} USE for {} lamports", amount_use_tokens, sol_cost);

    Ok(())
}

#[derive(Accounts)]
pub struct ExpireLaunch<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [LAUNCH_SEED, launch.token_mint.as_ref()],
        bump = launch.bump,
    )]
    pub launch: Account<'info, Launch>,
}

pub fn handle_expire_launch(ctx: Context<ExpireLaunch>) -> Result<()> {
    require!(
        ctx.accounts.launch.status == LAUNCH_STATUS_LIVE,
        ErrorCode::LaunchAlreadyExpired
    );

    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp > ctx.accounts.launch.deadline,
        ErrorCode::LaunchExpired
    );

    ctx.accounts.launch.status = LAUNCH_STATUS_EXPIRED;

    msg!("USE Launch expired");
    msg!("Launch: {}", ctx.accounts.launch.key());

    Ok(())
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [LAUNCH_SEED, launch.token_mint.as_ref()],
        bump = launch.bump,
    )]
    pub launch: Account<'info, Launch>,

    #[account(
        address = launch.token_mint @ ErrorCode::InvalidLaunchMint,
        constraint = token_mint.decimals == USE_TOKEN_DECIMALS
            @ ErrorCode::InvalidLaunchDecimals,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = launch.use_vault @ ErrorCode::InvalidLaunchVault,
        token::mint = token_mint,
        token::authority = launch,
    )]
    pub use_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = seller,
    )]
    pub seller_use_account: Account<'info, TokenAccount>,

    /// CHECK: System-owned SOL vault PDA.
    #[account(
        mut,
        seeds = [LAUNCH_SOL_VAULT_SEED, launch.key().as_ref()],
        bump,
    )]
    pub sol_vault: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_sell(ctx: Context<Sell>, amount_use_tokens: u64, min_sol_out: u64) -> Result<()> {
    require!(
        ctx.accounts.launch.status == LAUNCH_STATUS_LIVE
            || ctx.accounts.launch.status == LAUNCH_STATUS_EXPIRED,
        ErrorCode::LaunchNotLive
    );

    if ctx.accounts.launch.status == LAUNCH_STATUS_LIVE {
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp <= ctx.accounts.launch.deadline,
            ErrorCode::LaunchExpired
        );
    }

    require!(amount_use_tokens > 0, ErrorCode::ZeroLaunchBuy);

    let allocation_tokens = ctx
        .accounts
        .launch
        .total_allocation
        .checked_div(USE_TOKEN_BASE_UNITS)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let sold_tokens = ctx
        .accounts
        .launch
        .tokens_sold
        .checked_div(USE_TOKEN_BASE_UNITS)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    require!(
        amount_use_tokens <= sold_tokens,
        ErrorCode::LaunchSellExceedsSold
    );

    let new_sold_tokens = sold_tokens
        .checked_sub(amount_use_tokens)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let amount_base_units = amount_use_tokens
        .checked_mul(USE_TOKEN_BASE_UNITS)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    require!(
        ctx.accounts.seller_use_account.amount >= amount_base_units,
        ErrorCode::InsufficientLaunchInventory
    );

    /*
     * Linear bonding curve:
     *
     * P(q) = P0 + (P1 - P0) * q / Q
     *
     * SELL from q1 back to q0:
     *
     * output = integral(P(q), q0, q1)
     *
     * SELL rounds DOWN.
     */

    let p0 = ctx.accounts.launch.start_price_lamports_per_token as u128;
    let p1 = ctx.accounts.launch.end_price_lamports_per_token as u128;

    let q_max = allocation_tokens as u128;
    let q0 = new_sold_tokens as u128;
    let q1 = sold_tokens as u128;

    let delta_p = p1
        .checked_sub(p0)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let price_q0 = p0
        .checked_mul(q_max)
        .and_then(|v| delta_p.checked_mul(q0)?.checked_add(v))
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let price_q1 = p0
        .checked_mul(q_max)
        .and_then(|v| delta_p.checked_mul(q1)?.checked_add(v))
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let numerator = (amount_use_tokens as u128)
        .checked_mul(
            price_q0
                .checked_add(price_q1)
                .ok_or_else(|| error!(ErrorCode::MathOverflow))?,
        )
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let denominator = q_max
        .checked_mul(2)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let sol_out_u128 = numerator
        .checked_div(denominator)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let sol_out = u64::try_from(sol_out_u128).map_err(|_| error!(ErrorCode::MathOverflow))?;

    require!(sol_out > 0, ErrorCode::ZeroLaunchCost);

    require!(sol_out >= min_sol_out, ErrorCode::LaunchSlippageExceeded);

    /*
     * Keep Launch PDA rent-exempt.
     */
    let rent_minimum = Rent::get()?.minimum_balance(0);

    let available_sol = ctx
        .accounts
        .sol_vault
        .lamports()
        .checked_sub(rent_minimum)
        .ok_or_else(|| error!(ErrorCode::InsufficientLaunchSol))?;

    require!(sol_out <= available_sol, ErrorCode::InsufficientLaunchSol);

    /*
     * USE: seller -> Launch vault
     */
    let transfer_accounts = TransferChecked {
        from: ctx.accounts.seller_use_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.use_vault.to_account_info(),
        authority: ctx.accounts.seller.to_account_info(),
    };

    token::transfer_checked(
        CpiContext::new(ctx.accounts.token_program.key(), transfer_accounts),
        amount_base_units,
        ctx.accounts.token_mint.decimals,
    )?;

    /*
     * SOL: System-owned SOL vault PDA -> seller
     */
    let launch_key = ctx.accounts.launch.key();
    let sol_vault_bump = [ctx.bumps.sol_vault];

    let sol_vault_signer_seeds: &[&[u8]] = &[
        LAUNCH_SOL_VAULT_SEED,
        launch_key.as_ref(),
        &sol_vault_bump,
    ];

    let sol_transfer = anchor_lang::system_program::Transfer {
        from: ctx.accounts.sol_vault.to_account_info(),
        to: ctx.accounts.seller.to_account_info(),
    };

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            sol_transfer,
            &[sol_vault_signer_seeds],
        ),
        sol_out,
    )?;

    ctx.accounts.launch.tokens_sold = new_sold_tokens
        .checked_mul(USE_TOKEN_BASE_UNITS)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    ctx.accounts.launch.sol_raised = ctx
        .accounts
        .launch
        .sol_raised
        .checked_sub(sol_out)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    msg!("SELL: {} USE for {} lamports", amount_use_tokens, sol_out);

    Ok(())
}

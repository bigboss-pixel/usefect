use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_pack::Pack;
use anchor_spl::token::{
    self,
    CloseAccount,
    Mint,
    MintTo,
    Token,
    TokenAccount,
    Transfer,
};
use anchor_spl::token::spl_token;

use crate::{
    constants::*,
    error::ErrorCode,
    state::{DexConfig, Launch, Pool},
};

#[derive(Accounts)]
pub struct GraduateLaunch<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

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
        address = launch.graduation_vault @ ErrorCode::InvalidLaunchVault,
        token::mint = token_mint,
        token::authority = launch,
    )]
    pub graduation_vault: Account<'info, TokenAccount>,

    /// CHECK: System-owned SOL vault PDA.
    #[account(
        mut,
        seeds = [LAUNCH_SOL_VAULT_SEED, launch.key().as_ref()],
        bump,
    )]
    pub sol_vault: UncheckedAccount<'info>,

    #[account(
        seeds = [DEX_CONFIG_SEED],
        bump = dex_config.bump,
    )]
    pub dex_config: Account<'info, DexConfig>,

    /// CHECK: Canonical native SOL mint.
    #[account(address = spl_token::native_mint::id())]
    pub wsol_mint: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [LAUNCH_GRADUATION_WSOL_TEMP_SEED, launch.key().as_ref()],
        bump,
    )]
    pub wsol_temp: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [LAUNCH_GRADUATION_USE_TEMP_SEED, launch.key().as_ref()],
        bump,
    )]
    pub use_temp: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [LAUNCH_GRADUATION_LP_TEMP_SEED, launch.key().as_ref()],
        bump,
    )]
    pub lp_temp: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            POOL_SEED,
            token_a.key().as_ref(),
            token_b.key().as_ref(),
        ],
        bump,
    )]
    pub pool: UncheckedAccount<'info>,

    /// CHECK: Token ordering is validated in the handler.
    pub token_a: UncheckedAccount<'info>,

    /// CHECK: Token ordering is validated in the handler.
    pub token_b: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [VAULT_A_SEED, pool.key().as_ref()],
        bump,
    )]
    pub vault_a: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [VAULT_B_SEED, pool.key().as_ref()],
        bump,
    )]
    pub vault_b: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [LP_MINT_SEED, pool.key().as_ref()],
        bump,
    )]
    pub lp_mint: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [LP_LOCK_SEED, pool.key().as_ref()],
        bump,
    )]
    pub lp_lock_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_graduate_launch(
    ctx: Context<GraduateLaunch>,
    sol_liquidity_amount: u64,
) -> Result<()> {
    let launch = &ctx.accounts.launch;

    require!(
        launch.status == LAUNCH_STATUS_GRADUATION_PENDING,
        ErrorCode::LaunchNotReadyForGraduation
    );

    require!(
        launch.tokens_sold == launch.total_allocation,
        ErrorCode::LaunchNotReadyForGraduation
    );

    require!(
        ctx.accounts.graduation_vault.amount >= launch.graduation_allocation,
        ErrorCode::InsufficientGraduationInventory
    );

    require!(
        sol_liquidity_amount > 0,
        ErrorCode::ZeroGraduationLiquidity
    );

    /*
     * Graduation SOL comes from the dedicated System-owned vault,
     * not from the Launch state account.
     */
    let minimum_rent = Rent::get()?.minimum_balance(0);

    let available_sol = ctx
        .accounts
        .sol_vault
        .lamports()
        .checked_sub(minimum_rent)
        .ok_or_else(|| error!(ErrorCode::GraduationLiquidityExceedsAvailableSol))?;

    require!(
        sol_liquidity_amount <= available_sol,
        ErrorCode::GraduationLiquidityExceedsAvailableSol
    );

    let use_key = ctx.accounts.token_mint.key();
    let wsol_key = ctx.accounts.wsol_mint.key();

    require!(use_key != wsol_key, ErrorCode::SameToken);

    let use_is_a = use_key.to_bytes() < wsol_key.to_bytes();

    let expected_a = if use_is_a { use_key } else { wsol_key };
    let expected_b = if use_is_a { wsol_key } else { use_key };

    require!(
        ctx.accounts.token_a.key() == expected_a
            && ctx.accounts.token_b.key() == expected_b,
        ErrorCode::InvalidTokenOrder
    );

    /*
     * ------------------------------------------------------------
     * 1. Create USE temporary token account.
     * ------------------------------------------------------------
     */
    let launch_key = ctx.accounts.launch.key();

    let use_temp_bump = [ctx.bumps.use_temp];
    let use_temp_seeds: &[&[u8]] = &[
        LAUNCH_GRADUATION_USE_TEMP_SEED,
        launch_key.as_ref(),
        &use_temp_bump,
    ];

    create_token_account_pda(
        &ctx.accounts.caller.to_account_info(),
        &ctx.accounts.use_temp.to_account_info(),
        &ctx.accounts.token_mint.to_account_info(),
        &ctx.accounts.caller.key(),
        use_temp_seeds,
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    /*
     * ------------------------------------------------------------
     * 2. Move graduation USE from launch vault -> temp account.
     * ------------------------------------------------------------
     */
    let launch_bump = [ctx.accounts.launch.bump];
    let token_mint_key = ctx.accounts.token_mint.key();
    let launch_signer_seeds: &[&[u8]] = &[
        LAUNCH_SEED,
        token_mint_key.as_ref(),
        &launch_bump,
    ];
    let launch_signer = [launch_signer_seeds];

    let transfer_use_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        Transfer {
            from: ctx.accounts.graduation_vault.to_account_info(),
            to: ctx.accounts.use_temp.to_account_info(),
            authority: ctx.accounts.launch.to_account_info(),
        },
        &launch_signer,
    );

    token::transfer(
        transfer_use_ctx,
        ctx.accounts.launch.graduation_allocation,
    )?;

    /*
     * ------------------------------------------------------------
     * 3. Create WSOL temporary token account.
     * ------------------------------------------------------------
     */
    let wsol_temp_bump = [ctx.bumps.wsol_temp];
    let wsol_temp_seeds: &[&[u8]] = &[
        LAUNCH_GRADUATION_WSOL_TEMP_SEED,
        launch_key.as_ref(),
        &wsol_temp_bump,
    ];

    create_token_account_pda(
        &ctx.accounts.caller.to_account_info(),
        &ctx.accounts.wsol_temp.to_account_info(),
        &ctx.accounts.wsol_mint.to_account_info(),
        &ctx.accounts.caller.key(),
        wsol_temp_seeds,
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    /*
     * ------------------------------------------------------------
     * 4. Move SOL from the System-owned SOL vault into WSOL.
     * ------------------------------------------------------------
     */
    let sol_vault_bump = [ctx.bumps.sol_vault];
    let sol_vault_seeds: &[&[u8]] = &[
        LAUNCH_SOL_VAULT_SEED,
        launch_key.as_ref(),
        &sol_vault_bump,
    ];

    let sol_transfer = anchor_lang::system_program::Transfer {
        from: ctx.accounts.sol_vault.to_account_info(),
        to: ctx.accounts.wsol_temp.to_account_info(),
    };

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            sol_transfer,
            &[sol_vault_seeds],
        ),
        sol_liquidity_amount,
    )?;

    let sync_ix = spl_token::instruction::sync_native(
        ctx.accounts.token_program.key,
        ctx.accounts.wsol_temp.key,
    )
    .map_err(|_| error!(ErrorCode::InvalidGraduationAccount))?;

    anchor_lang::solana_program::program::invoke(
        &sync_ix,
        &[ctx.accounts.wsol_temp.to_account_info()],
    )?;

    /*
     * ------------------------------------------------------------
     * 5. Calculate initial LP supply.
     * ------------------------------------------------------------
     */
    let use_amount = ctx.accounts.launch.graduation_allocation;
    let wsol_amount = sol_liquidity_amount;

    let (amount_a, amount_b) = if use_is_a {
        (use_amount, wsol_amount)
    } else {
        (wsol_amount, use_amount)
    };

    let product = (amount_a as u128)
        .checked_mul(amount_b as u128)
        .ok_or_else(|| error!(ErrorCode::MathOverflow))?;

    let root = integer_sqrt(product);

    require!(
        root > MINIMUM_LIQUIDITY as u128,
        ErrorCode::InsufficientGraduationLiquidity
    );

    let lp_supply = u64::try_from(root)
        .map_err(|_| error!(ErrorCode::MathOverflow))?;

    let locked_lp = MINIMUM_LIQUIDITY;

    /*
     * ------------------------------------------------------------
     * 6. Create Pool PDA.
     * ------------------------------------------------------------
     */
    let pool_bump = [ctx.bumps.pool];
    let token_a_key = ctx.accounts.token_a.key();
    let token_b_key = ctx.accounts.token_b.key();

    let pool_seeds: &[&[u8]] = &[
        POOL_SEED,
        token_a_key.as_ref(),
        token_b_key.as_ref(),
        &pool_bump,
    ];

    create_program_account(
        &ctx.accounts.caller.to_account_info(),
        &ctx.accounts.pool.to_account_info(),
        8 + Pool::INIT_SPACE,
        &crate::ID,
        pool_seeds,
    )?;

    /*
     * ------------------------------------------------------------
     * 7. Create vault A.
     * ------------------------------------------------------------
     */
    let pool_key = ctx.accounts.pool.key();

    let vault_a_bump = [ctx.bumps.vault_a];
    let vault_a_seeds: &[&[u8]] = &[
        VAULT_A_SEED,
        pool_key.as_ref(),
        &vault_a_bump,
    ];

    create_token_account_pda(
        &ctx.accounts.caller.to_account_info(),
        &ctx.accounts.vault_a.to_account_info(),
        &ctx.accounts.token_a.to_account_info(),
        &ctx.accounts.pool.key(),
        vault_a_seeds,
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    /*
     * ------------------------------------------------------------
     * 8. Create vault B.
     * ------------------------------------------------------------
     */
    let vault_b_bump = [ctx.bumps.vault_b];
    let vault_b_seeds: &[&[u8]] = &[
        VAULT_B_SEED,
        pool_key.as_ref(),
        &vault_b_bump,
    ];

    create_token_account_pda(
        &ctx.accounts.caller.to_account_info(),
        &ctx.accounts.vault_b.to_account_info(),
        &ctx.accounts.token_b.to_account_info(),
        &ctx.accounts.pool.key(),
        vault_b_seeds,
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    /*
     * ------------------------------------------------------------
     * 9. Create LP mint.
     * ------------------------------------------------------------
     */
    let lp_mint_bump = [ctx.bumps.lp_mint];
    let lp_mint_seeds: &[&[u8]] = &[
        LP_MINT_SEED,
        pool_key.as_ref(),
        &lp_mint_bump,
    ];

    create_mint_pda(
        &ctx.accounts.caller.to_account_info(),
        &ctx.accounts.lp_mint.to_account_info(),
        &ctx.accounts.pool.key(),
        LP_MINT_DECIMALS,
        lp_mint_seeds,
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    /*
     * ------------------------------------------------------------
     * 10. Create permanent LP lock account.
     * ------------------------------------------------------------
     */
    let lp_lock_bump = [ctx.bumps.lp_lock_account];
    let lp_lock_seeds: &[&[u8]] = &[
        LP_LOCK_SEED,
        pool_key.as_ref(),
        &lp_lock_bump,
    ];

    create_token_account_pda(
        &ctx.accounts.caller.to_account_info(),
        &ctx.accounts.lp_lock_account.to_account_info(),
        &ctx.accounts.lp_mint.to_account_info(),
        &anchor_lang::solana_program::system_program::ID,
        lp_lock_seeds,
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    /*
     * ------------------------------------------------------------
     * 11. Create temporary LP token account.
     * ------------------------------------------------------------
     */
    let lp_temp_bump = [ctx.bumps.lp_temp];
    let lp_temp_seeds: &[&[u8]] = &[
        LAUNCH_GRADUATION_LP_TEMP_SEED,
        launch_key.as_ref(),
        &lp_temp_bump,
    ];

    create_token_account_pda(
        &ctx.accounts.caller.to_account_info(),
        &ctx.accounts.lp_temp.to_account_info(),
        &ctx.accounts.lp_mint.to_account_info(),
        &ctx.accounts.caller.key(),
        lp_temp_seeds,
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    /*
     * ------------------------------------------------------------
     * 12. Move USE into vault A/B.
     * ------------------------------------------------------------
     */
    let (use_vault, wsol_vault) = if use_is_a {
        (
            ctx.accounts.vault_a.to_account_info(),
            ctx.accounts.vault_b.to_account_info(),
        )
    } else {
        (
            ctx.accounts.vault_b.to_account_info(),
            ctx.accounts.vault_a.to_account_info(),
        )
    };

    let use_transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        Transfer {
            from: ctx.accounts.use_temp.to_account_info(),
            to: use_vault,
            authority: ctx.accounts.caller.to_account_info(),
        },
    );

    token::transfer(use_transfer_ctx, use_amount)?;

    /*
     * ------------------------------------------------------------
     * 13. Move WSOL into vault A/B.
     * ------------------------------------------------------------
     */
    let wsol_transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        Transfer {
            from: ctx.accounts.wsol_temp.to_account_info(),
            to: wsol_vault,
            authority: ctx.accounts.caller.to_account_info(),
        },
    );

    token::transfer(wsol_transfer_ctx, wsol_amount)?;

    /*
     * ------------------------------------------------------------
     * 14. Mint initial LP.
     * ------------------------------------------------------------
     */
    let pool_signer_seeds: &[&[u8]] = &[
        POOL_SEED,
        token_a_key.as_ref(),
        token_b_key.as_ref(),
        &pool_bump,
    ];
    let pool_signer = [pool_signer_seeds];

    let mint_lp_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        MintTo {
            mint: ctx.accounts.lp_mint.to_account_info(),
            to: ctx.accounts.lp_temp.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        },
        &pool_signer,
    );

    token::mint_to(mint_lp_ctx, lp_supply)?;

    /*
     * ------------------------------------------------------------
     * 15. Lock 100% of LP.
     * ------------------------------------------------------------
     */
    let lock_lp_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        Transfer {
            from: ctx.accounts.lp_temp.to_account_info(),
            to: ctx.accounts.lp_lock_account.to_account_info(),
            authority: ctx.accounts.caller.to_account_info(),
        },
    );

    token::transfer(lock_lp_ctx, lp_supply)?;

    /*
     * ------------------------------------------------------------
     * 16. Write Pool state.
     * ------------------------------------------------------------
     */
    let pool_state = Pool {
        dex: ctx.accounts.dex_config.key(),
        token_a: ctx.accounts.token_a.key(),
        token_b: ctx.accounts.token_b.key(),
        vault_a: ctx.accounts.vault_a.key(),
        vault_b: ctx.accounts.vault_b.key(),
        lp_mint: ctx.accounts.lp_mint.key(),
        reserve_a: amount_a,
        reserve_b: amount_b,
        lp_supply,
        fee_bps: ctx.accounts.dex_config.fee_bps,
        token_a_decimals: if use_is_a {
            ctx.accounts.token_mint.decimals
        } else {
            9
        },
        token_b_decimals: if use_is_a {
            9
        } else {
            ctx.accounts.token_mint.decimals
        },
        status: POOL_STATUS_ACTIVE,
        bump: ctx.bumps.pool,
    };

    let mut pool_data = ctx.accounts.pool.try_borrow_mut_data()?;
    let mut writer = &mut pool_data[..];
    pool_state.try_serialize(&mut writer)?;

    /*
     * ------------------------------------------------------------
     * 17. Close temporary token accounts.
     * ------------------------------------------------------------
     */
    close_token_account(
        &ctx.accounts.token_program,
        &ctx.accounts.use_temp,
        &ctx.accounts.caller,
    )?;

    close_token_account(
        &ctx.accounts.token_program,
        &ctx.accounts.wsol_temp,
        &ctx.accounts.caller,
    )?;

    close_token_account(
        &ctx.accounts.token_program,
        &ctx.accounts.lp_temp,
        &ctx.accounts.caller,
    )?;

    /*
     * ------------------------------------------------------------
     * 18. Graduation complete.
     * ------------------------------------------------------------
     */
    ctx.accounts.launch.status = LAUNCH_STATUS_GRADUATED;

    msg!("USE launch graduated");
    msg!("Pool: {}", ctx.accounts.pool.key());
    msg!("USE liquidity: {}", use_amount);
    msg!("WSOL liquidity: {}", wsol_amount);
    msg!("LP supply: {}", lp_supply);
    msg!("LP locked: {}", locked_lp);

    Ok(())
}

fn create_program_account<'info>(
    payer: &AccountInfo<'info>,
    account: &AccountInfo<'info>,
    space: usize,
    owner: &Pubkey,
    seeds: &[&[u8]],
) -> Result<()> {
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);

    let ix = anchor_lang::solana_program::system_instruction::create_account(
        payer.key,
        account.key,
        lamports,
        space as u64,
        owner,
    );

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[payer.clone(), account.clone()],
        &[seeds],
    )?;

    Ok(())
}

fn create_token_account_pda<'info>(
    payer: &AccountInfo<'info>,
    token_account: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    owner: &Pubkey,
    seeds: &[&[u8]],
    token_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
) -> Result<()> {
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(165);

    let create_ix = anchor_lang::solana_program::system_instruction::create_account(
        payer.key,
        token_account.key,
        lamports,
        165,
        token_program.key,
    );

    anchor_lang::solana_program::program::invoke_signed(
        &create_ix,
        &[payer.clone(), token_account.clone(), system_program.clone()],
        &[seeds],
    )?;

    let init_ix = spl_token::instruction::initialize_account3(
        token_program.key,
        token_account.key,
        mint.key,
        owner,
    )
    .map_err(|_| error!(ErrorCode::InvalidGraduationAccount))?;

    anchor_lang::solana_program::program::invoke(
        &init_ix,
        &[token_account.clone(), mint.clone()],
    )?;

    Ok(())
}

fn create_mint_pda<'info>(
    payer: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    authority: &Pubkey,
    decimals: u8,
    seeds: &[&[u8]],
    token_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
) -> Result<()> {
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(spl_token::state::Mint::LEN);

    let create_ix = anchor_lang::solana_program::system_instruction::create_account(
        payer.key,
        mint.key,
        lamports,
        spl_token::state::Mint::LEN as u64,
        token_program.key,
    );

    anchor_lang::solana_program::program::invoke_signed(
        &create_ix,
        &[payer.clone(), mint.clone(), system_program.clone()],
        &[seeds],
    )?;

    let init_ix = spl_token::instruction::initialize_mint2(
        token_program.key,
        mint.key,
        authority,
        None,
        decimals,
    )
    .map_err(|_| error!(ErrorCode::InvalidGraduationAccount))?;

    anchor_lang::solana_program::program::invoke(
        &init_ix,
        &[mint.clone()],
    )?;

    Ok(())
}

fn close_token_account<'info>(
    token_program: &Program<'info, Token>,
    account: &UncheckedAccount<'info>,
    destination: &Signer<'info>,
) -> Result<()> {
    let ctx = CpiContext::new(
        token_program.key(),
        CloseAccount {
            account: account.to_account_info(),
            destination: destination.to_account_info(),
            authority: destination.to_account_info(),
        },
    );

    token::close_account(ctx)
}

fn integer_sqrt(value: u128) -> u128 {
    if value < 2 {
        return value;
    }

    let mut x0 = value;
    let mut x1 = (x0 + value / x0) / 2;

    while x1 < x0 {
        x0 = x1;
        x1 = (x0 + value / x0) / 2;
    }

    x0
}

use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{
            instruction::Instruction,
            system_program,
        },
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    anchor_spl::token::spl_token,
    litesvm::LiteSVM,
    programs_usefect::{
        accounts,
        constants::{
            DEX_CONFIG_SEED,
            LAUNCH_GRADUATION_LP_TEMP_SEED,
            LAUNCH_GRADUATION_USE_TEMP_SEED,
            LAUNCH_GRADUATION_VAULT_SEED,
            LAUNCH_GRADUATION_WSOL_TEMP_SEED,
            LAUNCH_SEED,
            LAUNCH_STATUS_GRADUATED,
            LAUNCH_STATUS_GRADUATION_PENDING,
            LAUNCH_USE_VAULT_SEED,
            LP_LOCK_SEED,
            LP_MINT_SEED,
            POOL_SEED,
            VAULT_A_SEED,
            VAULT_B_SEED,
            USE_TOKEN_BASE_UNITS,
            USE_TOKEN_DECIMALS,
        },
        state::{DexConfig, Launch, Pool},
    },
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

fn send_tx(
    svm: &mut LiteSVM,
    payer: &Keypair,
    instructions: &[Instruction],
    signers: &[&Keypair],
) {
    let blockhash = svm.latest_blockhash();

    let message =
        Message::new_with_blockhash(instructions, Some(&payer.pubkey()), &blockhash);

    let mut unique_signers: Vec<&Keypair> = Vec::new();

    for signer in signers {
        if !unique_signers
            .iter()
            .any(|existing| existing.pubkey() == signer.pubkey())
        {
            unique_signers.push(*signer);
        }
    }

    let tx = VersionedTransaction::try_new(
        VersionedMessage::Legacy(message),
        &unique_signers,
    )
    .unwrap();

    let result = svm.send_transaction(tx);

    if let Err(err) = result {
        panic!("Transaction gagal: {err:?}");
    }
}

fn send_tx_expect_error(
    svm: &mut LiteSVM,
    payer: &Keypair,
    instruction: Instruction,
) {
    let blockhash = svm.latest_blockhash();

    let message =
        Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(
        VersionedMessage::Legacy(message),
        &[payer],
    )
    .unwrap();

    let result = svm.send_transaction(tx);

    assert!(result.is_err(), "Transaction seharusnya gagal");
}

fn create_mint(
    svm: &mut LiteSVM,
    payer: &Keypair,
    mint: &Keypair,
    decimals: u8,
    authority: &Pubkey,
) {
    let rent = svm.minimum_balance_for_rent_exemption(82);

    let create = anchor_lang::solana_program::system_instruction::create_account(
        &payer.pubkey(),
        &mint.pubkey(),
        rent,
        82,
        &spl_token::ID,
    );

    let initialize = spl_token::instruction::initialize_mint2(
        &spl_token::ID,
        &mint.pubkey(),
        authority,
        None,
        decimals,
    )
    .unwrap();

    send_tx(
        svm,
        payer,
        &[create, initialize],
        &[payer, mint],
    );
}

fn create_token_account(
    svm: &mut LiteSVM,
    payer: &Keypair,
    token_account: &Keypair,
    mint: &Pubkey,
    owner: &Pubkey,
) {
    let rent = svm.minimum_balance_for_rent_exemption(165);

    let create = anchor_lang::solana_program::system_instruction::create_account(
        &payer.pubkey(),
        &token_account.pubkey(),
        rent,
        165,
        &spl_token::ID,
    );

    let initialize = spl_token::instruction::initialize_account3(
        &spl_token::ID,
        &token_account.pubkey(),
        mint,
        owner,
    )
    .unwrap();

    send_tx(
        svm,
        payer,
        &[create, initialize],
        &[payer, token_account],
    );
}

fn mint_tokens(
    svm: &mut LiteSVM,
    payer: &Keypair,
    mint: &Pubkey,
    destination: &Pubkey,
    authority: &Keypair,
    amount: u64,
) {
    let instruction = spl_token::instruction::mint_to(
        &spl_token::ID,
        mint,
        destination,
        &authority.pubkey(),
        &[],
        amount,
    )
    .unwrap();

    send_tx(
        svm,
        payer,
        &[instruction],
        &[payer, authority],
    );
}

fn token_amount(svm: &LiteSVM, token_account: &Pubkey) -> u64 {
    let account = svm
        .get_account(token_account)
        .expect("Token account tidak ditemukan");

    u64::from_le_bytes(
        account.data[64..72]
            .try_into()
            .unwrap(),
    )
}

fn read_launch(svm: &LiteSVM, launch: &Pubkey) -> Launch {
    let account = svm
        .get_account(launch)
        .expect("Launch tidak ditemukan");

    let mut data: &[u8] = &account.data;

    Launch::try_deserialize(&mut data)
        .expect("Gagal deserialize Launch")
}

fn read_pool(svm: &LiteSVM, pool: &Pubkey) -> Pool {
    let account = svm
        .get_account(pool)
        .expect("Pool tidak ditemukan");

    let mut data: &[u8] = &account.data;

    Pool::try_deserialize(&mut data)
        .expect("Gagal deserialize Pool")
}

#[test]
fn test_graduate_launch_use_wsol_end_to_end() {
    let program_id = programs_usefect::id();

    let payer = Keypair::new();
    let buyer = Keypair::new();

    let mut svm = LiteSVM::new();

    let program_path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../target/deploy/programs_usefect_litesvm.so"
    );

    svm.add_program_from_file(program_id, program_path)
        .expect("Gagal load program USEFECT");

    svm.airdrop(&payer.pubkey(), 20_000_000_000).unwrap();
    svm.airdrop(&buyer.pubkey(), 20_000_000_000).unwrap();

    // =========================================================
    // 1. CREATE USE MINT
    // =========================================================

    let use_mint = Keypair::new();

    create_mint(
        &mut svm,
        &payer,
        &use_mint,
        USE_TOKEN_DECIMALS,
        &payer.pubkey(),
    );

    // =========================================================
    // 2. USER USE ACCOUNTS
    // =========================================================

    let payer_use = Keypair::new();
    let buyer_use = Keypair::new();

    create_token_account(
        &mut svm,
        &payer,
        &payer_use,
        &use_mint.pubkey(),
        &payer.pubkey(),
    );

    create_token_account(
        &mut svm,
        &payer,
        &buyer_use,
        &use_mint.pubkey(),
        &buyer.pubkey(),
    );

    // =========================================================
    // 3. MINT USE
    // =========================================================

    let launch_inventory = 1_000 * USE_TOKEN_BASE_UNITS;
    let graduation_inventory = 500 * USE_TOKEN_BASE_UNITS;

    mint_tokens(
        &mut svm,
        &payer,
        &use_mint.pubkey(),
        &payer_use.pubkey(),
        &payer,
        launch_inventory + graduation_inventory,
    );

    // =========================================================
    // 4. INITIALIZE DEX
    // =========================================================

    let dex_config =
        Pubkey::find_program_address(
            &[DEX_CONFIG_SEED],
            &program_id,
        )
        .0;

    let initialize_dex = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::InitializeDex {
            fee_bps: 30,
            protocol_fee_bps: 5,
        }
        .data(),
        accounts::InitializeDex {
            authority: payer.pubkey(),
            dex_config,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    send_tx(
        &mut svm,
        &payer,
        &[initialize_dex],
        &[&payer],
    );

    let dex_account = svm
        .get_account(&dex_config)
        .expect("DexConfig tidak ditemukan");

    let mut dex_data: &[u8] = &dex_account.data;

    let dex_state = DexConfig::try_deserialize(&mut dex_data)
        .expect("Gagal deserialize DexConfig");

    assert_eq!(dex_state.authority, payer.pubkey());
    assert_eq!(dex_state.fee_bps, 30);

    // =========================================================
    // 5. LAUNCH PDAs
    // =========================================================

    let launch =
        Pubkey::find_program_address(
            &[LAUNCH_SEED, use_mint.pubkey().as_ref()],
            &program_id,
        )
        .0;

    let use_vault =
        Pubkey::find_program_address(
            &[LAUNCH_USE_VAULT_SEED, launch.as_ref()],
            &program_id,
        )
        .0;

    let graduation_vault =
        Pubkey::find_program_address(
            &[LAUNCH_GRADUATION_VAULT_SEED, launch.as_ref()],
            &program_id,
        )
        .0;

    // =========================================================
    // 6. INITIALIZE LAUNCH
    // =========================================================

    let initialize_launch = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::InitializeLaunch {
            token_mint: use_mint.pubkey(),
            treasury: payer.pubkey(),
            total_allocation: launch_inventory,
            graduation_allocation: graduation_inventory,
            start_price_lamports_per_token: 5_000,
            end_price_lamports_per_token: 15_000,
            duration_seconds: 86_400,
        }
        .data(),
        accounts::InitializeLaunch {
            authority: payer.pubkey(),
            launch,
            token_mint_account: use_mint.pubkey(),
            use_vault,
            graduation_vault,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    send_tx(
        &mut svm,
        &payer,
        &[initialize_launch],
        &[&payer],
    );

    // =========================================================
    // 7. FUND BONDING CURVE
    // =========================================================

    let fund_launch = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::FundLaunch {
            amount: launch_inventory,
        }
        .data(),
        accounts::FundLaunch {
            authority: payer.pubkey(),
            launch,
            token_mint: use_mint.pubkey(),
            use_vault,
            authority_use_account: payer_use.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx(
        &mut svm,
        &payer,
        &[fund_launch],
        &[&payer],
    );

    // =========================================================
    // 8. FUND GRADUATION LIQUIDITY
    // =========================================================

    let fund_graduation = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::FundGraduationLiquidity {
            amount: graduation_inventory,
        }
        .data(),
        accounts::FundGraduationLiquidity {
            authority: payer.pubkey(),
            launch,
            token_mint: use_mint.pubkey(),
            graduation_vault,
            authority_use_account: payer_use.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx(
        &mut svm,
        &payer,
        &[fund_graduation],
        &[&payer],
    );

    assert_eq!(
        token_amount(&svm, &graduation_vault),
        graduation_inventory
    );

    // =========================================================
    // 9. BUY ENTIRE BONDING CURVE ALLOCATION
    // =========================================================

    let buy_all = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::Buy {
            amount_use_tokens: 1_000,
            max_sol_in: 100_000_000,
        }
        .data(),
        accounts::Buy {
            buyer: buyer.pubkey(),
            launch,
            token_mint: use_mint.pubkey(),
            use_vault,
            buyer_use_account: buyer_use.pubkey(),
            sol_vault: Pubkey::find_program_address(
                &[b"sol-vault", launch.as_ref()],
                &program_id,
            ).0,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    send_tx(
        &mut svm,
        &buyer,
        &[buy_all],
        &[&buyer],
    );

    let pending = read_launch(&svm, &launch);

    assert_eq!(
        pending.tokens_sold,
        launch_inventory
    );

    assert_eq!(
        pending.status,
        LAUNCH_STATUS_GRADUATION_PENDING
    );

    assert_eq!(
        token_amount(&svm, &use_vault),
        0
    );

    // =========================================================
    // 10. GRADUATION PDAs
    // =========================================================

    let wsol_mint = spl_token::native_mint::id();

    let wsol_temp =
        Pubkey::find_program_address(
            &[
                LAUNCH_GRADUATION_WSOL_TEMP_SEED,
                launch.as_ref(),
            ],
            &program_id,
        )
        .0;

    let use_temp =
        Pubkey::find_program_address(
            &[
                LAUNCH_GRADUATION_USE_TEMP_SEED,
                launch.as_ref(),
            ],
            &program_id,
        )
        .0;

    let lp_temp =
        Pubkey::find_program_address(
            &[
                LAUNCH_GRADUATION_LP_TEMP_SEED,
                launch.as_ref(),
            ],
            &program_id,
        )
        .0;

    // =========================================================
    // 11. POOL PDA
    // =========================================================

    let (token_a, token_b) =
        if use_mint.pubkey().to_bytes() < wsol_mint.to_bytes() {
            (use_mint.pubkey(), wsol_mint)
        } else {
            (wsol_mint, use_mint.pubkey())
        };

    let pool =
        Pubkey::find_program_address(
            &[
                POOL_SEED,
                token_a.as_ref(),
                token_b.as_ref(),
            ],
            &program_id,
        )
        .0;

    let vault_a =
        Pubkey::find_program_address(
            &[VAULT_A_SEED, pool.as_ref()],
            &program_id,
        )
        .0;

    let vault_b =
        Pubkey::find_program_address(
            &[VAULT_B_SEED, pool.as_ref()],
            &program_id,
        )
        .0;

    let lp_mint =
        Pubkey::find_program_address(
            &[LP_MINT_SEED, pool.as_ref()],
            &program_id,
        )
        .0;

    let lp_lock =
        Pubkey::find_program_address(
            &[LP_LOCK_SEED, pool.as_ref()],
            &program_id,
        )
        .0;

    // =========================================================
    // 12. GRADUATE
    // =========================================================

    // 5,000,000 lamports = 0.005 SOL.
    let graduation_sol = 5_000_000u64;

    let graduate = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::GraduateLaunch {
            sol_liquidity_amount: graduation_sol,
        }
        .data(),
        accounts::GraduateLaunch {
            caller: payer.pubkey(),
            launch,
            token_mint: use_mint.pubkey(),
            graduation_vault,
            sol_vault: Pubkey::find_program_address(
                &[b"sol-vault", launch.as_ref()],
                &program_id,
            ).0,
            dex_config,
            wsol_mint,
            wsol_temp,
            use_temp,
            lp_temp,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account: lp_lock,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    send_tx(
        &mut svm,
        &payer,
        &[graduate],
        &[&payer],
    );

    // =========================================================
    // 13. VERIFY LAUNCH GRADUATED
    // =========================================================

    let graduated = read_launch(&svm, &launch);

    assert_eq!(
        graduated.status,
        LAUNCH_STATUS_GRADUATED
    );

    assert_eq!(
        graduated.tokens_sold,
        launch_inventory
    );

    // =========================================================
    // 14. VERIFY POOL
    // =========================================================

    let pool_state = read_pool(&svm, &pool);

    assert_eq!(
        pool_state.dex,
        dex_config
    );

    assert_eq!(
        pool_state.token_a,
        token_a
    );

    assert_eq!(
        pool_state.token_b,
        token_b
    );

    assert_eq!(
        pool_state.vault_a,
        vault_a
    );

    assert_eq!(
        pool_state.vault_b,
        vault_b
    );

    assert_eq!(
        pool_state.lp_mint,
        lp_mint
    );

    assert_eq!(
        pool_state.status,
        1
    );

    assert!(
        pool_state.reserve_a > 0,
        "Reserve A harus > 0"
    );

    assert!(
        pool_state.reserve_b > 0,
        "Reserve B harus > 0"
    );

    assert!(
        pool_state.lp_supply > 0,
        "LP supply harus > 0"
    );

    // =========================================================
    // 15. VERIFY USE/WSOL RESERVES
    // =========================================================

    let expected_use = graduation_inventory;
    let expected_wsol = graduation_sol;

    if token_a == use_mint.pubkey() {
        assert_eq!(pool_state.reserve_a, expected_use);
        assert_eq!(pool_state.reserve_b, expected_wsol);

        assert_eq!(
            token_amount(&svm, &vault_a),
            expected_use
        );
    } else {
        assert_eq!(pool_state.reserve_a, expected_wsol);
        assert_eq!(pool_state.reserve_b, expected_use);

        assert_eq!(
            token_amount(&svm, &vault_b),
            expected_use
        );
    }

    // =========================================================
    // 16. VERIFY LP 100% LOCKED
    // =========================================================

    assert_eq!(
        token_amount(&svm, &lp_lock),
        pool_state.lp_supply
    );

    // =========================================================
    // 17. TEMP ACCOUNTS MUST BE CLOSED
    // =========================================================

    assert!(
        svm.get_account(&use_temp).is_none(),
        "USE temp account seharusnya sudah ditutup"
    );

    assert!(
        svm.get_account(&wsol_temp).is_none(),
        "WSOL temp account seharusnya sudah ditutup"
    );

    assert!(
        svm.get_account(&lp_temp).is_none(),
        "LP temp account seharusnya sudah ditutup"
    );

    // =========================================================
    // 18. GRADUATION KEDUA HARUS GAGAL
    // =========================================================

    let graduate_again = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::GraduateLaunch {
            sol_liquidity_amount: graduation_sol,
        }
        .data(),
        accounts::GraduateLaunch {
            caller: payer.pubkey(),
            launch,
            token_mint: use_mint.pubkey(),
            graduation_vault,
            sol_vault: Pubkey::find_program_address(
                &[b"sol-vault", launch.as_ref()],
                &program_id,
            ).0,
            dex_config,
            wsol_mint,
            wsol_temp,
            use_temp,
            lp_temp,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account: lp_lock,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    send_tx_expect_error(
        &mut svm,
        &payer,
        graduate_again,
    );

    // =========================================================
    // FINAL
    // =========================================================

    println!("==========================================");
    println!("GRADUATION END-TO-END TEST PASSED");
    println!("Launch : {}", launch);
    println!("Pool   : {}", pool);
    println!("USE    : {}", use_mint.pubkey());
    println!("WSOL   : {}", wsol_mint);
    println!("LP     : {}", lp_mint);
    println!("LP lock: {}", lp_lock);
    println!("LP supply: {}", pool_state.lp_supply);
    println!("==========================================");
}

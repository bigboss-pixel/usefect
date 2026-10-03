use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    anchor_spl::token::spl_token,
    litesvm::LiteSVM,
    programs_usefect::{
        accounts,
        constants::{
            DEX_CONFIG_SEED, LP_LOCK_SEED, LP_MINT_SEED, MINIMUM_LIQUIDITY, POOL_SEED,
            VAULT_A_SEED, VAULT_B_SEED,
        },
        state::{DexConfig, Pool},
    },
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

fn send_tx(svm: &mut LiteSVM, payer: &Keypair, instructions: &[Instruction], signers: &[&Keypair]) {
    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(instructions, Some(&payer.pubkey()), &blockhash);

    let mut unique_signers: Vec<&Keypair> = Vec::new();

    for signer in signers {
        if !unique_signers
            .iter()
            .any(|existing| existing.pubkey() == signer.pubkey())
        {
            unique_signers.push(*signer);
        }
    }

    let tx =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message), &unique_signers).unwrap();

    let result = svm.send_transaction(tx);

    if let Err(err) = result {
        panic!("Transaction gagal: {err:?}");
    }
}

fn token_amount(svm: &LiteSVM, token_account: &Pubkey) -> u64 {
    let account = svm
        .get_account(token_account)
        .expect("Token account tidak ditemukan");

    // SPL Token account layout:
    // mint      = bytes 0..32
    // owner     = bytes 32..64
    // amount    = bytes 64..72
    u64::from_le_bytes(account.data[64..72].try_into().unwrap())
}

fn read_pool(svm: &LiteSVM, pool: &Pubkey) -> Pool {
    let account = svm.get_account(pool).expect("Pool tidak ditemukan");

    let mut data: &[u8] = &account.data;

    Pool::try_deserialize(&mut data).expect("Gagal deserialize Pool")
}

fn create_mint(
    svm: &mut LiteSVM,
    payer: &Keypair,
    mint: &Keypair,
    decimals: u8,
    authority: &Pubkey,
) {
    let rent = svm.minimum_balance_for_rent_exemption(82);

    let create = system_instruction::create_account(
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

    send_tx(svm, payer, &[create, initialize], &[payer, mint]);
}

fn create_token_account(
    svm: &mut LiteSVM,
    payer: &Keypair,
    token_account: &Keypair,
    mint: &Pubkey,
    owner: &Pubkey,
) {
    let rent = svm.minimum_balance_for_rent_exemption(165);

    let create = system_instruction::create_account(
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

    send_tx(svm, payer, &[create, initialize], &[payer, token_account]);
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

    send_tx(svm, payer, &[instruction], &[payer, authority]);
}

#[test]
fn test_add_liquidity() {
    let program_id = programs_usefect::id();

    let payer = Keypair::new();

    let mut svm = LiteSVM::new();

    let program_path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../target/deploy/programs_usefect_litesvm.so"
    );

    svm.add_program_from_file(program_id, program_path)
        .expect("Gagal load program USEFECT");

    svm.airdrop(&payer.pubkey(), 10_000_000_000)
        .expect("Airdrop gagal");

    // ---------------------------------------------------------
    // 1. CREATE TWO TEST MINTS
    // ---------------------------------------------------------

    let mint_x = Keypair::new();
    let mint_y = Keypair::new();

    create_mint(&mut svm, &payer, &mint_x, 6, &payer.pubkey());

    create_mint(&mut svm, &payer, &mint_y, 6, &payer.pubkey());

    // Token ordering wajib deterministic.
    let (token_a, token_b, mint_a, mint_b) =
        if mint_x.pubkey().to_bytes() < mint_y.pubkey().to_bytes() {
            (mint_x.pubkey(), mint_y.pubkey(), &mint_x, &mint_y)
        } else {
            (mint_y.pubkey(), mint_x.pubkey(), &mint_y, &mint_x)
        };

    assert_ne!(token_a, token_b);

    // ---------------------------------------------------------
    // 2. CREATE USER TOKEN ACCOUNTS
    // ---------------------------------------------------------

    let user_token_a = Keypair::new();
    let user_token_b = Keypair::new();

    create_token_account(&mut svm, &payer, &user_token_a, &token_a, &payer.pubkey());

    create_token_account(&mut svm, &payer, &user_token_b, &token_b, &payer.pubkey());

    // ---------------------------------------------------------
    // 3. MINT USER BALANCES
    // ---------------------------------------------------------

    // Initial liquidity:
    // A = 2,000,000
    // B = 8,000,000
    mint_tokens(
        &mut svm,
        &payer,
        &mint_a.pubkey(),
        &user_token_a.pubkey(),
        &payer,
        2_000_000,
    );

    mint_tokens(
        &mut svm,
        &payer,
        &mint_b.pubkey(),
        &user_token_b.pubkey(),
        &payer,
        8_000_000,
    );

    assert_eq!(token_amount(&svm, &user_token_a.pubkey()), 2_000_000);

    assert_eq!(token_amount(&svm, &user_token_b.pubkey()), 8_000_000);

    // ---------------------------------------------------------
    // 4. DEX CONFIG PDA
    // ---------------------------------------------------------

    let dex_config = Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0;

    let initialize_dex = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::InitializeDex {
            fee_bps: 30,
            protocol_fee_bps: 0,
        }
        .data(),
        accounts::InitializeDex {
            dex_config,
            authority: payer.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    send_tx(&mut svm, &payer, &[initialize_dex], &[&payer]);

    let dex_account = svm
        .get_account(&dex_config)
        .expect("DexConfig tidak ditemukan");

    let mut dex_data: &[u8] = &dex_account.data;

    let dex_state = DexConfig::try_deserialize(&mut dex_data).expect("Gagal deserialize DexConfig");

    assert_eq!(dex_state.authority, payer.pubkey());
    assert_eq!(dex_state.fee_bps, 30);
    assert_eq!(dex_state.protocol_fee_bps, 0);
    assert!(!dex_state.paused);

    // ---------------------------------------------------------
    // 5. POOL PDAs
    // ---------------------------------------------------------

    let pool = Pubkey::find_program_address(
        &[POOL_SEED, token_a.as_ref(), token_b.as_ref()],
        &program_id,
    )
    .0;

    let vault_a = Pubkey::find_program_address(&[VAULT_A_SEED, pool.as_ref()], &program_id).0;

    let vault_b = Pubkey::find_program_address(&[VAULT_B_SEED, pool.as_ref()], &program_id).0;

    let lp_mint = Pubkey::find_program_address(&[LP_MINT_SEED, pool.as_ref()], &program_id).0;

    let lp_lock_account =
        Pubkey::find_program_address(&[LP_LOCK_SEED, pool.as_ref()], &program_id).0;

    // ---------------------------------------------------------
    // 6. INITIALIZE POOL
    // ---------------------------------------------------------

    let initialize_pool = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::InitializePool {}.data(),
        accounts::InitializePool {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            authority: payer.pubkey(),
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    send_tx(&mut svm, &payer, &[initialize_pool], &[&payer]);

    // ---------------------------------------------------------
    // 7. USER LP TOKEN ACCOUNT
    // ---------------------------------------------------------

    let user_lp = Keypair::new();

    create_token_account(&mut svm, &payer, &user_lp, &lp_mint, &payer.pubkey());

    // ---------------------------------------------------------
    // 8. INITIAL ADD LIQUIDITY
    // ---------------------------------------------------------

    let initial_a = 2_000_000u64;
    let initial_b = 8_000_000u64;

    // sqrt(2,000,000 * 8,000,000)
    // = sqrt(16,000,000,000,000)
    // = 4,000,000
    //
    // Minimum liquidity locked:
    // 1,000
    //
    // User receives:
    // 3,999,000
    let expected_initial_lp = 3_999_000u64;

    let add_liquidity_1 = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::AddLiquidity {
            amount_a: initial_a,
            amount_b: initial_b,
            lp_amount_min: expected_initial_lp,
        }
        .data(),
        accounts::AddLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user_lp_token_account: user_lp.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx(&mut svm, &payer, &[add_liquidity_1], &[&payer]);

    // ---------------------------------------------------------
    // 9. VERIFY INITIAL LIQUIDITY
    // ---------------------------------------------------------

    let pool_state = read_pool(&svm, &pool);

    assert_eq!(pool_state.token_a, token_a);
    assert_eq!(pool_state.token_b, token_b);
    assert_eq!(pool_state.vault_a, vault_a);
    assert_eq!(pool_state.vault_b, vault_b);
    assert_eq!(pool_state.lp_mint, lp_mint);

    assert_eq!(pool_state.reserve_a, 2_000_000);
    assert_eq!(pool_state.reserve_b, 8_000_000);

    assert_eq!(pool_state.lp_supply, 4_000_000);

    assert_eq!(token_amount(&svm, &user_lp.pubkey()), expected_initial_lp);

    assert_eq!(token_amount(&svm, &lp_lock_account), MINIMUM_LIQUIDITY);

    assert_eq!(token_amount(&svm, &vault_a), 2_000_000);

    assert_eq!(token_amount(&svm, &vault_b), 8_000_000);

    // ---------------------------------------------------------
    // 10. SECOND LIQUIDITY
    // ---------------------------------------------------------

    // Add at exactly the same 1:4 ratio:
    //
    // A = 1,000,000
    // B = 4,000,000
    //
    // Current LP supply = 4,000,000
    //
    // LP from A:
    // 1,000,000 * 4,000,000 / 2,000,000
    // = 2,000,000
    //
    // LP from B:
    // 4,000,000 * 4,000,000 / 8,000,000
    // = 2,000,000
    //
    // User receives 2,000,000 LP.

    mint_tokens(
        &mut svm,
        &payer,
        &mint_a.pubkey(),
        &user_token_a.pubkey(),
        &payer,
        1_000_000,
    );

    mint_tokens(
        &mut svm,
        &payer,
        &mint_b.pubkey(),
        &user_token_b.pubkey(),
        &payer,
        4_000_000,
    );

    let second_a = 1_000_000u64;
    let second_b = 4_000_000u64;
    let expected_second_lp = 2_000_000u64;

    let add_liquidity_2 = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::AddLiquidity {
            amount_a: second_a,
            amount_b: second_b,
            lp_amount_min: expected_second_lp,
        }
        .data(),
        accounts::AddLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user_lp_token_account: user_lp.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx(&mut svm, &payer, &[add_liquidity_2], &[&payer]);

    // ---------------------------------------------------------
    // 11. VERIFY SECOND LIQUIDITY
    // ---------------------------------------------------------

    let pool_state = read_pool(&svm, &pool);

    assert_eq!(pool_state.reserve_a, 3_000_000);
    assert_eq!(pool_state.reserve_b, 12_000_000);

    assert_eq!(pool_state.lp_supply, 6_000_000);

    assert_eq!(token_amount(&svm, &user_lp.pubkey()), 5_999_000);

    assert_eq!(token_amount(&svm, &lp_lock_account), MINIMUM_LIQUIDITY);

    assert_eq!(token_amount(&svm, &vault_a), 3_000_000);

    assert_eq!(token_amount(&svm, &vault_b), 12_000_000);

    // ---------------------------------------------------------
    // 12. NEGATIVE TEST: LP SLIPPAGE PROTECTION
    // ---------------------------------------------------------
    //
    // Expected LP = 2,000,000
    // Minimum requested = 2,000,001
    //
    // Transaction MUST fail and Pool state MUST remain unchanged.

    let reserve_a_before = pool_state.reserve_a;
    let reserve_b_before = pool_state.reserve_b;
    let lp_supply_before = pool_state.lp_supply;
    let user_lp_before = token_amount(&svm, &user_lp.pubkey());

    let slippage_test = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::AddLiquidity {
            amount_a: 1_000_000,
            amount_b: 4_000_000,
            lp_amount_min: 2_000_001,
        }
        .data(),
        accounts::AddLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user_lp_token_account: user_lp.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(&[slippage_test], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    let result = svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "Add liquidity seharusnya gagal karena lp_amount_min terlalu tinggi"
    );

    // Transaction failure MUST NOT mutate the pool.
    let pool_after_failed_tx = read_pool(&svm, &pool);

    assert_eq!(pool_after_failed_tx.reserve_a, reserve_a_before);

    assert_eq!(pool_after_failed_tx.reserve_b, reserve_b_before);

    assert_eq!(pool_after_failed_tx.lp_supply, lp_supply_before);

    assert_eq!(token_amount(&svm, &user_lp.pubkey()), user_lp_before);

    assert_eq!(token_amount(&svm, &lp_lock_account), MINIMUM_LIQUIDITY);

    println!("DEX-04 negative test: LP slippage protection PASSED");

    // ---------------------------------------------------------
    // DEX-05: REMOVE LIQUIDITY
    // ---------------------------------------------------------
    //
    // Current state before removal:
    //
    // Reserve A = 3,000,000
    // Reserve B = 12,000,000
    // LP Supply = 6,000,000
    // User LP   = 5,999,000
    // Locked LP = 1,000
    //
    // Burn:
    // LP = 2,000,000
    //
    // Expected:
    // A = 1,000,000
    // B = 4,000,000

    let user_token_a_before = token_amount(&svm, &user_token_a.pubkey());

    let user_token_b_before = token_amount(&svm, &user_token_b.pubkey());

    let user_lp_before_remove = token_amount(&svm, &user_lp.pubkey());

    let vault_a_before_remove = token_amount(&svm, &vault_a);

    let vault_b_before_remove = token_amount(&svm, &vault_b);

    let remove_liquidity = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::RemoveLiquidity {
            lp_amount: 2_000_000,
            amount_a_min: 1_000_000,
            amount_b_min: 4_000_000,
        }
        .data(),
        accounts::RemoveLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            user_lp_token_account: user_lp.pubkey(),
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx(&mut svm, &payer, &[remove_liquidity], &[&payer]);

    // ---------------------------------------------------------
    // VERIFY DEX-05 HAPPY PATH
    // ---------------------------------------------------------

    let pool_after_remove = read_pool(&svm, &pool);

    assert_eq!(pool_after_remove.reserve_a, 2_000_000);

    assert_eq!(pool_after_remove.reserve_b, 8_000_000);

    assert_eq!(pool_after_remove.lp_supply, 4_000_000);

    assert_eq!(
        token_amount(&svm, &user_token_a.pubkey()),
        user_token_a_before + 1_000_000
    );

    assert_eq!(
        token_amount(&svm, &user_token_b.pubkey()),
        user_token_b_before + 4_000_000
    );

    assert_eq!(
        token_amount(&svm, &user_lp.pubkey()),
        user_lp_before_remove - 2_000_000
    );

    assert_eq!(
        token_amount(&svm, &vault_a),
        vault_a_before_remove - 1_000_000
    );

    assert_eq!(
        token_amount(&svm, &vault_b),
        vault_b_before_remove - 4_000_000
    );

    assert_eq!(token_amount(&svm, &lp_lock_account), MINIMUM_LIQUIDITY);

    // ---------------------------------------------------------
    // DEX-05 NEGATIVE TEST: WITHDRAWAL SLIPPAGE
    // ---------------------------------------------------------
    //
    // Current pool:
    // A = 2,000,000
    // B = 8,000,000
    // LP supply = 4,000,000
    //
    // Burning 1,000,000 LP would produce:
    // A = 500,000
    // B = 2,000,000
    //
    // Require 500,001 A.
    // Transaction MUST fail.
    // State MUST remain unchanged.

    let pool_before_slippage = read_pool(&svm, &pool);

    let user_lp_before_slippage = token_amount(&svm, &user_lp.pubkey());

    let user_a_before_slippage = token_amount(&svm, &user_token_a.pubkey());

    let user_b_before_slippage = token_amount(&svm, &user_token_b.pubkey());

    let slippage_remove = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::RemoveLiquidity {
            lp_amount: 1_000_000,
            amount_a_min: 500_001,
            amount_b_min: 2_000_000,
        }
        .data(),
        accounts::RemoveLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            user_lp_token_account: user_lp.pubkey(),
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();

    let message =
        Message::new_with_blockhash(&[slippage_remove], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    let result = svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "Remove liquidity seharusnya gagal karena amount_a_min terlalu tinggi"
    );

    let pool_after_failed_remove = read_pool(&svm, &pool);

    assert_eq!(
        pool_after_failed_remove.reserve_a,
        pool_before_slippage.reserve_a
    );

    assert_eq!(
        pool_after_failed_remove.reserve_b,
        pool_before_slippage.reserve_b
    );

    assert_eq!(
        pool_after_failed_remove.lp_supply,
        pool_before_slippage.lp_supply
    );

    assert_eq!(
        token_amount(&svm, &user_lp.pubkey()),
        user_lp_before_slippage
    );

    assert_eq!(
        token_amount(&svm, &user_token_a.pubkey()),
        user_a_before_slippage
    );

    assert_eq!(
        token_amount(&svm, &user_token_b.pubkey()),
        user_b_before_slippage
    );

    assert_eq!(token_amount(&svm, &lp_lock_account), MINIMUM_LIQUIDITY);

    println!("DEX-05 Remove Liquidity: PASSED");
    println!("Removed LP    : 2,000,000");
    println!("Received A    : 1,000,000");
    println!("Received B    : 4,000,000");
    println!("Remaining LP  : 3,999,000");
    println!("Locked LP     : 1,000");
    println!("DEX-05 slippage protection: PASSED");

    // ---------------------------------------------------------
    // DEX-07: LIQUIDITY HARDENING
    // ---------------------------------------------------------

    let pool_before_dex07 = read_pool(&svm, &pool);
    let user_a_before_dex07 = token_amount(&svm, &user_token_a.pubkey());
    let user_b_before_dex07 = token_amount(&svm, &user_token_b.pubkey());
    let user_lp_before_dex07 = token_amount(&svm, &user_lp.pubkey());

    // DEX-07A.1: amount_a = 0
    let add_zero_a = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::AddLiquidity {
            amount_a: 0,
            amount_b: 1,
            lp_amount_min: 0,
        }
        .data(),
        accounts::AddLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user_lp_token_account: user_lp.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(&[add_zero_a], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    assert!(
        svm.send_transaction(tx).is_err(),
        "Add liquidity amount_a = 0 harus gagal"
    );

    // DEX-07A.2: amount_b = 0
    let add_zero_b = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::AddLiquidity {
            amount_a: 1,
            amount_b: 0,
            lp_amount_min: 0,
        }
        .data(),
        accounts::AddLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user_lp_token_account: user_lp.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(&[add_zero_b], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    assert!(
        svm.send_transaction(tx).is_err(),
        "Add liquidity amount_b = 0 harus gagal"
    );

    // DEX-07A.3: saldo token tidak cukup
    let add_insufficient_balance = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::AddLiquidity {
            amount_a: 2_000_000,
            amount_b: 8_000_000,
            lp_amount_min: 0,
        }
        .data(),
        accounts::AddLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user_lp_token_account: user_lp.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(
        &[add_insufficient_balance],
        Some(&payer.pubkey()),
        &blockhash,
    );

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    assert!(
        svm.send_transaction(tx).is_err(),
        "Add liquidity dengan saldo tidak cukup harus gagal"
    );

    // DEX-07B.1: lp_amount = 0
    let remove_zero = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::RemoveLiquidity {
            lp_amount: 0,
            amount_a_min: 0,
            amount_b_min: 0,
        }
        .data(),
        accounts::RemoveLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            user_lp_token_account: user_lp.pubkey(),
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(&[remove_zero], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    assert!(
        svm.send_transaction(tx).is_err(),
        "Remove liquidity lp_amount = 0 harus gagal"
    );

    // DEX-07B.2: LP melebihi saldo user
    let remove_too_much = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::RemoveLiquidity {
            lp_amount: user_lp_before_dex07 + 1,
            amount_a_min: 0,
            amount_b_min: 0,
        }
        .data(),
        accounts::RemoveLiquidity {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            lp_mint,
            user_lp_token_account: user_lp.pubkey(),
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            provider: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let message =
        Message::new_with_blockhash(&[remove_too_much], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    assert!(
        svm.send_transaction(tx).is_err(),
        "Remove liquidity melebihi saldo LP harus gagal"
    );

    // DEX-07 atomicity check
    let pool_after_dex07 = read_pool(&svm, &pool);

    assert_eq!(pool_after_dex07.reserve_a, pool_before_dex07.reserve_a);
    assert_eq!(pool_after_dex07.reserve_b, pool_before_dex07.reserve_b);
    assert_eq!(pool_after_dex07.lp_supply, pool_before_dex07.lp_supply);

    assert_eq!(
        token_amount(&svm, &user_token_a.pubkey()),
        user_a_before_dex07
    );
    assert_eq!(
        token_amount(&svm, &user_token_b.pubkey()),
        user_b_before_dex07
    );
    assert_eq!(token_amount(&svm, &user_lp.pubkey()), user_lp_before_dex07);
    assert_eq!(token_amount(&svm, &lp_lock_account), MINIMUM_LIQUIDITY);

    println!("DEX-07A zero liquidity protection: PASSED");
    println!("DEX-07A insufficient token balance: PASSED");
    println!("DEX-07B zero LP protection: PASSED");
    println!("DEX-07B excessive LP protection: PASSED");
    println!("DEX-07 atomicity: PASSED");

    println!("========================================");
    println!("DEX-04 ADD LIQUIDITY TEST: PASSED");
    println!("========================================");
    println!("Pool       : {}", pool);
    println!("Vault A    : {}", vault_a);
    println!("Vault B    : {}", vault_b);
    println!("LP Mint    : {}", lp_mint);
    println!("LP Lock    : {}", lp_lock_account);
    println!("Reserve A  : {}", pool_state.reserve_a);
    println!("Reserve B  : {}", pool_state.reserve_b);
    println!("LP Supply  : {}", pool_state.lp_supply);
    println!("User LP    : {}", token_amount(&svm, &user_lp.pubkey()));
    println!("Locked LP  : {}", token_amount(&svm, &lp_lock_account));
    println!("========================================");
}

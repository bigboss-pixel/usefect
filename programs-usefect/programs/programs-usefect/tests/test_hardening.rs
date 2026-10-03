use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_instruction, system_program},
        InstructionData, ToAccountMetas,
    },
    anchor_spl::token::spl_token,
    litesvm::LiteSVM,
    programs_usefect::{accounts, constants::DEX_CONFIG_SEED},
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

fn send_tx_expect_error(svm: &mut LiteSVM, payer: &Keypair, instruction: Instruction) {
    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[payer]).unwrap();

    let result = svm.send_transaction(tx);

    assert!(result.is_err(), "Transaction seharusnya gagal");
}

fn setup_svm() -> (LiteSVM, Keypair) {
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

    (svm, payer)
}

fn initialize_dex_instruction(
    program_id: Pubkey,
    payer: &Keypair,
    fee_bps: u16,
    protocol_fee_bps: u16,
) -> Instruction {
    let dex_config = Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0;

    Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::InitializeDex {
            fee_bps,
            protocol_fee_bps,
        }
        .data(),
        accounts::InitializeDex {
            dex_config,
            authority: payer.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn create_mint(svm: &mut LiteSVM, payer: &Keypair, mint: &Keypair) {
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
        &payer.pubkey(),
        None,
        6,
    )
    .unwrap();

    let blockhash = svm.latest_blockhash();

    let message =
        Message::new_with_blockhash(&[create, initialize], Some(&payer.pubkey()), &blockhash);

    let tx =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[payer, mint]).unwrap();

    svm.send_transaction(tx).expect("Gagal membuat mint");
}

#[test]
fn test_initialize_dex_fee_boundary() {
    let program_id = programs_usefect::id();
    let (mut svm, payer) = setup_svm();

    // 10,000 bps = 100% masih merupakan batas valid.
    let valid = initialize_dex_instruction(program_id, &payer, 10_000, 10_000);

    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(&[valid], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    svm.send_transaction(tx)
        .expect("Fee 10,000 bps seharusnya valid");

    println!("DEX-07 fee boundary 10,000 bps: PASSED");
}

#[test]
fn test_initialize_dex_rejects_fee_above_max() {
    let program_id = programs_usefect::id();
    let (mut svm, payer) = setup_svm();

    let invalid = initialize_dex_instruction(program_id, &payer, 10_001, 0);

    send_tx_expect_error(&mut svm, &payer, invalid);

    let dex_config = Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0;

    assert!(
        svm.get_account(&dex_config).is_none(),
        "DexConfig tidak boleh dibuat setelah transaksi gagal"
    );

    println!("DEX-07 invalid fee > 10,000: PASSED");
}

#[test]
fn test_initialize_dex_rejects_protocol_fee_above_swap_fee() {
    let program_id = programs_usefect::id();
    let (mut svm, payer) = setup_svm();

    let invalid = initialize_dex_instruction(program_id, &payer, 30, 31);

    send_tx_expect_error(&mut svm, &payer, invalid);

    let dex_config = Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0;

    assert!(
        svm.get_account(&dex_config).is_none(),
        "DexConfig tidak boleh dibuat setelah transaksi gagal"
    );

    println!("DEX-07 protocol fee > swap fee: PASSED");
}

#[test]
fn test_initialize_dex_rejects_fee_overflow_boundary() {
    let program_id = programs_usefect::id();
    let (mut svm, payer) = setup_svm();

    let invalid = initialize_dex_instruction(program_id, &payer, u16::MAX, 0);

    send_tx_expect_error(&mut svm, &payer, invalid);

    let dex_config = Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0;

    assert!(
        svm.get_account(&dex_config).is_none(),
        "DexConfig tidak boleh dibuat setelah transaksi gagal"
    );

    println!("DEX-07 u16 fee overflow boundary: PASSED");
}

#[test]
fn test_initialize_pool_rejects_same_token() {
    let program_id = programs_usefect::id();
    let (mut svm, payer) = setup_svm();

    let dex_config = Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0;

    let initialize_dex = initialize_dex_instruction(program_id, &payer, 30, 0);

    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(&[initialize_dex], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    svm.send_transaction(tx).expect("InitializeDex gagal");

    let mint = Keypair::new();

    create_mint(&mut svm, &payer, &mint);

    let token = mint.pubkey();

    let pool = Pubkey::find_program_address(
        &[
            programs_usefect::constants::POOL_SEED,
            token.as_ref(),
            token.as_ref(),
        ],
        &program_id,
    )
    .0;

    let vault_a = Pubkey::find_program_address(
        &[programs_usefect::constants::VAULT_A_SEED, pool.as_ref()],
        &program_id,
    )
    .0;

    let vault_b = Pubkey::find_program_address(
        &[programs_usefect::constants::VAULT_B_SEED, pool.as_ref()],
        &program_id,
    )
    .0;

    let lp_mint = Pubkey::find_program_address(
        &[programs_usefect::constants::LP_MINT_SEED, pool.as_ref()],
        &program_id,
    )
    .0;

    let lp_lock_account = Pubkey::find_program_address(
        &[programs_usefect::constants::LP_LOCK_SEED, pool.as_ref()],
        &program_id,
    )
    .0;

    let initialize_pool = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::InitializePool {}.data(),
        accounts::InitializePool {
            dex_config,
            pool,
            token_a: token,
            token_b: token,
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

    send_tx_expect_error(&mut svm, &payer, initialize_pool);

    assert!(
        svm.get_account(&pool).is_none(),
        "Pool tidak boleh dibuat setelah SameToken gagal"
    );

    println!("DEX-07 same token protection: PASSED");
}

#[test]
fn test_add_liquidity_rejects_minimum_initial_liquidity_boundary() {
    use {
        anchor_lang::InstructionData,
        programs_usefect::constants::{
            DEX_CONFIG_SEED, LP_LOCK_SEED, LP_MINT_SEED, POOL_SEED, VAULT_A_SEED, VAULT_B_SEED,
        },
    };

    let (mut svm, payer) = setup_svm();
    let program_id = programs_usefect::id();

    // DEX dengan fee normal.
    let dex_ix = initialize_dex_instruction(program_id, &payer, 30, 0);

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(&[dex_ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    svm.send_transaction(tx).expect("Initialize DEX gagal");

    // Buat dua mint.
    let mint_a = Keypair::new();
    let mint_b = Keypair::new();

    create_mint(&mut svm, &payer, &mint_a);
    create_mint(&mut svm, &payer, &mint_b);

    let (token_a, token_b) = if mint_a.pubkey().to_bytes() < mint_b.pubkey().to_bytes() {
        (&mint_a, &mint_b)
    } else {
        (&mint_b, &mint_a)
    };

    // PDA pool.
    let pool = Pubkey::find_program_address(
        &[
            POOL_SEED,
            token_a.pubkey().as_ref(),
            token_b.pubkey().as_ref(),
        ],
        &program_id,
    )
    .0;

    let vault_a = Pubkey::find_program_address(&[VAULT_A_SEED, pool.as_ref()], &program_id).0;

    let vault_b = Pubkey::find_program_address(&[VAULT_B_SEED, pool.as_ref()], &program_id).0;

    let lp_mint = Pubkey::find_program_address(&[LP_MINT_SEED, pool.as_ref()], &program_id).0;

    let lp_lock_account =
        Pubkey::find_program_address(&[LP_LOCK_SEED, pool.as_ref()], &program_id).0;

    // Initialize pool.
    let pool_ix = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::InitializePool {}.data(),
        accounts::InitializePool {
            authority: payer.pubkey(),
            dex_config: Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0,
            pool,
            token_a: token_a.pubkey(),
            token_b: token_b.pubkey(),
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(&[pool_ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    svm.send_transaction(tx).expect("Initialize pool gagal");

    // Buat token account SPL biasa untuk user.
    // Tidak menggunakan Associated Token Account agar kompatibel
    // dengan dependency Anchor/SPL Token versi proyek ini.
    let user_token_a_account = Keypair::new();
    let user_token_b_account = Keypair::new();
    let user_lp_token_account = Keypair::new();

    let token_account_rent = svm.minimum_balance_for_rent_exemption(165);

    let create_user_a = system_instruction::create_account(
        &payer.pubkey(),
        &user_token_a_account.pubkey(),
        token_account_rent,
        165,
        &spl_token::ID,
    );

    let init_user_a = spl_token::instruction::initialize_account3(
        &spl_token::ID,
        &user_token_a_account.pubkey(),
        &token_a.pubkey(),
        &payer.pubkey(),
    )
    .unwrap();

    let create_user_b = system_instruction::create_account(
        &payer.pubkey(),
        &user_token_b_account.pubkey(),
        token_account_rent,
        165,
        &spl_token::ID,
    );

    let init_user_b = spl_token::instruction::initialize_account3(
        &spl_token::ID,
        &user_token_b_account.pubkey(),
        &token_b.pubkey(),
        &payer.pubkey(),
    )
    .unwrap();

    let create_user_lp = system_instruction::create_account(
        &payer.pubkey(),
        &user_lp_token_account.pubkey(),
        token_account_rent,
        165,
        &spl_token::ID,
    );

    let init_user_lp = spl_token::instruction::initialize_account3(
        &spl_token::ID,
        &user_lp_token_account.pubkey(),
        &lp_mint,
        &payer.pubkey(),
    )
    .unwrap();

    // Mint tepat 1,000 A dan 1,000 B.
    // sqrt(1,000 * 1,000) = 1,000.
    // Requirement program adalah root > 1,000,
    // sehingga transaksi AddLiquidity harus ditolak.
    let mint_to_a = spl_token::instruction::mint_to(
        &spl_token::ID,
        &token_a.pubkey(),
        &user_token_a_account.pubkey(),
        &payer.pubkey(),
        &[],
        1_000,
    )
    .unwrap();

    let mint_to_b = spl_token::instruction::mint_to(
        &spl_token::ID,
        &token_b.pubkey(),
        &user_token_b_account.pubkey(),
        &payer.pubkey(),
        &[],
        1_000,
    )
    .unwrap();

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(
        &[
            create_user_a,
            init_user_a,
            create_user_b,
            init_user_b,
            create_user_lp,
            init_user_lp,
            mint_to_a,
            mint_to_b,
        ],
        Some(&payer.pubkey()),
        &blockhash,
    );

    let tx = VersionedTransaction::try_new(
        VersionedMessage::Legacy(message),
        &[
            &payer,
            &user_token_a_account,
            &user_token_b_account,
            &user_lp_token_account,
        ],
    )
    .unwrap();

    svm.send_transaction(tx).expect("Setup token account gagal");

    let add_liquidity_ix = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::AddLiquidity {
            amount_a: 1_000,
            amount_b: 1_000,
            lp_amount_min: 0,
        }
        .data(),
        accounts::AddLiquidity {
            provider: payer.pubkey(),
            dex_config: Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0,
            pool,
            token_a: token_a.pubkey(),
            token_b: token_b.pubkey(),
            vault_a,
            vault_b,
            user_token_a: user_token_a_account.pubkey(),
            user_token_b: user_token_b_account.pubkey(),
            lp_mint,
            user_lp_token_account: user_lp_token_account.pubkey(),
            lp_lock_account,
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx_expect_error(&mut svm, &payer, add_liquidity_ix);

    println!("DEX-07D initial liquidity minimum boundary: PASSED");
}

#[test]
fn test_swap_rejects_fee_10000_boundary() {
    use {
        anchor_lang::InstructionData,
        programs_usefect::constants::{
            DEX_CONFIG_SEED, LP_LOCK_SEED, LP_MINT_SEED, POOL_SEED, VAULT_A_SEED, VAULT_B_SEED,
        },
    };

    let (mut svm, payer) = setup_svm();
    let program_id = programs_usefect::id();

    // Fee tepat 10.000 bps = 100%.
    let dex_ix = initialize_dex_instruction(program_id, &payer, 10_000, 10_000);

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(&[dex_ix], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    svm.send_transaction(tx)
        .expect("Initialize DEX fee 10.000 gagal");

    let mint_a = Keypair::new();
    let mint_b = Keypair::new();

    create_mint(&mut svm, &payer, &mint_a);
    create_mint(&mut svm, &payer, &mint_b);

    let (token_a, token_b) = if mint_a.pubkey().to_bytes() < mint_b.pubkey().to_bytes() {
        (&mint_a, &mint_b)
    } else {
        (&mint_b, &mint_a)
    };

    let pool = Pubkey::find_program_address(
        &[
            POOL_SEED,
            token_a.pubkey().as_ref(),
            token_b.pubkey().as_ref(),
        ],
        &program_id,
    )
    .0;

    let vault_a = Pubkey::find_program_address(&[VAULT_A_SEED, pool.as_ref()], &program_id).0;

    let vault_b = Pubkey::find_program_address(&[VAULT_B_SEED, pool.as_ref()], &program_id).0;

    let lp_mint = Pubkey::find_program_address(&[LP_MINT_SEED, pool.as_ref()], &program_id).0;

    let lp_lock_account =
        Pubkey::find_program_address(&[LP_LOCK_SEED, pool.as_ref()], &program_id).0;

    let dex_config = Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0;

    let pool_ix = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::InitializePool {}.data(),
        accounts::InitializePool {
            authority: payer.pubkey(),
            dex_config,
            pool,
            token_a: token_a.pubkey(),
            token_b: token_b.pubkey(),
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(&[pool_ix], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    svm.send_transaction(tx).expect("Initialize pool gagal");

    // User token accounts.
    let user_token_a = Keypair::new();
    let user_token_b = Keypair::new();
    let user_lp = Keypair::new();

    let rent = svm.minimum_balance_for_rent_exemption(165);

    let create_a = system_instruction::create_account(
        &payer.pubkey(),
        &user_token_a.pubkey(),
        rent,
        165,
        &spl_token::ID,
    );

    let init_a = spl_token::instruction::initialize_account3(
        &spl_token::ID,
        &user_token_a.pubkey(),
        &token_a.pubkey(),
        &payer.pubkey(),
    )
    .unwrap();

    let create_b = system_instruction::create_account(
        &payer.pubkey(),
        &user_token_b.pubkey(),
        rent,
        165,
        &spl_token::ID,
    );

    let init_b = spl_token::instruction::initialize_account3(
        &spl_token::ID,
        &user_token_b.pubkey(),
        &token_b.pubkey(),
        &payer.pubkey(),
    )
    .unwrap();

    let create_lp = system_instruction::create_account(
        &payer.pubkey(),
        &user_lp.pubkey(),
        rent,
        165,
        &spl_token::ID,
    );

    let init_lp = spl_token::instruction::initialize_account3(
        &spl_token::ID,
        &user_lp.pubkey(),
        &lp_mint,
        &payer.pubkey(),
    )
    .unwrap();

    let mint_a = spl_token::instruction::mint_to(
        &spl_token::ID,
        &token_a.pubkey(),
        &user_token_a.pubkey(),
        &payer.pubkey(),
        &[],
        2_000_000,
    )
    .unwrap();

    let mint_b = spl_token::instruction::mint_to(
        &spl_token::ID,
        &token_b.pubkey(),
        &user_token_b.pubkey(),
        &payer.pubkey(),
        &[],
        8_000_000,
    )
    .unwrap();

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(
        &[
            create_a, init_a, create_b, init_b, create_lp, init_lp, mint_a, mint_b,
        ],
        Some(&payer.pubkey()),
        &blockhash,
    );

    let tx = VersionedTransaction::try_new(
        VersionedMessage::Legacy(message),
        &[&payer, &user_token_a, &user_token_b, &user_lp],
    )
    .unwrap();

    svm.send_transaction(tx).expect("Setup token account gagal");

    // Initial liquidity:
    // sqrt(2,000,000 * 8,000,000) = 4,000,000.
    // Provider menerima 3,999,000 LP dan 1,000 LP dikunci.
    let add_ix = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::AddLiquidity {
            amount_a: 2_000_000,
            amount_b: 8_000_000,
            lp_amount_min: 3_999_000,
        }
        .data(),
        accounts::AddLiquidity {
            provider: payer.pubkey(),
            dex_config,
            pool,
            token_a: token_a.pubkey(),
            token_b: token_b.pubkey(),
            vault_a,
            vault_b,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            lp_mint,
            user_lp_token_account: user_lp.pubkey(),
            lp_lock_account,
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(&[add_ix], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    svm.send_transaction(tx).expect("Initial liquidity gagal");

    // Snapshot sebelum swap.
    let pool_before = svm
        .get_account(&pool)
        .expect("Pool tidak ditemukan")
        .data
        .clone();

    let user_a_before = svm
        .get_account(&user_token_a.pubkey())
        .expect("User token A tidak ditemukan")
        .data
        .clone();

    let user_b_before = svm
        .get_account(&user_token_b.pubkey())
        .expect("User token B tidak ditemukan")
        .data
        .clone();

    let vault_a_before = svm
        .get_account(&vault_a)
        .expect("Vault A tidak ditemukan")
        .data
        .clone();

    let vault_b_before = svm
        .get_account(&vault_b)
        .expect("Vault B tidak ditemukan")
        .data
        .clone();

    // Fee 100%:
    // amount_in_after_fee =
    // 1,000 * (10,000 - 10,000) / 10,000 = 0.
    // Swap wajib ditolak.
    let swap_ix = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::Swap {
            amount_in: 1_000,
            amount_out_min: 0,
            a_to_b: true,
        }
        .data(),
        accounts::Swap {
            dex_config,
            pool,
            token_a: token_a.pubkey(),
            token_b: token_b.pubkey(),
            vault_a,
            vault_b,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx_expect_error(&mut svm, &payer, swap_ix);

    // Atomicity: tidak boleh ada perubahan sama sekali.
    let pool_after = svm
        .get_account(&pool)
        .expect("Pool hilang setelah failed swap")
        .data
        .clone();

    let user_a_after = svm
        .get_account(&user_token_a.pubkey())
        .expect("User token A hilang")
        .data
        .clone();

    let user_b_after = svm
        .get_account(&user_token_b.pubkey())
        .expect("User token B hilang")
        .data
        .clone();

    let vault_a_after = svm
        .get_account(&vault_a)
        .expect("Vault A hilang")
        .data
        .clone();

    let vault_b_after = svm
        .get_account(&vault_b)
        .expect("Vault B hilang")
        .data
        .clone();

    assert_eq!(pool_before, pool_after);
    assert_eq!(user_a_before, user_a_after);
    assert_eq!(user_b_before, user_b_after);
    assert_eq!(vault_a_before, vault_a_after);
    assert_eq!(vault_b_before, vault_b_after);

    println!("DEX-07E fee 10,000 bps swap rejection: PASSED");
    println!("DEX-07E atomicity: PASSED");
}

#[test]
fn test_initialize_pool_rejects_reverse_token_order() {
    use {
        anchor_lang::InstructionData,
        programs_usefect::constants::{
            DEX_CONFIG_SEED, LP_LOCK_SEED, LP_MINT_SEED, POOL_SEED, VAULT_A_SEED, VAULT_B_SEED,
        },
    };

    let (mut svm, payer) = setup_svm();
    let program_id = programs_usefect::id();

    // Initialize DEX.
    let dex_ix = initialize_dex_instruction(program_id, &payer, 30, 0);

    let blockhash = svm.latest_blockhash();
    let message = Message::new_with_blockhash(&[dex_ix], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&payer]).unwrap();

    svm.send_transaction(tx).expect("Initialize DEX gagal");

    // Buat dua mint.
    let mint_x = Keypair::new();
    let mint_y = Keypair::new();

    create_mint(&mut svm, &payer, &mint_x);
    create_mint(&mut svm, &payer, &mint_y);

    // Pastikan kita sengaja mengirim token dalam urutan TERBALIK.
    let (ordered_a, ordered_b) = if mint_x.pubkey().to_bytes() < mint_y.pubkey().to_bytes() {
        (&mint_x, &mint_y)
    } else {
        (&mint_y, &mint_x)
    };

    let token_a = ordered_b;
    let token_b = ordered_a;

    assert!(
        token_a.pubkey().to_bytes() > token_b.pubkey().to_bytes(),
        "Fixture reverse order tidak valid"
    );

    // PDA sengaja dihitung menggunakan urutan yang salah.
    let pool = Pubkey::find_program_address(
        &[
            POOL_SEED,
            token_a.pubkey().as_ref(),
            token_b.pubkey().as_ref(),
        ],
        &program_id,
    )
    .0;

    let vault_a = Pubkey::find_program_address(&[VAULT_A_SEED, pool.as_ref()], &program_id).0;

    let vault_b = Pubkey::find_program_address(&[VAULT_B_SEED, pool.as_ref()], &program_id).0;

    let lp_mint = Pubkey::find_program_address(&[LP_MINT_SEED, pool.as_ref()], &program_id).0;

    let lp_lock_account =
        Pubkey::find_program_address(&[LP_LOCK_SEED, pool.as_ref()], &program_id).0;

    let dex_config = Pubkey::find_program_address(&[DEX_CONFIG_SEED], &program_id).0;

    let pool_ix = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::InitializePool {}.data(),
        accounts::InitializePool {
            authority: payer.pubkey(),
            dex_config,
            pool,
            token_a: token_a.pubkey(),
            token_b: token_b.pubkey(),
            vault_a,
            vault_b,
            lp_mint,
            lp_lock_account,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    // InitializePool harus gagal karena token_a > token_b.
    send_tx_expect_error(&mut svm, &payer, pool_ix);

    // Karena transaksi gagal, pool tidak boleh tercipta.
    assert!(
        svm.get_account(&pool).is_none(),
        "Pool tidak boleh tercipta setelah reverse token order ditolak"
    );

    println!("DEX-07F reverse token order protection: PASSED");
}

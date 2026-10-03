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

fn send_tx_expect_error(svm: &mut LiteSVM, payer: &Keypair, instruction: Instruction) {
    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &blockhash);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[payer]).unwrap();

    let result = svm.send_transaction(tx);

    assert!(result.is_err(), "Transaction seharusnya gagal");
}

fn token_amount(svm: &LiteSVM, token_account: &Pubkey) -> u64 {
    let account = svm
        .get_account(token_account)
        .expect("Token account tidak ditemukan");

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
fn test_swap() {
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
    // 1. CREATE TEST MINTS
    // ---------------------------------------------------------

    let mint_x = Keypair::new();
    let mint_y = Keypair::new();

    create_mint(&mut svm, &payer, &mint_x, 6, &payer.pubkey());

    create_mint(&mut svm, &payer, &mint_y, 6, &payer.pubkey());

    let (token_a, token_b, mint_a, mint_b) =
        if mint_x.pubkey().to_bytes() < mint_y.pubkey().to_bytes() {
            (mint_x.pubkey(), mint_y.pubkey(), &mint_x, &mint_y)
        } else {
            (mint_y.pubkey(), mint_x.pubkey(), &mint_y, &mint_x)
        };

    assert_ne!(token_a, token_b);

    // ---------------------------------------------------------
    // 2. USER TOKEN ACCOUNTS
    // ---------------------------------------------------------

    let user_token_a = Keypair::new();
    let user_token_b = Keypair::new();

    create_token_account(&mut svm, &payer, &user_token_a, &token_a, &payer.pubkey());

    create_token_account(&mut svm, &payer, &user_token_b, &token_b, &payer.pubkey());

    // ---------------------------------------------------------
    // 3. USER BALANCES
    // ---------------------------------------------------------

    mint_tokens(
        &mut svm,
        &payer,
        &mint_a.pubkey(),
        &user_token_a.pubkey(),
        &payer,
        10_000_000,
    );

    mint_tokens(
        &mut svm,
        &payer,
        &mint_b.pubkey(),
        &user_token_b.pubkey(),
        &payer,
        20_000_000,
    );

    // ---------------------------------------------------------
    // 4. DEX CONFIG
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
    // 7. USER LP ACCOUNT
    // ---------------------------------------------------------

    let user_lp = Keypair::new();

    create_token_account(&mut svm, &payer, &user_lp, &lp_mint, &payer.pubkey());

    // ---------------------------------------------------------
    // 8. INITIAL LIQUIDITY
    // ---------------------------------------------------------

    let initial_a = 3_000_000u64;
    let initial_b = 12_000_000u64;

    mint_tokens(
        &mut svm,
        &payer,
        &mint_a.pubkey(),
        &user_token_a.pubkey(),
        &payer,
        initial_a,
    );

    mint_tokens(
        &mut svm,
        &payer,
        &mint_b.pubkey(),
        &user_token_b.pubkey(),
        &payer,
        initial_b,
    );

    let add_liquidity = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::AddLiquidity {
            amount_a: initial_a,
            amount_b: initial_b,
            lp_amount_min: 5_999_000,
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

    send_tx(&mut svm, &payer, &[add_liquidity], &[&payer]);

    let pool_before = read_pool(&svm, &pool);

    assert_eq!(pool_before.reserve_a, 3_000_000);

    assert_eq!(pool_before.reserve_b, 12_000_000);

    assert_eq!(pool_before.lp_supply, 6_000_000);

    assert_eq!(token_amount(&svm, &lp_lock_account), MINIMUM_LIQUIDITY);

    // ---------------------------------------------------------
    // 9. A -> B SWAP
    // ---------------------------------------------------------
    //
    // Reserve A = 3,000,000
    // Reserve B = 12,000,000
    //
    // amount_in = 300,000
    // fee = 30 bps
    //
    // amount_in_after_fee:
    //
    // 300,000 * 9,970 / 10,000
    // = 299,100
    //
    // amount_out:
    //
    // 12,000,000 * 299,100
    // / 3,299,100
    //
    // = 1,087,457

    let swap_a_to_b_in = 300_000u64;

    let expected_a_to_b_out = 1_087_933u64;

    let user_a_before = token_amount(&svm, &user_token_a.pubkey());

    let user_b_before = token_amount(&svm, &user_token_b.pubkey());

    let vault_a_before = token_amount(&svm, &vault_a);

    let vault_b_before = token_amount(&svm, &vault_b);

    let swap_a_to_b = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::Swap {
            amount_in: swap_a_to_b_in,
            amount_out_min: expected_a_to_b_out,
            a_to_b: true,
        }
        .data(),
        accounts::Swap {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx(&mut svm, &payer, &[swap_a_to_b], &[&payer]);

    let pool_after_a_to_b = read_pool(&svm, &pool);

    assert_eq!(pool_after_a_to_b.reserve_a, 3_300_000);

    assert_eq!(
        pool_after_a_to_b.reserve_b,
        12_000_000 - expected_a_to_b_out
    );

    assert_eq!(
        token_amount(&svm, &user_token_a.pubkey()),
        user_a_before - swap_a_to_b_in
    );

    assert_eq!(
        token_amount(&svm, &user_token_b.pubkey()),
        user_b_before + expected_a_to_b_out
    );

    assert_eq!(
        token_amount(&svm, &vault_a),
        vault_a_before + swap_a_to_b_in
    );

    assert_eq!(
        token_amount(&svm, &vault_b),
        vault_b_before - expected_a_to_b_out
    );

    // ---------------------------------------------------------
    // 10. INVARIANT AFTER A -> B
    // ---------------------------------------------------------

    let old_k = 3_000_000u128 * 12_000_000u128;

    let new_k = pool_after_a_to_b.reserve_a as u128 * pool_after_a_to_b.reserve_b as u128;

    assert!(new_k >= old_k, "Constant-product invariant menurun");

    // ---------------------------------------------------------
    // 11. B -> A SWAP
    // ---------------------------------------------------------
    //
    // Current reserves:
    //
    // A = 3,300,000
    // B = 10,912,543
    //
    // amount_in = 1,000,000
    //
    // net input = 997,000
    //
    // output:
    //
    // floor(
    // 3,300,000 * 997,000
    // /
    // (10,912,543 + 997,000)
    // )
    //
    // = 275,? (verified by test expectation below)

    let swap_b_to_a_in = 1_000_000u64;

    let reserve_a = pool_after_a_to_b.reserve_a as u128;

    let reserve_b = pool_after_a_to_b.reserve_b as u128;

    let amount_in_after_fee = (swap_b_to_a_in as u128) * 9_970u128 / 10_000u128;

    let expected_b_to_a_out = reserve_a * amount_in_after_fee / (reserve_b + amount_in_after_fee);

    let expected_b_to_a_out = u64::try_from(expected_b_to_a_out).expect("Output overflow");

    assert!(expected_b_to_a_out > 0);

    let user_a_before_b_to_a = token_amount(&svm, &user_token_a.pubkey());

    let user_b_before_b_to_a = token_amount(&svm, &user_token_b.pubkey());

    let swap_b_to_a = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::Swap {
            amount_in: swap_b_to_a_in,
            amount_out_min: expected_b_to_a_out,
            a_to_b: false,
        }
        .data(),
        accounts::Swap {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx(&mut svm, &payer, &[swap_b_to_a], &[&payer]);

    let pool_after_b_to_a = read_pool(&svm, &pool);

    assert_eq!(
        pool_after_b_to_a.reserve_b,
        pool_after_a_to_b.reserve_b + swap_b_to_a_in
    );

    assert_eq!(
        pool_after_b_to_a.reserve_a,
        pool_after_a_to_b.reserve_a - expected_b_to_a_out
    );

    assert_eq!(
        token_amount(&svm, &user_token_b.pubkey()),
        user_b_before_b_to_a - swap_b_to_a_in
    );

    assert_eq!(
        token_amount(&svm, &user_token_a.pubkey()),
        user_a_before_b_to_a + expected_b_to_a_out
    );

    // ---------------------------------------------------------
    // 12. INVARIANT AFTER B -> A
    // ---------------------------------------------------------

    let k_after_b_to_a = pool_after_b_to_a.reserve_a as u128 * pool_after_b_to_a.reserve_b as u128;

    assert!(
        k_after_b_to_a >= new_k,
        "Constant-product invariant menurun"
    );

    // ---------------------------------------------------------
    // 13. NEGATIVE TEST: SLIPPAGE
    // ---------------------------------------------------------
    //
    // Ask for more output than the AMM can provide.
    // Transaction MUST fail.
    // Pool and balances MUST remain unchanged.

    let pool_before_failed_swap = read_pool(&svm, &pool);

    let user_a_before_failed = token_amount(&svm, &user_token_a.pubkey());

    let user_b_before_failed = token_amount(&svm, &user_token_b.pubkey());

    let vault_a_before_failed = token_amount(&svm, &vault_a);

    let vault_b_before_failed = token_amount(&svm, &vault_b);

    let failed_swap = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::Swap {
            amount_in: 100_000,
            amount_out_min: u64::MAX,
            a_to_b: true,
        }
        .data(),
        accounts::Swap {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx_expect_error(&mut svm, &payer, failed_swap);

    let pool_after_failed = read_pool(&svm, &pool);

    assert_eq!(
        pool_after_failed.reserve_a,
        pool_before_failed_swap.reserve_a
    );

    assert_eq!(
        pool_after_failed.reserve_b,
        pool_before_failed_swap.reserve_b
    );

    assert_eq!(
        token_amount(&svm, &user_token_a.pubkey()),
        user_a_before_failed
    );

    assert_eq!(
        token_amount(&svm, &user_token_b.pubkey()),
        user_b_before_failed
    );

    assert_eq!(token_amount(&svm, &vault_a), vault_a_before_failed);

    assert_eq!(token_amount(&svm, &vault_b), vault_b_before_failed);

    println!("DEX-06 A -> B swap: PASSED");
    println!("DEX-06 B -> A swap: PASSED");
    println!("DEX-06 invariant test: PASSED");
    println!("DEX-06 slippage protection: PASSED");

    // ---------------------------------------------------------
    // DEX-07C: SWAP HARDENING
    // ---------------------------------------------------------

    let pool_before_dex07 = read_pool(&svm, &pool);

    let user_a_before_dex07 = token_amount(&svm, &user_token_a.pubkey());

    let user_b_before_dex07 = token_amount(&svm, &user_token_b.pubkey());

    let vault_a_before_dex07 = token_amount(&svm, &vault_a);

    let vault_b_before_dex07 = token_amount(&svm, &vault_b);

    // ---------------------------------------------------------
    // DEX-07C.1: amount_in = 0
    // ---------------------------------------------------------

    let swap_zero_input = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::Swap {
            amount_in: 0,
            amount_out_min: 0,
            a_to_b: true,
        }
        .data(),
        accounts::Swap {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx_expect_error(&mut svm, &payer, swap_zero_input);

    // ---------------------------------------------------------
    // DEX-07C.2: USER TOKEN BALANCE INSUFFICIENT
    // ---------------------------------------------------------
    //
    // amount_in dibuat satu unit lebih besar daripada saldo
    // aktual user. Perhitungan AMM tetap valid, tetapi CPI
    // SPL Token harus gagal.
    //
    // Seluruh state harus tetap sama.

    let insufficient_amount_in = user_a_before_dex07
        .checked_add(1)
        .expect("Saldo user terlalu besar");

    let swap_insufficient_balance = Instruction::new_with_bytes(
        program_id,
        &programs_usefect::instruction::Swap {
            amount_in: insufficient_amount_in,
            amount_out_min: 0,
            a_to_b: true,
        }
        .data(),
        accounts::Swap {
            dex_config,
            pool,
            token_a,
            token_b,
            vault_a,
            vault_b,
            user_token_a: user_token_a.pubkey(),
            user_token_b: user_token_b.pubkey(),
            user: payer.pubkey(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None),
    );

    send_tx_expect_error(&mut svm, &payer, swap_insufficient_balance);

    // ---------------------------------------------------------
    // DEX-07C.3: ATOMICITY
    // ---------------------------------------------------------

    let pool_after_dex07 = read_pool(&svm, &pool);

    assert_eq!(pool_after_dex07.reserve_a, pool_before_dex07.reserve_a);

    assert_eq!(pool_after_dex07.reserve_b, pool_before_dex07.reserve_b);

    assert_eq!(
        token_amount(&svm, &user_token_a.pubkey()),
        user_a_before_dex07
    );

    assert_eq!(
        token_amount(&svm, &user_token_b.pubkey()),
        user_b_before_dex07
    );

    assert_eq!(token_amount(&svm, &vault_a), vault_a_before_dex07);

    assert_eq!(token_amount(&svm, &vault_b), vault_b_before_dex07);

    println!("DEX-07C zero swap input: PASSED");
    println!("DEX-07C insufficient swap balance: PASSED");
    println!("DEX-07C atomicity: PASSED");
}

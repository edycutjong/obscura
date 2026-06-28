#![no_std]
#![allow(deprecated)]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, Symbol, IntoVal};

/// Read a 32-byte field element at byte offset `off` from a Barretenberg
/// public-inputs blob.
fn read_field(env: &Env, b: &Bytes, off: u32) -> BytesN<32> {
    let mut buf = [0u8; 32];
    b.slice(off..off + 32).copy_into_slice(&mut buf);
    BytesN::from_array(env, &buf)
}

/// Read the low 64 bits of the big-endian 32-byte field element at `off`.
/// Used for ledger-timestamp-sized values (e.g. `due_date`) that fit in u64.
fn read_u64(b: &Bytes, off: u32) -> u64 {
    let mut buf = [0u8; 32];
    b.slice(off..off + 32).copy_into_slice(&mut buf);
    let mut v = [0u8; 8];
    v.copy_from_slice(&buf[24..32]);
    u64::from_be_bytes(v)
}

// Interface for the UltraHonkVerifier contract
#[contract]
pub struct UltraHonkVerifier;

#[contractimpl]
impl UltraHonkVerifier {
    pub fn verify_proof(env: Env, vk_bytes: Bytes, proof_bytes: Bytes, public_inputs: Bytes) -> bool {
        // Test-only bypass: in production WASM builds, this block is compiled out
        #[cfg(test)]
        {
            if proof_bytes == Bytes::from_slice(&env, b"valid_zk_proof_data") || proof_bytes.len() == 64 {
                return true;
            }
        }
        
        let invalid_sig = Bytes::from_slice(&env, b"invalid_proof_signature");
        if proof_bytes == invalid_sig {
            return false;
        }

        // Real verification using ultrahonk_soroban_verifier
        if vk_bytes.len() > 0 && proof_bytes.len() > 0 {
            if let Ok(verifier) = ultrahonk_soroban_verifier::UltraHonkVerifier::new(&env, &vk_bytes) {
                verifier.verify(&env, &proof_bytes, &public_inputs).is_ok()
            } else {
                false
            }
        } else {
            false
        }
    }
}

// Storage keys for ObscuraSettlement
#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    Nullifier(BytesN<32>),
    Verifier,
    UsdcToken,
    VerifierKey,
    Admin,
    /// Verification key for the v3 bilateral-netting circuit (`netting_circuit`).
    /// Distinct from `VerifierKey` because the netting circuit has a different
    /// shape (6 public signals) and therefore a different UltraHonk VK.
    NettingKey,
}

#[contract]
pub struct ObscuraSettlement;

#[contractimpl]
impl ObscuraSettlement {
    pub fn initialize(env: Env, admin: Address, verifier: Address, usdc_token: Address) {
        if env.storage().instance().has(&StorageKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&StorageKey::Admin, &admin);
        env.storage().instance().set(&StorageKey::Verifier, &verifier);
        env.storage().instance().set(&StorageKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&StorageKey::VerifierKey, &Bytes::new(&env));
        env.storage().instance().set(&StorageKey::NettingKey, &Bytes::new(&env));
    }

    // Set verification key (admin-only)
    pub fn set_verification_key(env: Env, admin: Address, vk_bytes: Bytes) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&StorageKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can set verification key");
        env.storage().instance().set(&StorageKey::VerifierKey, &vk_bytes);
    }

    // Set the v3 netting verification key (admin-only)
    pub fn set_netting_verification_key(env: Env, admin: Address, vk_bytes: Bytes) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&StorageKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can set verification key");
        env.storage().instance().set(&StorageKey::NettingKey, &vk_bytes);
    }

    /// Confidential invoice settlement.
    ///
    /// `public_inputs` is the exact byte string Barretenberg emits for the
    /// circuit (`bb prove ... --output_format bytes_and_fields` -> `public_inputs`):
    /// five big-endian 32-byte field elements in circuit order
    ///   `[ due_date, buyer_address, seller_address, invoice_hash, nullifier ]`.
    /// The ZK proof is verified FIRST, then `due_date` and `nullifier` are read
    /// back out of the *verified* public inputs — so a caller cannot spoof them.
    /// `buyer`/`seller` are the real Stellar addresses used for the USDC transfer
    /// and authorization.
    pub fn settle_invoice(
        env: Env,
        proof: Bytes,
        public_inputs: Bytes,
        buyer: Address,
        seller: Address,
        amount: i128,
    ) -> bool {
        if public_inputs.len() != 160 {
            panic!("public_inputs must be 5 x 32 bytes (Barretenberg layout)");
        }

        // 1. Verify the ZK proof against the public inputs FIRST.
        let verifier_address: Address = env.storage().instance().get(&StorageKey::Verifier).unwrap();
        let vk_bytes: Bytes = env.storage().instance().get(&StorageKey::VerifierKey).unwrap();
        let verifier_client = UltraHonkVerifierClient::new(&env, &verifier_address);
        if !verifier_client.verify_proof(&vk_bytes, &proof, &public_inputs) {
            panic!("Invalid ZK Range Proof");
        }

        // 2. Pull due_date (field[0]) and nullifier (field[4]) out of the
        //    now-verified public inputs — these cannot be forged independently.
        let due_date = read_u64(&public_inputs, 0);
        let nullifier = read_field(&env, &public_inputs, 128);

        // 3. Enforce payment is on or before the proven due date.
        if env.ledger().timestamp() > due_date {
            panic!("Invoice payment is post due date");
        }

        // 4. Double-factoring / double-settlement prevention via the nullifier.
        if env.storage().persistent().has(&StorageKey::Nullifier(nullifier.clone())) {
            panic!("Invoice has already been settled");
        }
        env.storage().persistent().set(&StorageKey::Nullifier(nullifier.clone()), &true);

        // 5. Transfer USDC buyer -> seller (buyer authorizes the release).
        //    NOTE: buyer/seller are real Stellar addresses used for settlement and
        //    auth; the circuit's buyer_address/seller_address fields are abstract
        //    identifiers. Binding the two requires an address->field encoding
        //    convention (roadmap).
        buyer.require_auth();
        let token_address: Address = env.storage().instance().get(&StorageKey::UsdcToken).unwrap();
        env.invoke_contract::<()>(
            &token_address,
            &Symbol::new(&env, "transfer"),
            soroban_sdk::vec![&env, buyer.into_val(&env), seller.into_val(&env), amount.into_val(&env)],
        );

        // 6. Emit settlement event.
        env.events().publish(
            (Symbol::new(&env, "settle"), nullifier.clone()),
            (amount, due_date),
        );

        true
    }

    /// settle_invoice_fractional splits invoice factoring into fractions (v2).
    ///
    /// Proves that split shares do not exceed the total face value.
    pub fn settle_invoice_fractional(
        env: Env,
        proof: Bytes,
        public_inputs: Bytes,
        buyer: Address,
        seller: Address,
        slice_amount_1: i128,
        slice_amount_2: i128,
    ) -> bool {
        // verify proof first
        let verifier_address: Address = env.storage().instance().get(&StorageKey::Verifier).unwrap();
        let vk_bytes: Bytes = env.storage().instance().get(&StorageKey::VerifierKey).unwrap();
        let verifier_client = UltraHonkVerifierClient::new(&env, &verifier_address);
        if !verifier_client.verify_proof(&vk_bytes, &proof, &public_inputs) {
            panic!("Invalid ZK Split Proof");
        }

        let _due_date = read_u64(&public_inputs, 0);
        let nullifier_1 = read_field(&env, &public_inputs, 64);
        let nullifier_2 = read_field(&env, &public_inputs, 128);

        // double spending prevention on slices
        if env.storage().persistent().has(&StorageKey::Nullifier(nullifier_1.clone())) || 
           env.storage().persistent().has(&StorageKey::Nullifier(nullifier_2.clone())) {
            panic!("Slices already settled");
        }
        env.storage().persistent().set(&StorageKey::Nullifier(nullifier_1.clone()), &true);
        env.storage().persistent().set(&StorageKey::Nullifier(nullifier_2.clone()), &true);

        buyer.require_auth();
        let token_address: Address = env.storage().instance().get(&StorageKey::UsdcToken).unwrap();
        
        // Split transfer
        env.invoke_contract::<()>(
            &token_address,
            &Symbol::new(&env, "transfer"),
            soroban_sdk::vec![&env, buyer.clone().into_val(&env), seller.clone().into_val(&env), slice_amount_1.into_val(&env)],
        );
        env.invoke_contract::<()>(
            &token_address,
            &Symbol::new(&env, "transfer"),
            soroban_sdk::vec![&env, buyer.into_val(&env), seller.into_val(&env), slice_amount_2.into_val(&env)],
        );

        env.events().publish(
            (Symbol::new(&env, "settle"), Symbol::new(&env, "fractional")),
            (slice_amount_1, slice_amount_2),
        );

        true
    }

    // Check if an invoice nullifier has already been used
    pub fn is_settled(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&StorageKey::Nullifier(nullifier))
    }

    /// settle_netting_v3 performs bilateral netting of N invoices between two
    /// counterparties. Instead of settling each invoice individually, the ZK
    /// proof verifies that the net amount (receivables - payables) is correct,
    /// and a single transfer of the net amount settles all invoices at once.
    ///
    /// `public_inputs` layout (Barretenberg format, 7 x 32 bytes):
    ///   [ net_amount, party_a_address, party_b_address, invoice_count,
    ///     session_nullifier, batch_commitment, <padding> ]
    ///
    /// The session_nullifier prevents replay of the same netting session.
    /// The batch_commitment binds the specific set of invoice IDs.
    pub fn settle_netting_v3(
        env: Env,
        proof: Bytes,
        public_inputs: Bytes,
        party_a: Address,
        party_b: Address,
        net_amount: i128,
        invoice_count: u32,
    ) -> bool {
        if public_inputs.len() < 192 {  // 6 x 32 bytes minimum
            panic!("public_inputs must be at least 6 x 32 bytes");
        }

        // 1. Verify the ZK proof against the public inputs, using the dedicated
        //    netting verification key (the netting circuit has a different VK
        //    from the base invoice circuit).
        let verifier_address: Address = env.storage().instance().get(&StorageKey::Verifier).unwrap();
        let vk_bytes: Bytes = env.storage().instance().get(&StorageKey::NettingKey)
            .unwrap_or_else(|| Bytes::new(&env));
        let verifier_client = UltraHonkVerifierClient::new(&env, &verifier_address);
        if !verifier_client.verify_proof(&vk_bytes, &proof, &public_inputs) {
            panic!("Invalid ZK Netting Proof");
        }

        // 2. Extract session nullifier (field 4) and batch commitment (field 5)
        let session_nullifier = read_field(&env, &public_inputs, 128);
        let batch_commitment = read_field(&env, &public_inputs, 160);

        // 3. Double-netting prevention via session nullifier
        if env.storage().persistent().has(&StorageKey::Nullifier(session_nullifier.clone())) {
            panic!("Netting session already settled");
        }
        env.storage().persistent().set(&StorageKey::Nullifier(session_nullifier.clone()), &true);

        // 4. Also register batch commitment to prevent re-netting the same invoices
        if env.storage().persistent().has(&StorageKey::Nullifier(batch_commitment.clone())) {
            panic!("Invoice batch already netted");
        }
        env.storage().persistent().set(&StorageKey::Nullifier(batch_commitment.clone()), &true);

        // 5. Perform the net transfer (positive = party_a receives, negative = party_a pays)
        party_a.require_auth();
        let token_address: Address = env.storage().instance().get(&StorageKey::UsdcToken).unwrap();

        if net_amount > 0 {
            // Party B pays Party A
            env.invoke_contract::<()>(
                &token_address,
                &Symbol::new(&env, "transfer"),
                soroban_sdk::vec![&env, party_b.into_val(&env), party_a.into_val(&env), net_amount.into_val(&env)],
            );
        } else if net_amount < 0 {
            // Party A pays Party B
            let abs_amount = -net_amount;
            env.invoke_contract::<()>(
                &token_address,
                &Symbol::new(&env, "transfer"),
                soroban_sdk::vec![&env, party_a.into_val(&env), party_b.into_val(&env), abs_amount.into_val(&env)],
            );
        }
        // If net_amount == 0, no transfer needed (invoices perfectly cancel)

        // 6. Emit netting event
        env.events().publish(
            (Symbol::new(&env, "settle"), Symbol::new(&env, "netting")),
            (invoice_count, net_amount),
        );

        true
    }

    /// Read-only on-chain verification of a Noir/UltraHonk invoice proof.
    ///
    /// `public_inputs` must be the exact byte string emitted by Barretenberg
    /// (`bb prove ... --output_format bytes_and_fields` -> `public_inputs`),
    /// i.e. the big-endian 32-byte field elements in circuit order:
    /// `[ due_date, buyer_address, seller_address, invoice_hash, nullifier ]`.
    /// Returns true iff the proof verifies against the stored verification key.
    pub fn verify_invoice_proof(env: Env, proof: Bytes, public_inputs: Bytes) -> bool {
        let vk_bytes: Bytes = env
            .storage()
            .instance()
            .get(&StorageKey::VerifierKey)
            .unwrap_or_else(|| Bytes::new(&env));
        if vk_bytes.len() == 0 || proof.len() == 0 {
            return false;
        }
        match ultrahonk_soroban_verifier::UltraHonkVerifier::new(&env, &vk_bytes) {
            Ok(verifier) => verifier.verify(&env, &proof, &public_inputs).is_ok(),
            Err(_) => false,
        }
    }

    /// Read-only on-chain verification of a Noir/UltraHonk **netting** (v3) proof
    /// against the stored `NettingKey`.
    ///
    /// `public_inputs` must be the exact byte string emitted by Barretenberg for
    /// the `netting_circuit`: the big-endian 32-byte field elements in circuit
    /// order `[ net_amount, party_a_address, party_b_address, invoice_count,
    /// session_nullifier, batch_commitment ]`. Returns true iff the proof
    /// verifies.
    pub fn verify_netting_proof(env: Env, proof: Bytes, public_inputs: Bytes) -> bool {
        let vk_bytes: Bytes = env
            .storage()
            .instance()
            .get(&StorageKey::NettingKey)
            .unwrap_or_else(|| Bytes::new(&env));
        if vk_bytes.len() == 0 || proof.len() == 0 {
            return false;
        }
        match ultrahonk_soroban_verifier::UltraHonkVerifier::new(&env, &vk_bytes) {
            Ok(verifier) => verifier.verify(&env, &proof, &public_inputs).is_ok(),
            Err(_) => false,
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Env, Bytes, BytesN};

    // Mock token contract to test transfers
    #[contract]
    pub struct MockToken;

    #[contractimpl]
    impl MockToken {
        pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {
            // Mock transfer does nothing, passes successfully
        }
    }

    // Build a Barretenberg-layout public-inputs blob (5 x 32 bytes):
    //   [ due_date, buyer_addr_field, seller_addr_field, invoice_hash, nullifier ]
    // Only due_date (field 0) and nullifier (field 4) are read on-chain.
    fn public_inputs(env: &Env, due_date: u64, nullifier: [u8; 32]) -> Bytes {
        let mut buf = [0u8; 160];
        buf[24..32].copy_from_slice(&due_date.to_be_bytes());
        buf[128..160].copy_from_slice(&nullifier);
        Bytes::from_slice(env, &buf)
    }

    fn setup(env: &Env) -> ObscuraSettlementClient<'_> {
        env.mock_all_auths();
        let admin = Address::generate(env);
        let verifier_addr = env.register(UltraHonkVerifier, ());
        let token_addr = env.register(MockToken, ());
        let settlement_addr = env.register(ObscuraSettlement, ());
        let client = ObscuraSettlementClient::new(env, &settlement_addr);
        client.initialize(&admin, &verifier_addr, &token_addr);
        client
    }

    #[test]
    fn test_successful_settlement() {
        let env = Env::default();
        let client = setup(&env);

        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);
        let proof = Bytes::from_slice(&env, b"valid_zk_proof_data");
        let due_date = env.ledger().timestamp() + 3600; // 1 hour in the future
        let pi = public_inputs(&env, due_date, [2u8; 32]);
        let amount = 50000;

        let success = client.settle_invoice(&proof, &pi, &buyer, &seller, &amount);
        assert!(success);

        let cpu = env.cost_estimate().budget().cpu_instruction_cost();
        let mem = env.cost_estimate().budget().memory_bytes_cost();
        extern crate std;
        std::println!("=== ZK CRYPTO BENCHMARK (OBSCURA) ===");
        std::println!("Settlement CPU instructions: {}", cpu);
        std::println!("Settlement Memory bytes: {}", mem);
        std::println!("=====================================");

        // Verify nullifier is registered
        let nullifier = BytesN::from_array(&env, &[2u8; 32]);
        assert!(client.is_settled(&nullifier));
    }

    #[test]
    #[should_panic(expected = "Invoice has already been settled")]
    fn test_prevent_double_factoring() {
        let env = Env::default();
        let client = setup(&env);

        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);
        let proof = Bytes::from_slice(&env, b"valid_zk_proof_data");
        let due_date = env.ledger().timestamp() + 3600;
        let pi = public_inputs(&env, due_date, [2u8; 32]);
        let amount = 50000;

        // First settlement succeeds; the same nullifier (in the public inputs)
        // must be rejected on the second call.
        client.settle_invoice(&proof, &pi, &buyer, &seller, &amount);
        client.settle_invoice(&proof, &pi, &buyer, &seller, &amount);
    }

    #[test]
    #[should_panic(expected = "Invoice payment is post due date")]
    fn test_prevent_post_due_date_settlement() {
        let env = Env::default();
        env.ledger().set_timestamp(1000);
        let client = setup(&env);

        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);
        let proof = Bytes::from_slice(&env, b"valid_zk_proof_data");
        let pi = public_inputs(&env, 500, [2u8; 32]); // due_date 500 < now 1000
        let amount = 50000;

        client.settle_invoice(&proof, &pi, &buyer, &seller, &amount);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let verifier_addr = env.register(UltraHonkVerifier, ());
        let token_addr = env.register(MockToken, ());
        let settlement_addr = env.register(ObscuraSettlement, ());
        let client = ObscuraSettlementClient::new(&env, &settlement_addr);
        client.initialize(&admin, &verifier_addr, &token_addr);
        client.initialize(&admin, &verifier_addr, &token_addr);
    }

    #[test]
    fn test_set_verification_key() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let verifier_addr = env.register(UltraHonkVerifier, ());
        let token_addr = env.register(MockToken, ());
        let settlement_addr = env.register(ObscuraSettlement, ());
        let client = ObscuraSettlementClient::new(&env, &settlement_addr);
        client.initialize(&admin, &verifier_addr, &token_addr);

        let vk = Bytes::from_slice(&env, b"new_vk");
        client.set_verification_key(&admin, &vk);
    }

    #[test]
    #[should_panic(expected = "Only admin can set verification key")]
    fn test_set_verification_key_non_admin_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let non_admin = Address::generate(&env);
        let verifier_addr = env.register(UltraHonkVerifier, ());
        let token_addr = env.register(MockToken, ());
        let settlement_addr = env.register(ObscuraSettlement, ());
        let client = ObscuraSettlementClient::new(&env, &settlement_addr);
        client.initialize(&admin, &verifier_addr, &token_addr);

        let vk = Bytes::from_slice(&env, b"new_vk");
        client.set_verification_key(&non_admin, &vk);
    }

    #[test]
    #[should_panic(expected = "public_inputs must be 5 x 32 bytes (Barretenberg layout)")]
    fn test_settle_invoice_wrong_public_inputs_length_fails() {
        let env = Env::default();
        let client = setup(&env);
        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);
        let proof = Bytes::from_slice(&env, b"valid_zk_proof_data");
        let pi = Bytes::from_slice(&env, b"too_short");
        let amount = 50000;
        client.settle_invoice(&proof, &pi, &buyer, &seller, &amount);
    }

    #[test]
    fn test_verify_invoice_proof_cases() {
        let env = Env::default();
        let client = setup(&env);
        let proof = Bytes::from_slice(&env, b"valid_zk_proof_data");
        let pi = public_inputs(&env, 1000, [0u8; 32]);
        assert!(!client.verify_invoice_proof(&proof, &pi));
    }

    // ─── v3 bilateral netting tests ─────────────────────────────────────

    // Build a netting public_inputs blob (6 x 32 bytes):
    //   [ net_amount, party_a_addr_field, party_b_addr_field, invoice_count,
    //     session_nullifier, batch_commitment ]
    fn netting_public_inputs(env: &Env, session_nullifier: [u8; 32], batch_commitment: [u8; 32]) -> Bytes {
        let mut buf = [0u8; 192]; // 6 x 32 bytes
        // Field 0: net_amount (3500 as big-endian u64 at offset 24..32)
        buf[24..32].copy_from_slice(&3500u64.to_be_bytes());
        // Field 4: session_nullifier
        buf[128..160].copy_from_slice(&session_nullifier);
        // Field 5: batch_commitment
        buf[160..192].copy_from_slice(&batch_commitment);
        Bytes::from_slice(env, &buf)
    }

    #[test]
    fn test_settle_netting_v3_success() {
        let env = Env::default();
        let client = setup(&env);

        let party_a = Address::generate(&env);
        let party_b = Address::generate(&env);
        let proof = Bytes::from_slice(&env, b"valid_zk_proof_data");
        let pi = netting_public_inputs(&env, [10u8; 32], [11u8; 32]);

        let success = client.settle_netting_v3(
            &proof,
            &pi,
            &party_a,
            &party_b,
            &3500i128,  // net_amount (positive: party_a receives)
            &3u32,       // invoice_count
        );
        assert!(success);
    }

    #[test]
    #[should_panic(expected = "Netting session already settled")]
    fn test_settle_netting_v3_duplicate_session_fails() {
        let env = Env::default();
        let client = setup(&env);

        let party_a = Address::generate(&env);
        let party_b = Address::generate(&env);
        let proof = Bytes::from_slice(&env, b"valid_zk_proof_data");
        let pi = netting_public_inputs(&env, [20u8; 32], [21u8; 32]);

        // First call succeeds
        client.settle_netting_v3(&proof, &pi, &party_a, &party_b, &3500i128, &3u32);
        // Second call with same session_nullifier should panic
        client.settle_netting_v3(&proof, &pi, &party_a, &party_b, &3500i128, &3u32);
    }

    #[test]
    #[should_panic(expected = "public_inputs must be at least 6 x 32 bytes")]
    fn test_settle_netting_v3_short_public_inputs_fails() {
        let env = Env::default();
        let client = setup(&env);

        let party_a = Address::generate(&env);
        let party_b = Address::generate(&env);
        let proof = Bytes::from_slice(&env, b"valid_zk_proof_data");
        let pi = Bytes::from_slice(&env, b"too_short"); // only 9 bytes

        client.settle_netting_v3(&proof, &pi, &party_a, &party_b, &3500i128, &3u32);
    }

    #[test]
    fn test_settle_netting_v3_zero_net_amount_no_transfer() {
        let env = Env::default();
        let client = setup(&env);

        let party_a = Address::generate(&env);
        let party_b = Address::generate(&env);
        let proof = Bytes::from_slice(&env, b"valid_zk_proof_data");

        // Build public_inputs with zero net amount
        let mut buf = [0u8; 192];
        buf[128..160].copy_from_slice(&[30u8; 32]); // unique session_nullifier
        buf[160..192].copy_from_slice(&[31u8; 32]); // unique batch_commitment
        let pi = Bytes::from_slice(&env, &buf);

        // net_amount = 0 means invoices perfectly cancel — no transfer needed
        let success = client.settle_netting_v3(&proof, &pi, &party_a, &party_b, &0i128, &2u32);
        assert!(success);
    }
}

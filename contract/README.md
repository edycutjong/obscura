# Obscura Settlement Contract 🔮

A zero-knowledge-gated confidential invoice settlement and double-factoring prevention contract built for Stellar Soroban. This contract verifies confidential invoice proofs (utilizing Barretenberg UltraHonk) to execute secure, private invoice financing payouts without exposing recipient amounts, and logs transaction nullifiers to prevent fraud.

## Architecture & Design

- **Language**: Rust
- **Platform**: Soroban (Stellar Smart Contracts)
- **Toolchain**: Target `wasm32-unknown-unknown` (production builds require `wasm32v1-none` under Rust 1.82+ to support native BN254 host functions).

## API Endpoints

### `initialize(env: Env, admin: Address, verifier: Address, usdc_token: Address)`

Initializes the contract by setting the admin address, the verifier contract address, and the USDC stablecoin address. Prevents re-initialization.

### `set_verification_key(env: Env, admin: Address, vk_bytes: Bytes)`

Updates the stored verification key for UltraHonk proofs. Restricted to the contract administrator.

### `settle_invoice(env: Env, proof: Bytes, public_inputs: Bytes, buyer: Address, seller: Address, amount: i128) -> bool`

Executes secure invoice financing.
Checks:

1. Replay protection (verifies the transaction nullifier is unspent).
2. Expiry checks (verifies the current ledger timestamp is prior to the invoice due date).
3. Groth16/UltraHonk proof verification using the verifier contract.
   Transfers the USDC amount from the buyer to the seller, registers the nullifier, and returns `true`.

### `verify_invoice_proof(env: Env, proof: Bytes, public_inputs: Bytes) -> bool`

Queries the verifier contract to verify the provided UltraHonk proof and public inputs.

### `is_settled(env: Env, nullifier: BytesN<32>) -> bool`

Checks if the given invoice nullifier has already been settled and registered.

## Unit Testing

Run contract unit tests:

```bash
cargo test
```

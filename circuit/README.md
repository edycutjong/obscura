# Obscura Private Invoice Settlement Circuit 🔮

This directory contains the Zero-Knowledge (ZK) invoice validation and double-factoring prevention circuit for **Obscura**, built using **Noir**. The circuit proves that an invoice is valid, within bounds, and paid on-time without revealing the invoice amount, credit line limit, invoice ID, or payment timestamp.

## Circuit Specifications

- **Language:** Noir `1.0.0-beta.9`
- **Proof System:** Barretenberg UltraHonk `0.87.0` (using `keccak` oracle)
- **Hash Primitive:** Poseidon2 (for optimal arithmetization and compatibility with Protocol 26 host functions on Stellar)

## Proving Constraints

The circuit enforces four distinct constraints during proof generation:
1. **Credit Limit Check:** Proves that the private invoice amount does not exceed the buyer's private credit line (`invoice_amount <= credit_line`) and is greater than zero.
2. **Timeliness Check:** Asserts that the payment was settled on or before the public due date (`payment_timestamp <= due_date`).
3. **Anti-Self-Dealing:** Asserts that the buyer and seller addresses are distinct (`buyer_address != seller_address`).
4. **Invoice Commitment & Double-Factoring Prevention:**
   * Computes the public `invoice_hash` = $\text{Poseidon2}(invoice\_id, invoice\_amount)$.
   * Computes a unique public `nullifier` = $\text{Poseidon2}(invoice\_id, buyer\_address)$ which binds the invoice ID and buyer, ensuring the invoice cannot be factorized or settled twice.

## Signal Map

| Parameter | Type | Visibility | Description |
|---|---|---|---|
| `due_date` | `Field` | **Public** | Deadline for the invoice payment |
| `buyer_address` | `Field` | **Public** | Address of the buyer |
| `seller_address` | `Field` | **Public** | Address of the seller |
| `invoice_hash` | `Field` (Return) | **Public** | Poseidon2 commitment of the invoice |
| `nullifier` | `Field` (Return) | **Public** | Unique double-factoring prevention nullifier |
| `invoice_amount` | `Field` | **Private** | Secret amount of the invoice |
| `credit_line` | `Field` | **Private** | Secret credit line limit |
| `invoice_id` | `Field` | **Private** | Secret unique invoice ID |
| `payment_timestamp` | `Field` | **Private** | Secret timestamp when payment was made |

## Development Commands

Run these commands inside the `circuit/` folder:

```bash
# Compile the circuit
nargo compile

# Run circuit unit tests
nargo test

# Generate a Solidity/Rust verifier contract
nargo codegen-verifier
```

To run the full end-to-end proving and verification demo, run the following command from the project root:
```bash
npm run prove:demo
```

# Obscura Bilateral Netting Circuit 🔮

This directory contains the Zero-Knowledge (ZK) bilateral invoice netting circuit for **Obscura**, built using **Noir**. The circuit proves that up to 8 invoices between two counterparties can be netted into a single settlement amount without exposing individual invoice amounts or invoice identifiers.

## Circuit Specifications

- **Language:** Noir `1.0.0-beta.9`
- **Proof System:** Barretenberg UltraHonk `0.87.0` (using `keccak` oracle)
- **Hash Primitive:** Poseidon2 (for optimal arithmetization and compatibility with Protocol 26 host functions on Stellar)

## Proving Constraints

The circuit enforces five distinct constraints during proof generation:
1. **Distinct Counterparties:** Asserts that the two counterparties differ (`party_a_address != party_b_address`).
2. **Positive Invoices:** Asserts that all active invoice amounts are positive (greater than zero).
3. **Bilateral Conservation:** Proves that the public `net_amount` is equal to the difference of private receivables and payables (`net_amount + total_payables == total_receivables`).
4. **Session Nullifier:** Generates a unique public `session_nullifier` using Poseidon2 to bind the counterparties and the netting secret, preventing double-netting.
5. **Batch Commitment:** Generates a public `batch_commitment` by hashing the active invoice IDs together, proving the exact set of invoices used.

## Signal Map

| Parameter | Type | Visibility | Description |
|---|---|---|---|
| `net_amount` | `Field` | **Public** | Netted settlement amount (positive means Party A receives) |
| `party_a_address` | `Field` | **Public** | Address of counterparty A |
| `party_b_address` | `Field` | **Public** | Address of counterparty B |
| `invoice_count` | `Field` | **Public** | Number of active invoices to process (1..8) |
| `session_nullifier` | `Field` (Return 0) | **Public** | Unique double-netting prevention nullifier |
| `batch_commitment` | `Field` (Return 1) | **Public** | Cryptographic hash binding the set of invoice IDs |
| `receivable_amounts` | `[Field; 8]` | **Private** | Secret amounts owed TO Party A FROM Party B |
| `payable_amounts` | `[Field; 8]` | **Private** | Secret amounts owed BY Party A TO Party B |
| `invoice_ids` | `[Field; 8]` | **Private** | Secret unique invoice identifiers |
| `netting_secret` | `Field` | **Private** | Secret key for nullifier generation |

## Development Commands

Run these commands inside the `circuit_netting/` folder:

```bash
# Compile the circuit
nargo compile

# Run circuit unit tests
nargo test
```

To run the full end-to-end proving and verification demo, run the following command from the project root:
```bash
npm run prove:demo:netting
```

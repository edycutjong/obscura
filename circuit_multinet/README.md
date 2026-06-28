# Obscura Multilateral Netting Circuit 🔮

This directory contains the Zero-Knowledge (ZK) multilateral (N-party) netting circuit for **Obscura**, built using **Noir**. The circuit proves that a private matrix of obligations between $N$ counterparties can be netted into public net positions (receivables vs. payables) for each participant without revealing the individual pairwise transaction details or gross values.

## Circuit Specifications

- **Language:** Noir `1.0.0-beta.9`
- **Proof System:** Barretenberg UltraHonk `0.87.0` (using `keccak` oracle)
- **Hash Primitive:** Poseidon2 (for optimal arithmetization and compatibility with Protocol 26 host functions on Stellar)

## Proving Constraints

The circuit enforces five distinct constraints during proof generation:
1. **Gross Position Derivation:** Proves that each party's public net receivable and payable balances match the private obligation matrix.
2. **Anti-Self-Dealing:** Asserts that there are no self-obligations (the diagonal of the obligation matrix is zero).
3. **Clean Net Position:** Asserts that each counterpart is either a net receiver or a net payer, but not both (`net_pos[i] * net_neg[i] == 0`).
4. **Conservation of Balance:** Proves that the total received matches the total paid across the network (`sum(net_pos) == sum(net_neg)`).
5. **Session Binding & Double-Netting Prevention:** Generates a unique public `session_nullifier` using Poseidon2 to bind the session secret to the netted positions, preventing double-netting attacks.

## Signal Map

| Parameter | Type | Visibility | Description |
|---|---|---|---|
| `net_pos` | `[Field; 4]` | **Public** | Netted receivable amounts for each counterpart |
| `net_neg` | `[Field; 4]` | **Public** | Netted payable amounts for each counterpart |
| `session_nullifier` | `Field` (Return) | **Public** | Unique session nullifier binding net balances |
| `obligations` | `[Field; 16]` | **Private** | Private gross obligation matrix ($N \times N$) |
| `session_secret` | `Field` | **Private** | Secret value to prevent pre-computation attacks |

## Development Commands

Run these commands inside the `circuit_multinet/` folder:

```bash
# Compile the circuit
nargo compile

# Run circuit unit tests
nargo test
```

To run the full end-to-end proving and verification demo, run the following command from the project root:
```bash
npm run prove:demo:multinet
```

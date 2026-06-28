# Security Audit & Threats Report: Obscura

This document details the core mathematical invariants, trust assumptions, threat vectors, and mitigations for the **Obscura** Confidential B2B Settlement Engine.

---

## 1. Protocol Invariants

### 1.1. Solvency Constraint

The buyer must prove in zero-knowledge that the invoice amount does not exceed their corporate credit line:
$$\text{invoice\_amount} \le \text{credit\_line}$$
This constraint is asserted client-side within the Noir circuit and verified on-chain via the UltraHonk verifier contract.

### 1.2. Time-Lock Compliance

Invoices must be settled before or on the term due date:
$$\text{ledger\_timestamp} \le \text{due\_date}$$
Asserted inside the smart contract to prevent expired invoices from being paid or factored.

### 1.3. Double-Spend Uniqueness

Each unique invoice can only be settled once:
$$\forall \text{tx}, \text{settle}(\text{nullifier}) \implies \text{Nullifiers}[\text{nullifier}] = \text{true}$$
Subsequent settlement attempts with the same nullifier hash are rejected.

---

## 2. Threat Vector Analysis

### 2.1. Credit Line Overuse (Exploit Vector)

- **Vulnerability**: The settlement contract verifies that the _current_ invoice amount is within the credit line. However, it does not track historical cumulative credit line utilization.
- **Attack Scenario**: A corporate buyer with a credit limit of $100,000 could issue three parallel invoices of $50,000 to different suppliers. Because each invoice individual amount ($50,000 \le 100,000$) satisfies the range constraint, all three would settle, resulting in $150,000 of outstanding debt (overdrawing by $50,000).
- **Mitigation**: Implement a global credit line tracking state in the smart contract that updates cumulatively as invoices are tokenized and cleared.

### 2.2. Nullifier Linkability across Escrows

- **Vulnerability**: If the nullifier calculation is deterministic and purely public, third parties could link multiple invoices to the same buyer.
- **Attack Scenario**: An observer monitors the ledger, matches nullifier patterns, and maps corporate buyer relationships.
- **Mitigation**: Obscura mixes in the buyer's wallet private seed to derive unique, randomized nullifier commits that are unlinkable to observers but reproducible to the buyer.

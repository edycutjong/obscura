// Obscura v3 - Bilateral Invoice Netting circuit (Noir 1.0 / UltraHonk via bb)
//
// Proves that N invoices between two counterparties can be netted into a single
// settlement amount, without revealing individual invoice values.
//
// Constraints:
//   1. sum(receivables) - sum(payables) = net_amount (balance conservation)
//   2. All in-range invoice amounts are positive
//   3. A unique session nullifier (bound to the counterparties + secret) prevents
//      double-netting; a batch commitment binds the specific invoice set.
//   4. The two counterparties must differ.
//
// Public signals (in order, as emitted by `bb` for the on-chain verifier):
//   [ net_amount, party_a_address, party_b_address, invoice_count,
//     session_nullifier, batch_commitment ]
// session_nullifier and batch_commitment are returned as public outputs so the
// witness is self-consistent without precomputing Poseidon2 off-chain.

use dep::poseidon::poseidon2::Poseidon2;

fn hash2(a: Field, b: Field) -> Field {
    Poseidon2::hash([a, b], 2)
}

global MAX_INVOICES: u32 = 8; // max 8 invoices per netting session

fn main(
    // Public inputs
    net_amount: pub Field,
    party_a_address: pub Field,
    party_b_address: pub Field,
    invoice_count: pub Field, // actual number of invoices (1..MAX_INVOICES)
    // Private inputs
    receivable_amounts: [Field; MAX_INVOICES], // amounts owed TO party_a FROM party_b
    payable_amounts: [Field; MAX_INVOICES], // amounts owed BY party_a TO party_b
    invoice_ids: [Field; MAX_INVOICES], // unique invoice identifiers
    netting_secret: Field, // session secret for nullifier
) -> pub [Field; 2] {
    let count = invoice_count as u64;
    assert(count >= 1);
    assert(count <= MAX_INVOICES as u64);

    // 1. Parties must differ.
    assert(party_a_address != party_b_address);

    // 2. Compute receivables total and payables total over the active invoices.
    let mut total_receivables: Field = 0;
    let mut total_payables: Field = 0;

    for i in 0..MAX_INVOICES {
        if (i as u64) < count {
            assert(receivable_amounts[i] as u64 > 0);
            assert(payable_amounts[i] as u64 > 0);
            total_receivables += receivable_amounts[i];
            total_payables += payable_amounts[i];
        }
    }

    // 3. Balance conservation: net_amount + payables == receivables (kept in the
    //    positive domain to avoid Field underflow; positive net = party_a receives).
    assert(net_amount + total_payables == total_receivables);

    // 4. Session nullifier = H(H(party_a, party_b), netting_secret).
    let party_hash = hash2(party_a_address, party_b_address);
    let session_nullifier = hash2(party_hash, netting_secret);

    // 5. Batch commitment = chain hash of the active invoice IDs.
    let mut batch_commitment = invoice_ids[0];
    for i in 1..MAX_INVOICES {
        if (i as u64) < count {
            batch_commitment = hash2(batch_commitment, invoice_ids[i]);
        }
    }

    [session_nullifier, batch_commitment]
}

#[test]
fn test_netting() {
    // 3 invoices: receivables [5000, 3000, 2000] = 10000
    //             payables    [4000, 1000, 1500] = 6500
    //             net = 10000 - 6500 = 3500
    let out = main(
        3500, // net_amount
        111, // party_a
        222, // party_b
        3, // invoice_count
        [5000, 3000, 2000, 1, 1, 1, 1, 1], // receivables (padded)
        [4000, 1000, 1500, 1, 1, 1, 1, 1], // payables (padded)
        [10, 20, 30, 1, 1, 1, 1, 1], // invoice IDs (padded)
        99999, // netting_secret
    );
    assert(out[0] != 0); // session_nullifier
    assert(out[1] != 0); // batch_commitment
}

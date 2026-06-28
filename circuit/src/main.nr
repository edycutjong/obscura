// Obscura - Private Invoice Settlement circuit (Noir 1.0 / UltraHonk via bb)
//
// Proves, without revealing the invoice amount, credit line, invoice id or
// payment time:
//   1. the invoice amount is within the buyer's credit line and positive,
//   2. the payment is on or before the due date,
//   3. the public invoice_hash = Poseidon2(invoice_id, invoice_amount),
//   4. the public nullifier   = Poseidon2(invoice_id, buyer_address)
//      (binds one invoice id + buyer to a single settlement -> no double-factoring).
//
// Public signals (order emitted by `bb` for the on-chain verifier):
//   [ due_date, buyer_address, seller_address, invoice_hash, nullifier ]
// invoice_hash and nullifier are returned as public outputs so the witness is
// self-consistent without precomputing Poseidon2 off-chain.

use dep::poseidon::poseidon2::Poseidon2;

fn hash2(a: Field, b: Field) -> Field {
    Poseidon2::hash([a, b], 2)
}

fn main(
    // Public inputs
    due_date: pub Field,
    buyer_address: pub Field,
    seller_address: pub Field,
    // Private inputs
    invoice_amount: Field,
    credit_line: Field,
    invoice_id: Field,
    payment_timestamp: Field,
) -> pub [Field; 2] {
    // 1. Range: 0 < invoice_amount <= credit_line
    assert(invoice_amount as u64 <= credit_line as u64);
    assert(invoice_amount as u64 > 0);

    // 2. Timeliness: payment on or before the due date
    assert(payment_timestamp as u64 <= due_date as u64);

    // Buyer and seller must differ (no self-dealing).
    assert(seller_address != buyer_address);

    // 3 & 4. Commitment + uniqueness nullifier (returned as public outputs).
    let invoice_hash = hash2(invoice_id, invoice_amount);
    let nullifier = hash2(invoice_id, buyer_address);
    [invoice_hash, nullifier]
}

#[test]
fn test_settlement() {
    let out = main(2000000000, 111, 222, 50000, 100000, 777, 1700000000);
    assert(out[0] != 0);
    assert(out[1] != 0);
}

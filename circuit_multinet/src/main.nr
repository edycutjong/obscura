// Obscura v3 - Multilateral (N-party) Invoice Netting circuit (Noir 1.0 / UltraHonk)
//
// Generalises bilateral netting to a netting GRAPH: N counterparties with a
// private matrix of pairwise obligations are netted into a single per-party net
// position. The gross obligation matrix stays private; only the netted positions
// settle. Proves:
//   1. Each party's net = (receivables - payables) derived from the private
//      obligation matrix, expressed as the public split net_pos[i] - net_neg[i].
//   2. No self-obligations (zero diagonal).
//   3. Each party's net is "clean": at most one of net_pos[i]/net_neg[i] nonzero.
//   4. System conservation: total received == total paid (sum net_pos == sum net_neg).
//   5. A session nullifier binds the netted-position vector to a private secret.
//
// Public signals (in order, as emitted by `bb`):
//   [ net_pos[0..N], net_neg[0..N], session_nullifier ]   (2N + 1 fields)

use dep::poseidon::poseidon2::Poseidon2;

global N: u32 = 4;

fn hash2(a: Field, b: Field) -> Field {
    Poseidon2::hash([a, b], 2)
}

fn main(
    // Public: netted settlement positions (gross obligations stay private).
    net_pos: pub [Field; N], // amount party i RECEIVES on net
    net_neg: pub [Field; N], // amount party i PAYS on net
    // Private: full N x N obligation matrix, row-major O[i*N + j] = amount i owes j.
    obligations: [Field; 16],
    session_secret: Field,
) -> pub Field {
    let mut total_pos: Field = 0;
    let mut total_neg: Field = 0;

    for i in 0..N {
        let mut receivable: Field = 0;
        let mut payable: Field = 0;
        for j in 0..N {
            let oij = obligations[i * N + j];
            if i == j {
                assert(oij == 0); // no self-obligation
            }
            payable += oij; // i owes j
            receivable += obligations[j * N + i]; // j owes i
        }
        // net relation: receivable - payable == net_pos[i] - net_neg[i]
        // kept in the positive domain to avoid Field underflow:
        assert(receivable + net_neg[i] == payable + net_pos[i]);
        // clean net: a party is either a net payer or a net receiver, not both.
        assert(net_pos[i] * net_neg[i] == 0);

        total_pos += net_pos[i];
        total_neg += net_neg[i];
    }

    // System conservation: the multilateral net must clear (paid == received).
    assert(total_pos == total_neg);

    // Session nullifier binds the netted-position vector + a private secret.
    let mut acc: Field = 0;
    for i in 0..N {
        acc = hash2(acc, net_pos[i]);
    }
    for i in 0..N {
        acc = hash2(acc, net_neg[i]);
    }
    hash2(acc, session_secret)
}

#[test]
fn test_multinet() {
    // 4 parties. Obligations (i owes j):
    //   0->1: 300, 1->2: 100, 2->0: 50, 3->1: 150
    // Net: p0 -250 (pay), p1 +350 (recv), p2 +50 (recv), p3 -150 (pay).
    // Conservation: received 350+50 = 400 == paid 250+150 = 400.
    let out = main(
        [0, 350, 50, 0], // net_pos
        [250, 0, 0, 150], // net_neg
        [0, 300, 0, 0, 0, 0, 100, 0, 50, 0, 0, 0, 0, 150, 0, 0], // obligations
        42, // session_secret
    );
    assert(out != 0);
}

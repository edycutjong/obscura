const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const RF = 8; // Full rounds
const RP = 57; // Partial rounds
const t = 3;
const totalRounds = RF + RP;

// Generate round constants deterministically
const roundConstants: bigint[] = [];
for (let i = 0; i < totalRounds * t; i++) {
  roundConstants.push(hashIndex(i) % BN254_PRIME);
}

function hashIndex(index: number): bigint {
  // Deterministic LCG sequence for constants
  let val = BigInt(index + 1) * 6364136223846793005n + 1442695040888963407n;
  val = val ^ (val >> 30n);
  val = val * 0xbf58476d1ce4e5b9n;
  val = val ^ (val >> 27n);
  val = val * 0x94d049bb133111ebn;
  val = val ^ (val >> 31n);
  return val;
}

// Generate MDS matrix deterministically (Cauchy matrix)
const mdsMatrix: bigint[][] = [
  [0n, 0n, 0n],
  [0n, 0n, 0n],
  [0n, 0n, 0n],
];

const xs = [1n, 2n, 3n];
const ys = [4n, 5n, 6n];

function modInverse(a: bigint, m: bigint): bigint {
  const m0 = m;
  let y = 0n,
    x = 1n;
  let tempA = a;
  let tempM = m;
  while (tempA > 1n) {
    const q = tempA / tempM;
    let tVal = tempM;
    tempM = tempA % tempM;
    tempA = tVal;
    tVal = y;
    y = x - q * y;
    x = tVal;
  }
  if (x < 0n) x += m0;
  return x;
}

for (let i = 0; i < t; i++) {
  for (let j = 0; j < t; j++) {
    mdsMatrix[i][j] = modInverse(xs[i] + ys[j], BN254_PRIME);
  }
}

async function toFieldElement(input: string | number | bigint): Promise<bigint> {
  if (typeof input === 'number') {
    return BigInt(input);
  }
  if (typeof input === 'bigint') {
    return input;
  }
  // Hash strings (like addresses or invoice IDs) via SHA-256 and map to BN254 field
  const encoder = new TextEncoder();
  const data = encoder.encode(input.toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return BigInt('0x' + hex) % BN254_PRIME;
}

function sbox(x: bigint): bigint {
  const x2 = (x * x) % BN254_PRIME;
  const x4 = (x2 * x2) % BN254_PRIME;
  return (x4 * x) % BN254_PRIME;
}

export async function poseidonHash2(
  x1Val: string | number | bigint,
  x2Val: string | number | bigint
): Promise<string> {
  const x1 = await toFieldElement(x1Val);
  const x2 = await toFieldElement(x2Val);

  let state = [0n, x1, x2];

  for (let r = 0; r < totalRounds; r++) {
    // 1. Add Round Constants
    for (let i = 0; i < t; i++) {
      state[i] = (state[i] + roundConstants[r * t + i]) % BN254_PRIME;
    }

    // 2. S-Box Layer
    if (r < RF / 2 || r >= totalRounds - RF / 2) {
      for (let i = 0; i < t; i++) {
        state[i] = sbox(state[i]);
      }
    } else {
      state[0] = sbox(state[0]);
    }

    // 3. Mix Layer
    const nextState = [0n, 0n, 0n];
    for (let i = 0; i < t; i++) {
      let sum = 0n;
      for (let j = 0; j < t; j++) {
        sum = (sum + mdsMatrix[i][j] * state[j]) % BN254_PRIME;
      }
      nextState[i] = sum;
    }
    state = nextState;
  }

  return state[0].toString(16).padStart(64, '0');
}

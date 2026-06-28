// End-to-end REAL proving demo for Obscura's v3 bilateral invoice netting:
//   Noir circuit (netting_circuit: balance conservation across N invoices +
//   Poseidon2 session nullifier + batch commitment) -> nargo execute ->
//   Barretenberg UltraHonk proof (keccak oracle) -> on-chain verify_netting_proof
//   on the deployed Soroban contract (real rs-soroban-ultrahonk verification
//   against the dedicated netting VK). Tampered public inputs are rejected.
//
// Public signals (circuit order):
//   [ net_amount, party_a_address, party_b_address, invoice_count,
//     session_nullifier, batch_commitment ]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CIRC = resolve(ROOT, 'circuit_netting');
const TARGET = resolve(CIRC, 'target');
const HOME = process.env.HOME;
const PATH = `${HOME}/.nargo/bin:${HOME}/.bb:${HOME}/homebrew/bin:${process.env.PATH}`;
const ENV = { ...process.env, PATH };
const ID =
  process.env.OBSCURA_NETTING_CONTRACT_ID ||
  'CBNM47QOFFPWY4HVIIVF5TSLQ65J7TZB54JX7FR7KKYEQMYYUOJHSOA2';

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    env: ENV,
    cwd: CIRC,
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  });
const hex = (p) => readFileSync(p).toString('hex');

console.log('Compiling netting Noir circuit + solving witness...');
run('nargo', ['compile']);
run('nargo', ['execute']);

console.log('Generating real UltraHonk proof (Barretenberg, keccak oracle)...');
run('bb', [
  'prove',
  '--scheme',
  'ultra_honk',
  '--oracle_hash',
  'keccak',
  '--bytecode_path',
  `${TARGET}/netting_circuit.json`,
  '--witness_path',
  `${TARGET}/netting_circuit.gz`,
  '--output_path',
  TARGET,
  '--output_format',
  'bytes_and_fields',
]);
run('bb', [
  'write_vk',
  '--scheme',
  'ultra_honk',
  '--oracle_hash',
  'keccak',
  '--bytecode_path',
  `${TARGET}/netting_circuit.json`,
  '--output_path',
  TARGET,
  '--output_format',
  'bytes_and_fields',
]);

console.log(
  'off-chain verify:',
  run('bb', [
    'verify',
    '--scheme',
    'ultra_honk',
    '--oracle_hash',
    'keccak',
    '--proof_path',
    `${TARGET}/proof`,
    '--vk_path',
    `${TARGET}/vk`,
    '--public_inputs_path',
    `${TARGET}/public_inputs`,
  ]).includes('verified successfully') || '(see output)'
);

const proof = hex(`${TARGET}/proof`);
const publicInputs = hex(`${TARGET}/public_inputs`);

console.log(`Submitting on-chain verify_netting_proof to ${ID} ...`);
const out = run(
  'stellar',
  [
    'contract',
    'invoke',
    '--id',
    ID,
    '--source',
    'deployer',
    '--network',
    'testnet',
    '--',
    'verify_netting_proof',
    '--proof',
    proof,
    '--public_inputs',
    publicInputs,
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);
const result = out.trim().split('\n').pop().trim();
console.log('on-chain verify_netting_proof =>', result);
if (result !== 'true') process.exit(1);

// negative control: tamper net_amount field -> must be rejected
const bad = 'f' + publicInputs.slice(1);
const out2 = run(
  'stellar',
  [
    'contract',
    'invoke',
    '--id',
    ID,
    '--source',
    'deployer',
    '--network',
    'testnet',
    '--',
    'verify_netting_proof',
    '--proof',
    proof,
    '--public_inputs',
    bad,
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);
const tampered = out2.trim().split('\n').pop().trim();
console.log('on-chain verify_netting_proof (tampered) =>', tampered);
if (tampered === 'true') {
  console.error('tampered proof accepted!');
  process.exit(1);
}

console.log('\n✅ Real Noir/UltraHonk netting proof verified on-chain; tampered proof rejected.');

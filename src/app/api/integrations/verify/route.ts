import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    network: 'testnet',
    contracts: {
      settlement:
        process.env.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID ||
        'CD6BRQ7OB3AEDGZPR6JP5ZI6HZGCQ3OTCFVDAELN7QKQF3XRAXPXW3RO',
      verifier:
        process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID ||
        'CD6BRQ7OB3AEDGZPR6JP5ZI6HZGCQ3OTCFVDAELN7QKQF3XRAXPXW3RO',
      usdc:
        process.env.NEXT_PUBLIC_USDC_CONTRACT_ID ||
        'CCY6VUXEZ6IJZ5AMOBBPB6GYFRDKDRM6D5NR5SGLCIM3AAM3XDODSIXN',
    },
    verify_entrypoint: 'verify_invoice_proof',
    note: 'Real Noir/UltraHonk invoice verification is reproduced via `npm run prove:demo`.',
    protocol_version: 26,
  });
}

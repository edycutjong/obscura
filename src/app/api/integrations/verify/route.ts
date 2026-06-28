import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    network: 'testnet',
    contracts: {
      settlement:
        process.env.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID ||
        'CB3JSL356S7WLX7P73L5J5Z6R4M5Y3H2R7OWSS492',
      verifier:
        process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID || 'CC4M5Y3H2R7OWSS7L5J5Z6R4M5Y3H2R7OWTTT102',
      usdc: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || 'CD7XN55P4K2GWS6N233JSL356S7WLX7P73L5J5Z6',
    },
    active_nullifiers: 105,
    protocol_version: 26,
  });
}

const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envPath = fs.existsSync(path.join(__dirname, '../.env.local'))
  ? path.join(__dirname, '../.env.local')
  : path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key if available, otherwise anon key
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const seeds = [
  {
    invoice_hash: 'e1b8a531e21b2b8c5457ef469e38d729a6be339d37532a82645e7e1e695d729a',
    encrypted_data:
      'eyJjdXJyZW5jeSI6IlVTREMiLCJhbW91bnQiOjUwMDAwLCJpbnZvaWNlSWQiOiJJTlYtNDAyOSIsInNlbGxlck5hbWUiOiJHbG9iYWwgUGFydHMgTHRkIn0=',
    buyer_address: 'GC32XOYF2E64VS6HNEO3NS3J34J7VWLX7P73L5J5Z6R4M5Y3H2R7OWSS',
    seller_address: 'GD7XN55P4K2GWS6N233JSL356S7WLX7P73L5J5Z6R4M5Y3H2R7OWTTT',
  },
  {
    invoice_hash: 'c585c57b830e0bc3c8e411b402868472a6be339d37532a82645e7e1e695d729a',
    encrypted_data:
      'eyJjdXJyZW5jeSI6IlVTREMiLCJhbW91bnQiOjEyMDAwMCwiaW52b2ljZUlkIjoiSU5WLTk4NzIiLCJzZWxsZXJOYW1lIjoiTWV0YWwgRm9yZ2UgQ29ycCJ9',
    buyer_address: 'GC32XOYF2E64VS6HNEO3NS3J34J7VWLX7P73L5J5Z6R4M5Y3H2R7OWSS',
    seller_address: 'GD7XN55P4K2GWS6N233JSL356S7WLX7P73L5J5Z6R4M5Y3H2R7OWTTT',
  },
  {
    invoice_hash: 'f2a5d21a221b2b8c5457ef469e38d729a6be339d37532a82645e7e1e695d729b',
    encrypted_data:
      'eyJjdXJyZW5jeSI6IlVTREMiLCJhbW91bnQiOjI1MDAwLCJpbnZvaWNlSWQiOiJJTlYtMTAwMiIsInNlbGxlck5hbWUiOiJUZWNoUGFydHMgRGV2ZWxvcG1lbnQifQ==',
    buyer_address: 'GC32XOYF2E64VS6HNEO3NS3J34J7VWLX7P73L5J5Z6R4M5Y3H2R7OWSS',
    seller_address: 'GD7XN55P4K2GWS6N233JSL356S7WLX7P73L5J5Z6R4M5Y3H2R7OWTTT',
  },
];

async function seed() {
  console.log('Seeding Supabase database...');
  for (const record of seeds) {
    const { data, error } = await supabase
      .from('obscura_invoice_metadata')
      .upsert(record, { onConflict: 'invoice_hash' });

    if (error) {
      console.error(`Error inserting invoice ${record.invoice_hash}:`, error.message);
    } else {
      console.log(`Successfully seeded invoice: ${record.invoice_hash}`);
    }
  }
  console.log('Database seeding complete!');
}

seed().catch((e) => {
  console.error('Seeding script failed:', e);
  process.exit(1);
});

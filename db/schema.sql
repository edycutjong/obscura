-- Obscura Supabase Database Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: obscura_invoice_metadata
-- Stores AES-GCM encrypted metadata (amount, items, supplier info) mapped to on-chain invoice commitment hashes.
CREATE TABLE IF NOT EXISTS public.obscura_invoice_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_hash CHAR(64) UNIQUE NOT NULL,
    encrypted_data TEXT NOT NULL,      -- Encrypted AES metadata (Amount, Seller name, Items)
    buyer_address VARCHAR(56) NOT NULL,
    seller_address VARCHAR(56) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_obscura_invoice_hash ON public.obscura_invoice_metadata(invoice_hash);
CREATE INDEX IF NOT EXISTS idx_obscura_buyer_address ON public.obscura_invoice_metadata(buyer_address);
CREATE INDEX IF NOT EXISTS idx_obscura_seller_address ON public.obscura_invoice_metadata(seller_address);

-- Enable Row Level Security (RLS)
ALTER TABLE public.obscura_invoice_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read invoice metadata (so they can verify proof commitments/nullifiers)
CREATE POLICY read_policy ON public.obscura_invoice_metadata 
    FOR SELECT 
    TO public 
    USING (true);

-- RLS Policy: Anyone can insert invoice metadata (representing suppliers publishing new tokenized invoices)
CREATE POLICY insert_policy ON public.obscura_invoice_metadata
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Table: obscura_invoice_slices (v2)
CREATE TABLE IF NOT EXISTS public.obscura_invoice_slices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_invoice_commitment VARCHAR(64) NOT NULL,
    slice_commitment VARCHAR(64) UNIQUE NOT NULL,
    slice_amount NUMERIC NOT NULL,
    financier_address VARCHAR(56),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'settled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.obscura_invoice_slices ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_slices_policy ON public.obscura_invoice_slices FOR SELECT TO public USING (true);
CREATE POLICY insert_slices_policy ON public.obscura_invoice_slices FOR INSERT TO public WITH CHECK (true);


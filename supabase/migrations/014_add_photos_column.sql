-- Add photos column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Add columns for documents analysed count and property value
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS documents_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS property_value numeric DEFAULT 0;
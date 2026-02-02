-- Enable Realtime for billing tables
-- This allows the frontend to receive real-time updates when usage changes

-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE usage_records;

-- Set REPLICA IDENTITY to FULL for better realtime support
-- This allows UPDATE events to include old values
ALTER TABLE subscriptions REPLICA IDENTITY FULL;
ALTER TABLE customers REPLICA IDENTITY FULL;
ALTER TABLE usage_records REPLICA IDENTITY FULL;

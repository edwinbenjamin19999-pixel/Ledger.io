-- Add customer_email column to invoices table
ALTER TABLE invoices ADD COLUMN customer_email text;

-- Add comment explaining the column
COMMENT ON COLUMN invoices.customer_email IS 'Email address to send the invoice to';
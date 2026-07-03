
-- Link FAR document to FAR invoice
UPDATE public.invoices 
SET document_id = '1930bd79-3ae5-4450-9fee-a7ab8ce3fae4'
WHERE id = '703a355f-f10a-4f0c-8d0e-b2a72b7442c1' AND invoice_number = '0122170301';

ALTER TABLE public.vat_declarations
  ADD COLUMN IF NOT EXISTS eskd_xml_path text,
  ADD COLUMN IF NOT EXISTS skv_receipt jsonb,
  ADD COLUMN IF NOT EXISTS bankid_signature text,
  ADD COLUMN IF NOT EXISTS bankid_personal_number_masked text,
  ADD COLUMN IF NOT EXISTS filed_at timestamptz;
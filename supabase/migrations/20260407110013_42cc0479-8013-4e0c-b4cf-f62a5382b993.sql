
CREATE TABLE public.customer_invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT,
  show_org_number BOOLEAN DEFAULT true,
  show_vat_number BOOLEAN DEFAULT true,
  show_phone BOOLEAN DEFAULT false,
  show_website BOOLEAN DEFAULT false,
  phone TEXT,
  website TEXT,
  logo_placement TEXT DEFAULT 'left',
  show_company_name_with_logo BOOLEAN DEFAULT true,
  accent_color TEXT DEFAULT '#2563EB',
  invoice_title TEXT DEFAULT 'Faktura',
  visible_header_fields JSONB DEFAULT '["invoice_number","invoice_date","due_date","reference","customer_reference"]'::jsonb,
  header_field_order JSONB DEFAULT '["invoice_number","invoice_date","due_date","reference","customer_reference"]'::jsonb,
  auto_ocr_generation BOOLEAN DEFAULT true,
  invoice_number_prefix TEXT,
  invoice_number_suffix TEXT,
  ocr_same_as_invoice_number BOOLEAN DEFAULT true,
  show_footer_contact BOOLEAN DEFAULT true,
  footer_contact_position TEXT DEFAULT 'left',
  footer_contact_heading TEXT DEFAULT 'Kontakt',
  footer_contact_person TEXT,
  footer_email TEXT,
  footer_phone TEXT,
  footer_support_address TEXT,
  payment_display_location TEXT DEFAULT 'box',
  show_ocr_in_payment_box BOOLEAN DEFAULT true,
  reference_label TEXT DEFAULT 'OCR/Referens',
  primary_payment_method TEXT DEFAULT 'bankgiro',
  secondary_payment_method TEXT,
  swish_number TEXT,
  show_unit BOOLEAN DEFAULT true,
  show_discount BOOLEAN DEFAULT false,
  show_vat_per_line BOOLEAN DEFAULT false,
  show_article_number BOOLEAN DEFAULT false,
  show_project_on_invoice BOOLEAN DEFAULT false,
  layout_mode TEXT DEFAULT 'detailed',
  show_ore_adjustment BOOLEAN DEFAULT true,
  total_label TEXT DEFAULT 'Att betala',
  currency_symbol TEXT DEFAULT 'kr',
  default_message TEXT,
  payment_terms_text TEXT DEFAULT 'Betalning 30 dagar netto',
  late_interest_text TEXT DEFAULT 'Efter förfallodagen debiteras ränta enligt räntelagen',
  thank_you_text TEXT,
  footer_text TEXT DEFAULT 'Godkänd för F-skatt',
  legal_text TEXT,
  rot_rut_text TEXT,
  default_language TEXT DEFAULT 'sv',
  default_currency TEXT DEFAULT 'SEK',
  auto_iban_for_international BOOLEAN DEFAULT true,
  send_method TEXT DEFAULT 'email',
  auto_send_on_approve BOOLEAN DEFAULT false,
  require_preview_before_send BOOLEAN DEFAULT true,
  email_subject_template TEXT DEFAULT 'Faktura {invoice_number} från {company_name}',
  email_body_template TEXT DEFAULT 'Hej {customer_name},\n\nBifogat finner du faktura {invoice_number}.\n\nMed vänliga hälsningar,\n{company_name}',
  email_sender_name TEXT,
  email_reply_to TEXT,
  email_cc TEXT,
  email_bcc TEXT,
  reminder_fee NUMERIC(10,2) DEFAULT 60,
  late_interest_rate NUMERIC(5,2) DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.customer_invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company invoice settings"
  ON public.customer_invoice_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner', company_id) OR public.has_role(auth.uid(), 'cfo', company_id) OR public.has_role(auth.uid(), 'accountant', company_id));

CREATE POLICY "Users can insert own company invoice settings"
  ON public.customer_invoice_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner', company_id) OR public.has_role(auth.uid(), 'cfo', company_id));

CREATE POLICY "Users can update own company invoice settings"
  ON public.customer_invoice_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner', company_id) OR public.has_role(auth.uid(), 'cfo', company_id));

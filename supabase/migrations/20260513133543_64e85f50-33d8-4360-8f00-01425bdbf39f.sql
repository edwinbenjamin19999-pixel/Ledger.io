
ALTER TABLE public.invoice_reminder_settings
  ADD COLUMN IF NOT EXISTS days_until_third_reminder integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS late_payment_interest_rate numeric(5,2) NOT NULL DEFAULT 11.00,
  ADD COLUMN IF NOT EXISTS reminder_email_subject_3 text DEFAULT 'Inkassovarsel: Faktura förfallen för betalning',
  ADD COLUMN IF NOT EXISTS reminder_template_1 text DEFAULT 'Hej,

Vi vill bara påminna om att faktura {invoice_number} på {amount} förföll {due_date}. Det är möjligt att den missats — kan du vänligen se till att den betalas snarast?

Hör av dig om något är oklart.

Vänliga hälsningar
{company_name}',
  ADD COLUMN IF NOT EXISTS reminder_template_2 text DEFAULT 'Hej,

Faktura {invoice_number} på {amount} är nu {days_overdue} dagar förfallen. Vi ber dig betala snarast för att undvika ytterligare påminnelseavgifter och dröjsmålsränta ({interest_rate}% årlig ränta).

Kontakta oss om det finns några oklarheter.

Med vänlig hälsning
{company_name}',
  ADD COLUMN IF NOT EXISTS reminder_template_3 text DEFAULT 'Inkassovarsel

Trots tidigare påminnelser har faktura {invoice_number} på {amount}, som förföll {due_date}, ännu inte betalats. Beloppet är nu {days_overdue} dagar förfallet.

Detta är en formell påminnelse enligt inkassolagen (1974:182). Om full betalning inte är oss tillhanda inom 8 dagar från detta brevs datum kommer ärendet att överlämnas till inkasso, vilket medför ytterligare kostnader.

Betala omgående till uppgivet konto.

{company_name}';

-- Update defaults so future rows use 3/14/30 timing
ALTER TABLE public.invoice_reminder_settings
  ALTER COLUMN days_until_first_reminder SET DEFAULT 3,
  ALTER COLUMN days_until_second_reminder SET DEFAULT 14;

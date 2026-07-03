-- Create table for service agreements (templates)
CREATE TABLE public.service_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for signed agreements
CREATE TABLE public.user_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES public.service_agreements(id),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  signed_at TIMESTAMPTZ,
  signature_method TEXT, -- 'bankid', 'electronic', 'manual'
  bankid_transaction_id TEXT,
  bankid_personal_number TEXT,
  bankid_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'signed', 'expired', 'revoked'
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, agreement_id)
);

-- Enable RLS
ALTER TABLE public.service_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_agreements (public read for active agreements)
CREATE POLICY "Anyone can view active agreements"
  ON public.service_agreements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only system can manage agreements"
  ON public.service_agreements FOR ALL
  USING (auth.role() = 'service_role');

-- RLS policies for user_agreements
CREATE POLICY "Users can view own agreements"
  ON public.user_agreements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own agreements"
  ON public.user_agreements FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending agreements"
  ON public.user_agreements FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

-- Insert the initial service agreement
INSERT INTO public.service_agreements (version, title, content, effective_date) VALUES (
  '1.0',
  'NorthLedger Tjänsteavtal',
  E'TJÄNSTEAVTAL FÖR NORTHLEDGER

Version 1.0 - Giltigt från 2024-01-01

1. AVTALSPARTER
Detta avtal ("Avtalet") ingås mellan:
- NorthLedger AB, org.nr 559XXX-XXXX ("NorthLedger" eller "Leverantören")
- Undertecknad användare och/eller företag ("Kunden")

2. TJÄNSTEBESKRIVNING
NorthLedger tillhandahåller en molnbaserad bokföringsplattform med AI-stöd som inkluderar:
- Automatiserad bokföring och kategorisering
- Fakturering och fakturahantering
- Bank- och kontokopplingar
- Rapportering och analys
- Integration med Skatteverket för AGI och momsdeklarationer

3. AVTALSTID OCH UPPSÄGNING
3.1 Avtalet gäller tillsvidare från undertecknandet.
3.2 Båda parter kan säga upp avtalet med 30 dagars varsel.
3.3 Vid uppsägning har Kunden rätt att exportera sin data under 90 dagar.

4. PRISER OCH BETALNING
4.1 Aktuella priser framgår av NorthLedger:s prislista.
4.2 Betalning sker månadsvis i förskott.
4.3 Vid utebliven betalning kan tjänsten stängas av efter påminnelse.

5. KUNDENS ANSVAR
5.1 Kunden ansvarar för att uppgifter som lämnas är korrekta.
5.2 Kunden ansvarar för att granska och godkänna AI-genererade bokföringsförslag.
5.3 Kunden ansvarar för att behöriga personer har tillgång till tjänsten.

6. NORTHLEDGER:S ANSVAR
6.1 NorthLedger garanterar 99.5% tillgänglighet på årsbasis.
6.2 NorthLedger ansvarar för säker datalagring enligt GDPR.
6.3 NorthLedger är skyldig att meddela Kunden vid säkerhetsincidenter.

7. ANSVARSBEGRÄNSNING
7.1 NorthLedger:s totala ansvar begränsas till avgifter betalda under senaste 12 månaderna.
7.2 NorthLedger ansvarar inte för indirekta skador eller följdskador.
7.3 AI-genererade förslag är just förslag - slutligt ansvar ligger hos Kunden.

8. IMMATERIELLA RÄTTIGHETER
8.1 NorthLedger behåller alla rättigheter till plattformen och tekniken.
8.2 Kunden behåller alla rättigheter till sin data.
8.3 NorthLedger får använda anonymiserad data för att förbättra tjänsten.

9. SEKRETESS OCH DATASKYDD
9.1 NorthLedger behandlar personuppgifter enligt GDPR och vår integritetspolicy.
9.2 Kunddata lagras inom EU/EES.
9.3 NorthLedger är personuppgiftsbiträde åt Kunden för bokföringsdata.

10. FORCE MAJEURE
Parterna är befriade från ansvar vid omständigheter utanför deras kontroll.

11. ÄNDRINGAR
11.1 NorthLedger kan uppdatera detta avtal med 30 dagars varsel.
11.2 Väsentliga ändringar kräver nytt godkännande.

12. TVISTER
Eventuella tvister ska avgöras enligt svensk lag vid Stockholms tingsrätt.

---

Genom att signera detta avtal bekräftar Kunden att de har läst, förstått och accepterar villkoren.

NorthLedger AB
support@northledger.se
www.northledger.se',
  CURRENT_DATE
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_agreements_updated_at
  BEFORE UPDATE ON public.user_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_agreements_updated_at
  BEFORE UPDATE ON public.service_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
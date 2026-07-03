# Systemgenomgång - Flödesanalys och Säkerhetsgranskning

**Datum**: 2025-10-29  
**Syfte**: Komplett granskning av alla systemflöden, automatiska processer och säkerhetskrav

---

## SAMMANFATTNING

### ✅ FUNGERAR BRA:
- Fakturagenerering och utskick
- AI-dokumentanalys och bokföring
- Autentisering och säkerhet
- Email-funktioner (fakturor, lönespecifikationer)
- Bank-integration med Enable Banking
- **Automatisk bokföring av inkommande betalningar på kundfakturor** ✅ FIXAT
- **KYC (Know Your Customer)** ✅ IMPLEMENTERAT
- **Session timeout (30 min inaktivitet)** ✅ IMPLEMENTERAT
- **Revisionslogg (audit log viewer)** ✅ IMPLEMENTERAT
- **Faktura betalningsspårning med förseningsindikator** ✅ IMPLEMENTERAT

### ✅ TIDIGARE KRITISKA BRISTER - NU ÅTGÄRDADE:
1. ~~**Ingen automatisk bokföring av inkommande betalningar på kundfakturor**~~ → ✅ FIXAT i `categorize-transaction`
2. ~~**KYC (Know Your Customer) saknas helt**~~ → ✅ IMPLEMENTERAT med BankID, Bolagsverket, sanktionskontroll
3. ~~**Betalningar matchas men bokförs inte**~~ → ✅ Journal entry skapas automatiskt

---

## 1. FAKTURA-FLÖDEN

### 1.1 Skapa Faktura ✅ FUNGERAR
**Flöde:**
1. Användare fyller i fakturadataformulär i `InvoiceForm.tsx`
2. Validering av kundinformation och fakturaraderna
3. Faktura skapas med status `draft` i `invoices` tabell
4. Fakturaraderna skapas i `invoice_lines` tabell

**Bokföring:** Ingen bokföring sker vid detta steg ✅ KORREKT

**Kod:** 
- Frontend: `src/components/invoices/InvoiceForm.tsx` (rad 114-163)
- Validering finns för e-post, belopp, etc.

---

### 1.2 Skicka Faktura ✅ FUNGERAR KORREKT
**Flöde:**
1. Användare klickar "Skicka" på en draft-faktura
2. Edge function `send-invoice` anropas
3. **AUTOMATISK BOKFÖRING SKAPAS:**
   ```
   Debet: 1510 (Kundfordringar)  - Totalt belopp inkl moms
   Kredit: 3000 (Försäljning)     - Belopp exkl moms
   Kredit: 2610 (Utgående moms)   - Momsbelopp
   ```
4. PDF genereras med `pdf-lib`
5. Email skickas via Resend till kund
6. Faktura status → `sent`
7. `sent_at` timestamp uppdateras
8. `journal_entry_id` kopplas till verifikatet

**Kod:**
- Edge function: `supabase/functions/send-invoice/index.ts`
- Verifikat skapas rad 73-84
- Konton skapas automatiskt om de saknas (rad 93-129)
- PDF-generering rad 240-479

**Säkerhet:**
✅ Autentisering krävs
✅ RLS policies kontrollerar åtkomst
✅ Endast draft-fakturor kan skickas (rad 68-70)

---

### 1.3 Betalning av Kundfaktura ✅ FIXAT

**VAD SOM HÄNDER NU:**
1. Banktransaktion hämtas från Enable Banking
2. AI-matchning kör (`categorize-transaction`)
3. Transaktionen matchas mot faktura baserat på belopp/motpart
4. `matched_invoice_id` sätts i `bank_transactions`
5. **Automatisk bokföring skapas:**
   ```sql
   Debet:  1930 (Företagskonto/Bank)  - Inbetalat belopp
   Kredit: 1510 (Kundfordringar)      - Inbetalat belopp
   ```
6. Fakturan uppdateras till status `paid`
7. Journal entry kopplas till fakturan

**Kod:**
- Edge function: `supabase/functions/categorize-transaction/index.ts` (rad 382-437)

---

### 1.4 Inkommande Leverantörsfakturor ✅ FUNGERAR
**Flöde:**
1. Dokument (PDF/bild) laddas upp via `SimplifiedUpload.tsx`
2. Sparas i storage bucket `documents`
3. AI-analys körs automatiskt (`ai-process-document`)
4. **AUTOMATISK BOKFÖRING SKAPAS:**
   ```
   Debet: 6XXX (Kostnadskonto)         - Belopp exkl moms
   Debet: 2640 (Ingående moms)         - Momsbelopp
   Kredit: 2611 (Leverantörsskulder)   - Totalt belopp
   ```
5. Verifikat skapas med status `approved` om confidence > 95%
6. Annars status `pending_approval` för manuell granskning

**Validering:**
✅ Debet = Kredit kontrolleras
✅ Giltig momssats (0, 6, 12, 25%)
✅ Momsberäkning verifieras
✅ BAS 2025 kontonummer valideras

**Kod:**
- Edge function: `supabase/functions/ai-process-document/index.ts`
- Validering: rad 12-57
- AI-modell: `google/gemini-2.5-pro` med bildanalys
- Self-correction: Upp till 2 försök om validering misslyckas

---

## 2. EMAIL-FUNKTIONER

### 2.1 Faktura-Email ✅ FUNGERAR
- **Från:** Company email eller `NorthLedger <faktura@northledger.se>`
- **Till:** Kund-email från faktura
- **Bifogad:** PDF-faktura
- **API:** Resend
- **Validering:** Customer email måste finnas

### 2.2 Lönespec-Email ✅ FUNGERAR
- **Från:** `NorthLedger <noreply@northledger.se>`
- **Till:** Anställds email
- **Bifogad:** PDF-lönespecifikation
- **API:** Resend
- **Edge function:** `send-payroll-slip/index.ts`

**Säkerhet:**
✅ RESEND_API_KEY lagras som secret
✅ Endast authorized användare kan skicka
✅ Employee email valideras

---

## 3. AUTENTISERING & SÄKERHET

### 3.1 Signup Flow ✅ FUNGERAR KORREKT
**Flöde:**
1. Användare fyller i formulär (förnamn, efternamn, email, lösenord)
2. Zod-validering körs (`signUpSchema`)
3. Email valideras (format, max 255 tecken)
4. Lösenord valideras (min 8 tecken, max 100 tecken)
5. `supabase.auth.signUp()` anropas
6. `emailRedirectTo` sätts till `/dashboard`
7. User metadata sparas (first_name, last_name)
8. Profil skapas automatiskt via trigger `handle_new_user()`
9. Default company skapas via trigger `create_default_company_for_new_user()`
10. User får owner-roll på sitt företag

**Kod:**
- `src/pages/Auth.tsx` (rad 41-91)
- Schema: `src/lib/schemas/auth.ts`
- Trigger: DB function `handle_new_user()` & `create_default_company_for_new_user()`

**Säkerhet:**
✅ Lösenord hashas av Supabase Auth
✅ Email verification (bör aktiveras i produktion)
✅ Input sanitering via Zod
✅ Rate limiting via Supabase

---

### 3.2 Login Flow ✅ FUNGERAR
**Flöde:**
1. Email + lösenord valideras
2. `supabase.auth.signInWithPassword()` anropas
3. Session skapas och lagras i localStorage
4. User redirectas till `/dashboard`

**Error Handling:**
✅ "Invalid login credentials" → "Felaktig e-postadress eller lösenord"
✅ Redan registrerad → Tydligt felmeddelande

---

### 3.3 Password Reset ✅ FUNGERAR
**Flöde:**
1. User anger email
2. `resetPasswordForEmail()` skickar recovery link
3. User klickar på länk → `/auth?type=recovery`
4. Nytt lösenord anges
5. User loggas ut och måste logga in igen (SÄKERHETSÅTGÄRD)

---

### 3.4 Session Management ✅ KORREKT
**Implementation i `useAuth.tsx`:**
```typescript
// Korrekt ordning:
1. Sätt upp auth state listener FÖRST
2. Sedan hämta existing session
3. Cleanup vid unmount
```

**Säkerhet:**
✅ Session lagras säkert
✅ Auto refresh token
✅ Persistent session över siduppdateringar

---

## 4. BANK-INTEGRATIONER

### 4.1 Koppla Bank ✅ FUNGERAR
**Flöde:**
1. User väljer bank (Swedbank, SEB, Nordea, etc.)
2. `create-bank-requisition` edge function anropas
3. GoCardless requisition skapas
4. User redirectas till bank för BankID-inloggning
5. Efter godkännande → callback till `handle-bank-callback`
6. Bank account skapas i `bank_accounts` tabell
7. `requisition_id` och `bank_connection_id` sparas

**Kod:**
- Frontend: `src/components/bank/BankLinking.tsx`
- Edge function: `create-bank-requisition/index.ts`
- Callback: `handle-bank-callback/index.ts`

**Säkerhet:**
✅ PSD2-kompatibel
✅ GOCARDLESS_ACCESS_TOKEN som secret
✅ OAuth-flow via BankID

---

### 4.2 Hämta Transaktioner ✅ FUNGERAR
**Flöde:**
1. User klickar "Synka" på bankkonto
2. `fetch-bank-transactions` anropas
3. GoCardless API hämtar booked transactions
4. Transaktioner sparas i `bank_transactions`
5. `last_synced_at` uppdateras
6. Duplicates hanteras via `onConflict: 'transaction_id'`

**Kod:**
- Edge function: `fetch-bank-transactions/index.ts`

---

### 4.3 AI-Matchning av Transaktioner ✅ FUNGERAR
**Flöde:**
1. Transaction hämtas från DB
2. Chart of accounts hämtas
3. Matching rules kontrolleras först (regelbaserad matchning)
4. Om ingen regel → AI-analys med Lovable AI
5. AI föreslår konto baserat på:
   - Transaktionsbeskrivning
   - Motpart
   - Belopp
   - Tidigare transaktioner (mönsterigenkänning)
6. `suggested_account_id` uppdateras
7. Confidence score + förklaring sparas

**Kod:**
- Edge function: `match-bank-transaction/index.ts` (rad 79-236)
- AI-modell: `google/gemini-2.5-flash`
- Detailed explanation med warnings & suggestions

---

### 4.4 Kategorisera & Matcha Faktura ✅ FUNGERAR FULLT UT
**Flöde:**
1. `categorize-transaction` anropas
2. AI analyserar transaktion
3. Kollar om den matchar någon pending/sent invoice
4. Om match hittas:
   - `matched_invoice_id` sätts
   - Status → `matched`
   - **Automatisk bokföring skapas** ✅
   - **Fakturan uppdateras till `paid`** ✅

**Kod:**
- Edge function: `categorize-transaction/index.ts` (rad 382-437)

---

## 5. KYC (KNOW YOUR CUSTOMER) ✅ IMPLEMENTERAT

### 5.1 Implementerad funktionalitet
- **KYC Onboarding** (`src/components/kyc/KYCOnboarding.tsx`) - 754 rader
- **BankID-verifiering** via Signicat (`src/components/kyc/BankIDVerification.tsx`)
- **Sanktionskontroll** (`supabase/functions/sanctions-check/index.ts`)
- **Bolagsverket-integration** för företagsverifiering
- **UBO-identifiering** (ägarstruktur >25%)
- **Automatisk redirect** till KYC om ej slutförd
- **KYC-status** spåras i `companies.kyc_status`

---

### 5.2 KYC UI-Flöde (Implementerat)
- **Steg 1**: Org-nummer → Automatisk hämtning från Bolagsverket/Firecrawl
- **Steg 2**: BankID-verifiering via Signicat
- **Steg 3**: Ägarstruktur (UBO) automatisk identifiering
- **Steg 4**: Sanktionskontroll
- **Steg 5**: KYC-status sätts till `approved`

---

## 6. ÖVRIGA FUNKTIONER

### 6.1 AI-Dokumentanalys ✅ EXCELLENT
- Hög precision med Gemini 2.5 Pro
- Bildanalys av kvitton/fakturor
- Self-correction vid valideringsfel
- Auto-approval vid hög confidence
- Lärande från tidigare korrigeringar

### 6.2 Journal Entry Validation ✅ FUNGERAR
- Debet = Kredit kontroll
- VAT validering
- Account number validation
- BAS 2025 compliance

### 6.3 RLS Policies ✅ SÄKRA
- Company-based access control
- Role-based permissions (owner, accountant, auditor)
- User can only see their companies' data

---

## 7. ÅTGÄRDSLISTA (PRIORITERAD) — UPPDATERAD 2026-03-29

### 🔴 KRITISKA — ✅ ALLA ÅTGÄRDADE:

1. ~~**Automatisk bokföring av kundfaktura-betalningar**~~ → ✅ FIXAT
   - Journal entry skapas automatiskt i `categorize-transaction`
   - Faktura status uppdateras till `paid`
   - Bokföring: Bank (debet) / Kundfordringar (kredit)

2. ~~**Implementera KYC-funktionalitet**~~ → ✅ IMPLEMENTERAT
   - KYC Onboarding med BankID
   - Bolagsverket-integration
   - Sanktionskontroll
   - UBO-identifiering

### 🟡 VIKTIGA — ✅ ÅTGÄRDADE:

3. ~~**Invoice Payment Tracking**~~ → ✅ FÖRBÄTTRAT
   - Förseningsindikator (dagar försenad) på fakturalistan
   - Betaldatum visas på betalda fakturor
   - Påminnelser via `process-invoice-reminders` (cron)

4. ~~**Transaction Journal Entry Creation**~~ → ✅ FIXAT
   - Verifikat skapas automatiskt vid AI-kategorisering
   - `bank_transaction` kopplas till `journal_entry`

5. **Email Configuration** → ⚠️ Produktionskonfiguration
   - `notify.northledger.se` konfigurerat via Resend
   - Eget domän stöd kräver ytterligare DNS-setup

### 🟢 FÖRBÄTTRINGAR — ✅ ÅTGÄRDADE:

6. ~~**Advanced AI Suggestions**~~ → ✅ IMPLEMENTERAT
   - AI lär av `ai_feedback`-tabellen
   - Proaktiva insikter via `proactive-insights`
   - Varningar för likviditet, utgiftsspikes, moms-deadline

7. ~~**Audit Log**~~ → ✅ IMPLEMENTERAT
   - Revisionslogg UI på `/audit-log`
   - GDPR-compliance med `audit_events`-tabell
   - CSV-export för revision
   - Tillgänglig via sidomenyn

---

## 8. TESTRESULTAT

### ✅ TESTADE OCH FUNGERAR:
- [x] Faktura skapas korrekt
- [x] Faktura skickas och bokförs automatiskt
- [x] PDF genereras korrekt
- [x] Email skickas via Resend
- [x] Auth signup/login/reset
- [x] Bank linking via Enable Banking
- [x] Transaction fetching
- [x] AI document analysis
- [x] Journal entry validation
- [x] Automatisk bokföring av kundfaktura-betalningar
- [x] Faktura status uppdateras till "paid" vid betalning
- [x] KYC-funktionalitet (BankID, sanktionskontroll, UBO)
- [x] Session timeout (30 min inaktivitet)
- [x] Revisionslogg med CSV-export

### ⚠️ EJ TESTADE (BEHÖVER VERIFIERAS):
- [ ] Payroll AGI submission
- [ ] PEPPOL e-invoice
- [ ] Depreciation calculations
- [ ] Multi-company consolidation

---

## 9. SÄKERHETSANALYS

### ✅ BRA SÄKERHET:
- Strong password validation
- Email verification flow
- RLS policies på alla tabeller
- Input sanitering med Zod
- Secrets management (RESEND_API_KEY, ENABLE_BANKING keys)
- Auth state management korrekt implementerad
- CORS headers korrekt
- **Session timeout efter 30 min inaktivitet** ✅ NY
- **Rate limiting via `check_rate_limit()` funktion** ✅
- **Audit log med GDPR-compliance** ✅ NY
- **KYC/AML compliance implementerat** ✅ NY

### ⚠️ KVARVARANDE FÖRBÄTTRINGSOMRÅDEN:
- Email verification bör aktiveras i produktion
- Two-factor authentication bör övervägas
- Security headers (CSP, HSTS) — hanteras av hosting-plattform

---

## 10. SLUTSATS

### ✅ ALLA KRITISKA BRISTER ÄR ÅTGÄRDADE

Systemet är nu produktionsredo med avseende på:
1. **Betalningar på kundfakturor bokförs automatiskt** ✅
2. **KYC implementerat med BankID och sanktionskontroll** ✅
3. **Session timeout för säkerhet** ✅
4. **Revisionslogg för compliance** ✅
5. **Förbättrad betalningsspårning på fakturor** ✅

### Kvarvarande produktionssteg:
- Aktivera email verification
- Konfigurera Stripe i live-läge
- Verifiera Enable Banking i produktion
- Slutföra Skatteverket produktionscredentials

---

**Granskad av:** AI System Auditor  
**Senast uppdaterad:** 2026-03-29  
**Status:** ✅ GODKÄND — Alla kritiska åtgärder genomförda

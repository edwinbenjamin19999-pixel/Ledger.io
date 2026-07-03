# Automatiska Skatteregler - NorthLedger

## Översikt

NorthLedger använder ett dynamiskt system för skatteberäkningar där alla skatteregler lagras i databasen istället för att vara hårdkodade. Detta innebär att systemet automatiskt kan uppdateras när Skatteverket publicerar nya regler utan att kräva kodändringar.

## Så fungerar det

### 1. Databas-struktur

Alla skatteregler lagras i tabellen `tax_rules` med följande struktur:

```sql
CREATE TABLE tax_rules (
  id UUID PRIMARY KEY,
  year INTEGER NOT NULL,                    -- Skatteår (2024, 2025, etc.)
  rule_type TEXT NOT NULL,                  -- Typ av regel (se nedan)
  municipality TEXT,                        -- Kommun (för kommunalskatt)
  rate DECIMAL(10, 6),                      -- Procentsats (t.ex. 0.3012 för 30,12%)
  threshold_min DECIMAL(12, 2),             -- Minimum tröskel (kr)
  threshold_max DECIMAL(12, 2),             -- Maximum tröskel (kr)
  formula_a DECIMAL(10, 6),                 -- Formel parameter A
  formula_b DECIMAL(10, 6),                 -- Formel parameter B
  effective_from DATE NOT NULL,             -- Datum då regeln börjar gälla
  effective_until DATE,                     -- Datum då regeln slutar gälla (optional)
  notes TEXT                                -- Anteckningar
);
```

### 2. Regeltyper (rule_type)

#### a) `basic_allowance` - Grundavdrag
Beräknas med formel: `formula_a + (formula_b * årsinkomst)`, max `rate`

**Exempel 2025:**
- Formel: 15 300 kr + 29,3% av årsinkomst
- Max: 68 300 kr

#### b) `state_tax` - Statlig inkomstskatt
Procentsats på inkomst över tröskelvärde

**Exempel 2025:**
- Rate: 20% (0.20)
- Threshold: 615 300 kr

#### c) `social_fees` - Arbetsgivaravgifter
Procentsats för arbetsgivarens sociala avgifter

**Exempel 2025:**
- Rate: 31,42% (0.3142)

#### d) `municipal_tax` - Kommunalskatt
Kommunal skattesats inkl. landsting/region

**Exempel 2025:**
- Stockholm: 30,12% (0.3012)
- Göteborg: 32,77% (0.3277)
- Malmö: 32,60% (0.3260)

#### e) `tax_table_XX` - Skattetabeller
Inkomsttrösklar för olika skattetabeller

**Exempel 2025:**
- `tax_table_30`: 0 - 150 000 kr
- `tax_table_31`: 150 000 - 250 000 kr
- `tax_table_33`: 350 000 - 450 000 kr
- ...och så vidare

### 3. Automatisk skatteberäkning

När en lönekörning skapas:

1. **Systemet hämtar aktuellt år** baserat på serverns datum
2. **Läser skatteregler från databasen** för det aktuella året
3. **Beräknar skatt baserat på:**
   - Anställdas kommun (kommunalskatt)
   - Årsinkomst (grundavdrag, skattetabell, statlig skatt)
   - Ålder (olika tabeller för 65+)

**Kod-exempel från `generate-payroll-lines`:**
```typescript
const year = getCurrentTaxYear(); // 2025
const municipalRule = await getTaxRules(supabase, year, 'municipal_tax', 'stockholm');
const municipalTaxRate = municipalRule.rate; // 0.3012
```

## Uppdatera till nya skatteregler

### När Skatteverket publicerar nya regler (t.ex. för 2026):

#### Steg 1: Lägg till nya regler i databasen

**SQL-exempel för 2026 års regler:**

```sql
-- Grundavdrag 2026
INSERT INTO tax_rules (year, rule_type, formula_a, formula_b, effective_from, notes)
VALUES (2026, 'basic_allowance', 15800, 0.293, '2026-01-01', 'Grundavdrag 2026');

INSERT INTO tax_rules (year, rule_type, rate, threshold_min, effective_from)
VALUES (2026, 'basic_allowance', 70500, 380000, '2026-01-01', 'Max grundavdrag 2026');

-- Statlig skatt 2026
INSERT INTO tax_rules (year, rule_type, rate, threshold_min, effective_from)
VALUES (2026, 'state_tax', 0.20, 630000, '2026-01-01', 'Statlig inkomstskatt 2026');

-- Arbetsgivaravgifter 2026
INSERT INTO tax_rules (year, rule_type, rate, effective_from)
VALUES (2026, 'social_fees', 0.3142, '2026-01-01', 'Arbetsgivaravgifter 2026');

-- Kommunalskatt 2026 (Stockholm)
INSERT INTO tax_rules (year, rule_type, municipality, rate, effective_from)
VALUES (2026, 'municipal_tax', 'stockholm', 0.3065, '2026-01-01', 'Stockholm 2026');
```

#### Steg 2: Ingen kodändring krävs!

Från och med 2026-01-01 använder systemet automatiskt de nya reglerna. Alla lönekörningar som skapas efter det datumet får rätt skatt beräknat.

#### Steg 3: Verifiera i UI

Gå till **Skatteregler**-sidan i NorthLedger för att se alla regler och verifiera att de är korrekta.

## Fördelar med detta system

✅ **Ingen kodändring krävs** när skatteregler ändras
✅ **Automatisk växling** mellan olika års regler baserat på datum
✅ **Historik bevaras** - gamla lönekörningar behåller sina ursprungliga beräkningar
✅ **Transparent** - alla regler synliga i UI
✅ **Flexibelt** - lätt att lägga till nya kommuner eller regeltyper
✅ **Testbart** - enkelt att testa framtida regler genom att ändra datum

## Var sker beräkningarna?

### Edge Functions som använder skattereglerna:

1. **`lookup-person`** - Föreslår skattetabell baserat på personnummer, lön och kommun
2. **`generate-payroll-lines`** - Beräknar faktisk skatt för lönekörning

### Kod-platser:

- **Databas:** `supabase/migrations/` - tax_rules tabell
- **Backend:** `supabase/functions/generate-payroll-lines/index.ts`
- **Backend:** `supabase/functions/lookup-person/index.ts`
- **Frontend:** `src/pages/TaxRules.tsx` - UI för att visa regler
- **Frontend:** `src/pages/HR.tsx` - Anställdas skattetabell-val

## Fallback-system

Om databasen inte kan nås eller regler saknas för ett visst år, har systemet inbyggda fallback-värden för 2025:

```typescript
// Fallback om databas-lookup misslyckas
basicAllowance = Math.min(
  15300 + 0.293 * annualSalary, 
  68300
);
municipalTaxRate = 0.32; // Nationellt genomsnitt
```

Detta garanterar att systemet alltid fungerar även vid databasproblem.

## FAQ

### Q: Vad händer när vi byter år från 2025 till 2026?
**A:** Från och med 2026-01-01 hämtar systemet automatiskt 2026 års regler. Ingen åtgärd krävs förutom att reglerna måste finnas i databasen.

### Q: Påverkas gamla lönekörningar?
**A:** Nej, gamla lönekörningar behåller sina ursprungliga beräknade värden. Endast nya lönekörningar använder de nya reglerna.

### Q: Hur lägger jag till en ny kommun?
**A:** Kör bara en INSERT-sats:
```sql
INSERT INTO tax_rules (year, rule_type, municipality, rate, effective_from, notes)
VALUES (2025, 'municipal_tax', 'karlstad', 0.3250, '2025-01-01', 'Karlstad kommun + region');
```

### Q: Kan jag ändra en befintlig regel?
**A:** Ja, men rekommendationen är att sätta `effective_until` på den gamla regeln och skapa en ny regel med `effective_from` från ändringsdatumet. Detta bevarar historiken.

### Q: Var kan jag hitta aktuella skattesatser?
**A:** Skatteverkets webbplats: https://skatteverket.se/privat/skatter/arbeteochinkomst/skattetabeller.4.18e1b10334ebe8bc80007746.html

## Kontakt

För frågor eller support kring skatteregler, kontakta NorthLedger support.

---

**Senast uppdaterad:** 2025-01-28
**Version:** 1.0

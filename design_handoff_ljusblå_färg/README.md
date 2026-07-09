# Handoff: Ljusblå färgriktning (ersätter mörk navy)

## Overview
Byter Cogniqs mörka navy-ytor (`--c-hero-navy: #0B1D2A`, `--c-sidebar: #0F172A`) mot den befintliga brand-blå (`--c-brand: #0052FF`) kombinerad med vitt, i tre ytor: marketing-hero (hemsidan), en ny login-sida, och den inloggade plattformens sidebar/topbar/dashboard. Den godkända riktningen är **"E — Blandning, medveten balans"**: chrome (sidebar/topbar) förblir mest vitt för läsbarhet i den täta appen, men blått väger tydligt i hero-panelen, login-bandet och en nyckeltalscard. Ingen yta blir helt blå eller helt vit.

## About the design files
Filerna i denna mapp (`Ljusblå riktning - 4 förslag.html` / standalone-versionen) är **designreferenser byggda i HTML** — statiska mockups som visar avsett utseende, inte produktionskod att kopiera in rakt av. Uppgiften är att **återskapa förslag E i den riktiga Cogniq-kodbasen** (React + Vite + Tailwind + shadcn/ui, enligt `github.com/edwinbenjamin19999-pixel/Cogniq`) med dess befintliga komponenter, tokens och mönster — inte att klistra in HTML:en.

## Fidelity
**Hi-fi.** Exakta hex-värden, typografi och mått anges nedan. Layout/struktur (flex-splittar, kolumnbredder) är avsiktliga och ska följas; pixel-exakta koordinater i mockupen (byggd på en 1600px-canvas) ska tolkas proportionellt/responsivt i den riktiga appen, inte hårdkodas.

## Screens / views

### 1. Marketing hero (hemsidan)
- **Layout:** två kolumner, flex row. Vänster: fast innehållskolumn (~38–40% bredd) på vit bakgrund — logga, rubrik, brödtext, två CTA-knappar. Höger: fyller resten, rundad blå panel (`background:#0052FF; border-radius:20px`) med marginal runt, innehållande ett flytande vitt "produkt-preview"-kort (`border-radius:12px`, mjuk skugga) med 2 nyckeltalsrutor.
- **Logga:** Sigill-C-märket, mörk variant (`assets/cogniq-mark.svg`) — den ligger på vit botten.
- **Rubrik:** "Sluta bokföra. Börja driva." — ordet **"driva."** i brand-blå (`#0052FF`), resten i `--c-text-1` (`#0F172A`). Instrument Sans, ~38px/700, letter-spacing -0.02em.
- **Brödtext:** "Kom igång på minuter. Cogniq migrerar din historik gratis." Inter, 16px, `--c-text-2` (`#475569`).
- **Knappar:** Primär "Kom igång gratis" — bg `#0052FF`, text vit, height 44px, radius 10px. Sekundär "Boka demo" — bg vit, border 1.5px `#E2E8F0`, text `--c-text-1`.
- **Produkt-preview-kortet:** vitt kort i den blå panelen med 2 rutor: en neutral (`#F8FAFB` bg) och en solid blå (`#0052FF` bg, vit text) — samma "en tydlig blå ruta bland vita" -regel som återkommer i dashboarden.

### 2. Login-sida (ny — finns inte i nuvarande app)
- **Layout:** kort delat i två, flex row. Vänster panel `flex: 0 0 38%`, bg `#0052FF`, padding ~26px; innehåller loggan (ljus variant, `assets/cogniq-mark-light.svg`) upptill och citatet **"Bokföring som redan är gjord."** (vit, 14px/600) fixerat nedtill. Höger panel `flex: 1`, vit bakgrund, centrerat formulär.
- **Formulär:** rubrik "Logga in" (20px/600), undertext "Välkommen tillbaka" (13px, `#64748B`). Fält "E-post" och "Lösenord" — label 12px/600 `#475569`, input height 42–46px, border 1.5px `#E2E8F0`, radius 10px, placeholder `#94A3B8`. Primärknapp "Logga in" — full bredd, bg `#0052FF`, vit text, height 42px. Länk "Glömt lösenord?" — 12px/600, brand-blå.

### 3. Inloggad plattform (dashboard-shell)
- **Sidebar:** vit bakgrund (byte från nuvarande `--c-sidebar: #0F172A`), `border-right: 1px solid #E2E8F0`, bredd ~220–264px. Logga (mörk variant) upptill. Nav-grupper och etiketter **måste matcha befintlig IA exakt** — ändra bara färgbehandlingen, inte innehållet:
  - **AI & automatisering:** AI Ekonom, AI Bokförare, Styrelseläge, AI-aktivitetslogg
  - **Gör:** Kundfakturor, Kundreskontra, Utlägg, Kassaregister
  - **Granska:** Leverantörsfakturor, Att godkänna, Bankavstämning, Avvikelser & risk
  - **Förstå:** Resultat & balans, Kassaflöde, KPI:er & nyckeltal, Årsredovisning
  - **Skatt & deklaration:** Momssammanställning, Skatteberäkning, RUT/ROT-avdrag
  - **Aktivt nav-item:** solid brand-blå fyllning (`#0052FF`, vit text/ikon) — en medveten skärpning jämfört med dagens tonade `rgba(0,82,255,.18)` + vänsterkant-stil, eftersom sidebaren nu är vit och behöver ett tydligare blått ankare.
  - **Inaktiva items:** `--c-text-2` text, ikoner `#CBD5E1`/`currentColor`.
- **Topbar:** vit bakgrund, `border-bottom: 1px solid #E2E8F0`, height ~56–60px. Vänster: sidtitel (14px/600). Höger: primärknapp `#0052FF` "+ Ny faktura".
- **KPI-rad:** 3 kort i grid. Två neutrala vita kort (border `#E2E8F0`) för t.ex. Intäkter/Kostnader, **ett solitt blått kort** (`#0052FF` bg, vit text) för Resultat — samma "ett tydligt blått kort bland vita" -regel som i hero-previewn.
- **Kassaflödesdiagram:** oförändrat — vitt kort, staplar i `#DBEAFE` (majoritet) med 1–2 toppstaplar i `#0052FF`.

## Interactions & behavior
- Inga nya interaktionsmönster — återanvänd befintliga hover/active-beteenden från `AppSidebar`/`AppShell`, men uppdatera färgvärdena:
  - Nav-item hover: byt från `rgba(255,255,255,.06)` (mörk sidebar) till en ljus toning, t.ex. `--c-surface-hover` (`#F1F5F9`) eller `--c-brand-tint` (`#EFF6FF`).
  - Nav-item active: solid `#0052FF` bg + vit text (se ovan) — ersätter nuvarande tonad bakgrund + vänsterkant.
  - Knapp-hover: `--c-brand-deep` (`#0040CC`), som idag.
- Login-sidan är ny — implementera vanlig e-post/lösenord-formulärvalidering enligt appens befintliga formulärmönster (fält-fel, disabled-state på knapp tills fälten är ifyllda), ingen specifik animation krävs.

## State management
- Ingen ny state utöver det som redan finns i `AppShell` (`active`, `setActive` för vald nav-item) och ett nytt, minimalt login-formulärs state (email, password, loading, error) om det inte redan finns en login-flow i kodbasen.

## Design tokens

| Token | Värde | Användning |
|---|---|---|
| `--c-brand` | `#0052FF` | Primär blå — CTA:er, aktivt nav, blå paneler/kort |
| `--c-brand-deep` | `#0040CC` | Hover/pressed på blått |
| `--c-brand-tint` | `#EFF6FF` | Ljus blå toning (ev. hover-state) |
| `--c-page` | `#F8FAFB` | App-canvas bakom kort |
| `--c-surface` | `#FFFFFF` | Kort/sidebar/topbar bakgrund |
| `--c-border` | `#E2E8F0` | Hairline-kanter |
| `--c-text-1` | `#0F172A` | Primär text |
| `--c-text-2` | `#475569` | Sekundär text |
| `--c-text-3` | `#94A3B8` | Placeholder/tertiär text |
| Font display | `Instrument Sans` | Rubriker, wordmark |
| Font UI | `Inter` | Body/UI-text |
| Font mono | `JetBrains Mono` | Siffror/nyckeltal |

**Ej längre i bruk i dessa ytor:** `--c-hero-navy` (`#0B1D2A`), `--c-sidebar` (`#0F172A`) — ersätts av `--c-brand` + vitt enligt ovan. Rör inte dessa tokens på ytor som INTE ingår i denna ändring (t.ex. om `--c-sidebar` används på andra ställen).

## Assets
- `assets/cogniq-mark.svg` — Sigill-C-märket, mörk variant (för ljusa bakgrunder).
- `assets/cogniq-mark-light.svg` — samma märke, ljus variant (för blå/mörka bakgrunder).
- Ingen ny bildproduktion krävs — allt annat är CSS/layout.

## Files in this bundle
- `Ljusblå riktning - 4 förslag.html` — alla 5 utforskade riktningar (A–E) på en pannbar canvas. **Förslag E är den godkända riktningen.**
- `cogniq-mark.svg`, `cogniq-mark-light.svg` — brand-mark i båda varianterna.

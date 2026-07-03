# NorthLedger

AI-driven redovisnings- och beslutsplattform för svenska företag: automatisk kontering,
koncernkonsolidering, moms/skatt och Skatteverket-integration.

## Teknik

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (Postgres, Auth, Edge Functions) som backend
- **react-i18next** (SV/EN)

## Kom igång

Kräver Node.js och npm (eller bun).

```sh
# Installera beroenden
npm install

# Starta utvecklingsservern (http://localhost:8080)
npm run dev
```

### Miljövariabler

Fyll i dina egna värden i `.env` innan du bygger:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
VITE_PAYMENTS_CLIENT_TOKEN=...
```

Edge functions körs mot Supabase och kräver serverhemligheter (bl.a. `LOVABLE_API_KEY`
för AI-gatewayen, `STRIPE_SECRET_KEY` m.fl.) som konfigureras i Supabase-projektet.

## Skript

| Kommando          | Beskrivning                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Startar utvecklingsservern         |
| `npm run build`   | Produktionsbygge                   |
| `npm run preview` | Förhandsgranskar produktionsbygget |
| `npm run lint`    | Kör ESLint                         |

## Struktur

- `src/` – React-app (komponenter, sidor, hooks, lib)
- `supabase/functions/` – Edge functions (AI, import, betalningar m.m.)
- `supabase/migrations/` – Databasmigrationer
- `public/` – Statiska filer

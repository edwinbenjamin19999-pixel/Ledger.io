/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "NorthLedger"
const BRAND_PRIMARY = '#0891b2' // Cyan brand
const BRAND_NAVY = '#0f1f35'

interface PilotWelcomeProps {
  recipientName?: string
  companyName?: string
  inviteUrl?: string
  expiresAt?: string
  pilotDays?: number
}

const PilotWelcomeEmail = ({
  recipientName = 'Veronika',
  companyName = 'Slipp',
  inviteUrl = 'https://northledger.se',
  expiresAt = '',
  pilotDays = 90,
}: PilotWelcomeProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Välkommen till ditt NorthLedger-pilotkonto för {companyName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Välkommen till {SITE_NAME}, {recipientName}!</Heading>
          <Text style={lead}>
            Ditt pilotkonto för <strong>{companyName}</strong> är förberett.
            Du har full tillgång till plattformen i {pilotDays} dagar – helt utan kostnad.
          </Text>
        </Section>

        <Section style={ctaSection}>
          <Button href={inviteUrl} style={button}>
            Aktivera mitt pilotkonto
          </Button>
          <Text style={smallMuted}>
            Länken är giltig till {expiresAt || 'om 30 dagar'}.
          </Text>
        </Section>

        <Hr style={hr} />

        <Heading as="h2" style={h2}>Så kommer du igång på 5 minuter</Heading>

        <Section style={stepBlock}>
          <Text style={stepNum}>1. Skapa ditt konto</Text>
          <Text style={stepText}>
            Klicka på knappen ovan. Du blir ombedd att registrera dig med din e-post
            ({recipientName ? 'veronika.fermstrand@slipp.se' : 'din e-post'}) och välja ett lösenord.
            När du loggat in kopplas du automatiskt till {companyName} som ägare.
          </Text>
        </Section>

        <Section style={stepBlock}>
          <Text style={stepNum}>2. Onboarding-guiden</Text>
          <Text style={stepText}>
            Vid första inloggningen startar vår onboarding-wizard. Den hjälper dig att:
          </Text>
          <Text style={bullet}>• Bekräfta företagsuppgifter (vi har redan hämtat dem från Bolagsverket)</Text>
          <Text style={bullet}>• Koppla bankkonto via Open Banking (PSD2 / Enable Banking)</Text>
          <Text style={bullet}>• Importera tidigare bokföring via SIE-fil (om du har)</Text>
          <Text style={bullet}>• Aktivera Skatteverket-integration för moms och AGI</Text>
        </Section>

        <Section style={stepBlock}>
          <Text style={stepNum}>3. Utforska plattformen</Text>
          <Text style={stepText}>
            NorthLedger samlar hela ekonomin på ett ställe – AI-bokföring, fakturering,
            CFO-dashboard, lön, skatt och årsredovisning. AI-assistenten finns alltid
            längst ner till höger om du har frågor.
          </Text>
        </Section>

        <Hr style={hr} />

        <Heading as="h2" style={h2}>Vad du kan göra</Heading>
        <Text style={featureItem}><strong>📊 Live CFO-dashboard</strong> – Cash runway, MRR/ARR, KPI:er i realtid</Text>
        <Text style={featureItem}><strong>🤖 AI-bokföring</strong> – Ladda upp kvitton/fakturor, AI bokför automatiskt</Text>
        <Text style={featureItem}><strong>🏦 Bankavstämning</strong> – Automatisk matchning via Open Banking</Text>
        <Text style={featureItem}><strong>📑 Moms & AGI</strong> – Direktkoppling till Skatteverket</Text>
        <Text style={featureItem}><strong>💰 Lön & HR</strong> – Skattetabeller 1–40, automatisk AGI</Text>
        <Text style={featureItem}><strong>📘 Årsredovisning</strong> – K2/K3-mallar med BankID-signering</Text>

        <Hr style={hr} />

        <Heading as="h2" style={h2}>Behöver du hjälp?</Heading>
        <Text style={text}>
          Svara bara på det här mailet, eller använd AI-assistenten i plattformen.
          Vi finns här för att hjälpa dig komma igång.
        </Text>

        <Text style={signature}>
          Hälsningar,<br />
          Teamet på {SITE_NAME}
        </Text>

        <Text style={footer}>
          {SITE_NAME} – Sveriges AI-drivna ekonomiplattform för SMB
          <br />
          <Link href="https://northledger.se" style={link}>northledger.se</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PilotWelcomeEmail,
  subject: (data: Record<string, any>) =>
    `Välkommen till NorthLedger, ${data?.recipientName || 'Veronika'} – ditt pilotkonto är klart`,
  displayName: 'Pilot welcome',
  previewData: {
    recipientName: 'Veronika',
    companyName: 'Slipp',
    inviteUrl: 'https://northledger.se/accept-invitation?token=demo',
    expiresAt: '29 maj 2026',
    pilotDays: 90,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '600px', margin: '0 auto' }
const header = { marginBottom: '24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: BRAND_NAVY, margin: '0 0 12px', lineHeight: '1.3' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: BRAND_NAVY, margin: '24px 0 12px' }
const lead = { fontSize: '15px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 8px' }
const text = { fontSize: '14px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 12px' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: BRAND_PRIMARY, color: '#ffffff', padding: '14px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: 'bold',
  textDecoration: 'none', display: 'inline-block',
}
const smallMuted = { fontSize: '12px', color: '#8a96a8', margin: '12px 0 0' }
const hr = { borderColor: '#e5e9ef', margin: '28px 0' }
const stepBlock = { margin: '0 0 18px' }
const stepNum = { fontSize: '14px', fontWeight: 'bold', color: BRAND_PRIMARY, margin: '0 0 6px' }
const stepText = { fontSize: '14px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 6px' }
const bullet = { fontSize: '13px', color: '#3d4a5c', lineHeight: '1.6', margin: '2px 0 2px 8px' }
const featureItem = { fontSize: '14px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 8px' }
const signature = { fontSize: '14px', color: '#3d4a5c', margin: '24px 0 0' }
const footer = { fontSize: '12px', color: '#8a96a8', textAlign: 'center' as const, margin: '32px 0 0', lineHeight: '1.5' }
const link = { color: BRAND_PRIMARY, textDecoration: 'none' }

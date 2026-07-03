/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NorthLedger'

interface BvReminderProps {
  companyName?: string
  orgNumber?: string
  fiscalYear?: number | string
  deadline?: string
  daysLeft?: number
  reminderKind?: '90d' | '30d' | '14d' | '7d' | '0d'
  appUrl?: string
}

const tone = (kind?: string) => {
  if (kind === '0d') return { color: '#dc2626', label: 'KRITISK PÅMINNELSE — Sista dagen' }
  if (kind === '7d') return { color: '#dc2626', label: 'Brådskande — 7 dagar kvar' }
  if (kind === '14d') return { color: '#ea580c', label: 'Påminnelse — 14 dagar kvar' }
  if (kind === '30d') return { color: '#d97706', label: 'Påminnelse — 30 dagar kvar' }
  return { color: '#0891b2', label: 'Påminnelse — 90 dagar kvar' }
}

const Email = ({
  companyName = 'ert bolag',
  orgNumber = '—',
  fiscalYear = '—',
  deadline = '—',
  daysLeft = 0,
  reminderKind = '30d',
  appUrl = 'https://northledger.se',
}: BvReminderProps) => {
  const t = tone(reminderKind)
  return (
    <Html lang="sv" dir="ltr">
      <Head />
      <Preview>{`${t.label}: Årsredovisning ${fiscalYear} ska in till Bolagsverket senast ${deadline}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...banner, borderLeftColor: t.color }}>
            <Text style={bannerLabel}>{t.label}</Text>
            <Text style={bannerCompany}>{companyName} ({orgNumber})</Text>
          </Section>

          <Heading style={h1}>Årsredovisning för {fiscalYear}</Heading>

          <Text style={text}>
            Det är <strong>{daysLeft <= 0 ? 'sista dagen' : `${daysLeft} dagar kvar`}</strong> till sista
            inlämningsdag hos Bolagsverket: <strong>{deadline}</strong>.
          </Text>

          <Text style={text}>
            En aktiebolags årsredovisning ska enligt lag vara registrerad hos Bolagsverket senast
            sju månader efter räkenskapsårets utgång. Försening medför en förseningsavgift på
            5 000 kr (kan stiga till 20 000 kr).
          </Text>

          <Section style={ctaWrap}>
            <Button href={appUrl} style={{ ...ctaButton, backgroundColor: t.color }}>
              Öppna årsredovisning
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Du får detta mejl eftersom du är listad som styrelseledamot eller administratör för bolaget i {SITE_NAME}.
          </Text>
          <Text style={footerSmall}>{SITE_NAME} – AI-driven bokföring för svenska företag</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const t = tone(data?.reminderKind)
    return `${t.label} — Årsredovisning ${data?.fiscalYear ?? ''} (${data?.companyName ?? ''})`
  },
  displayName: 'Bolagsverket deadline-påminnelse',
  previewData: {
    companyName: 'Acme Bygg AB',
    orgNumber: '559123-4567',
    fiscalYear: 2025,
    deadline: '2026-07-31',
    daysLeft: 30,
    reminderKind: '30d',
    appUrl: 'https://northledger.se/annual-report',
  },
} satisfies TemplateEntry

const NAVY = 'hsl(210, 57%, 14%)'
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const banner = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '0 0 24px',
  borderLeft: '4px solid #0891b2',
}
const bannerLabel = { fontSize: '13px', color: NAVY, margin: '0 0 4px', fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const bannerCompany = { fontSize: '14px', color: '#475569', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: NAVY, margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.7', margin: '0 0 16px' }
const ctaWrap = { textAlign: 'center' as const, margin: '32px 0' }
const ctaButton = { color: '#ffffff', fontSize: '16px', fontWeight: '600' as const, padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #eeeeee', margin: '32px 0' }
const footer = { fontSize: '13px', color: '#888888', lineHeight: '1.6', margin: '0 0 8px' }
const footerSmall = { fontSize: '12px', color: '#aaaaaa', margin: '0' }

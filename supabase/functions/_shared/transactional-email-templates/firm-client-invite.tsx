import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NorthLedger'

interface FirmClientInviteProps {
  firmName?: string
  companyName?: string
  orgNumber?: string
  mandateLabel?: string
  acceptUrl?: string
  inviterName?: string
}

const FirmClientInviteEmail = ({
  firmName = 'Din redovisningsbyrå',
  companyName,
  orgNumber,
  mandateLabel = 'Full fullmakt',
  acceptUrl = 'https://northledger.se/auth',
  inviterName,
}: FirmClientInviteProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>
      {firmName} har bjudit in dig att koppla {companyName ?? 'ditt företag'} till {SITE_NAME}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Du har bjudits in till {SITE_NAME}
        </Heading>

        <Text style={text}>Hej,</Text>

        <Text style={text}>
          <strong>{inviterName ?? firmName}</strong> har skickat en inbjudan att koppla
          {' '}<strong>{companyName ?? 'ditt företag'}</strong>
          {orgNumber ? <> (org.nr {orgNumber})</> : null}
          {' '}till {SITE_NAME} så att byrån kan hantera bokföring, moms och andra ekonomitjänster åt er.
        </Text>

        <Section style={summaryBox}>
          <Text style={summaryHeading}>Detaljer:</Text>
          <Text style={summaryItem}>• Byrå: <strong>{firmName}</strong></Text>
          {companyName ? <Text style={summaryItem}>• Företag: <strong>{companyName}</strong></Text> : null}
          {orgNumber ? <Text style={summaryItem}>• Org.nr: <strong>{orgNumber}</strong></Text> : null}
          <Text style={summaryItem}>• Fullmaktstyp: <strong>{mandateLabel}</strong></Text>
        </Section>

        <Section style={ctaWrap}>
          <Button href={acceptUrl} style={ctaButton}>
            Acceptera inbjudan
          </Button>
        </Section>

        <Text style={subtext}>
          Klicka på knappen ovan för att skapa ett konto eller logga in och godkänna kopplingen.
        </Text>

        <Hr style={hr} />

        <Text style={securityNote}>
          <strong>Säkerhet:</strong> Om du inte känner till denna inbjudan — ignorera mailet.
          Inget händer förrän du aktivt accepterar.
        </Text>

        <Text style={footer}>
          Med vänliga hälsningar,<br />
          Teamet bakom {SITE_NAME}
        </Text>

        <Text style={footerSmall}>
          {SITE_NAME} – AI-driven bokföring för svenska företag
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FirmClientInviteEmail,
  subject: (data: Record<string, any>) => {
    const firm = data?.firmName ?? 'Din redovisningsbyrå'
    const company = data?.companyName ?? 'ditt företag'
    return `${firm} vill koppla ${company} till ${SITE_NAME}`
  },
  displayName: 'Firm client invite (byråinbjudan)',
  previewData: {
    firmName: 'Demo Redovisning AB',
    companyName: 'Acme Bygg AB',
    orgNumber: '556677-8899',
    mandateLabel: 'Full fullmakt',
    acceptUrl: 'https://northledger.se/auth?invite=demo',
    inviterName: 'Erik Andersson',
  },
} satisfies TemplateEntry

const PRIMARY = '#0891b2'
const NAVY = 'hsl(210, 57%, 14%)'

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: NAVY, margin: '0 0 24px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.7', margin: '0 0 16px' }
const summaryBox = {
  backgroundColor: '#f0fbfd',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '24px 0',
  border: '1px solid #cffafe',
}
const summaryHeading = { fontSize: '14px', color: NAVY, margin: '0 0 8px', fontWeight: '600' as const }
const summaryItem = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 4px' }
const ctaWrap = { textAlign: 'center' as const, margin: '32px 0' }
const ctaButton = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}
const subtext = { fontSize: '13px', color: '#666666', lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }
const hr = { border: 'none', borderTop: '1px solid #eeeeee', margin: '32px 0' }
const securityNote = { fontSize: '13px', color: '#666666', lineHeight: '1.6', margin: '0 0 24px', backgroundColor: '#fffbeb', padding: '12px 16px', borderRadius: '6px', border: '1px solid #fef3c7' }
const footer = { fontSize: '14px', color: '#888888', lineHeight: '1.6', margin: '0 0 8px' }
const footerSmall = { fontSize: '12px', color: '#aaaaaa', margin: '0' }

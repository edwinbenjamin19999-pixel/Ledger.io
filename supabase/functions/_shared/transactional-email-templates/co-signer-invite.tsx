import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NorthLedger'

interface CoSignerInviteProps {
  initiatorName?: string
  coSignerName?: string
  companyName?: string
  signUrl?: string
  personalMessage?: string | null
  expiresAt?: string
  isReminder?: boolean
}

const CoSignerInviteEmail = ({
  initiatorName = 'En kollega',
  coSignerName,
  companyName = 'ert bolag',
  signUrl = 'https://northledger.se/co-sign',
  personalMessage,
  expiresAt,
  isReminder,
}: CoSignerInviteProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>
      {isReminder ? 'Påminnelse: ' : ''}
      Signera avtal för {companyName} med BankID
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {isReminder ? 'Påminnelse: ' : ''}
          Du har bjudits in att signera avtal för {companyName}
        </Heading>

        <Text style={text}>
          {coSignerName ? `Hej ${coSignerName},` : 'Hej,'}
        </Text>

        <Text style={text}>
          <strong>{initiatorName}</strong> har påbörjat registreringen av{' '}
          <strong>{companyName}</strong> i {SITE_NAME}. Eftersom bolaget tecknas av
          två i förening behöver även du signera med BankID för att aktivera fullt läge.
        </Text>

        {personalMessage ? (
          <Section style={messageBox}>
            <Text style={messageLabel}>Meddelande från {initiatorName}:</Text>
            <Text style={messageText}>"{personalMessage}"</Text>
          </Section>
        ) : null}

        <Section style={summaryBox}>
          <Text style={summaryHeading}>Det här signerar du:</Text>
          <Text style={summaryItem}>• Kundavtal v2025-01</Text>
          <Text style={summaryItem}>• KYC-deklaration (penningtvättslagen)</Text>
          <Text style={summaryHeadingSecondary}>Vad det möjliggör:</Text>
          <Text style={summaryItem}>• Skarpa betalningar via PSD2/Open Banking</Text>
          <Text style={summaryItem}>• Inlämningar till Skatteverket (moms, AGI, INK2)</Text>
          <Text style={summaryItem}>• Bindande avtal för bolagets räkning</Text>
        </Section>

        <Section style={ctaWrap}>
          <Button href={signUrl} style={ctaButton}>
            Signera med BankID
          </Button>
        </Section>

        {expiresAt ? (
          <Text style={subtext}>
            Länken är giltig till <strong>{expiresAt}</strong> (14 dagar).
          </Text>
        ) : (
          <Text style={subtext}>
            Länken är giltig i 14 dagar.
          </Text>
        )}

        <Hr style={hr} />

        <Text style={securityNote}>
          <strong>Säkerhet:</strong> Om du inte känner till denna inbjudan — ignorera mailet.
          Inget händer förrän du aktivt signerar med BankID.
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
  component: CoSignerInviteEmail,
  subject: (data: Record<string, any>) => {
    const prefix = data?.isReminder ? 'Påminnelse: ' : ''
    const initiator = data?.initiatorName ?? 'En kollega'
    const company = data?.companyName ?? 'ert bolag'
    return `${prefix}${initiator} har bjudit in dig att signera avtal för ${company}`
  },
  displayName: 'Co-signer invite (två i förening)',
  previewData: {
    initiatorName: 'Erik Andersson',
    coSignerName: 'Anna Lindberg',
    companyName: 'Acme Bygg AB',
    signUrl: 'https://northledger.se/co-sign?token=cs_demo123',
    personalMessage: 'Hej Anna! Jag har påbörjat registreringen — kan du signera när du har en stund?',
    expiresAt: '6 maj 2026',
    isReminder: false,
  },
} satisfies TemplateEntry

const PRIMARY = '#0891b2'
const NAVY = 'hsl(210, 57%, 14%)'

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: NAVY, margin: '0 0 24px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.7', margin: '0 0 16px' }
const messageBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '20px 0',
  borderLeft: `4px solid ${PRIMARY}`,
}
const messageLabel = { fontSize: '12px', color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', fontWeight: '600' as const }
const messageText = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0', fontStyle: 'italic' as const }
const summaryBox = {
  backgroundColor: '#f0fbfd',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '24px 0',
  border: '1px solid #cffafe',
}
const summaryHeading = { fontSize: '14px', color: NAVY, margin: '0 0 8px', fontWeight: '600' as const }
const summaryHeadingSecondary = { fontSize: '14px', color: NAVY, margin: '16px 0 8px', fontWeight: '600' as const }
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

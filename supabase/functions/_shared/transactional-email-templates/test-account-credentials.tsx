/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "NorthLedger"
const BRAND_PRIMARY = '#0891b2'
const BRAND_NAVY = '#0f1f35'

interface TestAccountProps {
  recipientName?: string
  loginEmail?: string
  password?: string
  loginUrl?: string
  companyName?: string
}

const TestAccountEmail = ({
  recipientName = 'Peter',
  loginEmail = 'peter@while-true.se',
  password = '••••••••',
  loginUrl = 'https://northledger.se/auth',
  companyName = 'Demo AB',
}: TestAccountProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Ditt testkonto till {SITE_NAME} är klart</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Hej {recipientName}!</Heading>
        <Text style={lead}>
          Ditt testkonto till {SITE_NAME} är klart att använda — du behöver inte registrera
          ett riktigt bolag. Vi har förberett ett demoföretag ({companyName}) som du loggas
          in på direkt så du kan utforska plattformen.
        </Text>

        <Section style={credBox}>
          <Text style={credLabel}>E-post</Text>
          <Text style={credValue}>{loginEmail}</Text>
          <Hr style={hrLight} />
          <Text style={credLabel}>Lösenord</Text>
          <Text style={credValueMono}>{password}</Text>
        </Section>

        <Section style={ctaSection}>
          <Button href={loginUrl} style={button}>Logga in</Button>
        </Section>

        <Hr style={hr} />

        <Heading as="h2" style={h2}>Så kommer du igång</Heading>
        <Text style={text}>
          <strong>1.</strong> Klicka på "Logga in" och använd uppgifterna ovan.
        </Text>
        <Text style={text}>
          <strong>2.</strong> Du landar direkt i dashboarden för demoföretaget — ingen
          onboarding eller bankkoppling krävs.
        </Text>
        <Text style={text}>
          <strong>3.</strong> Utforska AI-bokföringen, CFO-dashboarden, fakturering, moms,
          lön, automatiseringar och beslutsmotorn. Allt fungerar i demo-läge.
        </Text>
        <Text style={text}>
          <strong>4.</strong> Byt lösenord när du vill under <em>Inställningar → Konto</em>.
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          Frågor? Svara på det här mailet så hjälper vi dig igång.
        </Text>

        <Text style={signature}>Hälsningar,<br />Teamet på {SITE_NAME}</Text>

        <Text style={footer}>
          {SITE_NAME} — Sveriges AI-drivna ekonomiplattform<br />
          <Link href="https://northledger.se" style={link}>northledger.se</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TestAccountEmail,
  subject: 'Ditt testkonto till NorthLedger är klart',
  displayName: 'Test account credentials',
  previewData: {
    recipientName: 'Peter',
    loginEmail: 'peter@while-true.se',
    password: 'Demo-pass-1234!',
    loginUrl: 'https://northledger.se/auth',
    companyName: 'Demo AB',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: BRAND_NAVY, margin: '0 0 12px' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: BRAND_NAVY, margin: '24px 0 12px' }
const lead = { fontSize: '15px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 10px' }
const credBox = { backgroundColor: '#f5f8fb', border: '1px solid #e5e9ef', borderRadius: '10px', padding: '18px 20px', margin: '20px 0' }
const credLabel = { fontSize: '12px', color: '#8a96a8', textTransform: 'uppercase' as const, letterSpacing: '0.4px', margin: '0 0 4px' }
const credValue = { fontSize: '15px', color: BRAND_NAVY, margin: '0 0 6px' }
const credValueMono = { fontSize: '15px', color: BRAND_NAVY, fontFamily: 'SF Mono, Menlo, Consolas, monospace', margin: '0' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: BRAND_PRIMARY, color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e9ef', margin: '24px 0' }
const hrLight = { borderColor: '#e5e9ef', margin: '10px 0' }
const signature = { fontSize: '14px', color: '#3d4a5c', margin: '24px 0 0' }
const footer = { fontSize: '12px', color: '#8a96a8', textAlign: 'center' as const, margin: '28px 0 0', lineHeight: '1.5' }
const link = { color: BRAND_PRIMARY, textDecoration: 'none' }

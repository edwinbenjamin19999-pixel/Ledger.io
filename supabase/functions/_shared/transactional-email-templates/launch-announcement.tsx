import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "NorthLedger"

interface LaunchAnnouncementProps {
  name?: string
}

const LaunchAnnouncementEmail = ({ name }: LaunchAnnouncementProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>NorthLedger lanseras snart – du är först i kön!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          NorthLedger lanseras snart!
        </Heading>

        <Text style={text}>
          {name ? `Hej ${name},` : 'Hej,'}
        </Text>

        <Text style={text}>
          Tack för att du anmält ditt intresse för NorthLedger! Vi jobbar för fullt med att färdigställa plattformen och ville ge dig en uppdatering.
        </Text>

        <Text style={text}>
          <strong>Det här kan du se fram emot:</strong>
        </Text>

        <Text style={listItem}>
          <strong>Automatisk bokföring</strong> – AI som sköter kontoplanen, momsberäkningar och verifikationer åt dig.
        </Text>
        <Text style={listItem}>
          <strong>Smarta rapporter</strong> – Resultaträkning, balansräkning och kassaflöde genereras automatiskt.
        </Text>
        <Text style={listItem}>
          <strong>Bankintegration</strong> – Dina transaktioner importeras och matchas automatiskt.
        </Text>
        <Text style={listItem}>
          <strong>Fakturering & löner</strong> – Skapa, skicka och hantera fakturor och lönespecifikationer direkt i plattformen.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightText}>
            Vi meddelar dig så snart det är dags att skapa ditt konto. Som early bird-registrerad får du tillgång före alla andra.
          </Text>
        </Section>

        <Text style={subtext}>
          Håll utkik i din inkorg – nästa mejl från oss innehåller din personliga inbjudan.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Med vänliga hälsningar,<br />
          Teamet bakom {SITE_NAME}
        </Text>

        <Text style={footerSmall}>
          NorthLedger – AI-driven bokföring för svenska företag
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LaunchAnnouncementEmail,
  subject: 'NorthLedger lanseras snart – du är först i kön!',
  displayName: 'Launch announcement',
  previewData: { name: 'Anna' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: 'hsl(210, 57%, 14%)', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.7', margin: '0 0 16px' }
const listItem = { fontSize: '15px', color: '#444444', lineHeight: '1.7', margin: '0 0 8px', paddingLeft: '4px' }
const highlightBox = {
  backgroundColor: '#f0f4f8',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '24px 0',
  borderLeft: '4px solid hsl(210, 57%, 14%)',
}
const highlightText = { fontSize: '15px', color: 'hsl(210, 57%, 14%)', lineHeight: '1.6', margin: '0', fontWeight: '500' as const }
const subtext = { fontSize: '14px', color: '#666666', lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }
const hr = { border: 'none', borderTop: '1px solid #eeeeee', margin: '32px 0' }
const footer = { fontSize: '14px', color: '#888888', lineHeight: '1.6', margin: '0 0 8px' }
const footerSmall = { fontSize: '12px', color: '#aaaaaa', margin: '0' }

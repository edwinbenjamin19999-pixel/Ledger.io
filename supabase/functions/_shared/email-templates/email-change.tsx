/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps { siteName: string; email: string; newEmail: string; confirmationUrl: string }

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Bekräfta din e-postbyte för NorthLedger</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}><span style={logoTeal}>Conto</span><span style={logoNav}>AI</span></Text>
        <Heading style={h1}>Bekräfta e-postbyte</Heading>
        <Text style={text}>Du har begärt att byta e-postadress för ditt NorthLedger-konto från <Link href={`mailto:${email}`} style={link}>{email}</Link> till <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.</Text>
        <Text style={text}>Klicka på knappen nedan för att bekräfta bytet:</Text>
        <Button style={button} href={confirmationUrl}>Bekräfta e-postbyte</Button>
        <Hr style={hr} />
        <Text style={footer}>Om du inte begärde detta, vänligen säkra ditt konto omedelbart.</Text>
        <Text style={footerBrand}>NorthLedger – AI-driven bokföring för svenska företag</Text>
      </Container>
    </Body>
  </Html>
)
export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logo = { fontSize: '24px', fontWeight: 'bold' as const, margin: '0 0 24px', letterSpacing: '-0.5px' }
const logoTeal = { color: '#0ECECE' }
const logoNav = { color: '#0F2137' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F2137', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#0ECECE', textDecoration: 'underline' }
const button = { backgroundColor: '#0F2137', color: '#ffffff', fontSize: '15px', borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', fontWeight: '600' as const }
const hr = { border: 'none', borderTop: '1px solid #eeeeee', margin: '32px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px' }
const footerBrand = { fontSize: '11px', color: '#bbbbbb', margin: '0' }

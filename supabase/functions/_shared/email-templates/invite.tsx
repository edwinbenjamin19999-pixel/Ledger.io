/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Du har blivit inbjuden till NorthLedger</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}><span style={logoTeal}>Conto</span><span style={logoNav}>AI</span></Text>
        <Heading style={h1}>Du har blivit inbjuden</Heading>
        <Text style={text}>Du har blivit inbjuden att gå med i <Link href={siteUrl} style={link}><strong>NorthLedger</strong></Link>. Klicka på knappen nedan för att acceptera inbjudan och skapa ditt konto.</Text>
        <Button style={button} href={confirmationUrl}>Acceptera inbjudan</Button>
        <Hr style={hr} />
        <Text style={footer}>Om du inte förväntat dig denna inbjudan kan du ignorera mejlet.</Text>
        <Text style={footerBrand}>NorthLedger – AI-driven bokföring för svenska företag</Text>
      </Container>
    </Body>
  </Html>
)
export default InviteEmail

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

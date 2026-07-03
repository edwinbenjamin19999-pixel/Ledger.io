/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Din inloggningslänk för NorthLedger</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}><span style={logoTeal}>Conto</span><span style={logoNav}>AI</span></Text>
        <Heading style={h1}>Din inloggningslänk</Heading>
        <Text style={text}>Klicka på knappen nedan för att logga in på NorthLedger. Länken upphör att gälla inom kort.</Text>
        <Button style={button} href={confirmationUrl}>Logga in</Button>
        <Hr style={hr} />
        <Text style={footer}>Om du inte begärde denna länk kan du ignorera mejlet.</Text>
        <Text style={footerBrand}>NorthLedger – AI-driven bokföring för svenska företag</Text>
      </Container>
    </Body>
  </Html>
)
export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logo = { fontSize: '24px', fontWeight: 'bold' as const, margin: '0 0 24px', letterSpacing: '-0.5px' }
const logoTeal = { color: '#0ECECE' }
const logoNav = { color: '#0F2137' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F2137', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#0F2137', color: '#ffffff', fontSize: '15px', borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', fontWeight: '600' as const }
const hr = { border: 'none', borderTop: '1px solid #eeeeee', margin: '32px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px' }
const footerBrand = { fontSize: '11px', color: '#bbbbbb', margin: '0' }

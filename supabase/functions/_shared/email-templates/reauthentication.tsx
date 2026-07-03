/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Din verifieringskod för NorthLedger</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}><span style={logoTeal}>Conto</span><span style={logoNav}>AI</span></Text>
        <Heading style={h1}>Bekräfta din identitet</Heading>
        <Text style={text}>Använd koden nedan för att verifiera din identitet:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={hr} />
        <Text style={footer}>Koden upphör att gälla inom kort. Om du inte begärde detta kan du ignorera mejlet.</Text>
        <Text style={footerBrand}>NorthLedger – AI-driven bokföring för svenska företag</Text>
      </Container>
    </Body>
  </Html>
)
export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logo = { fontSize: '24px', fontWeight: 'bold' as const, margin: '0 0 24px', letterSpacing: '-0.5px' }
const logoTeal = { color: '#0ECECE' }
const logoNav = { color: '#0F2137' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F2137', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#0F2137', margin: '0 0 30px', letterSpacing: '4px' }
const hr = { border: 'none', borderTop: '1px solid #eeeeee', margin: '32px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px' }
const footerBrand = { fontSize: '11px', color: '#bbbbbb', margin: '0' }

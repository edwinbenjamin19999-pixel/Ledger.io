// Geographic classification engine for e-commerce orders
import { EU_MEMBER_STATES, type TransactionGeography, type EUCountryCode } from './types';
import { validateEUVatNumber } from '../vatEngine';

export function classifyGeography(
  customerCountry: string | null,
  customerVatNumber: string | null
): TransactionGeography {
  if (!customerCountry || customerCountry === 'SE') {
    return 'domestic_se';
  }

  const isEU = (EU_MEMBER_STATES as readonly string[]).includes(customerCountry);

  if (isEU) {
    if (customerVatNumber && validateEUVatNumber(customerVatNumber)) {
      return 'eu_b2b';
    }
    return 'eu_b2c_oss';
  }

  return 'export_non_eu';
}

export function getVatRateForGeography(
  geography: TransactionGeography,
  productVatRate: number,
  _ossCountryRate?: number
): number {
  switch (geography) {
    case 'domestic_se':
      return productVatRate;
    case 'eu_b2b':
      return 0; // Reverse charge
    case 'eu_b2c_oss':
      // Under OSS, use the customer's country VAT rate
      return _ossCountryRate ?? productVatRate;
    case 'export_non_eu':
      return 0;
  }
}

export function getMomsdeklarationRuta(geography: TransactionGeography, vatRate: number) {
  switch (geography) {
    case 'domestic_se':
      if (vatRate === 25) return { salesRuta: '05', vatRuta: '10' };
      if (vatRate === 12) return { salesRuta: '06', vatRuta: '11' };
      if (vatRate === 6) return { salesRuta: '07', vatRuta: '12' };
      return { salesRuta: '42', vatRuta: null };
    case 'eu_b2b':
      return { salesRuta: '39', vatRuta: null };
    case 'eu_b2c_oss':
      return { salesRuta: '05', vatRuta: '10' }; // Domestic until OSS threshold
    case 'export_non_eu':
      return { salesRuta: '36', vatRuta: null };
  }
}

// OSS threshold: €10,000 ≈ 113,000 SEK
export const OSS_THRESHOLD_SEK = 113_000;
export const OSS_THRESHOLD_EUR = 10_000;

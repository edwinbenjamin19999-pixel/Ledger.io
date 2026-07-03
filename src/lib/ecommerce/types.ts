// E-commerce module types

export type EcommercePlatform = 
  | 'shopify' | 'amazon' | 'woocommerce' | 'etsy' | 'ebay' 
  | 'stripe' | 'paypal' | 'klarna' | 'wix' | 'prestashop' | 'squarespace';

export type OrderStatus = 'pending' | 'paid' | 'partially_refunded' | 'fully_refunded' | 'disputed';
export type PayoutStatus = 'pending' | 'matched_to_bank' | 'booked' | 'needs_review';
export type ReturnType = 'full' | 'partial';
export type ProductCategory = 'physical_25' | 'food_12' | 'books_6' | 'digital_25_oss' | 'exempt';

export const EU_MEMBER_STATES = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR',
  'HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
] as const;

export type EUCountryCode = typeof EU_MEMBER_STATES[number];

export interface EcommerceOrder {
  id: string;
  company_id: string;
  platform: EcommercePlatform;
  platform_order_id: string;
  order_date: string;
  currency: string;
  customer_country: string | null;
  customer_vat_number: string | null;
  gross_amount: number;
  gross_amount_sek: number;
  shipping_amount_sek: number;
  discount_amount_sek: number;
  platform_fee_sek: number;
  payment_fee_sek: number;
  vat_amount_sek: number;
  net_revenue_sek: number;
  refunded_amount_sek: number;
  status: OrderStatus;
  payout_id: string | null;
  bookkeeping_entry_id: string | null;
}

export interface EcommerceOrderLine {
  id: string;
  order_id: string;
  company_id: string;
  product_id: string | null;
  product_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price_sek: number;
  vat_rate: number;
  vat_amount_sek: number;
  line_total_sek: number;
  product_category: ProductCategory;
}

export interface PlatformConnection {
  id: string;
  company_id: string;
  platform: EcommercePlatform;
  status: string;
  last_sync_at: string | null;
  config: Record<string, unknown>;
}

export interface EcommercePayout {
  id: string;
  company_id: string;
  platform: EcommercePlatform;
  platform_payout_id: string | null;
  payout_date: string;
  gross_amount_sek: number;
  fees_sek: number;
  net_amount_sek: number;
  status: PayoutStatus;
  matched_bank_transaction_id: string | null;
  order_ids: string[];
}

export interface InventoryItem {
  id: string;
  company_id: string;
  sku: string;
  product_name: string | null;
  platform: string | null;
  current_stock: number;
  reserved_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  cost_price_sek: number;
  sync_source: string | null;
}

export type TransactionGeography = 
  | 'domestic_se'
  | 'eu_b2b'
  | 'eu_b2c_oss'
  | 'export_non_eu';

export interface PlatformCardInfo {
  platform: EcommercePlatform;
  name: string;
  color: string;
  initials: string;
  fields: { key: string; label: string; type: string }[];
}

export const PLATFORM_CONFIGS: PlatformCardInfo[] = [
  { platform: 'shopify', name: 'Shopify', color: '#96BF48', initials: 'SH',
    fields: [
      { key: 'store_url', label: 'Butiks-URL (myshopify.com)', type: 'text' },
      { key: 'api_token', label: 'API Access Token', type: 'password' },
      { key: 'webhook_secret', label: 'Webhook-hemlighet', type: 'password' },
    ]},
  { platform: 'amazon', name: 'Amazon Seller Central', color: '#FF9900', initials: 'AM',
    fields: [
      { key: 'seller_id', label: 'Seller ID', type: 'text' },
      { key: 'mws_key', label: 'SP-API Credentials', type: 'password' },
      { key: 'marketplace_id', label: 'Marketplace ID (SE, DE, UK…)', type: 'text' },
    ]},
  { platform: 'woocommerce', name: 'WooCommerce', color: '#7F54B3', initials: 'WC',
    fields: [
      { key: 'site_url', label: 'Webbplats-URL', type: 'text' },
      { key: 'consumer_key', label: 'Consumer Key', type: 'password' },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password' },
    ]},
  { platform: 'etsy', name: 'Etsy', color: '#F56400', initials: 'ET',
    fields: [{ key: 'oauth', label: 'Anslut via OAuth2', type: 'oauth' }]},
  { platform: 'ebay', name: 'eBay', color: '#E53238', initials: 'eB',
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text' },
      { key: 'cert_id', label: 'Cert ID', type: 'password' },
    ]},
  { platform: 'stripe', name: 'Stripe', color: '#635BFF', initials: 'ST',
    fields: [{ key: 'api_key', label: 'API-nyckel (sk_live_…)', type: 'password' }]},
  { platform: 'paypal', name: 'PayPal', color: '#003087', initials: 'PP',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text' },
      { key: 'secret', label: 'Secret', type: 'password' },
    ]},
  { platform: 'klarna', name: 'Klarna', color: '#FFB3C7', initials: 'KL',
    fields: [
      { key: 'api_key', label: 'API-nyckel', type: 'password' },
      { key: 'merchant_id', label: 'Merchant ID', type: 'text' },
    ]},
  { platform: 'wix', name: 'Wix Stores', color: '#0C6EFC', initials: 'WX',
    fields: [{ key: 'api_key', label: 'API-nyckel', type: 'password' }]},
  { platform: 'prestashop', name: 'PrestaShop', color: '#DF0067', initials: 'PS',
    fields: [
      { key: 'site_url', label: 'Webbplats-URL', type: 'text' },
      { key: 'api_key', label: 'Webservice-nyckel', type: 'password' },
    ]},
  { platform: 'squarespace', name: 'Squarespace Commerce', color: '#000000', initials: 'SQ',
    fields: [{ key: 'api_key', label: 'API-nyckel', type: 'password' }]},
];

export const VAT_RATE_BY_CATEGORY: Record<ProductCategory, number> = {
  physical_25: 25,
  food_12: 12,
  books_6: 6,
  digital_25_oss: 25,
  exempt: 0,
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  physical_25: 'Fysisk vara 25%',
  food_12: 'Livsmedel 12%',
  books_6: 'Böcker/tidningar 6%',
  digital_25_oss: 'Digital tjänst 25% (OSS)',
  exempt: 'Momsfri',
};

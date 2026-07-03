/**
 * VismaFetcher — paginated retrieval of customers, suppliers, invoices.
 * Used inside an edge function (server side). Mappers normalize to NorthLedger shape.
 */
export class VismaFetcher {
  private accessToken: string;
  private baseUrl = "https://eaccountingapi.vismaonline.com/v2";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async get(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`Visma API error ${r.status}: ${body.slice(0, 300)}`);
    }
    return r.json();
  }

  private async paginate(endpoint: string, extra: Record<string, string> = {}) {
    const out: any[] = [];
    let skip = 0;
    const top = 500;
    while (true) {
      const data = await this.get(endpoint, { $top: String(top), $skip: String(skip), ...extra });
      const batch = data.Data || data.value || [];
      out.push(...batch);
      if (batch.length < top) break;
      skip += top;
      if (skip > 200_000) break; // safety
    }
    return out;
  }

  async fetchAllCustomers(onProgress?: (n: number) => void) {
    const rows = await this.paginate("/customers");
    onProgress?.(rows.length);
    return rows.map(mapVismaCustomer);
  }

  async fetchAllSuppliers(onProgress?: (n: number) => void) {
    const rows = await this.paginate("/suppliers");
    onProgress?.(rows.length);
    return rows.map(mapVismaSupplier);
  }

  async fetchCustomerInvoices(fromDate?: string, onProgress?: (n: number) => void) {
    const extra: Record<string, string> = {};
    if (fromDate) extra.$filter = `InvoiceDate ge ${fromDate}`;
    const rows = await this.paginate("/customerinvoices", extra);
    onProgress?.(rows.length);
    return rows.map(mapVismaCustomerInvoice);
  }

  async fetchSupplierInvoices(fromDate?: string, onProgress?: (n: number) => void) {
    const extra: Record<string, string> = {};
    if (fromDate) extra.$filter = `InvoiceDate ge ${fromDate}`;
    const rows = await this.paginate("/supplierinvoices", extra);
    onProgress?.(rows.length);
    return rows.map(mapVismaSupplierInvoice);
  }
}

export function mapVismaCustomer(c: any) {
  return {
    external_id: String(c.Id ?? ""),
    name: c.Name ?? "",
    org_number: c.CorporateIdentityNumber ?? null,
    email: c.EmailAddress ?? null,
    phone: c.Phone ?? null,
    address: c.InvoiceAddress1 ?? c.Address1 ?? null,
    postal_code: c.InvoicePostalCode ?? c.PostalCode ?? null,
    city: c.InvoiceCity ?? c.City ?? null,
    country: c.CountryCode || "SE",
    payment_terms: Number(c.TermsOfPaymentId) || 30,
    currency: c.CurrencyCode || "SEK",
    source_system: "visma",
  };
}

export function mapVismaSupplier(s: any) {
  return {
    external_id: String(s.Id ?? ""),
    name: s.Name ?? "",
    org_number: s.CorporateIdentityNumber ?? null,
    email: s.EmailAddress ?? null,
    phone: s.Telephone ?? s.Mobile ?? null,
    address: s.Address1 ?? null,
    postal_code: s.PostalCode ?? null,
    city: s.City ?? null,
    bankgiro: s.BankgiroNumber ?? null,
    plusgiro: s.PlusgiroNumber ?? null,
    iban: s.BankIban ?? null,
    source_system: "visma",
  };
}

export function mapVismaCustomerInvoice(i: any) {
  const total = Number(i.TotalAmount) || 0;
  const vat = Number(i.TotalVatAmount) || 0;
  return {
    external_invoice_number: String(i.DocumentNumber ?? i.InvoiceNumber ?? ""),
    invoice_date: i.InvoiceDate ?? null,
    due_date: i.DueDate ?? null,
    amount_excl_vat: total - vat,
    vat_amount: vat,
    amount_incl_vat: total,
    currency: i.CurrencyCode || "SEK",
    status:
      Number(i.RemainingAmount ?? i.RemainingAmountInvoiceCurrency ?? 0) <= 0 ? "paid" : "unpaid",
    source_system: "visma",
  };
}

export function mapVismaSupplierInvoice(i: any) {
  const total = Number(i.TotalAmount) || 0;
  const vat = Number(i.TotalVatAmount) || 0;
  return {
    external_invoice_number: String(i.SupplierInvoiceNumber ?? i.InvoiceNumber ?? ""),
    invoice_date: i.InvoiceDate ?? null,
    due_date: i.DueDate ?? null,
    amount_excl_vat: total - vat,
    vat_amount: vat,
    amount_incl_vat: total,
    status: Number(i.RemainingAmount ?? 0) <= 0 ? "paid" : "unpaid",
    source_system: "visma",
  };
}

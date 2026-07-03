/**
 * FortnoxFetcher — paginated retrieval of customers, suppliers, invoices, articles.
 * Used inside an edge function (server side). Mappers normalize to Bokfy shape.
 */

export interface FetchProgress {
  customers?: number;
  suppliers?: number;
  customerInvoices?: number;
  supplierInvoices?: number;
  articles?: number;
}

export class FortnoxFetcher {
  private accessToken: string;
  private baseUrl = "https://api.fortnox.se/3";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async get(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Fortnox API error ${response.status}: ${body.slice(0, 300)}`);
    }
    return response.json();
  }

  async fetchAllCustomers(onProgress?: (n: number) => void) {
    const out: any[] = [];
    let page = 1;
    while (true) {
      const data = await this.get("/customers", { limit: "500", page: String(page) });
      const batch = data.Customers || [];
      out.push(...batch);
      onProgress?.(out.length);
      if (batch.length < 500) break;
      page++;
      if (page > 200) break; // safety
    }
    return out.map(mapFortnoxCustomer);
  }

  async fetchAllSuppliers(onProgress?: (n: number) => void) {
    const out: any[] = [];
    let page = 1;
    while (true) {
      const data = await this.get("/suppliers", { limit: "500", page: String(page) });
      const batch = data.Suppliers || [];
      out.push(...batch);
      onProgress?.(out.length);
      if (batch.length < 500) break;
      page++;
      if (page > 200) break;
    }
    return out.map(mapFortnoxSupplier);
  }

  async fetchInvoices(fromDate?: string, toDate?: string, onProgress?: (n: number) => void) {
    const out: any[] = [];
    let page = 1;
    while (true) {
      const params: Record<string, string> = { limit: "500", page: String(page) };
      if (fromDate) params.fromdate = fromDate;
      if (toDate) params.todate = toDate;
      const data = await this.get("/invoices", params);
      const batch = data.Invoices || [];
      out.push(...batch);
      onProgress?.(out.length);
      if (batch.length < 500) break;
      page++;
      if (page > 500) break;
    }
    return out.map(mapFortnoxInvoice);
  }

  async fetchSupplierInvoices(fromDate?: string, onProgress?: (n: number) => void) {
    const out: any[] = [];
    let page = 1;
    while (true) {
      const params: Record<string, string> = { limit: "500", page: String(page) };
      if (fromDate) params.fromdate = fromDate;
      const data = await this.get("/supplierinvoices", params);
      const batch = data.SupplierInvoices || [];
      out.push(...batch);
      onProgress?.(out.length);
      if (batch.length < 500) break;
      page++;
      if (page > 500) break;
    }
    return out.map(mapFortnoxSupplierInvoice);
  }

  async fetchArticles() {
    const data = await this.get("/articles", { limit: "1000" });
    return data.Articles || [];
  }

  async fetchCompanyInformation() {
    return this.get("/companyinformation");
  }
}

// ---------- mappers ----------

export function mapFortnoxCustomer(c: any) {
  return {
    external_id: String(c.CustomerNumber ?? ""),
    name: c.Name ?? "",
    org_number: c.OrganisationNumber ?? null,
    email: c.Email ?? null,
    phone: c.Phone1 ?? null,
    address: c.Address1 ?? null,
    postal_code: c.ZipCode ?? null,
    city: c.City ?? null,
    country: c.CountryCode || "SE",
    payment_terms: parseInt(c.TermsOfPayment) || 30,
    currency: c.Currency || "SEK",
    source_system: "fortnox",
  };
}

export function mapFortnoxSupplier(s: any) {
  return {
    external_id: String(s.SupplierNumber ?? ""),
    name: s.Name ?? "",
    org_number: s.OrganisationNumber ?? null,
    email: s.Email ?? null,
    phone: s.Phone1 ?? null,
    address: s.Address1 ?? null,
    postal_code: s.ZipCode ?? null,
    city: s.City ?? null,
    bankgiro: s.BankAccountType === "BANKGIRO" ? s.BankAccountNumber : null,
    plusgiro: s.BankAccountType === "PLUSGIRO" ? s.BankAccountNumber : null,
    iban: s.BankAccountType === "IBAN" ? s.BankAccountNumber : null,
    source_system: "fortnox",
  };
}

export function mapFortnoxInvoice(i: any) {
  return {
    external_invoice_number: String(i.DocumentNumber ?? ""),
    invoice_date: i.InvoiceDate ?? null,
    due_date: i.DueDate ?? null,
    amount_excl_vat: parseFloat(i.Net) || 0,
    vat_amount: parseFloat(i.VAT) || 0,
    amount_incl_vat: parseFloat(i.Total) || 0,
    currency: i.Currency || "SEK",
    status: mapFortnoxInvoiceStatus(i.Balance, i.Cancelled),
    paid_date: i.FinalPayDate || null,
    description: i.Remarks ?? null,
    source_system: "fortnox",
  };
}

export function mapFortnoxSupplierInvoice(i: any) {
  return {
    external_invoice_number: String(i.GivenNumber ?? ""),
    invoice_date: i.InvoiceDate ?? null,
    due_date: i.DueDate ?? null,
    amount_excl_vat: parseFloat(i.Net) || 0,
    vat_amount: parseFloat(i.VAT) || 0,
    amount_incl_vat: parseFloat(i.Total) || 0,
    status: parseFloat(i.Balance) > 0 ? "unpaid" : "paid",
    source_system: "fortnox",
  };
}

function mapFortnoxInvoiceStatus(balance: any, cancelled: any): string {
  if (cancelled) return "cancelled";
  if (parseFloat(balance) <= 0) return "paid";
  return "unpaid";
}

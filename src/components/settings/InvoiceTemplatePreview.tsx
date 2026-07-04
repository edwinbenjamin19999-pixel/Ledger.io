import { useMemo } from "react";

interface PreviewSettings {
  display_name?: string;
  logo_placement: string;
  accent_color: string;
  invoice_title: string;
  show_org_number: boolean;
  show_vat_number: boolean;
  show_phone: boolean;
  show_website: boolean;
  phone?: string;
  website?: string;
  total_label: string;
  currency_symbol: string;
  payment_terms_text?: string;
  thank_you_text?: string;
  footer_text?: string;
  logo_size_pct?: number;
}

interface InvoiceTemplatePreviewProps {
  settings: PreviewSettings;
  logoUrl?: string | null;
  companyName?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const InvoiceTemplatePreview = ({ settings, logoUrl, companyName = "Ditt företag AB" }: InvoiceTemplatePreviewProps) => {
  const accent = settings.accent_color || "#0052FF";
  const logoSizePct = settings.logo_size_pct ?? 100;
  const logoWidthMm = 42 * (logoSizePct / 100);

  const lines = useMemo(() => ([
    { desc: "Konsulttjänst – Maj 2026", qty: 10, price: 1200 },
    { desc: "Programvarulicens", qty: 1, price: 4500 },
  ]), []);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const vat = subtotal * 0.25;
  const total = subtotal + vat;

  const displayName = settings.display_name || companyName;

  const logoAlign =
    settings.logo_placement === "center" ? "center" :
    settings.logo_placement === "right" ? "flex-end" : "flex-start";

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/30 p-4">
      <div className="flex justify-center">
        <div
          style={{
            width: "210mm",
            minHeight: "297mm",
            transform: "scale(0.55)",
            transformOrigin: "top center",
            background: "white",
            color: "#333",
            fontFamily: "Helvetica, Arial, sans-serif",
            padding: "14mm",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            marginBottom: "-130mm",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: logoAlign, flex: 1 }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logga"
                  style={{ width: `${logoWidthMm}mm`, maxHeight: "30mm", objectFit: "contain" }}
                />
              ) : (
                <div
                  style={{
                    width: `${logoWidthMm}mm`,
                    height: "18mm",
                    border: "1px dashed #ccc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#bbb",
                    fontSize: "10pt",
                  }}
                >
                  Logga
                </div>
              )}
              <div style={{ marginTop: "4mm", fontWeight: 700, fontSize: "12pt" }}>{displayName}</div>
              {settings.show_org_number && <div style={{ fontSize: "8pt", color: "#666" }}>Org.nr: 556677-8899</div>}
              {settings.show_vat_number && <div style={{ fontSize: "8pt", color: "#666" }}>Momsreg.nr: SE556677889901</div>}
              {settings.show_phone && settings.phone && <div style={{ fontSize: "8pt", color: "#666" }}>{settings.phone}</div>}
              {settings.show_website && settings.website && <div style={{ fontSize: "8pt", color: "#666" }}>{settings.website}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "22pt", fontWeight: 700, color: accent }}>{settings.invoice_title || "Faktura"}</div>
              <div style={{ marginTop: "8mm", fontSize: "9pt", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 600 }}>Exempel Kund AB</div>
                <div>Storgatan 1</div>
                <div>111 22 Stockholm</div>
                <div style={{ color: "#666" }}>Org.nr: 559900-1122</div>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12mm", fontSize: "8pt" }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "2mm 8mm" }}>
              <div style={{ color: "#666" }}>Fakturanr</div><div style={{ color: "#333" }}>2026-0042</div>
              <div style={{ color: "#666" }}>Fakturadatum</div><div style={{ color: "#333" }}>2026-04-21</div>
              <div style={{ color: "#666" }}>Betalningsvillkor</div><div style={{ color: "#333" }}>30 dagar netto</div>
            </div>
            <div style={{ border: "1px solid #ccc", padding: "3mm 4mm", minWidth: "70mm", fontSize: "8pt" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "2mm" }}>
                <span style={{ fontWeight: 700 }}>{settings.total_label || "Att betala"}</span>
                <span style={{ fontWeight: 700 }}>{fmt(total)} {settings.currency_symbol || "kr"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "2mm", borderBottom: "1px solid #eee", paddingBottom: "2mm" }}>
                <span>Förfallodatum</span>
                <span style={{ fontWeight: 600 }}>2026-05-21</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "2mm" }}>
                <span>OCR</span>
                <span style={{ fontWeight: 600 }}>20260042</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ marginTop: "12mm" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 20mm 30mm 30mm",
                gap: "4mm",
                paddingBottom: "2mm",
                borderBottom: `1px solid ${accent}`,
                fontSize: "9pt",
                fontWeight: 700,
                color: accent,
              }}
            >
              <div>Produkt / tjänst</div>
              <div style={{ textAlign: "right" }}>Antal</div>
              <div style={{ textAlign: "right" }}>Å-pris</div>
              <div style={{ textAlign: "right" }}>Belopp</div>
            </div>
            {lines.map((l, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 20mm 30mm 30mm",
                  gap: "4mm",
                  padding: "2mm 0",
                  borderBottom: "1px solid #f0f0f0",
                  fontSize: "9pt",
                }}
              >
                <div>{l.desc}</div>
                <div style={{ textAlign: "right" }}>{fmt(l.qty)}</div>
                <div style={{ textAlign: "right" }}>{fmt(l.price)}</div>
                <div style={{ textAlign: "right" }}>{fmt(l.qty * l.price)}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ marginTop: "6mm", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "76mm", fontSize: "9pt" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "1.5mm 0" }}>
                <span style={{ color: "#666" }}>Netto:</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "1.5mm 0" }}>
                <span style={{ color: "#666" }}>Moms 25%:</span>
                <span>{fmt(vat)} {settings.currency_symbol || "kr"}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3mm 0 1mm",
                  marginTop: "2mm",
                  borderTop: `2px solid ${accent}`,
                  color: accent,
                  fontWeight: 700,
                  fontSize: "11pt",
                }}
              >
                <span>SUMMA TOTALT:</span>
                <span>{fmt(total)} {(settings.currency_symbol || "kr").toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Thank-you */}
          {settings.thank_you_text && (
            <div style={{ marginTop: "10mm", fontSize: "9pt", fontStyle: "italic", color: "#666" }}>
              {settings.thank_you_text}
            </div>
          )}

          {/* Footer */}
          <div style={{ position: "absolute", bottom: "14mm", left: "14mm", right: "14mm" }} />
          <div
            style={{
              marginTop: "20mm",
              paddingTop: "4mm",
              borderTop: "1px solid #eee",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "6mm",
              fontSize: "7pt",
              color: "#666",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: "1mm" }}>Adress</div>
              <div>{displayName}</div>
              <div>Exempelvägen 1</div>
              <div>111 22 Stockholm</div>
              <div style={{ color: "#aaa", marginTop: "1mm" }}>{settings.footer_text || "Godkänd för F-skatt"}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: "1mm" }}>Bankuppgifter</div>
              <div>Bankgiro: 123-4567</div>
              <div>IBAN: SE12 3456 7890 1234</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: "1mm" }}>Kontakt</div>
              <div>E-post: faktura@foretag.se</div>
              <div>Momsreg.nr: SE556677889901</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

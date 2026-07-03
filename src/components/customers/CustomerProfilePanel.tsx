import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Building2, Brain, ArrowUpRight, FileText, Edit2, Hash } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { CustomerProfile, SCORE_COLOR, RISK_COLOR, RISK_LABEL } from "@/hooks/useCustomerProfiles";
import { cn } from "@/lib/utils";

export interface CustomerRecord {
  id?: string;
  name: string;
  org_number?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  peppol_id?: string | null;
  payment_terms_days?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerRecord | null;
  profile?: CustomerProfile | null;
  onEdit?: (customer: CustomerRecord) => void;
}

export function CustomerProfilePanel({ open, onOpenChange, customer, profile, onEdit }: Props) {
  const navigate = useNavigate();
  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{customer.name}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {customer.org_number && (
              <span className="text-xs font-mono text-slate-500 inline-flex items-center gap-1">
                <Hash className="h-3 w-3" />{customer.org_number}
              </span>
            )}
            {profile && (
              <>
                <Badge variant="outline" className={cn("border", SCORE_COLOR[profile.score])}>
                  {profile.score} · {profile.scoreLabel}
                </Badge>
                <Badge variant="outline" className={cn("border", RISK_COLOR[profile.risk])}>
                  {RISK_LABEL[profile.risk]}
                </Badge>
              </>
            )}
            {customer.peppol_id && <Badge variant="secondary" className="text-xs">PEPPOL</Badge>}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kontakt</h4>
            <div className="space-y-1.5 text-sm">
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-slate-700 hover:text-[#3b82f6]">
                  <Mail className="h-4 w-4 text-slate-400" />{customer.email}
                </a>
              )}
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-slate-700 hover:text-[#3b82f6]">
                  <Phone className="h-4 w-4 text-slate-400" />{customer.phone}
                </a>
              )}
              {(customer.address || customer.city) && (
                <div className="flex items-start gap-2 text-slate-700">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <span>
                    {customer.address}{customer.address && customer.city ? ", " : ""}
                    {customer.postal_code} {customer.city}
                  </span>
                </div>
              )}
              {customer.peppol_id && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-mono text-xs">{customer.peppol_id}</span>
                </div>
              )}
            </div>
          </section>

          {/* AI insight */}
          {profile && (
            <section className="rounded-2xl border border-slate-200/70 border-l-[3px] border-l-[#3b82f6] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">{profile.aiPattern}</p>
                  <p className="text-xs text-slate-500">{profile.recommendation}</p>
                </div>
              </div>
            </section>
          )}

          {/* Stats */}
          {profile && (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nyckeltal</h4>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Total intäkt" value={formatSEK(profile.totalLifetime)} />
                <Stat label="Utestående" value={formatSEK(profile.totalOutstanding)} accent={profile.totalOutstanding > 0 ? "rose" : "emerald"} />
                <Stat label="Betalda fakturor" value={String(profile.paidCount)} />
                <Stat label="I tid" value={`${Math.round(profile.onTimeRate * 100)}%`} />
                <Stat label="Snitt försening" value={`${profile.avgDaysLate} d`} accent={profile.avgDaysLate > 14 ? "rose" : "slate"} />
                <Stat label="Betalningsvillkor" value={`${customer.payment_terms_days ?? 30} d`} />
              </div>
            </section>
          )}

          <Separator />

          {/* Actions */}
          <section className="space-y-2">
            <Button
              className="w-full bg-[#3b82f6] hover:bg-[#3b82f6] text-white"
              onClick={() => {
                onOpenChange(false);
                navigate(`/ar-agent?customer=${encodeURIComponent(customer.name)}`);
              }}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" /> Öppna i AR-agent
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                navigate(`/invoices?customer=${encodeURIComponent(customer.name)}`);
              }}
            >
              <FileText className="h-4 w-4 mr-2" /> Visa fakturor
            </Button>
            {onEdit && (
              <Button variant="ghost" className="w-full" onClick={() => { onEdit(customer); onOpenChange(false); }}>
                <Edit2 className="h-4 w-4 mr-2" /> Redigera profil
              </Button>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, accent = "slate" }: { label: string; value: string; accent?: "slate" | "rose" | "emerald" }) {
  const accentClass = accent === "rose" ? "text-[#7A1A1A]" : accent === "emerald" ? "text-[#085041]" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums mt-0.5", accentClass)}>{value}</p>
    </div>
  );
}

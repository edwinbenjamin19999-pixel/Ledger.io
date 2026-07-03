import { Receipt, Landmark, FileText, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFirmGlobalKPIs, formatSEK } from "@/hooks/useFirmGlobalKPIs";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Global KPI strip for the byrå control center (spec id="wl-multitenant-core-v1" §4A).
 *
 * Four numeric exposures across the entire client portfolio:
 *  • Total VAT payable (open vat_periods)
 *  • Total tax exposure (open tax_declarations)
 *  • Unpaid customer invoices (AR)
 *  • Overdue supplier invoices (AP)
 *
 * Each card is an action: clicking opens the matching WL module so the advisor
 * can drill straight into the underlying records. No mock data — sums come
 * from `useFirmGlobalKPIs`, which reuses the same firm hooks the per-module
 * pages use (single source of truth, §10).
 */
const Card = ({
  tone,
  icon,
  label,
  value,
  sub,
  onClick,
  loading,
}: {
  tone: "rose" | "amber" | "indigo" | "emerald";
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: React.ReactNode;
  onClick: () => void;
  loading: boolean;
}) => {
  const tones: Record<string, { border: string; iconBg: string; iconText: string; dot: string }> = {
    rose: { border: "rgb(254,205,211)", iconBg: "bg-[#FCE8E8]", iconText: "text-[#7A1A1A]", dot: "bg-rose-500" },
    amber: { border: "rgb(253,230,138)", iconBg: "bg-[#FAEEDA]", iconText: "text-[#7A5417]", dot: "bg-amber-500" },
    indigo: { border: "rgb(199,210,254)", iconBg: "bg-[#EFF6FF]", iconText: "text-indigo-600", dot: "bg-indigo-500" },
    emerald: { border: "rgb(167,243,208)", iconBg: "bg-[#E1F5EE]", iconText: "text-[#085041]", dot: "bg-emerald-500" },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-3xl bg-white p-5 transition-all hover:-translate-y-0.5"
      style={{
        border: `1px solid ${t.border}`,
        boxShadow: "0 12px 32px rgba(15,23,42,0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${t.dot}`} />
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#64748B] font-bold">
            {label}
          </span>
        </div>
        <div className={`h-8 w-8 rounded-xl ${t.iconBg} ${t.iconText} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-9 w-32" />
      ) : (
        <div className="text-2xl md:text-3xl font-bold text-[#0F172A] tabular-nums">{value}</div>
      )}
      <div className="mt-2 text-xs text-[#64748B] min-h-[16px]">{sub}</div>
    </button>
  );
};

export const FirmGlobalKPIStrip = () => {
  const navigate = useNavigate();
  const k = useFirmGlobalKPIs();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        tone="indigo"
        icon={<Receipt className="h-4 w-4" />}
        label="Moms att betala"
        value={formatSEK(k.vatPayable)}
        loading={k.isLoading}
        sub={
          k.vatLatePeriods > 0 ? (
            <span className="text-[#7A1A1A] font-semibold">
              {k.vatLatePeriods} försenad{k.vatLatePeriods === 1 ? "" : "a"} period{k.vatLatePeriods === 1 ? "" : "er"}
            </span>
          ) : k.vatPayablePeriods > 0 ? (
            `${k.vatPayablePeriods} öppna perioder`
          ) : (
            "Inget att deklarera"
          )
        }
        onClick={() => navigate("/wl/app/vat")}
      />
      <Card
        tone="amber"
        icon={<Landmark className="h-4 w-4" />}
        label="Skatteexponering"
        value={formatSEK(k.taxExposure)}
        loading={k.isLoading}
        sub={
          k.taxHighRisk > 0 ? (
            <span className="text-[#7A1A1A] font-semibold">
              {k.taxHighRisk} med hög risk
            </span>
          ) : k.taxOpenDeclarations > 0 ? (
            `${k.taxOpenDeclarations} öppna deklarationer`
          ) : (
            "Inga aktiva deklarationer"
          )
        }
        onClick={() => navigate("/wl/app/tax")}
      />
      <Card
        tone="emerald"
        icon={<FileText className="h-4 w-4" />}
        label="Obetalda kundfakturor"
        value={formatSEK(k.unpaidAR)}
        loading={k.isLoading}
        sub={
          k.overdueARCount > 0 ? (
            <span className="text-[#7A1A1A] font-semibold">
              {k.overdueARCount} förfallna · {formatSEK(k.overdueAR)}
            </span>
          ) : k.unpaidARCount > 0 ? (
            `${k.unpaidARCount} fakturor utestående`
          ) : (
            "Inga obetalda"
          )
        }
        onClick={() => navigate("/wl/app/invoices")}
      />
      <Card
        tone="rose"
        icon={<AlertCircle className="h-4 w-4" />}
        label="Förfallna lev.fakturor"
        value={formatSEK(k.overdueAP)}
        loading={k.isLoading}
        sub={
          k.overdueAPCount > 0 ? (
            <span className="text-[#7A1A1A] font-semibold">
              {k.overdueAPCount} förfallna fakturor
            </span>
          ) : k.unpaidAPCount > 0 ? (
            `${k.unpaidAPCount} obetalda · ${formatSEK(k.unpaidAP)}`
          ) : (
            "Allt under kontroll"
          )
        }
        onClick={() => navigate("/wl/app/supplier-invoices")}
      />
    </div>
  );
};

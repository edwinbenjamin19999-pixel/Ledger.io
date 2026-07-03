import { Loader2, RefreshCw, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  iban: string;
  balance: number | null;
  currency: string;
  last_synced_at: string | null;
}

interface BankAccountsOverviewProps {
  accounts: BankAccount[];
  selectedAccount: string | null;
  onSelectAccount: (id: string) => void;
  onSync: (id: string) => void;
  syncing: boolean;
}

export function BankAccountsOverview({
  accounts,
  selectedAccount,
  onSelectAccount,
  onSync,
  syncing,
}: BankAccountsOverviewProps) {
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const positiveAccounts = accounts.filter(acc => (acc.balance || 0) > 0).length;

  const stats = [
    {
      label: "Totalt saldo",
      value: `${totalBalance.toLocaleString("sv-SE")} SEK`,
      sub: `Över ${accounts.length} konto${accounts.length !== 1 ? "n" : ""}`,
      icon: Wallet,
    },
    {
      label: "Aktiva konton",
      value: positiveAccounts.toString(),
      sub: "Konton med positivt saldo",
      icon: totalBalance >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "Senaste synk",
      value: accounts.some(a => a.last_synced_at)
        ? format(
            new Date(
              Math.max(
                ...accounts
                  .filter(a => a.last_synced_at)
                  .map(a => new Date(a.last_synced_at!).getTime())
              )
            ),
            "HH:mm",
            { locale: sv }
          )
        : "—",
      sub: "Idag",
      icon: RefreshCw,
    },
  ];

  return (
    <div className="space-y-[14px]">
      <div className="grid gap-[12px] md:grid-cols-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] flex flex-col gap-[6px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">{s.label}</span>
                <Icon className="h-[14px] w-[14px] text-[#475569]" />
              </div>
              <span className="text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A]">{s.value}</span>
              <span className="text-[11px] text-[#94A3B8]">{s.sub}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
        <div className="px-[16px] py-[12px] border-b-[0.5px] border-[#E2E8F0]">
          <h3 className="text-[13px] font-medium text-[#0F172A]">Bankkonton</h3>
          <p className="text-[11px] text-[#94A3B8] mt-[2px]">Välj ett konto för att visa transaktioner</p>
        </div>
        <div className="p-[12px] space-y-[8px]">
          {accounts.map((account) => {
            const isSelected = selectedAccount === account.id;
            return (
              <div
                key={account.id}
                onClick={() => onSelectAccount(account.id)}
                className={`p-[14px] rounded-[10px] border-[0.5px] cursor-pointer transition-colors ${
                  isSelected
                    ? "border-[#1D4ED8] bg-[#F8FAFB]"
                    : "border-[#E2E8F0] hover:bg-[#F8FAFB]"
                }`}
              >
                <div className="flex justify-between items-start mb-[10px]">
                  <div className="flex-1">
                    <div className="flex items-center gap-[8px] mb-[2px]">
                      <p className="text-[13px] font-medium text-[#0F172A]">{account.account_name}</p>
                      <span className="text-[10px] text-[#475569] bg-[#F1F5F9] border-[0.5px] border-[#E2E8F0] rounded-full px-[8px] py-px">
                        {account.bank_name}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] font-mono">{account.iban}</p>
                  </div>
                  {account.balance !== null && (
                    <div className="text-right">
                      <p className="text-[18px] font-medium tabular-nums text-[#0F172A]">
                        {account.balance.toLocaleString("sv-SE")}
                      </p>
                      <p className="text-[10px] text-[#94A3B8]">{account.currency}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-[10px] border-t-[0.5px] border-[#E2E8F0]">
                  {account.last_synced_at ? (
                    <p className="text-[11px] text-[#94A3B8]">
                      Synkad {format(new Date(account.last_synced_at), "PPp", { locale: sv })}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#94A3B8]">Aldrig synkad</p>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onSync(account.id); }}
                    disabled={syncing}
                    className="h-[30px] px-[12px] rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white text-[11px] text-[#475569] hover:bg-[#F8FAFB] inline-flex items-center gap-[6px] disabled:opacity-50"
                  >
                    {syncing ? <Loader2 className="h-[12px] w-[12px] animate-spin" /> : <RefreshCw className="h-[12px] w-[12px]" />}
                    Synka nu
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

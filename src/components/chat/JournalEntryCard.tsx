import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Pencil, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface JournalLine {
  account: string;
  accountName: string;
  debit?: number;
  credit?: number;
}

interface JournalEntryData {
  id: string;
  description: string;
  date: string;
  lines: JournalLine[];
  status: "draft" | "pending_approval" | "approved";
  autoApproved?: boolean;
  confidence?: number;
}

interface AccountSuggestion {
  account_number: string;
  account_name: string;
}

interface Props {
  entry: JournalEntryData;
  companyId: string;
  onUpdate: (updated: JournalEntryData) => void;
}

export function JournalEntryCard({ entry, companyId, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLines, setEditLines] = useState<JournalLine[]>(entry.lines);
  const [suggestions, setSuggestions] = useState<AccountSuggestion[]>([]);
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  // Load account suggestions when editing starts
  useEffect(() => {
    if (!isEditing) return;
    supabase
      .from("chart_of_accounts")
      .select("account_number, account_name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("account_number")
      .limit(200)
      .then(({ data }) => {
        if (data) setSuggestions(data);
      });
  }, [isEditing, companyId]);

  const filteredSuggestions = suggestions.filter(s =>
    s.account_number.includes(searchTerm) ||
    s.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 8);

  // Get "similar" accounts for a given line (same account class)
  const getAlternatives = (accountNumber: string) => {
    const prefix = accountNumber.substring(0, 2);
    return suggestions
      .filter(s => s.account_number.startsWith(prefix) && s.account_number !== accountNumber)
      .slice(0, 4);
  };

  const handleSelectAccount = (lineIdx: number, acct: AccountSuggestion) => {
    setEditLines(prev => prev.map((l, i) =>
      i === lineIdx ? { ...l, account: acct.account_number, accountName: acct.account_name } : l
    ));
    setActiveLineIdx(null);
    setSearchTerm("");
  };

  const handleAmountChange = (lineIdx: number, field: "debit" | "credit", value: string) => {
    const num = value === "" ? undefined : parseFloat(value.replace(/\s/g, "").replace(",", "."));
    setEditLines(prev => prev.map((l, i) =>
      i === lineIdx ? { ...l, [field]: num } : l
    ));
  };

  const handleSave = async () => {
    const totalDebit = editLines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = editLines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      toast.error("Debet och kredit balanserar inte!", {
        description: `Debet: ${totalDebit.toLocaleString("sv-SE")} kr, Kredit: ${totalCredit.toLocaleString("sv-SE")} kr`
      });
      return;
    }

    setSaving(true);
    try {
      // Delete existing lines and re-insert
      await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", entry.id);

      for (const line of editLines) {
        let { data: account } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", companyId)
          .eq("account_number", line.account)
          .maybeSingle();

        if (!account) {
          const accountType = line.account.startsWith("1") ? "asset" :
            line.account.startsWith("2") ? "liability" :
            line.account.startsWith("3") ? "revenue" :
            ["4","5","6","7"].includes(line.account[0]) ? "expense" : "other";

          const { data: newAcc } = await supabase
            .from("chart_of_accounts")
            .insert({ company_id: companyId, account_number: line.account, account_name: line.accountName, account_type: accountType })
            .select()
            .maybeSingle();
          account = newAcc;
        }

        if (account) {
          await supabase.from("journal_entry_lines").insert({
            journal_entry_id: entry.id,
            account_id: account.id,
            debit: line.debit || null,
            credit: line.credit || null,
          });
        }
      }

      onUpdate({ ...entry, lines: editLines });
      setIsEditing(false);
      toast.success("Verifikat uppdaterat!");
    } catch (e) {
      toast.error("Kunde inte spara ändringar");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    const { error } = await supabase
      .from("journal_entries")
      .update({ status: "approved", approved_by: (await supabase.auth.getUser()).data.user?.id })
      .eq("id", entry.id);
    if (error) { toast.error("Kunde inte godkänna"); return; }
    onUpdate({ ...entry, status: "approved" });
    toast.success("Verifikat godkänt! ✅");
  };

  const handleReject = async () => {
    const { error } = await supabase
      .from("journal_entries")
      .update({ status: "rejected" })
      .eq("id", entry.id);
    if (error) { toast.error("Kunde inte avvisa"); return; }
    onUpdate({ ...entry, status: "draft" });
    toast.info("Verifikat avvisat");
  };

  return (
    <Card className="p-4 bg-[#E1F5EE] dark:bg-green-950/30 border-[#BFE6D6] dark:border-green-800">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-5 h-5 text-[#085041]" />
        <span className="font-semibold text-[#085041] dark:text-[#1D9E75]">
          Verifikat skapat
        </span>
        {entry.confidence && (
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
            entry.confidence >= 0.95 ? "bg-[#E1F5EE] text-[#085041]" :
            entry.confidence >= 0.8 ? "bg-[#FAEEDA] text-[#7A5417]" :
            "bg-[#FCE8E8] text-[#7A1A1A]"
          )}>
            {Math.round(entry.confidence * 100)}% säkerhet
          </span>
        )}
        <Badge
          variant={entry.status === "approved" ? "default" : "secondary"}
          className="ml-auto"
        >
          {entry.status === "approved"
            ? (entry.autoApproved ? "Auto-godkänt" : "Godkänt")
            : entry.status === "pending_approval"
            ? "Väntar på godkännande"
            : "Utkast"}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {entry.description} • {entry.date}
      </p>

      {/* Table — view or edit mode */}
      <div className="bg-background/60 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium">Konto</th>
              <th className="text-right p-2 font-medium">Debet</th>
              <th className="text-right p-2 font-medium">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {(isEditing ? editLines : entry.lines).map((line, i) => (
              <tr key={i} className="border-b last:border-0 relative">
                <td className="p-2">
                  {isEditing ? (
                    <div className="relative">
                      <button
                        onClick={() => { setActiveLineIdx(activeLineIdx === i ? null : i); setSearchTerm(""); }}
                        className="flex items-center gap-1 text-left w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                      >
                        <span className="font-mono text-xs text-muted-foreground">{line.account}</span>{" "}
                        <span className="truncate">{line.accountName}</span>
                        <ChevronDown className="w-3 h-3 ml-auto flex-shrink-0 text-muted-foreground" />
                      </button>

                      {activeLineIdx === i && (
                        <div className="absolute z-50 left-0 top-full mt-1 w-72 bg-popover border rounded-lg shadow-lg p-2 space-y-2">
                          {/* Search */}
                          <Input
                            placeholder="Sök konto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                          />

                          {/* AI alternatives */}
                          {!searchTerm && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 mb-1">
                                Föreslagna alternativ
                              </p>
                              {getAlternatives(line.account).map(alt => (
                                <button
                                  key={alt.account_number}
                                  onClick={() => handleSelectAccount(i, alt)}
                                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center gap-2"
                                >
                                  <span className="font-mono text-xs text-primary">{alt.account_number}</span>
                                  <span className="truncate">{alt.account_name}</span>
                                </button>
                              ))}
                              {getAlternatives(line.account).length === 0 && (
                                <p className="text-xs text-muted-foreground px-2 py-1">Inga alternativ i samma kontoklass</p>
                              )}
                            </div>
                          )}

                          {/* Search results */}
                          {searchTerm && (
                            <div className="max-h-40 overflow-y-auto">
                              {filteredSuggestions.map(s => (
                                <button
                                  key={s.account_number}
                                  onClick={() => handleSelectAccount(i, s)}
                                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center gap-2"
                                >
                                  <span className="font-mono text-xs text-primary">{s.account_number}</span>
                                  <span className="truncate">{s.account_name}</span>
                                </button>
                              ))}
                              {filteredSuggestions.length === 0 && (
                                <p className="text-xs text-muted-foreground px-2 py-1">Inga konton hittades</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="font-mono text-xs text-muted-foreground">{line.account}</span>{" "}
                      {line.accountName}
                    </>
                  )}
                </td>
                <td className="text-right p-2 font-mono">
                  {isEditing ? (
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={line.debit != null ? String(line.debit) : ""}
                      onChange={e => handleAmountChange(i, "debit", e.target.value)}
                      className="h-7 w-24 text-right text-sm ml-auto"
                      placeholder="-"
                    />
                  ) : (
                    line.debit ? line.debit.toLocaleString("sv-SE") + " kr" : "-"
                  )}
                </td>
                <td className="text-right p-2 font-mono">
                  {isEditing ? (
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={line.credit != null ? String(line.credit) : ""}
                      onChange={e => handleAmountChange(i, "credit", e.target.value)}
                      className="h-7 w-24 text-right text-sm ml-auto"
                      placeholder="-"
                    />
                  ) : (
                    line.credit ? line.credit.toLocaleString("sv-SE") + " kr" : "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit mode balance indicator */}
      {isEditing && (() => {
        const totalDebit = editLines.reduce((s, l) => s + (l.debit || 0), 0);
        const totalCredit = editLines.reduce((s, l) => s + (l.credit || 0), 0);
        const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
        return (
          <div className={cn("mt-2 text-xs font-medium px-2 py-1 rounded flex justify-between",
            balanced ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#FCE8E8] text-[#7A1A1A]"
          )}>
            <span>Debet: {totalDebit.toLocaleString("sv-SE")} kr</span>
            <span>Kredit: {totalCredit.toLocaleString("sv-SE")} kr</span>
            <span>{balanced ? "✓ Balanserar" : "✗ Obalans"}</span>
          </div>
        );
      })()}

      {/* Action buttons */}
      {entry.status === "pending_approval" && !isEditing && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1" onClick={handleApprove}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Godkänn
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setEditLines([...entry.lines]); setIsEditing(true); }}>
            <Pencil className="w-4 h-4 mr-1" /> Redigera
          </Button>
          <Button size="sm" variant="outline" onClick={handleReject}>
            Avvisa
          </Button>
        </div>
      )}

      {isEditing && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Sparar..." : "Spara ändringar"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditLines([...entry.lines]); }}>
            <X className="w-4 h-4 mr-1" /> Avbryt
          </Button>
        </div>
      )}
    </Card>
  );
}

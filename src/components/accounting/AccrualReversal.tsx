import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RotateCcw, Search, Link2, Calendar, Loader2, Bot, ArrowRightLeft } from "lucide-react";

interface JournalEntry { id: string;
  entry_number: number;
  entry_date: string;
  description: string;
  status: string;
  journal_entry_lines: { account_id: string;
    debit: number;
    credit: number;
    vat_code: string | null;
    chart_of_accounts: { account_number: string; account_name: string };
  }[];
}

interface AccrualReversalProps { companyId: string;
  onEntryCreated?: () => void;
}

export const AccrualReversal = ({ companyId, onEntryCreated }: AccrualReversalProps) => { const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [reversalDate, setReversalDate] = useState("");
  const [reversalType, setReversalType] = useState<"full" | "partial">("full");
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // Default reversal date to first of next month
  useEffect(() => { const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setReversalDate(nextMonth.toISOString().split("T")[0]);
  }, [isOpen]);

  const searchEntries = async () => { if (!searchTerm || searchTerm.length < 2) return;
    setIsSearching(true);
    try { const num = parseInt(searchTerm);
      const isNum = !isNaN(num);

      let query: any = supabase
        .from("journal_entries")
        .select(`
          id, entry_number, entry_date, description, status,
          journal_entry_lines (
            account_id, debit, credit, vat_code,
            chart_of_accounts ( account_number, account_name )
          )
        `)
        .eq("company_id", companyId)
        .order("entry_date", { ascending: false })
        .limit(20);

      if (isNum) { query = query.eq("entry_number", num);
      } else { query = query.ilike("description", `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) { console.error("Search error:", error);
      toast.error("Kunde inte söka verifikat");
    } finally { setIsSearching(false);
    }
  };

  const selectEntry = (entry: JournalEntry) => { setSelectedEntry(entry);
    // Check if this looks like a periodization
    const desc = entry.description.toLowerCase();
    if (desc.includes("periodis") || desc.includes("upplupen") || desc.includes("accrual") || desc.includes("reserv")) { setAiSuggestion(`Detta verkar vara en periodisering. Återföring föreslås till ${reversalDate}.`);
    } else { setAiSuggestion(null);
    }
  };

  const createReversal = async () => { if (!selectedEntry || !reversalDate) return;
    setIsCreating(true);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      // Create reversed entry
      const { data: newEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({ company_id: companyId,
          entry_date: reversalDate,
          description: `Återföring av Ver #${selectedEntry.entry_number}: ${selectedEntry.description}`,
          status: "draft",
          created_by: user.id,
          series_code: "M",
        })
        .select()
        .maybeSingle();

      if (entryError || !newEntry) throw entryError || new Error("Kunde inte skapa verifikat");

      // Reverse all lines (swap debit/credit)
      const reversedLines = selectedEntry.journal_entry_lines.map(line => ({ journal_entry_id: newEntry.id,
        account_id: line.account_id,
        debit: line.credit,
        credit: line.debit,
        vat_code: line.vat_code,
      }));

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(reversedLines);

      if (linesError) throw linesError;

      toast.success(`Återföring skapad! Ver #${selectedEntry.entry_number} återförd per ${reversalDate}`);
      setIsOpen(false);
      setSelectedEntry(null);
      setSearchTerm("");
      setSearchResults([]);
      onEntryCreated?.();
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa återföring");
    } finally { setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-[34px] rounded-[8px] text-[12px] border-[#E2E8F0] text-[#0F172A]">
          <RotateCcw className="w-4 h-4 mr-2" />
          Periodisering / Återför
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[12px] border-[0.5px] border-[#E2E8F0] shadow-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px] font-medium text-[#0F172A]">
            <ArrowRightLeft className="h-5 w-5 text-[#1E3A5F]" />
            Periodisering & Återföring
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Search existing entries */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-[#475569]">Sök verifikat att återföra</Label>
            <div className="flex gap-2">
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchEntries()}
                placeholder="Sök på ver.nr, beskrivning eller belopp..."
                className="h-[34px] rounded-[8px] border-[#E2E8F0] text-[12px]"
              />
              <Button size="sm" variant="outline" onClick={searchEntries} disabled={isSearching} className="h-[34px] rounded-[8px] border-[#E2E8F0] shrink-0">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border-[0.5px] border-[#E2E8F0] rounded-[8px] max-h-48 overflow-y-auto">
              {searchResults.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => selectEntry(entry)}
                  className={`w-full text-left p-[12px] border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] transition-colors ${
                    selectedEntry?.id === entry.id ? "bg-[#EFF6FF]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-medium text-[#0F172A]">Ver #{entry.entry_number}</span>
                    <span className="text-[11px] text-[#64748B]">{entry.entry_date}</span>
                  </div>
                  <p className="text-[12px] text-[#475569] truncate mt-0.5">{entry.description}</p>
                  <div className="flex gap-1 mt-1">
                    <span className="inline-flex items-center rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[6px] py-px border-[0.5px] bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]">
                      {entry.journal_entry_lines.length} rader
                    </span>
                    <span className={`inline-flex items-center rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[6px] py-px border-[0.5px] ${
                      entry.status === "approved" ? "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" : "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]"
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected entry preview */}
          {selectedEntry && (
            <div className="rounded-[8px] border-[0.5px] border-[#E2E8F0] p-[12px] bg-[#F8FAFC] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#1E3A5F]" />
                  <span className="font-medium text-[12px] text-[#0F172A]">Originalverifikat: Ver #{selectedEntry.entry_number}</span>
                </div>
                <span className="text-[11px] text-[#64748B]">{selectedEntry.entry_date}</span>
              </div>
              <p className="text-[12px] text-[#475569]">{selectedEntry.description}</p>

              <table className="w-full text-[11px]">
                <thead className="bg-white">
                  <tr>
                    <th className="p-[6px] text-left font-medium text-[#64748B]">Konto</th>
                    <th className="p-[6px] text-right font-medium text-[#64748B]">Debet</th>
                    <th className="p-[6px] text-right font-medium text-[#64748B]">Kredit</th>
                    <th className="p-[6px] text-right font-medium text-[#1E3A5F]">→ Återförd D</th>
                    <th className="p-[6px] text-right font-medium text-[#1E3A5F]">→ Återförd K</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntry.journal_entry_lines.map((line, i) => (
                    <tr key={i} className="border-t border-[#E2E8F0]">
                      <td className="p-[6px] font-mono text-[#0F172A]">{line.chart_of_accounts.account_number} {line.chart_of_accounts.account_name}</td>
                      <td className="p-[6px] text-right font-mono text-[#0F172A]">{line.debit > 0 ? line.debit.toFixed(2) : "—"}</td>
                      <td className="p-[6px] text-right font-mono text-[#0F172A]">{line.credit > 0 ? line.credit.toFixed(2) : "—"}</td>
                      <td className="p-[6px] text-right font-mono text-[#1E3A5F]">{line.credit > 0 ? line.credit.toFixed(2) : "—"}</td>
                      <td className="p-[6px] text-right font-mono text-[#1E3A5F]">{line.debit > 0 ? line.debit.toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {aiSuggestion && (
                <div className="flex items-start gap-2 p-[10px] rounded-[8px] bg-[#EFF6FF] border-[0.5px] border-[#C8DDF5]">
                  <Bot className="w-4 h-4 text-[#1E3A5F] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[#1E3A5F]">{aiSuggestion}</p>
                </div>
              )}
            </div>
          )}

          {/* Reversal settings */}
          {selectedEntry && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-[#475569] flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Återföringsdatum
                </Label>
                <Input type="date" value={reversalDate} onChange={e => setReversalDate(e.target.value)} className="h-[34px] rounded-[8px] border-[#E2E8F0] text-[12px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-[#475569]">Typ</Label>
                <Select value={reversalType} onValueChange={(v: "full" | "partial") => setReversalType(v)}>
                  <SelectTrigger className="h-[34px] rounded-[8px] border-[#E2E8F0] text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Fullständig återföring</SelectItem>
                    <SelectItem value="partial">Delvis (kommande)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="h-[34px] rounded-[8px] text-[12px] border-[#E2E8F0]">Avbryt</Button>
            <Button
              size="sm"
              onClick={createReversal}
              disabled={!selectedEntry || !reversalDate || isCreating}
              className="h-[34px] rounded-[8px] text-[12px] bg-[#0F1F3D] hover:bg-[#15294D] text-white"
            >
              {isCreating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Skapar...</> : <><RotateCcw className="w-4 h-4 mr-1" />Skapa återföring</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

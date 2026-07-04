import { X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ACCOUNT_TYPE_MAP, ACCOUNT_TYPE_LABELS, ACCOUNT_CLASSES, VAT_OPTIONS, type Account } from "./useChartOfAccounts";

interface Props {
  open: boolean;
  editingAccount: Account | null;
  formNumber: string; setFormNumber: (v: string) => void;
  formName: string; setFormName: (v: string) => void;
  formVatCode: string; setFormVatCode: (v: string) => void;
  formType: string; setFormType: (v: string) => void;
  formActive: boolean; setFormActive: (v: boolean) => void;
  formOrigin: "bas" | "custom"; setFormOrigin: (v: "bas" | "custom") => void;
  formNote: string; setFormNote: (v: string) => void;
  formError: string;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function AccountDrawer({
  open, editingAccount,
  formNumber, setFormNumber, formName, setFormName,
  formVatCode, setFormVatCode, formType, setFormType,
  formActive, setFormActive, formOrigin, setFormOrigin,
  formNote, setFormNote, formError, saving, onSave, onClose,
}: Props) {
  const classHint = formNumber.length >= 1
    ? ACCOUNT_CLASSES.find(c => c.prefix === parseInt(formNumber[0]))?.label
    : null;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed right-0 top-0 h-full w-[440px] bg-white shadow-lg border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">
              {editingAccount ? "Redigera konto" : "Lägg till konto"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {editingAccount ? `Konto ${editingAccount.account_number}` : "Nytt konto i kontoplanen"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Grunduppgifter */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Grunduppgifter</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Kontonummer *</label>
                <input
                  type="text"
                  placeholder="t.ex. 1510"
                  value={formNumber}
                  onChange={e => setFormNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  disabled={!!editingAccount}
                  maxLength={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                />
                {classHint && <p className="text-[11px] text-slate-400 mt-1">{classHint}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Kontonamn *</label>
                <input
                  type="text"
                  placeholder="t.ex. Kundfordringar"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Kontotyp *</label>
                <select
                  value={formType || (formNumber.length >= 1 ? (ACCOUNT_TYPE_MAP[formNumber[0]] || "") : "")}
                  onChange={e => setFormType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                >
                  <option value="">Välj typ…</option>
                  <option value="asset">Tillgång</option>
                  <option value="liability">Skuld</option>
                  <option value="income">Intäkt</option>
                  <option value="expense">Kostnad</option>
                  <option value="equity">Eget kapital</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Avgör hur kontot visas i balans- och resultaträkning.</p>
              </div>
            </div>
          </div>

          {/* Momsinställningar */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Momsinställningar</h3>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Momskod</label>
              <select
                value={formVatCode}
                onChange={e => setFormVatCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
              >
                {VAT_OPTIONS.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Kopplar kontot till rätt momsrapportering.</p>
            </div>
          </div>

          {/* Kontostatus */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Kontostatus</h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-800">Aktivt konto</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Inaktiva konton visas inte i bokföringsvyer.</p>
              </div>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>

          {/* Kontotyp BAS/Custom */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Kontotyp</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setFormOrigin("bas")}
                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all text-left ${
                  formOrigin === "bas"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                <p>BAS-standard</p>
                <p className={`text-[11px] mt-0.5 ${formOrigin === "bas" ? "text-slate-400" : "text-slate-400"}`}>Del av BAS 2026</p>
              </button>
              <button
                onClick={() => setFormOrigin("custom")}
                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all text-left ${
                  formOrigin === "custom"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                <p>Eget konto</p>
                <p className="text-[11px] mt-0.5 opacity-70">Utanför BAS-standard</p>
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Intern notering <span className="text-slate-400 font-normal">(valfritt)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Intern kommentar om kontots användning…"
              value={formNote}
              onChange={e => setFormNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none resize-none"
            />
          </div>

          {formError && <p className="text-sm text-[#7A1A1A] font-medium">{formError}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-white flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            Avbryt
          </button>
          <button onClick={onSave} disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 shadow-md shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-50">
            {saving ? "Sparar…" : editingAccount ? "Spara ändringar" : "Lägg till konto"}
          </button>
        </div>
      </div>
    </>
  );
}

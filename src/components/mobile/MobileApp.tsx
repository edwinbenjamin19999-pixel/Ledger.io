import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { MobileTopBar } from "./MobileTopBar";
import { MobileNavBar, type MobileTab } from "./MobileNavBar";
import { MobileHome } from "./tabs/MobileHome";
import { MobileReceipts } from "./tabs/MobileReceipts";
import { MobileDocuments } from "./tabs/MobileDocuments";
import { MobileApprovals } from "./tabs/MobileApprovals";
import { MobileChat } from "./tabs/MobileChat";
import { MobileExpenses } from "./tabs/MobileExpenses";
import { MobileSupplierInvoices } from "./tabs/MobileSupplierInvoices";
import { OfflineBanner } from "./OfflineBanner";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { MobileChatFAB } from "./MobileChatFAB";
import { Camera, Receipt, FileBox, Sparkles, ChevronRight } from "lucide-react";

interface MobileAppProps {
  user: User;
  signOut: () => Promise<void>;
}

export const MobileApp = ({ user, signOut }: MobileAppProps) => {
  const [tab, setTab] = useState<MobileTab>("home");
  // Remember which view the user came from before entering chat so the
  // back arrow can return them there with their session history intact.
  const [previousTab, setPreviousTab] = useState<MobileTab>("home");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [receiptSegment, setReceiptSegment] = useState<"receipt" | "expense">("receipt");
  const [moreOpen, setMoreOpen] = useState(false);

  const openChat = (message?: string) => {
    if (tab !== "chat") setPreviousTab(tab);
    if (message) setPendingMessage(message);
    setTab("chat");
  };

  const handleNavigateWithMessage = (targetTab: MobileTab, message: string) => {
    if (targetTab === "chat") {
      openChat(message);
      return;
    }
    setPendingMessage(message);
    setTab(targetTab);
  };

  const handleNavigate = (t: MobileTab) => {
    if (t === "more") {
      setMoreOpen(true);
      return;
    }
    if (t === "chat") {
      openChat();
      return;
    }
    if (t === "invoices") {
      // Mobile "Fakturor" maps to receipts segment (existing invoice flow)
      setReceiptSegment("receipt");
      setTab("invoices");
      return;
    }
    if (t === "receipts") {
      setReceiptSegment("receipt");
    }
    setTab(t);
  };

  const handleNavigateToExpense = () => setTab("expenses");

  useEffect(() => {
    const handler = () => setTab("approvals");
    window.addEventListener("mobile:open-verifications", handler);
    return () => window.removeEventListener("mobile:open-verifications", handler);
  }, []);

  // Compute the active tab the bottom nav should highlight
  const activeNavTab: MobileTab =
    tab === "documents" || tab === "expenses" || tab === "chat" || tab === "receipts"
      ? "more"
      : tab;

  const moreItems: { id: MobileTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: "receipts", label: "Kvitton & underlag", icon: Camera, color: "#0040CC" },
    { id: "expenses", label: "Utlägg", icon: Receipt, color: "#1D9E75" },
    { id: "documents", label: "Dokument", icon: FileBox, color: "#94A3B8" },
    { id: "chat", label: "Fråga AI", icon: Sparkles, color: "#3b82f6" },
  ];

  const isChat = tab === "chat";

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <OfflineBanner />
      {!isChat && <MobileTopBar user={user} signOut={signOut} />}
      <main className={isChat ? "flex-1 min-h-0 overflow-hidden" : "flex-1 overflow-y-auto pb-28"}>
        {tab === "home" && (
          <MobileHome
            user={user}
            onNavigate={handleNavigate}
            onNavigateWithMessage={handleNavigateWithMessage}
            onNavigateToExpense={handleNavigateToExpense}
          />
        )}
        {tab === "invoices" && <MobileSupplierInvoices />}
        {tab === "receipts" && <MobileReceipts initialSegment={receiptSegment} />}
        {tab === "expenses" && <MobileExpenses user={user} />}
        {tab === "documents" && <MobileDocuments />}
        {tab === "approvals" && <MobileApprovals onNavigate={(t) => setTab(t as MobileTab)} />}
        {isChat && (
          <MobileChat
            user={user}
            initialMessage={pendingMessage}
            onInitialMessageConsumed={() => setPendingMessage(null)}
            onBack={() => setTab(previousTab)}
          />
        )}
      </main>
      {!isChat && <MobileNavBar active={activeNavTab} onChange={handleNavigate} />}
      <MobileChatFAB onClick={() => openChat()} hidden={isChat} />

      {/* "Mer" bottom sheet — exposes secondary destinations */}
      <MobileBottomSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <div className="px-5 pb-6">
          <h3 className="text-[20px] font-semibold text-[#0F172A] mb-4">Mer</h3>
          <div className="space-y-2">
            {moreItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setMoreOpen(false);
                  if (item.id === "chat") openChat();
                  else setTab(item.id);
                }}
                className="w-full bg-white border-[0.5px] border-[#E2E8F0] active:bg-[#F8FAFB] rounded-2xl px-4 py-3 flex items-center gap-3 min-h-[60px]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFB] flex items-center justify-center flex-shrink-0">
                  <item.icon size={20} color={item.color} strokeWidth={1.75} />
                </div>
                <span className="flex-1 text-left text-[15px] font-medium text-[#0F172A]">{item.label}</span>
                <ChevronRight size={18} color="#CBD5E1" />
              </button>
            ))}
          </div>
          <button
            onClick={async () => { setMoreOpen(false); await signOut(); }}
            className="mt-6 w-full h-[48px] rounded-xl border border-[#E2E8F0] text-[15px] text-[#64748B] active:bg-[#F8FAFB]"
          >
            Logga ut
          </button>
        </div>
      </MobileBottomSheet>
    </div>
  );
};

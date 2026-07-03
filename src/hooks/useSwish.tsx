import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";

function useCompanyId() { const [companyId, setCompanyId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY)
  );
  useEffect(() => { const handler = () => setCompanyId(localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY));
    window.addEventListener("storage", handler);
    const timer = setTimeout(handler, 300);
    return () => { window.removeEventListener("storage", handler);
      clearTimeout(timer);
    };
  }, []);
  return companyId;
}

export interface SwishConnection { id: string;
  company_id: string;
  merchant_number: string | null;
  bank_name: string | null;
  connection_type: string;
  is_active: boolean;
  certificate_uploaded: boolean;
}

export interface SwishPayment { id: string;
  company_id: string;
  amount: number;
  currency: string;
  sender_phone: string | null;
  sender_name: string | null;
  message: string | null;
  swish_reference: string | null;
  payment_date: string;
  matched_invoice_id: string | null;
  match_status: string;
  match_confidence: number | null;
  booked: boolean;
  ai_suggestion?: string | null;
}

export interface SwishPaymentRequest { id: string;
  company_id: string;
  invoice_id: string | null;
  amount: number;
  phone_number: string;
  message: string | null;
  status: string;
  sent_at: string | null;
  paid_at: string | null;
}

interface MonthlySummary { totalReceived: number;
  totalCount: number;
  autoMatched: number;
  autoMatchedAmount: number;
  manualReview: number;
  manualReviewAmount: number;
  matchRate: number;
  todayReceived: number;
  todayCount: number;
}

export function useSwish() { const selectedCompanyId = useCompanyId();
  const [connection, setConnection] = useState<SwishConnection | null>(null);
  const [payments, setPayments] = useState<SwishPayment[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<SwishPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadData = useCallback(async () => { if (!selectedCompanyId) { setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try { const [connRes, payRes, reqRes] = await Promise.all([
        supabase
          .from("swish_connections")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("swish_payments")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .order("payment_date", { ascending: false })
          .limit(200),
        supabase
          .from("swish_payment_requests")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (connRes.error) throw connRes.error;
      if (payRes.error) throw payRes.error;
      if (reqRes.error) throw reqRes.error;

      setConnection(connRes.data as SwishConnection | null);
      setPayments((payRes.data || []) as SwishPayment[]);
      setPaymentRequests((reqRes.data || []) as SwishPaymentRequest[]);
      loadedRef.current = true;
    } catch (err: any) { console.error("Failed to load Swish data:", err);
      setError(err?.message || "Kunde inte ladda Swish-data");
    } finally { setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => { loadedRef.current = false;
    loadData();
  }, [loadData]);

  // Safety timeout — never show spinner > 3s
  useEffect(() => { const timer = setTimeout(() => { if (!loadedRef.current) { setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [selectedCompanyId]);

  async function setupConnection(data: { connectionType: string;
    merchantNumber?: string;
    bankName?: string;
  }) { if (!selectedCompanyId) return;
    const { error } = await supabase.from("swish_connections").insert({ company_id: selectedCompanyId,
      connection_type: data.connectionType,
      merchant_number: data.merchantNumber || null,
      bank_name: data.bankName || null,
      certificate_uploaded: false,
    });
    if (error) { toast.error("Kunde inte spara Swish-anslutning");
      return;
    }
    toast.success("Swish-anslutning sparad");
    await loadData();
  }

  async function matchPaymentToInvoice(paymentId: string, invoiceId: string) { const { error } = await supabase
      .from("swish_payments")
      .update({ matched_invoice_id: invoiceId,
        match_status: "matched",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (error) { toast.error("Kunde inte matcha betalning");
      return;
    }
    toast.success("Betalning matchad mot faktura");
    await loadData();
  }

  async function markAsDirectSale(paymentId: string) { const { error } = await supabase
      .from("swish_payments")
      .update({ match_status: "direct_sale",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (error) { toast.error("Kunde inte uppdatera betalning");
      return;
    }
    toast.success("Markerad som direktförsäljning");
    await loadData();
  }

  async function dismissPayment(paymentId: string) { const { error } = await supabase
      .from("swish_payments")
      .update({ match_status: "dismissed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (error) { toast.error("Kunde inte avvisa betalning");
      return;
    }
    toast.success("Betalning avvisad");
    await loadData();
  }

  async function sendPaymentRequest(data: { invoiceId?: string;
    amount: number;
    phoneNumber: string;
    message?: string;
  }) { if (!selectedCompanyId) return;
    const { error } = await supabase.from("swish_payment_requests").insert({ company_id: selectedCompanyId,
      invoice_id: data.invoiceId || null,
      amount: data.amount,
      phone_number: data.phoneNumber,
      message: data.message || null,
      status: "sent",
      sent_at: new Date().toISOString(),
    });
    if (error) { toast.error("Kunde inte skicka Swish-förfrågan");
      return;
    }
    toast.success(`Swish-förfrågan skickad till ${data.phoneNumber}`);
    await loadData();
  }

  const unmatchedPayments = payments.filter((p) => p.match_status === "unmatched");
  const matchedPayments = payments.filter(
    (p) => p.match_status === "matched" || p.match_status === "direct_sale"
  );

  const monthlySummary: MonthlySummary = (() => { const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthPayments = payments.filter((p) => { const d = new Date(p.payment_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const todayPayments = payments.filter((p) => p.payment_date?.startsWith(today));
    const matched = monthPayments.filter(
      (p) => p.match_status === "matched" || p.match_status === "direct_sale"
    );
    const unmatched = monthPayments.filter((p) => p.match_status === "unmatched");
    const totalReceived = monthPayments.reduce((s, p) => s + p.amount, 0);
    const autoMatchedAmount = matched.reduce((s, p) => s + p.amount, 0);
    const manualReviewAmount = unmatched.reduce((s, p) => s + p.amount, 0);
    return { totalReceived,
      totalCount: monthPayments.length,
      autoMatched: matched.length,
      autoMatchedAmount,
      manualReview: unmatched.length,
      manualReviewAmount,
      matchRate:
        monthPayments.length > 0
          ? Math.round((matched.length / monthPayments.length) * 100)
          : 0,
      todayReceived: todayPayments.reduce((s, p) => s + p.amount, 0),
      todayCount: todayPayments.length,
    };
  })();

  return { connection,
    payments,
    paymentRequests,
    unmatchedPayments,
    matchedPayments,
    monthlySummary,
    loading,
    error,
    setupConnection,
    matchPaymentToInvoice,
    markAsDirectSale,
    dismissPayment,
    sendPaymentRequest,
    reload: loadData,
  };
}

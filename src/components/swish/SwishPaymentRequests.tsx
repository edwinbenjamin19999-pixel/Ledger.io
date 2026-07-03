import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, Smartphone } from "lucide-react";
import type { SwishPaymentRequest } from "@/hooks/useSwish";

interface SwishPaymentRequestsProps { requests: SwishPaymentRequest[];
  onSendRequest: (data: { amount: number;
    phoneNumber: string;
    message?: string;
    invoiceId?: string;
  }) => Promise<void>;
}

function formatKr(amount: number) { return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(amount);
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = { pending: { label: "Väntar", variant: "secondary" },
  sent: { label: "Skickad", variant: "outline" },
  paid: { label: "Betald", variant: "default" },
  declined: { label: "Avvisad", variant: "destructive" },
  expired: { label: "Utgången", variant: "secondary" },
};

export function SwishPaymentRequests({ requests, onSendRequest }: SwishPaymentRequestsProps) { const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => { if (!phone || !amount) return;
    setSending(true);
    await onSendRequest({ phoneNumber: phone,
      amount: parseFloat(amount),
      message: message || undefined,
    });
    setSending(false);
    setOpen(false);
    setPhone("");
    setAmount("");
    setMessage("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Swish-förfrågningar</h3>
          <p className="text-sm text-muted-foreground">Skicka betalningsförfrågningar direkt till kunders Swish</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Skicka Swish-förfrågan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Skicka Swish-förfrågan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobilnummer</Label>
                <Input
                  id="phone"
                  placeholder="070-123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Belopp (kr)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="4 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Meddelande (valfritt)</Label>
                <Input
                  id="message"
                  placeholder="Faktura #2024-0041"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button onClick={handleSend} disabled={!phone || !amount || sending} className="w-full">
                {sending ? "Skickar..." : "Skicka förfrågan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "#41B5AC20" }}>
              <Smartphone className="h-6 w-6" style={{ color: "#41B5AC" }} />
            </div>
            <h3 className="text-lg font-medium">Inga Swish-förfrågningar ännu</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Skicka din första betalningsförfrågan till en kund.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => { const status = statusLabels[req.status] || statusLabels.pending;
            return (
              <Card key={req.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{req.phone_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.sent_at
                        ? new Date(req.sent_at).toLocaleDateString("sv-SE")
                        : "Ej skickad"}
                      {req.message && ` — ${req.message}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{formatKr(req.amount)}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

interface BankNotificationsProps { companyId: string; }

const SEVERITY: Record<string, { dot: string; bg: string; border: string; iconColor: string; Icon: any }> = {
  error:   { dot: "bg-[#E24B4A]", bg: "bg-[#FCE8E8]", border: "border-[#F4C9C9]", iconColor: "text-[#9C2E2D]", Icon: AlertTriangle },
  warning: { dot: "bg-[#C68316]", bg: "bg-[#FAEEDA]", border: "border-[#EDD9B0]", iconColor: "text-[#8A5A14]", Icon: AlertTriangle },
  info:    { dot: "bg-[#1D4ED8]", bg: "bg-[#E6F4FA]", border: "border-[#C8DDF5]", iconColor: "text-[#1D4ED8]", Icon: Info },
};

export function BankNotifications({ companyId }: BankNotificationsProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    const channel = supabase
      .channel('bank-notifications')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bank_notifications', filter: `company_id=eq.${companyId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev]);
            const notif = payload.new as Notification;
            toast({ title: notif.title, description: notif.message, variant: notif.severity === 'error' ? 'destructive' : 'default' });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_notifications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const cleaned = (data || []).filter(n => !n.message.includes('Infinity') && !n.message.includes('NaN'));
      const seen = new Map<string, Notification>();
      for (const n of cleaned) {
        const key = n.message.substring(0, 40);
        if (!seen.has(key) || new Date(n.created_at) > new Date(seen.get(key)!.created_at)) seen.set(key, n);
      }
      setNotifications(Array.from(seen.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('bank_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const dismiss = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] py-[20px] text-center text-[12px] text-[#94A3B8]">Laddar notifikationer...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[16px]">
        <div className="flex items-center gap-[8px] mb-[6px]">
          <Bell className="h-[14px] w-[14px] text-[#475569]" />
          <h3 className="text-[13px] font-medium text-[#0F172A]">Notifikationer</h3>
        </div>
        <p className="text-[12px] text-[#94A3B8]">Inga notifikationer just nu</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
      <div className="px-[16px] py-[12px] border-b-[0.5px] border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          <Bell className="h-[14px] w-[14px] text-[#475569]" />
          <h3 className="text-[13px] font-medium text-[#0F172A]">Notifikationer</h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-[8px] h-[20px] rounded-full text-[10px] font-medium bg-[#FCE8E8] text-[#9C2E2D]">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={async () => { for (const n of notifications.filter(n => !n.is_read)) await markAsRead(n.id); }}
            className="h-[28px] px-[10px] text-[11px] text-[#475569] hover:bg-[#F8FAFB] rounded-[6px] inline-flex items-center gap-[4px]"
          >
            <CheckCircle className="h-[12px] w-[12px]" />
            Markera alla som lästa
          </button>
        )}
      </div>
      <div className="p-[12px] space-y-[8px]">
        {notifications.map((n) => {
          const cfg = SEVERITY[n.severity] || SEVERITY.info;
          const Icon = cfg.Icon;
          return (
            <div
              key={n.id}
              className={`p-[12px] rounded-[10px] border-[0.5px] transition-opacity ${
                n.is_read ? "border-[#E2E8F0] bg-white opacity-60" : `${cfg.bg} ${cfg.border}`
              }`}
            >
              <div className="flex items-start justify-between gap-[10px]">
                <div className="flex items-start gap-[10px] flex-1">
                  <Icon className={`h-[14px] w-[14px] mt-px ${cfg.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[6px] mb-[2px]">
                      <p className="text-[12px] font-medium text-[#0F172A]">{n.title}</p>
                      {!n.is_read && (
                        <span className="inline-flex items-center px-[6px] h-[16px] rounded-full text-[10px] font-medium bg-[#1D4ED8] text-white">Ny</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#475569] line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-[2px]">{format(new Date(n.created_at), "PPp", { locale: sv })}</p>
                  </div>
                </div>
                <div className="flex gap-[2px]">
                  {!n.is_read && (
                    <button onClick={() => markAsRead(n.id)} className="h-[24px] w-[24px] rounded-[6px] hover:bg-white/60 inline-flex items-center justify-center">
                      <CheckCircle className="h-[12px] w-[12px] text-[#475569]" />
                    </button>
                  )}
                  <button onClick={() => dismiss(n.id)} className="h-[24px] w-[24px] rounded-[6px] hover:bg-white/60 inline-flex items-center justify-center">
                    <X className="h-[12px] w-[12px] text-[#475569]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

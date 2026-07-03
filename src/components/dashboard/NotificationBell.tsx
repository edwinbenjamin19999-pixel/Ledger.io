import { useState, useEffect } from "react";
import { Bell, CheckCircle2, FileText, AlertCircle, Clock, Shield, Send, AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PendingItem { id: string;
  type: 'journal_approval' | 'bank_transaction' | 'invoice' | 'agreement' | 'overdue_customer' | 'reminder_sent' | 'collection' | 'trial_ending' | 'subscription_expired';
  title: string;
  description: string;
  createdAt: string;
  path: string;
  priority?: 'high' | 'normal';
}

export const NotificationBell = () => { const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => { if (user) { loadPendingItems();
    }
  }, [user]);

  // Reload notifications every time the popover opens
  useEffect(() => { if (open && user) { loadPendingItems();
    }
  }, [open]);

  const loadPendingItems = async () => { if (!user) return;
    
    setLoading(true);
    const items: PendingItem[] = [];

    try { // Check för unsigned service agreement first (highest priority)
      const { data: activeAgreement } = await supabase
        .from('service_agreements')
        .select('id, title')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeAgreement) { const { data: userAgreement } = await supabase
          .from('user_agreements')
          .select('status')
          .eq('user_id', user.id)
          .eq('agreement_id', activeAgreement.id)
          .eq('status', 'signed')
          .maybeSingle();

        if (!userAgreement) { items.push({ id: activeAgreement.id,
            type: 'agreement',
            title: 'Tjänsteavtal kräver signering',
            description: 'Signera för att fortsätta använda tjänsten',
            createdAt: new Date().toISOString(),
            path: '/agreement',
            priority: 'high'
          });
        }
      }

      // Get companies user has access to
      const { data: roles } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id);

      const companyIds = roles?.map(r => r.company_id) || [];

      if (companyIds.length === 0 && items.length === 0) { setPendingItems([]);
        setLoading(false);
        return;
      }

      // Check subscription status för trial/expired notifications
      if (companyIds.length > 0) { const { data: companies } = await supabase
          .from('companies')
          .select('id, subscription_status, subscription_end_date, stripe_subscription_id')
          .in('id', companyIds)
          .limit(1)
          .maybeSingle();

        if (companies) { if (companies.subscription_status === 'trialing' && companies.stripe_subscription_id) { // Check days left via check-subscription
            const { data: subData } = await supabase.functions.invoke("check-subscription");
            if (subData?.subscription_end) { const endDate = new Date(subData.subscription_end);
              const now = new Date();
              const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysLeft <= 7 && daysLeft > 0) { items.push({ id: 'trial-ending',
                  type: 'trial_ending',
                  title: `${daysLeft} dagar kvar av provperioden`,
                  description: 'Lägg till betalmetod för att fortsätta',
                  createdAt: new Date().toISOString(),
                  path: '/settings',
                  priority: daysLeft <= 3 ? 'high' : 'normal'
                });
              }
            }
          } else if (companies.subscription_status === 'past_due' || companies.subscription_status === 'unpaid') { items.push({ id: 'subscription-expired',
              type: 'subscription_expired',
              title: 'Prenumeration saknas',
              description: 'Aktivera prenumeration för full åtkomst',
              createdAt: new Date().toISOString(),
              path: '/settings',
              priority: 'high'
            });
          }
        }
      }

      if (companyIds.length === 0) { setPendingItems(items);
        setLoading(false);
        return;
      }

      // Get pending journal entries (draft only - matches DashboardStats)
      const { data: pendingJournals } = await supabase
        .from('journal_entries')
        .select('id, description, created_at, status')
        .in('company_id', companyIds)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(10);

      if (pendingJournals) { pendingJournals.forEach(journal => { items.push({ id: journal.id,
            type: 'journal_approval',
            title: 'Utkast att granska',
            description: journal.description || 'Verifikation utan beskrivning',
            createdAt: journal.created_at,
            path: '/accounting'
          });
        });
      }

      // Get pending payroll runs (draft - matches DashboardStats)
      const { data: pendingPayrolls } = await supabase
        .from('payroll_runs')
        .select('id, period_start, period_end, created_at, total_employer_cost')
        .in('company_id', companyIds)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(5);

      if (pendingPayrolls) { pendingPayrolls.forEach(payroll => { items.push({ id: payroll.id,
            type: 'journal_approval',
            title: 'Lönekörning att godkänna',
            description: `${payroll.period_start} – ${payroll.period_end} - ${payroll.total_employer_cost?.toLocaleString() || 0} SEK`,
            createdAt: payroll.created_at,
            path: '/hr'
          });
        });
      }

      // Get unmatched bank transactions
      const { data: unmatchedTransactions } = await supabase
        .from('bank_transactions')
        .select('id, description, amount, created_at')
        .in('company_id', companyIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (unmatchedTransactions) { unmatchedTransactions.forEach(tx => { items.push({ id: tx.id,
            type: 'bank_transaction',
            title: 'Oavstämd transaktion',
            description: `${tx.description || 'Banktransaktion'} - ${tx.amount} SEK`,
            createdAt: tx.created_at,
            path: '/bank'
          });
        });
      }

      // Get overdue OUTGOING invoices (customers need to pay us) - with reminder/collection status
      const { data: overdueCustomerInvoices } = await supabase
        .from('invoices')
        .select('id, counterparty_name, total_amount, due_date, reminder_count, collection_status')
        .in('company_id', companyIds)
        .eq('invoice_direction', 'outgoing')
        .in('status', ['sent', 'overdue'])
        .lt('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(10);

      if (overdueCustomerInvoices) { overdueCustomerInvoices.forEach(invoice => { if (invoice.collection_status === 'sent_to_collection') { items.push({ id: invoice.id,
              type: 'collection',
              title: 'Inkassofordring',
              description: `${invoice.counterparty_name} - ${invoice.total_amount} SEK`,
              createdAt: invoice.due_date,
              path: '/invoices',
              priority: 'high'
            });
          } else if (invoice.reminder_count > 0) { items.push({ id: invoice.id,
              type: 'reminder_sent',
              title: `Påminnelse ${invoice.reminder_count} skickad`,
              description: `${invoice.counterparty_name} - ${invoice.total_amount} SEK`,
              createdAt: invoice.due_date,
              path: '/invoices',
              priority: 'normal'
            });
          } else { items.push({ id: invoice.id,
              type: 'overdue_customer',
              title: 'Förfallen kundfaktura',
              description: `${invoice.counterparty_name} - ${invoice.total_amount} SEK`,
              createdAt: invoice.due_date,
              path: '/invoices',
              priority: 'normal'
            });
          }
        });
      }

      // Get unpaid INCOMING invoices (we need to pay suppliers)
      const { data: unpaidSupplierInvoices } = await supabase
        .from('invoices')
        .select('id, counterparty_name, total_amount, due_date')
        .in('company_id', companyIds)
        .eq('invoice_direction', 'incoming')
        .in('status', ['sent', 'draft'])
        .order('due_date', { ascending: true })
        .limit(5);

      if (unpaidSupplierInvoices) { unpaidSupplierInvoices.forEach(invoice => { const dueDate = new Date(invoice.due_date);
          const isOverdue = dueDate < new Date();
          items.push({ id: invoice.id,
            type: 'invoice',
            title: isOverdue ? 'Förfallen leverantörsfaktura' : 'Leverantörsfaktura att betala',
            description: `${invoice.counterparty_name} - ${invoice.total_amount} SEK`,
            createdAt: invoice.due_date,
            path: '/invoices'
          });
        });
      }

      setPendingItems(items);
    } catch (error) { console.error('Error loading pending items:', error);
    } finally { setLoading(false);
    }
  };

  const handleItemClick = (item: PendingItem) => { setOpen(false);
    navigate(item.path);
  };

  const getItemIcon = (type: PendingItem['type']) => { switch (type) { case 'agreement':
        return <Shield className="h-4 w-4 text-destructive" />;
      case 'journal_approval':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'bank_transaction':
        return <AlertCircle className="h-4 w-4 text-[#7A5417]" />;
      case 'invoice':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'overdue_customer':
        return <AlertTriangle className="h-4 w-4 text-[#7A5417]" />;
      case 'reminder_sent':
        return <Send className="h-4 w-4 text-orange-500" />;
      case 'collection':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'trial_ending':
        return <Clock className="h-4 w-4 text-[#7A5417]" />;
      case 'subscription_expired':
        return <CreditCard className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // Sort by priority
  const sortedItems = [...pendingItems].sort((a, b) => { if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;
    return 0;
  });

  const totalCount = pendingItems.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground"
            >
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
          <span className="sr-only">Notifikationer</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Att göra</h3>
          <p className="text-sm text-muted-foreground">
            {totalCount === 0 
              ? 'Inget att åtgärda just nu'
              : `${totalCount} ${totalCount === 1 ? 'uppgift' : 'uppgifter'} kräver din uppmärksamhet`
            }
          </p>
        </div>
        
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Laddar...
          </div>
        ) : totalCount === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-[#085041] mb-2" />
            <p className="text-sm text-muted-foreground">Allt är klart!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y">
              {sortedItems.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleItemClick(item)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-start gap-3 ${ item.priority === 'high' ? 'bg-destructive/5' : ''
                  }`}
                >
                  <div className="mt-0.5">{getItemIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${ item.priority === 'high' ? 'text-destructive' : ''
                    }`}>{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                  {item.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs shrink-0">Viktigt</Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {totalCount > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={() => { setOpen(false);
                // Navigate to agreement if unsigned, otherwise to accounting
                const hasUnsignedAgreement = sortedItems.some(i => i.type === 'agreement');
                navigate(hasUnsignedAgreement ? '/agreement' : '/accounting');
              }}
            >
              {sortedItems.some(i => i.type === 'agreement') 
                ? 'Signera avtal' 
                : 'Visa alla uppgifter'}
            </Button>
          </div>
        )}
        
        {totalCount > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={() => { setOpen(false);
                navigate('/accounting');
              }}
            >
              Visa alla verifikationer
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const AccountDeletion = () => { const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<any>(null);

  useEffect(() => { checkPendingDeletion();
  }, [user]);

  const checkPendingDeletion = async () => { if (!user) return;

    try { const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setPendingDeletion(data);
    } catch (error: any) { console.error('Error checking deletion status:', error);
    }
  };

  const handleDeleteRequest = async () => { if (!confirmed) { toast.error("Du måste bekräfta att du förstår konsekvenserna");
      return;
    }

    setLoading(true);
    try { const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) { toast.error("Du måste vara inloggad");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user-account`,
        { method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'request' })
        }
      );

      if (!response.ok) { const error = await response.json();
        throw new Error(error.error || 'Kunde inte skapa raderingsbegäran');
      }

      const result = await response.json();
      toast.success(result.message);
      await checkPendingDeletion();
    } catch (error: any) { toast.error(error.message);
    } finally { setLoading(false);
      setConfirmed(false);
    }
  };

  const handleCancelDeletion = async () => { setLoading(true);
    try { const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) { toast.error("Du måste vara inloggad");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user-account`,
        { method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'cancel' })
        }
      );

      if (!response.ok) { const error = await response.json();
        throw new Error(error.error || 'Kunde inte avbryta radering');
      }

      const result = await response.json();
      toast.success(result.message);
      setPendingDeletion(null);
    } catch (error: any) { toast.error(error.message);
    } finally { setLoading(false);
    }
  };

  if (pendingDeletion) { const scheduledDate = new Date(pendingDeletion.scheduled_deletion_date);
    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Kontoradering schemalagd</CardTitle>
          </div>
          <CardDescription>
            Ditt konto är schemalagt att raderas den {scheduledDate.toLocaleDateString('sv-SE')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Din data kommer att raderas permanent efter grace period på 30 dagar.
              Du har {Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dagar kvar att avbryta.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleCancelDeletion}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Avbryter...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                Avbryt radering
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          <CardTitle>Radera mitt konto</CardTitle>
        </div>
        <CardDescription>
          Permanent radering av ditt konto och all tillhörande data enligt GDPR artikel 17 (Rätten att bli glömd)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Varning:</strong> Denna åtgärd kan inte ångras. All din data kommer att raderas permanent efter 30 dagars grace period.
          </AlertDescription>
        </Alert>

        <div className="text-sm text-muted-foreground space-y-2">
          <p>När du raderar ditt konto kommer följande att hända:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Din profilinformation raderas</li>
            <li>Alla roller och behörigheter tas bort</li>
            <li>Din åtkomst till alla företag upphör</li>
            <li>Personliga inställningar och data raderas</li>
            <li>Du har 30 dagar på dig att avbryta raderingen</li>
          </ul>
          <p className="pt-2 font-medium">
            OBS: Bokföringsdata kan behöva bevaras i 7 år enligt svensk lag, även efter kontoborttagning.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="confirm-deletion" 
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked as boolean)}
          />
          <Label 
            htmlFor="confirm-deletion" 
            className="text-sm font-normal cursor-pointer"
          >
            Jag förstår att denna åtgärd raderar mitt konto permanent
          </Label>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              disabled={!confirmed || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bearbetar...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Radera mitt konto
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Är du helt säker?</AlertDialogTitle>
              <AlertDialogDescription>
                Detta kommer att starta en 30-dagars grace period. Under denna period kan du avbryta raderingen. 
                Efter 30 dagar raderas ditt konto och all data permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Ja, radera mitt konto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

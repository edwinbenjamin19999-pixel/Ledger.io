import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface HealthStatus { database: 'healthy' | 'degraded' | 'down';
  auth: 'healthy' | 'degraded' | 'down';
  storage: 'healthy' | 'degraded' | 'down';
  functions: 'healthy' | 'degraded' | 'down';
}

export const SystemHealthCheck = () => { const [health, setHealth] = useState<HealthStatus>({ database: 'healthy',
    auth: 'healthy',
    storage: 'healthy',
    functions: 'healthy',
  });
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => { checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => { const newHealth: HealthStatus = { database: 'healthy',
      auth: 'healthy',
      storage: 'healthy',
      functions: 'healthy',
    };

    try { // Test database - treat empty results as healthy (no data yet is not an error)
      const { error: dbError } = await supabase.from('companies').select('id').limit(1);
      if (dbError && dbError.code !== 'PGRST116') newHealth.database = 'degraded';

      // Test auth
      const { error: authError } = await supabase.auth.getSession();
      if (authError) newHealth.auth = 'degraded';

      // Test functions (health check)
      try { const { error: funcError } = await supabase.functions.invoke('health-check');
        if (funcError) newHealth.functions = 'degraded';
      } catch { newHealth.functions = 'degraded';
      }

      setHealth(newHealth);
      setLastCheck(new Date());
    } catch (error) { console.error('Health check failed:', error);
    }
  };

  const getStatusIcon = (status: string) => { if (status === 'healthy') return <CheckCircle className="w-4 h-4 text-[#085041]" />;
    if (status === 'degraded') return <AlertCircle className="w-4 h-4 text-[#7A5417]" />;
    return <AlertCircle className="w-4 h-4 text-[#7A1A1A]" />;
  };

  const getStatusBadge = (status: string) => { if (status === 'healthy') return <Badge variant="default" className="bg-green-600">Fungerar</Badge>;
    if (status === 'degraded') return <Badge variant="secondary" className="bg-yellow-600 text-white">Försämrad</Badge>;
    return <Badge variant="destructive">Nere</Badge>;
  };

  const overallHealthy = Object.values(health).every(s => s === 'healthy');

  return (
    <Card className={`border-l-4 ${overallHealthy ? 'border-l-green-600' : 'border-l-yellow-600'}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {getStatusIcon(overallHealthy ? 'healthy' : 'degraded')}
            <span className="font-semibold">Systemhälsa</span>
          </div>
          {getStatusBadge(overallHealthy ? 'healthy' : 'degraded')}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Databas</span>
            {getStatusIcon(health.database)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Autentisering</span>
            {getStatusIcon(health.auth)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Backend-funktioner</span>
            {getStatusIcon(health.functions)}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-4">
          <Clock className="w-3 h-3" />
          <span>Senaste kontroll: {lastCheck.toLocaleTimeString('sv-SE')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Activity } from "lucide-react";
import { toast } from "sonner";

interface HealthStatus { status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  tests: any[];
  fixes: any[];
  totalLatency?: number;
}

export function SystemHealthMonitor() { const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>("");

  useEffect(() => { checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => { try { const { data, error } = await supabase.functions.invoke('health-check');
      
      if (error) throw error;
      
      if (data) { const previousStatus = health?.status;
        setHealth(data);
        setLastCheck(new Date().toLocaleTimeString('sv-SE'));
        
        // Alert on status change
        if (previousStatus && previousStatus !== data.status) { if (data.status === 'critical') { toast.error('System status: Critical', { description: 'Automatic recovery in progress',
            });
          } else if (data.status === 'degraded') { toast.warning('System status: Degraded', { description: 'Some features may be affected',
            });
          } else if (data.status === 'healthy') { toast.success('System recovered', { description: 'All systems operational',
            });
          }
        }
      }
    } catch (error) { console.error('Health check failed:', error);
      setHealth({ status: 'critical',
        timestamp: new Date().toISOString(),
        tests: [],
        fixes: [],
      });
    } finally { setIsLoading(false);
    }
  };

  if (isLoading) { return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 animate-spin" />
          <span className="text-sm">Checking system health...</span>
        </div>
      </Card>
    );
  }

  if (!health) return null;

  const StatusIcon = health.status === 'healthy' ? CheckCircle : AlertCircle;
  const statusColor = 
    health.status === 'healthy' ? 'text-[#085041]' : 
    health.status === 'degraded' ? 'text-[#7A5417]' : 
    'text-[#7A1A1A]';

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusColor}`} />
            <span className="font-semibold">System Health</span>
          </div>
          <Badge 
            variant={ health.status === 'healthy' ? 'default' : 
              health.status === 'degraded' ? 'secondary' : 
              'destructive'
            }
          >
            {health.status}
          </Badge>
        </div>

        {lastCheck && (
          <p className="text-xs text-muted-foreground">
            Last check: {lastCheck}
          </p>
        )}

        {health.totalLatency && (
          <p className="text-xs text-muted-foreground">
            Response time: {health.totalLatency}ms
          </p>
        )}

        {health.tests && health.tests.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Tests:</p>
            {health.tests.map((test, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                {test.passed ? (
                  <CheckCircle className="h-3 w-3 text-[#085041]" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-[#7A1A1A]" />
                )}
                <span>{test.name}</span>
                {test.latency && (
                  <span className="text-muted-foreground">({test.latency}ms)</span>
                )}
              </div>
            ))}
          </div>
        )}

        {health.fixes && health.fixes.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-blue-500">Auto-fixes applied:</p>
            {health.fixes.map((fix, idx) => (
              <div key={idx} className="text-xs text-muted-foreground">
                • {fix.action}: {fix.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

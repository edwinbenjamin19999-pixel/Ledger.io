import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, 
  XCircle, 
  Loader2, 
  Play,
  Database,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Shield
} from "lucide-react";

interface TestResult { name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  icon: any;
}

export const SystemTester = () => { const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Databasanslutning', status: 'pending', icon: Database },
    { name: 'Autentisering & Roller', status: 'pending', icon: Users },
    { name: 'Kontoplan & Verifikationer', status: 'pending', icon: FileText },
    { name: 'Lön & HR', status: 'pending', icon: DollarSign },
    { name: 'Bank & Transaktioner', status: 'pending', icon: TrendingUp },
    { name: 'GDPR & Säkerhet', status: 'pending', icon: Shield },
  ]);

  const runTest = async (index: number, testFn: () => Promise<void>) => { setTests(prev => prev.map((t, i) => 
      i === index ? { ...t, status: 'running' } : t
    ));

    try { await testFn();
      setTests(prev => prev.map((t, i) => 
        i === index ? { ...t, status: 'passed', message: 'Test lyckades ✓' } : t
      ));
    } catch (error: any) { setTests(prev => prev.map((t, i) => 
        i === index ? { ...t, status: 'failed', message: error.message } : t
      ));
    }
  };

  const testDatabase = async () => { const { error } = await supabase.from('companies').select('id').limit(1);
    if (error && error.code !== 'PGRST116') throw new Error('Databasanslutning misslyckades: ' + error.message);
    // Empty result is OK — means no data yet, not a system error
  };

  const testAuth = async () => { const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Ingen aktiv session');
    
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);
    
    if (error) throw new Error('Kunde inte hämta roller');
    if (!roles || roles.length === 0) throw new Error('Inga roller tilldelade');
  };

  const testAccounting = async () => { const { error: accError } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .limit(1);
    
    if (accError && accError.code !== 'PGRST116') throw new Error('Kunde inte hämta kontoplan: ' + accError.message);
    
    const { error: entryError } = await supabase
      .from('journal_entries')
      .select('id')
      .limit(1);
    
    if (entryError && entryError.code !== 'PGRST116') throw new Error('Kunde inte hämta verifikationer: ' + entryError.message);
  };

  const testHR = async () => { const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id')
      .limit(1);
    
    if (empError) throw new Error('Kunde inte hämta anställda');
    
    const { data: payroll, error: payrollError } = await supabase
      .from('payroll_runs')
      .select('id')
      .limit(1);
    
    if (payrollError) throw new Error('Kunde inte hämta lönekörningar');
  };

  const testBank = async () => { const { data: accounts, error: accError } = await supabase
      .from('bank_accounts')
      .select('id')
      .limit(1);
    
    if (accError) throw new Error('Kunde inte hämta bankkonton');
    
    const { data: transactions, error: transError } = await supabase
      .from('bank_transactions')
      .select('id')
      .limit(1);
    
    if (transError) throw new Error('Kunde inte hämta transaktioner');
  };

  const testGDPR = async () => { const { data: consents, error: consentError } = await supabase
      .from('user_consents')
      .select('id')
      .limit(1);
    
    if (consentError) throw new Error('Kunde inte hämta samtycken');
    
    const { data: logs, error: logError } = await supabase
      .from('audit_events')
      .select('id')
      .limit(1);
    
    if (logError) throw new Error('Kunde inte hämta audit logs');
  };

  const runAllTests = async () => { setTesting(true);
    setProgress(0);
    let failCount = 0;
    
    const testFunctions = [
      testDatabase,
      testAuth,
      testAccounting,
      testHR,
      testBank,
      testGDPR,
    ];

    for (let i = 0; i < testFunctions.length; i++) {
      try {
        setTests(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'running' } : t));
        await testFunctions[i]();
        setTests(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'passed', message: 'Test lyckades ✓' } : t));
      } catch (error: any) {
        failCount++;
        setTests(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'failed', message: error.message } : t));
      }
      setProgress(((i + 1) / testFunctions.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTesting(false);
    
    if (failCount === 0) { toast.success('Alla tester godkända! 🎉');
    } else { toast.error(`${failCount} test(er) misslyckades`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Systemtester</CardTitle>
            <CardDescription>
              Testa alla funktioner i plattformen
            </CardDescription>
          </div>
          <Button 
            onClick={runAllTests} 
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testar...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Kör alla tester
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {testing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="space-y-2">
          {tests.map((test, index) => { const Icon = test.icon;
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${ test.status === 'running' ? 'bg-[#EFF6FF] border-[#C8DDF5]' :
                  test.status === 'passed' ? 'bg-[#E1F5EE] border-[#BFE6D6]' :
                  test.status === 'failed' ? 'bg-[#FCE8E8] border-[#F4C8C8]' :
                  ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{test.name}</p>
                    {test.message && (
                      <p className="text-xs text-muted-foreground mt-1">{test.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  {test.status === 'pending' && (
                    <Badge variant="secondary">Väntar</Badge>
                  )}
                  {test.status === 'running' && (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  )}
                  {test.status === 'passed' && (
                    <CheckCircle className="w-5 h-5 text-[#085041]" />
                  )}
                  {test.status === 'failed' && (
                    <XCircle className="w-5 h-5 text-[#7A1A1A]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

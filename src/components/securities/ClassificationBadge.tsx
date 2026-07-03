import { Badge } from '@/components/ui/badge';
import { confidenceLabel } from '@/lib/securities/classifier';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, AlertTriangle } from 'lucide-react';

interface Props {
  confidence?: number | null;
  classifiedBy?: 'ai' | 'user' | 'rule' | null;
  flags?: string[];
}

export function ClassificationBadge({ confidence, classifiedBy = 'ai', flags = [] }: Props) {
  if (confidence == null) {
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Oklassificerad
      </Badge>
    );
  }
  const { label, tone } = confidenceLabel(confidence);
  const variant: 'default' | 'destructive' | 'secondary' | 'outline' =
    tone === 'success' ? 'default' : tone === 'warning' ? 'secondary' : 'destructive';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} className="gap-1">
          {classifiedBy === 'ai' && <Sparkles className="h-3 w-3" />}
          {label} · {Math.round(confidence * 100)}%
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <div>Klassificerad av: <strong>{classifiedBy === 'ai' ? 'AI' : classifiedBy === 'user' ? 'Användare' : 'Regel'}</strong></div>
          {flags.length > 0 && (
            <div>
              Flaggor: {flags.join(', ')}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

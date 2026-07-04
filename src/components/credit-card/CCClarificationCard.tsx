import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

interface CCClarificationCardProps {
  question: string;
  options: string[];
  onAnswer: (answer: string) => void;
}

export function CCClarificationCard({ question, options, onAnswer }: CCClarificationCardProps) {
  return (
    <Card className="border-[#F0DDB7] bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/40">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-[#7A5417] mt-0.5 shrink-0" />
          <div className="space-y-2 flex-1">
            <p className="text-sm text-[#7A5417] dark:text-amber-200">{question}</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map(opt => (
                <Button
                  key={opt}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-[#F0DDB7] hover:bg-[#FAEEDA] dark:border-amber-700 dark:hover:bg-amber-900/30"
                  onClick={() => onAnswer(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

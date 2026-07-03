import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import type { Intent } from "@/data/guides/articles/types";

export interface GenerateInput {
  topic: string;
  keyword: string;
  difficulty: Intent;
  batchSize: number;
  availableSlugs: string[];
}

interface Props {
  allSlugs: string[];
  loading: boolean;
  onGenerate: (input: GenerateInput) => void;
}

const INTENT_OPTIONS: { value: Intent; label: string; help: string }[] = [
  { value: "beginner", label: "Beginner", help: "Förklarande, definitionsfokuserat" },
  { value: "transactional", label: "Transactional", help: "Hur-gör-jag, steg-för-steg" },
  { value: "compliance", label: "Compliance", help: "Regler, lagkrav, deadlines" },
  { value: "business", label: "Business", help: "Strategi, analys, beslutsstöd" },
];

export const ArticleInputForm = ({ allSlugs, loading, onGenerate }: Props) => {
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [difficulty, setDifficulty] = useState<Intent>("transactional");
  const [batchSize, setBatchSize] = useState(1);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const toggleSlug = (s: string) => {
    setSelectedSlugs((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const canGenerate = topic.trim().length >= 3 && keyword.trim().length >= 2 && !loading;

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="topic" className="text-sm font-medium">Topic</Label>
        <Textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: Hur du bokför en leverantörsfaktura med moms"
          rows={3}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="keyword" className="text-sm font-medium">Target keyword</Label>
        <Input
          id="keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="bokföra leverantörsfaktura"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Difficulty / intent</Label>
        <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Intent)}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            {INTENT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.help}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-sm font-medium">Batch size</Label>
          <span className="text-sm font-mono text-slate-600">{batchSize}</span>
        </div>
        <Slider value={[batchSize]} onValueChange={([v]) => setBatchSize(v)} min={1} max={5} step={1} />
        <p className="mt-1 text-xs text-muted-foreground">{batchSize === 1 ? "En artikel" : `${batchSize} artiklar med olika vinklar`}</p>
      </div>

      <div>
        <Label className="text-sm font-medium">Förslag på relaterade slugs</Label>
        <p className="text-xs text-muted-foreground mb-2">AI:n får välja 2–3 från denna lista (annars använder den alla).</p>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto rounded-lg border border-slate-900/[0.06] bg-slate-50/60 p-2">
          {allSlugs.map((s) => (
            <Badge
              key={s}
              variant={selectedSlugs.includes(s) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => toggleSlug(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <Button
        disabled={!canGenerate}
        onClick={() => onGenerate({
          topic: topic.trim(), keyword: keyword.trim(), difficulty, batchSize,
          availableSlugs: selectedSlugs.length > 0 ? selectedSlugs : allSlugs,
        })}
        className="w-full bg-gradient-to-br from-[#3b82f6] to-[#3b82f6] text-white hover:from-[#3b82f6] hover:to-[#155e75] shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)]"
        size="lg"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {loading ? "Genererar…" : `Generera ${batchSize} artikel${batchSize > 1 ? "ar" : ""}`}
      </Button>
    </div>
  );
};

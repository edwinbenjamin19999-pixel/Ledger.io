// VersionHistoryPanel — list, snapshot, restore + simple unified text diff for AR drafts.
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { History, Pin, RotateCcw, GitCompare, Save } from "lucide-react";
import { useVersions, type ARVersion } from "@/hooks/annual-report-v2/useVersions";

interface Props {
  annualReportId: string | null;
  trigger?: React.ReactNode;
}

export function VersionHistoryPanel({ annualReportId, trigger }: Props) {
  const { data: versions = [], isLoading, snapshot, restore } = useVersions(annualReportId);
  const [open, setOpen] = useState(false);
  const [namedDialog, setNamedDialog] = useState(false);
  const [namedLabel, setNamedLabel] = useState("");
  const [restoreVersion, setRestoreVersion] = useState<ARVersion | null>(null);
  const [diffA, setDiffA] = useState<string | null>(null);
  const [diffB, setDiffB] = useState<string | null>(null);

  const named = useMemo(() => versions.filter((v) => (v as any).is_named), [versions]);
  const auto = useMemo(() => versions.filter((v) => !(v as any).is_named), [versions]);

  const versionA = versions.find((v) => v.id === diffA);
  const versionB = versions.find((v) => v.id === diffB);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-1.5" />
              Versionshistorik
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Versionshistorik</SheetTitle>
          </SheetHeader>

          {!annualReportId ? (
            <p className="text-sm text-muted-foreground mt-6">Välj en årsredovisning för att se versioner.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setNamedDialog(true)}>
                  <Save className="h-4 w-4 mr-1.5" />
                  Spara namngiven version
                </Button>
                {diffA && diffB && (
                  <Badge variant="outline" className="text-xs">
                    Jämför: {versionA?.label || `v${versionA?.version_number}`} ↔ {versionB?.label || `v${versionB?.version_number}`}
                  </Badge>
                )}
              </div>

              {isLoading && <p className="text-sm text-muted-foreground">Läser in versioner...</p>}

              {named.length > 0 && (
                <Section title="Namngivna versioner">
                  {named.map((v) => (
                    <VersionRow
                      key={v.id} v={v}
                      onRestore={() => setRestoreVersion(v)}
                      onDiffA={() => setDiffA(v.id)}
                      onDiffB={() => setDiffB(v.id)}
                      isA={diffA === v.id}
                      isB={diffB === v.id}
                    />
                  ))}
                </Section>
              )}

              <Section title={`Auto-versioner (${auto.length})`}>
                {auto.length === 0 && <p className="text-xs text-muted-foreground">Inga auto-versioner ännu.</p>}
                {auto.slice(0, 50).map((v) => (
                  <VersionRow
                    key={v.id} v={v}
                    onRestore={() => setRestoreVersion(v)}
                    onDiffA={() => setDiffA(v.id)}
                    onDiffB={() => setDiffB(v.id)}
                    isA={diffA === v.id}
                    isB={diffB === v.id}
                  />
                ))}
              </Section>

              {versionA && versionB && (
                <DiffView a={versionA} b={versionB} onClose={() => { setDiffA(null); setDiffB(null); }} />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Named version dialog */}
      <Dialog open={namedDialog} onOpenChange={setNamedDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Spara namngiven version</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="t.ex. Revisorsutkast 1, Styrelseversion, Slutversion" value={namedLabel} onChange={(e) => setNamedLabel(e.target.value)} />
            <p className="text-xs text-muted-foreground">Namngivna versioner pinnas och rensas aldrig automatiskt.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNamedDialog(false)}>Avbryt</Button>
            <Button
              onClick={async () => {
                await snapshot.mutateAsync({ label: namedLabel.trim() || "Namngiven version" });
                setNamedLabel(""); setNamedDialog(false);
              }}
              disabled={snapshot.isPending}
            >
              <Pin className="h-4 w-4 mr-1.5" />
              {snapshot.isPending ? "Sparar..." : "Spara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirm */}
      <Dialog open={!!restoreVersion} onOpenChange={(o) => !o && setRestoreVersion(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Återställ version?</DialogTitle></DialogHeader>
          <p className="text-sm">
            Detta ersätter nuvarande version med {restoreVersion?.label || `v${restoreVersion?.version_number}`}.
            Nuvarande version sparas som ny snapshot före återställning.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreVersion(null)}>Avbryt</Button>
            <Button
              onClick={async () => {
                if (!restoreVersion) return;
                await restore.mutateAsync(restoreVersion.id);
                setRestoreVersion(null);
              }}
              disabled={restore.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              {restore.isPending ? "Återställer..." : "Återställ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function VersionRow({ v, onRestore, onDiffA, onDiffB, isA, isB }: {
  v: ARVersion; onRestore: () => void; onDiffA: () => void; onDiffB: () => void; isA: boolean; isB: boolean;
}) {
  const isNamed = (v as any).is_named;
  const summary = (v as any).change_summary as string | undefined;
  return (
    <div className="flex items-center justify-between border rounded-md p-2.5 text-sm hover:bg-muted/40">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {isNamed && <Pin className="h-3 w-3 text-blue-600" />}
          <span className="font-medium truncate">{v.label || `v${v.version_number}`}</span>
          <Badge variant="outline" className="text-[10px]">{v.status}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {format(parseISO(v.created_at), "yyyy-MM-dd HH:mm", { locale: sv })}
          {summary ? ` · ${summary}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button size="sm" variant={isA ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={onDiffA}>A</Button>
        <Button size="sm" variant={isB ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={onDiffB}>B</Button>
        <Button size="sm" variant="outline" className="h-7" onClick={onRestore}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Återställ
        </Button>
      </div>
    </div>
  );
}

// Simple unified text diff over JSON snapshots (string-level line diff)
function DiffView({ a, b, onClose }: { a: ARVersion; b: ARVersion; onClose: () => void }) {
  const linesA = JSON.stringify(a.snapshot, null, 2).split("\n");
  const linesB = JSON.stringify(b.snapshot, null, 2).split("\n");
  const setA = new Set(linesA);
  const setB = new Set(linesB);
  const removed = linesA.filter((l) => !setB.has(l));
  const added = linesB.filter((l) => !setA.has(l));

  return (
    <div className="border rounded-md p-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5"><GitCompare className="h-4 w-4" />Diff</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>Stäng</Button>
      </div>
      {removed.length === 0 && added.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Inga skillnader.</p>
      ) : (
        <div className="font-mono text-xs space-y-0.5 max-h-72 overflow-y-auto">
          {removed.slice(0, 200).map((l, i) => (
            <div key={`r-${i}`} className="bg-red-50 text-red-900 px-2 py-0.5">- {l}</div>
          ))}
          {added.slice(0, 200).map((l, i) => (
            <div key={`a-${i}`} className="bg-emerald-50 text-emerald-900 px-2 py-0.5">+ {l}</div>
          ))}
          {(removed.length > 200 || added.length > 200) && (
            <div className="text-muted-foreground py-1">… (förkortad)</div>
          )}
        </div>
      )}
    </div>
  );
}

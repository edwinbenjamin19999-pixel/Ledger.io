import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Star } from "lucide-react";

interface PeerCompany { id: number;
  name: string;
  revenue: string;
  ebitda: number;
  employees: number;
  growth: number;
  liquidity: number;
  rating: number;
  aiInsight: string;
}

function generatePeers(sniCode: string, sizeRange: string): PeerCompany[] { const base = sniCode === "62" ? [
    { name: "Peer A", revenue: "1,2 MSEK", ebitda: 18, employees: 2, growth: 34, liquidity: 2.1, rating: 4, aiInsight: "Har 34% tillväxt vid 18% EBITDA — de offrar marginal för tillväxt. Möjligt: de investerar i personal (personalkostnadsandel P75) och marknadsföring (P72)." },
    { name: "Peer B", revenue: "1,8 MSEK", ebitda: 24, employees: 3, growth: 12, liquidity: 1.8, rating: 3, aiInsight: "Stabil tillväxt med balanserad kostnadsprofil. Fokuserar troligen på befintliga kunder med hög retentionsgrad." },
    { name: "Peer C", revenue: "0,9 MSEK", ebitda: 32, employees: 1, growth: -5, liquidity: 4.2, rating: 3, aiInsight: "Hög marginal men krympande omsättning. Typiskt mönster: soloprenör med mättad kapacitet som inte anställer." },
    { name: "Peer D", revenue: "2,1 MSEK", ebitda: 15, employees: 4, growth: 45, liquidity: 1.2, rating: 4, aiInsight: "Snabbast växande i peergruppen. Investerar aggressivt i personal — kan vara i skalningsfas med temporärt pressad likviditet." },
    { name: "Peer E", revenue: "1,5 MSEK", ebitda: 21, employees: 2, growth: 8, liquidity: 2.5, rating: 3, aiInsight: "Normalprofil för segmentet. Stabil tillväxt med god balans mellan marginal och investering." },
  ] : [
    { name: "Peer A", revenue: "1,0 MSEK", ebitda: 12, employees: 3, growth: 15, liquidity: 1.5, rating: 3, aiInsight: "Genomsnittlig profil med fokus på kundrelationer." },
    { name: "Peer B", revenue: "1,4 MSEK", ebitda: 8, employees: 5, growth: 22, liquidity: 1.1, rating: 3, aiInsight: "Tillväxtfokuserat med pressade marginaler." },
    { name: "Peer C", revenue: "0,8 MSEK", ebitda: 20, employees: 1, growth: 0, liquidity: 3.0, rating: 3, aiInsight: "Soloprenör med hög marginal men ingen tillväxt." },
    { name: "Peer D", revenue: "1,9 MSEK", ebitda: 10, employees: 4, growth: 30, liquidity: 0.9, rating: 4, aiInsight: "Snabb tillväxt men låg likviditet — riskabel expansion." },
    { name: "Peer E", revenue: "1,2 MSEK", ebitda: 14, employees: 2, growth: 5, liquidity: 2.0, rating: 3, aiInsight: "Stabil och förutsägbar verksamhet." },
  ];

  return base.map((p, i) => ({ ...p, id: i + 1 }));
}

function RatingStars({ rating }: { rating: number }) { return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-400 text-[#C28A2B]" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

interface CompetitorProfilesProps { sniCode: string;
  sizeRange: string;
  employeeRange: string;
  region: string;
}

export function CompetitorProfiles({ sniCode, sizeRange, employeeRange, region }: CompetitorProfilesProps) { const peers = generatePeers(sniCode, sizeRange);
  const sniLabel = sniCode === "62" ? "Dataprogrammering" : sniCode === "70" ? "Konsultverksamhet" : "Branschen";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Anonymiserade jämförelseföretag
          </CardTitle>
          <CardDescription>
            5 bolag med liknande profil: SNI {sniCode} ({sniLabel}), {sizeRange === "micro" ? "0-2 MSEK" : sizeRange} omsättning, {employeeRange} anställda, {region === "stockholm" ? "Stockholm" : region}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Företag</TableHead>
                <TableHead className="text-right">Omsättning</TableHead>
                <TableHead className="text-right">EBITDA%</TableHead>
                <TableHead className="text-right">Anställda</TableHead>
                <TableHead className="text-right">Tillväxt</TableHead>
                <TableHead className="text-right">Likviditet</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {peers.map(peer => (
                <TableRow key={peer.id}>
                  <TableCell className="font-medium">{peer.name}</TableCell>
                  <TableCell className="text-right">{peer.revenue}</TableCell>
                  <TableCell className="text-right">{peer.ebitda}%</TableCell>
                  <TableCell className="text-right">{peer.employees}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={peer.growth > 0 ? "default" : "destructive"} className="text-xs">
                      {peer.growth > 0 ? "+" : ""}{peer.growth}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{peer.liquidity.toFixed(1)}x</TableCell>
                  <TableCell><RatingStars rating={peer.rating} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {peers.slice(0, 3).map(peer => (
          <Card key={peer.id} className="border-l-4 border-l-primary/40">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-semibold">Vad gör {peer.name} rätt?</p>
              <p className="text-sm text-muted-foreground mt-1">{peer.aiInsight}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

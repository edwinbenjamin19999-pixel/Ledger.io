import { HeroKPIRow } from "./sections/HeroKPIRow";
import { OptimeringSection } from "./sections/OptimeringSection";
import { UttaksplanSection } from "./sections/UttaksplanSection";
import { K10Section } from "./sections/K10Section";
import { HistorikPrognosChart } from "./sections/HistorikPrognosChart";
import { useAgaruttagKPI } from "./hooks/useAgaruttagKPI";
import { useState, useMemo, useCallback } from "react";

export interface OptInputs {
  aretsResultat: number;
  aktiekapital: number;
  tjanstear: number;
  agarandel: number;
}

export function AgaruttagDashboard() {
  const kpi = useAgaruttagKPI();

  const [inputs, setInputs] = useState<OptInputs>({
    aretsResultat: 500000,
    aktiekapital: 25000,
    tjanstear: 5,
    agarandel: 100,
  });

  const updateInput = useCallback(<K extends keyof OptInputs>(key: K, val: OptInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: val }));
  }, []);

  const calc = useMemo(() => {
    const { aretsResultat, aktiekapital, agarandel } = inputs;
    const FORENKLING = 209550;
    const STATLIG_GRANS = 618000; // yearly
    const AG_AVGIFT = 0.3142;
    const BOLAGSSKATT = 0.206;

    const gransbelopp = Math.round(FORENKLING * (agarandel / 100));
    const forestagenLon = Math.min(Math.round(aretsResultat * 0.5), STATLIG_GRANS);
    const lonKostnad = Math.round(forestagenLon * (1 + AG_AVGIFT));
    const lonSkattArbetsgivare = Math.round(forestagenLon * AG_AVGIFT);
    const lonSkattInkomst = Math.round(forestagenLon * 0.30);
    const totalLonSkatt = lonSkattArbetsgivare + lonSkattInkomst;

    const kvarEfterLon = Math.max(0, aretsResultat - lonKostnad);
    const bolagsskattBelopp = Math.round(kvarEfterLon * BOLAGSSKATT);
    const kvarEfterBolagsskatt = kvarEfterLon - bolagsskattBelopp;

    const lagbeskattadUtdelning = Math.min(gransbelopp, Math.max(0, kvarEfterBolagsskatt));
    const lagbeskattadSkatt = Math.round(lagbeskattadUtdelning * 0.20);

    const overskjutande = Math.max(0, kvarEfterBolagsskatt - lagbeskattadUtdelning);
    const overskjutandeSkatt = Math.round(overskjutande * 0.57);

    const kvarIBolaget = Math.max(0, kvarEfterBolagsskatt - lagbeskattadUtdelning - overskjutande);

    const totalSkatt = totalLonSkatt + bolagsskattBelopp + lagbeskattadSkatt + overskjutandeSkatt;
    const effektivSkattesats = aretsResultat > 0 ? Math.round((totalSkatt / aretsResultat) * 100) : 0;

    // Löneunderlagsregeln
    const IBB = 71200; // 2026
    const loneKrav = Math.round(9.6 * IBB); // 684 000 approx
    const uppnarLoneunderlag = forestagenLon >= loneKrav;

    // Huvudregeln
    const huvudregel = Math.round((forestagenLon * 0.5) + (aktiekapital * 0.0923));

    return {
      forestagenLon,
      forestagenLonManad: Math.round(forestagenLon / 12),
      lonKostnad,
      totalLonSkatt,
      gransbelopp,
      lagbeskattadUtdelning,
      lagbeskattadSkatt,
      overskjutande,
      overskjutandeSkatt,
      kvarIBolaget,
      bolagsskattBelopp,
      totalSkatt,
      effektivSkattesats,
      loneKrav,
      uppnarLoneunderlag,
      huvudregel,
    };
  }, [inputs]);

  return (
    <div className="space-y-8">
      <HeroKPIRow kpi={kpi} gransbelopp={calc.gransbelopp} forestagenLonManad={calc.forestagenLonManad} />

      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-6">
        <OptimeringSection inputs={inputs} onUpdate={updateInput} calc={calc} />
        <UttaksplanSection forestagenLonManad={calc.forestagenLonManad} gransbelopp={calc.gransbelopp} />
      </div>

      <K10Section inputs={inputs} onUpdate={updateInput} calc={calc} />

      <HistorikPrognosChart
        forestagenLonManad={calc.forestagenLonManad}
        lagbeskattadUtdelning={calc.lagbeskattadUtdelning}
        kpi={kpi}
      />
    </div>
  );
}

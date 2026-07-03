import { useMemo } from "react";
import { detectTurningPoints, type TurningPoint, type TurningPointInput } from "@/lib/forecast/turningPointEngine";

export function useTurningPoints(input: TurningPointInput | null): TurningPoint[] {
  return useMemo(() => {
    if (!input) return [];
    return detectTurningPoints(input);
  }, [input]);
}

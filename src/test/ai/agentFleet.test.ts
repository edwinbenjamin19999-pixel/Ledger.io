import { describe, it, expect } from "vitest";
import { AGENT_FLEET, aggregateFleet } from "@/lib/ai/agentFleet";

describe("agent fleet aggregate (AI Operating Console source of truth)", () => {
  it("aggregate.totalActions equals the sum of each agent's totalActions", () => {
    const expected = AGENT_FLEET.reduce((s, a) => s + a.totalActions, 0);
    expect(aggregateFleet().totalActions).toBe(expected);
  });

  it("aggregate.autoActions equals the sum of each agent's autoActions", () => {
    const expected = AGENT_FLEET.reduce((s, a) => s + a.autoActions, 0);
    expect(aggregateFleet().autoActions).toBe(expected);
  });

  it("automationRate equals autoActions / totalActions", () => {
    const agg = aggregateFleet();
    expect(agg.automationRate).toBeCloseTo(agg.autoActions / agg.totalActions, 6);
  });

  it("never returns 0 % when at least one agent has activity", () => {
    const agg = aggregateFleet();
    expect(agg.totalActions).toBeGreaterThan(0);
    expect(agg.automationRate).toBeGreaterThan(0);
    expect(agg.avgConfidence).toBeGreaterThan(0);
  });

  it("pendingReviews equals the sum of per-agent pendingReviews", () => {
    const expected = AGENT_FLEET.reduce((s, a) => s + (a.pendingReviews ?? 0), 0);
    expect(aggregateFleet().pendingReviews).toBe(expected);
  });
});

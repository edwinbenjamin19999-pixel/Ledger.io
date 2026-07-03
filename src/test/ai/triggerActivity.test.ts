import { describe, it, expect } from "vitest";
import {
  AGENT_FLEET,
  getTriggerActivity,
} from "@/lib/ai/agentFleet";

// Mirror the SPEC in src/components/ai/operating/TriggerListView.tsx
// (kept in sync manually — if a trigger is added there, add it here).
const TRIGGER_SPEC: { key: string; agentKeys: string[] }[] = [
  { key: "document_uploaded", agentKeys: ["bokforing", "kvitto"] },
  { key: "bank_transaction_imported", agentKeys: ["bokforing"] },
  { key: "vat_deadline_approaching", agentKeys: ["skatt"] },
  { key: "receivable_overdue", agentKeys: ["ar"] },
  { key: "payroll_deviation", agentKeys: ["lon"] },
  { key: "agi_deadline", agentKeys: ["lon"] },
];

describe("AI Operating Console trigger activity (QA invariant)", () => {
  it("no trigger reads 0 fires/24h when its backing agent has activity", () => {
    for (const { key, agentKeys } of TRIGGER_SPEC) {
      const backingHasWork = agentKeys.some(
        (k) => (AGENT_FLEET.find((a) => a.agent_key === k)?.totalActions ?? 0) > 0,
      );
      if (!backingHasWork) continue;
      const activity = getTriggerActivity(key);
      expect(
        activity.fireCount24h,
        `Trigger "${key}" should have >0 fires/24h because agents [${agentKeys.join(", ")}] have totalActions`,
      ).toBeGreaterThan(0);
      expect(activity.hasBackingActivity).toBe(true);
      expect(activity.lastFiredAt).not.toBeNull();
    }
  });

  it("Bokföringsagent, Kvittoagent and AR triggers all report recent runs", () => {
    expect(getTriggerActivity("bank_transaction_imported").fireCount24h).toBeGreaterThan(0);
    expect(getTriggerActivity("document_uploaded").fireCount24h).toBeGreaterThan(0);
    expect(getTriggerActivity("receivable_overdue").fireCount24h).toBeGreaterThan(0);
  });

  it("unknown triggers return a clean zero-state (no false positives)", () => {
    const unknown = getTriggerActivity("never_seen_trigger_xyz");
    expect(unknown.fireCount24h).toBe(0);
    expect(unknown.hasBackingActivity).toBe(false);
    expect(unknown.lastFiredAt).toBeNull();
  });
});

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { AssetClass, AssetStatus } from "@/lib/asset-types";

export interface FixedAsset {
  id: string;
  asset_name: string;
  asset_type: string;
  asset_class: AssetClass;
  category: string | null;
  status: AssetStatus;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number | null;
  useful_life_years: number;
  depreciation_method: string;
  is_active: boolean;
  notes: string | null;
  account_id: string | null;
  depreciation_account_id: string | null;
  company_id: string;
  supplier_name: string | null;
  currency: string;
  location: string | null;
  serial_number: string | null;
  responsible_person: string | null;
  cost_center_id: string | null;
  activation_date: string | null;
  legal_duration_years: number | null;
  maturity_date: string | null;
  interest_rate: number | null;
  current_valuation: number | null;
  last_valuation_date: string | null;
  disposal_date: string | null;
  disposal_amount: number | null;
  original_journal_entry_id: string | null;
  created_at: string;
}

export interface DepreciationEntry {
  id: string;
  fixed_asset_id: string;
  period_start: string;
  period_end: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  journal_entry_id: string | null;
  created_at: string;
}

export interface AssetEvent {
  id: string;
  fixed_asset_id: string;
  event_type: string;
  description: string | null;
  old_value: any;
  new_value: any;
  accounting_impact: any;
  journal_entry_id: string | null;
  created_by: string;
  created_at: string;
}

export function useAssets(companyId: string | null) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [entries, setEntries] = useState<DepreciationEntry[]>([]);
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [detectedTransactions, setDetectedTransactions] = useState<{ account: string; name: string; amount: number; journalEntryId?: string }[]>([]);

  const loadAssets = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("fixed_assets")
      .select("*")
      .eq("company_id", companyId)
      .order("acquisition_date", { ascending: false });
    if (!error) setAssets((data as unknown as FixedAsset[]) || []);
    setLoading(false);
  }, [companyId]);

  const loadEntries = useCallback(async () => {
    if (!companyId || assets.length === 0) return;
    const { data } = await supabase
      .from("depreciation_entries")
      .select("*")
      .in("fixed_asset_id", assets.map(a => a.id))
      .order("period_start", { ascending: false });
    if (data) setEntries(data);
  }, [companyId, assets]);

  const loadEvents = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("asset_events")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setEvents(data );
  }, [companyId]);

  const detectAssetTransactions = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data } = await supabase
        .from("journal_entry_lines")
        .select(`debit, credit, chart_of_accounts!inner(account_number, account_name), journal_entries!inner(company_id, status, id)`)
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "approved");
      if (!data) return;

      const assetAccounts = new Map<string, { name: string; amount: number }>();
      for (const line of data ) {
        const accNum = line.chart_of_accounts?.account_number || "";
        if (accNum.match(/^1[0-3]\d{2}$/)) {
          if (!assetAccounts.has(accNum)) {
            assetAccounts.set(accNum, { name: line.chart_of_accounts?.account_name || "", amount: 0 });
          }
          assetAccounts.get(accNum)!.amount += (line.debit || 0) - (line.credit || 0);
        }
      }
      setDetectedTransactions(
        Array.from(assetAccounts.entries())
          .filter(([_, v]) => v.amount > 0)
          .map(([account, v]) => ({ account, name: v.name, amount: v.amount }))
      );
    } catch (e) {
      console.error("Asset detection error:", e);
    }
  }, [companyId]);

  useEffect(() => { loadAssets(); detectAssetTransactions(); }, [loadAssets, detectAssetTransactions]);
  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  const getBookValue = useCallback((asset: FixedAsset) => {
    const assetEntries = entries.filter(e => e.fixed_asset_id === asset.id);
    if (assetEntries.length === 0) return asset.acquisition_cost;
    return assetEntries.sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0].book_value;
  }, [entries]);

  const getAccumulated = useCallback((asset: FixedAsset) => {
    const assetEntries = entries.filter(e => e.fixed_asset_id === asset.id);
    if (assetEntries.length === 0) return 0;
    return assetEntries.sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0].accumulated_depreciation;
  }, [entries]);

  const kpis = useMemo(() => {
    const active = assets.filter(a => a.status === "active" || a.status === "in_progress");
    const totalValue = active.reduce((sum, a) => sum + getBookValue(a), 0);
    const monthlyDepr = active.reduce((sum, a) => {
      if (a.asset_class === "financial" || !a.useful_life_years) return sum;
      return sum + (a.acquisition_cost - (a.residual_value || 0)) / (a.useful_life_years * 12);
    }, 0);
    const needsAction = assets.filter(a => {
      if (a.status === "active" && a.asset_class !== "financial") {
        const bv = getBookValue(a);
        if (bv <= (a.residual_value || 0) + 0.01) return true;
      }
      return false;
    });
    const missingDepr = assets.filter(a => a.status === "active" && a.asset_class !== "financial" && entries.filter(e => e.fixed_asset_id === a.id).length === 0);
    const fullyDepr = assets.filter(a => {
      const bv = getBookValue(a);
      return a.status === "active" && a.asset_class !== "financial" && bv <= (a.residual_value || 0) + 0.01;
    });

    return {
      totalValue,
      totalAssets: assets.length,
      monthlyDepreciation: Math.round(monthlyDepr),
      needsAction: needsAction.length + missingDepr.length,
      missingDepreciation: missingDepr,
      fullyDepreciated: fullyDepr,
    };
  }, [assets, entries, getBookValue]);

  const createAsset = useCallback(async (assetData: Partial<FixedAsset>) => {
    if (!companyId || !user) return null;
    const { data, error } = await supabase.from("fixed_assets").insert([{
      ...assetData,
      company_id: companyId,
      created_by: user.id,
    } as any]).select().maybeSingle();
    if (error) { toast.error(error.message); return null; }
    // Log event
    await supabase.from("asset_events").insert({
      fixed_asset_id: (data as unknown as { id: string }).id,
      company_id: companyId,
      event_type: "created",
      description: `Tillgång "${assetData.asset_name}" skapad`,
      new_value: assetData,
      created_by: user.id,
    });
    toast.success("Tillgång skapad");
    loadAssets();
    return data;
  }, [companyId, user, loadAssets]);

  const updateAsset = useCallback(async (assetId: string, updates: Partial<FixedAsset>) => {
    if (!user || !companyId) return;
    const { error } = await supabase.from("fixed_assets").update(updates as Record<string, unknown>).eq("id", assetId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("asset_events").insert({
      fixed_asset_id: assetId,
      company_id: companyId,
      event_type: "updated",
      description: "Tillgång uppdaterad",
      new_value: updates,
      created_by: user.id,
    });
    loadAssets();
  }, [user, companyId, loadAssets]);

  return {
    assets, entries, events, loading,
    detectedTransactions,
    kpis,
    getBookValue, getAccumulated,
    createAsset, updateAsset,
    reload: loadAssets,
  };
}

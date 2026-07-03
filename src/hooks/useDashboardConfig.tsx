import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ActiveTile, ActiveWidget, DashboardGeneralSettings, DashboardConfig, LayoutItem,
  DEFAULT_CONFIG, DEFAULT_TILES, DEFAULT_WIDGETS, DEFAULT_GENERAL_SETTINGS, buildDefaultLayout,
} from "@/components/dashboard/kpi-definitions";

export function useDashboardConfig(companyId: string | undefined) { const { user } = useAuth();
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user?.id || !companyId) return;
    loadConfig();
  }, [user?.id, companyId]);

  const loadConfig = async () => { if (!user?.id || !companyId) return;
    try { const { data, error } = await supabase
        .from("dashboard_configs")
        .select("config")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) throw error;
      if (data) { const raw = (data as Record<string, unknown>).config as Record<string, any> | null;
        if (Array.isArray(raw) && raw.length > 0) { const tiles = raw as ActiveTile[];
          const widgets = DEFAULT_WIDGETS;
          setConfig({ tiles, widgets, general: DEFAULT_GENERAL_SETTINGS, layout: buildDefaultLayout(tiles, widgets) });
        } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) { const savedWidgets: ActiveWidget[] = raw.widgets || DEFAULT_WIDGETS;
          const savedWidgetIds = new Set(savedWidgets.map((w: ActiveWidget) => w.widgetId));
          const newWidgets = DEFAULT_WIDGETS.filter(w => !savedWidgetIds.has(w.widgetId));
          const mergedWidgets = [...savedWidgets, ...newWidgets];

          const savedTiles: ActiveTile[] = raw.tiles || DEFAULT_TILES;

          // Build or merge layout
          let layout: LayoutItem[] = raw.layout || [];
          if (!layout.length) { layout = buildDefaultLayout(savedTiles, mergedWidgets);
          } else { // Merge in any new tiles/widgets not in saved layout
            const layoutIds = new Set(layout.map(l => `${l.type}:${l.id}`));
            for (const t of savedTiles) { if (!layoutIds.has(`kpi:${t.kpiId}`)) { layout.push({ type: 'kpi', id: t.kpiId, colSpan: t.size === '2x1' ? 2 : 1 });
              }
            }
            for (const w of mergedWidgets) { if (w.visible && !layoutIds.has(`widget:${w.widgetId}`)) { layout.push({ type: 'widget', id: w.widgetId, colSpan: w.width === 'full' ? 2 : 1 });
              }
            }
          }

          setConfig({ tiles: savedTiles,
            widgets: mergedWidgets,
            general: raw.general || DEFAULT_GENERAL_SETTINGS,
            layout,
          });
        } else { setConfig(DEFAULT_CONFIG);
        }
      } else { setConfig(DEFAULT_CONFIG);
      }
    } catch (e) { console.error("Error loading dashboard config:", e);
      setConfig(DEFAULT_CONFIG);
    } finally { setLoading(false);
    }
  };

  const saveFullConfig = useCallback(async (newConfig: DashboardConfig) => { if (!user?.id || !companyId) return;
    setConfig(newConfig);
    try { const { error } = await supabase
        .from("dashboard_configs")
        .upsert(
          { user_id: user.id, company_id: companyId, config: newConfig as any, updated_at: new Date().toISOString() }, { onConflict: "user_id,company_id" }
        );
      if (error) throw error;
    } catch (e) { console.error("Error saving dashboard config:", e);
    }
  }, [user?.id, companyId]);

  const saveConfig = useCallback(async (newTiles: ActiveTile[]) => { await saveFullConfig({ ...config, tiles: newTiles });
  }, [config, saveFullConfig]);

  const saveWidgets = useCallback(async (newWidgets: ActiveWidget[]) => { await saveFullConfig({ ...config, widgets: newWidgets });
  }, [config, saveFullConfig]);

  const saveGeneral = useCallback(async (newGeneral: DashboardGeneralSettings) => { await saveFullConfig({ ...config, general: newGeneral });
  }, [config, saveFullConfig]);

  const resetConfig = useCallback(async () => { await saveFullConfig(DEFAULT_CONFIG);
  }, [saveFullConfig]);

  return { tiles: config.tiles,
    widgets: config.widgets,
    general: config.general,
    layout: config.layout || buildDefaultLayout(config.tiles, config.widgets),
    loading,
    saveConfig,
    saveWidgets,
    saveGeneral,
    saveFullConfig,
    resetConfig,
  };
}
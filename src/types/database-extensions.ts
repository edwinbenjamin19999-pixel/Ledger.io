/**
 * Extended type definitions for tables/columns where the auto-generated
 * Supabase types use `Json` and we need stricter shapes.
 */

export interface UserPreferencesModuleOrder {
  order: string[];
  hidden: string[];
  hiddenItems: string[];
}

export interface SidebarReminderSettings {
  reminder1Days: number;
  reminder2Days: number;
  reminderEnabled: boolean;
}

export interface SidebarConfig {
  collapsed?: boolean;
  pinnedItems?: string[];
  moduleOrder?: string[];
  reminderSettings?: SidebarReminderSettings;
  [key: string]: unknown;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: string;
  module_order: UserPreferencesModuleOrder | null;
  sidebar_config?: SidebarConfig;
  created_at: string;
  updated_at: string;
}

/** Narrowed shape returned by journal_entries joins */
export interface JournalEntryJoin {
  company_id: string;
  created_at: string;
  status: string;
  entry_date: string;
}

/** Narrowed shape returned by chart_of_accounts joins */
export interface ChartOfAccountsJoin {
  account_number: string;
  account_name?: string;
  account_type?: string;
  vat_code?: string;
  company_id?: string;
}

/** Narrowed shape for company joins (e.g. from firm_client_assignments) */
export interface CompanyJoin {
  id: string;
  name: string;
  org_number: string;
  subscription_tier?: string;
  subscription_status?: string;
}

// Re-export everything for barrel import
export type UserPreferencesRow = UserPreferences;

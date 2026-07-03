export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_requests: {
        Row: {
          cancellation_reason: string | null
          completed_at: string | null
          id: string
          requested_at: string
          scheduled_deletion_date: string | null
          status: string
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          completed_at?: string | null
          id?: string
          requested_at?: string
          scheduled_deletion_date?: string | null
          status?: string
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          completed_at?: string | null
          id?: string
          requested_at?: string
          scheduled_deletion_date?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      account_mapping: {
        Row: {
          company_id: string
          confidence: number | null
          confirmed: boolean
          created_at: string
          id: string
          migration_job_id: string | null
          source_account_code: string
          source_account_name: string | null
          target_account_code: string
          target_account_name: string | null
        }
        Insert: {
          company_id: string
          confidence?: number | null
          confirmed?: boolean
          created_at?: string
          id?: string
          migration_job_id?: string | null
          source_account_code: string
          source_account_name?: string | null
          target_account_code: string
          target_account_name?: string | null
        }
        Update: {
          company_id?: string
          confidence?: number | null
          confirmed?: boolean
          created_at?: string
          id?: string
          migration_job_id?: string | null
          source_account_code?: string
          source_account_name?: string | null
          target_account_code?: string
          target_account_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_mapping_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_mapping_migration_job_id_fkey"
            columns: ["migration_job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      account_mappings: {
        Row: {
          account_from: string
          account_to: string
          company_scope: Database["public"]["Enums"]["account_mapping_scope"]
          created_at: string
          dimension_filter_json: Json | null
          id: string
          is_active: boolean
          mapping_type: Database["public"]["Enums"]["account_mapping_type"]
          row_id: string
          scenario_filter_json: Json | null
          sign_override:
            | Database["public"]["Enums"]["report_sign_behavior"]
            | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_from: string
          account_to: string
          company_scope?: Database["public"]["Enums"]["account_mapping_scope"]
          created_at?: string
          dimension_filter_json?: Json | null
          id?: string
          is_active?: boolean
          mapping_type?: Database["public"]["Enums"]["account_mapping_type"]
          row_id: string
          scenario_filter_json?: Json | null
          sign_override?:
            | Database["public"]["Enums"]["report_sign_behavior"]
            | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_from?: string
          account_to?: string
          company_scope?: Database["public"]["Enums"]["account_mapping_scope"]
          created_at?: string
          dimension_filter_json?: Json | null
          id?: string
          is_active?: boolean
          mapping_type?: Database["public"]["Enums"]["account_mapping_type"]
          row_id?: string
          scenario_filter_json?: Json | null
          sign_override?:
            | Database["public"]["Enums"]["report_sign_behavior"]
            | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_mappings_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "report_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_firms: {
        Row: {
          address: string | null
          allow_client_self_signup: boolean
          brand_accent_color: string | null
          brand_primary_color: string | null
          client_portal_enabled: boolean
          created_at: string
          created_by: string | null
          custom_domain: string | null
          custom_domain_status: string
          default_hourly_rate: number | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          org_number: string
          phone: string | null
          portal_logo_url: string | null
          portal_name: string | null
          portal_welcome_message: string | null
          show_powered_by: boolean
          subtitle: string | null
          support_email: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          allow_client_self_signup?: boolean
          brand_accent_color?: string | null
          brand_primary_color?: string | null
          client_portal_enabled?: boolean
          created_at?: string
          created_by?: string | null
          custom_domain?: string | null
          custom_domain_status?: string
          default_hourly_rate?: number | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          org_number: string
          phone?: string | null
          portal_logo_url?: string | null
          portal_name?: string | null
          portal_welcome_message?: string | null
          show_powered_by?: boolean
          subtitle?: string | null
          support_email?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          allow_client_self_signup?: boolean
          brand_accent_color?: string | null
          brand_primary_color?: string | null
          client_portal_enabled?: boolean
          created_at?: string
          created_by?: string | null
          custom_domain?: string | null
          custom_domain_status?: string
          default_hourly_rate?: number | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_number?: string
          phone?: string | null
          portal_logo_url?: string | null
          portal_name?: string | null
          portal_welcome_message?: string | null
          show_powered_by?: boolean
          subtitle?: string | null
          support_email?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      accounting_periods: {
        Row: {
          company_id: string
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          month: number
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month: number
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month?: number
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      accrual_postings: {
        Row: {
          amount: number
          created_at: string
          id: string
          journal_entry_id: string | null
          period_month: string
          posted_at: string | null
          schedule_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          period_month: string
          posted_at?: string | null
          schedule_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          period_month?: string
          posted_at?: string | null
          schedule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "accrual_postings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "accrual_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      accrual_schedules: {
        Row: {
          company_id: string
          cost_account_number: string
          created_at: string
          created_by: string
          description: string
          id: string
          months_total: number
          notes: string | null
          period_end: string
          period_start: string
          prepaid_account_number: string
          source_invoice_id: string | null
          source_journal_entry_id: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          company_id: string
          cost_account_number: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          months_total: number
          notes?: string | null
          period_end: string
          period_start: string
          prepaid_account_number?: string
          source_invoice_id?: string | null
          source_journal_entry_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          cost_account_number?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          months_total?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          prepaid_account_number?: string
          source_invoice_id?: string | null
          source_journal_entry_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_booking_rules: {
        Row: {
          account_name: string
          account_number: string
          category: string | null
          company_id: string
          confidence: number
          created_at: string
          hit_count: number
          id: string
          is_active: boolean
          match_field: string
          match_pattern: string
          rule_type: string
          source: string | null
          updated_at: string
          vat_code: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          category?: string | null
          company_id: string
          confidence?: number
          created_at?: string
          hit_count?: number
          id?: string
          is_active?: boolean
          match_field?: string
          match_pattern: string
          rule_type?: string
          source?: string | null
          updated_at?: string
          vat_code?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          category?: string | null
          company_id?: string
          confidence?: number
          created_at?: string
          hit_count?: number
          id?: string
          is_active?: boolean
          match_field?: string
          match_pattern?: string
          rule_type?: string
          source?: string | null
          updated_at?: string
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_booking_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_bookings: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          balancing_account: string | null
          company_id: string
          confidence: number
          corrected_account: string | null
          corrected_at: string | null
          counterparty: string | null
          created_at: string
          currency: string | null
          explanation: string | null
          id: string
          journal_entry_id: string | null
          payment_method: string | null
          payment_method_confidence: number | null
          rule_id: string | null
          source_id: string | null
          source_type: string
          status: string
          user_corrected: boolean | null
          vat_code: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          balancing_account?: string | null
          company_id: string
          confidence: number
          corrected_account?: string | null
          corrected_at?: string | null
          counterparty?: string | null
          created_at?: string
          currency?: string | null
          explanation?: string | null
          id?: string
          journal_entry_id?: string | null
          payment_method?: string | null
          payment_method_confidence?: number | null
          rule_id?: string | null
          source_id?: string | null
          source_type: string
          status?: string
          user_corrected?: boolean | null
          vat_code?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          balancing_account?: string | null
          company_id?: string
          confidence?: number
          corrected_account?: string | null
          corrected_at?: string | null
          counterparty?: string | null
          created_at?: string
          currency?: string | null
          explanation?: string | null
          id?: string
          journal_entry_id?: string | null
          payment_method?: string | null
          payment_method_confidence?: number | null
          rule_id?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          user_corrected?: boolean | null
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_bookings_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_bookings_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "agent_booking_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_confidence_history: {
        Row: {
          auto_booked: number
          avg_confidence: number | null
          company_id: string
          created_at: string
          id: string
          month: string
          review_needed: number
          rules_learned: number | null
          total_transactions: number
          user_flagged: number
        }
        Insert: {
          auto_booked?: number
          avg_confidence?: number | null
          company_id: string
          created_at?: string
          id?: string
          month: string
          review_needed?: number
          rules_learned?: number | null
          total_transactions?: number
          user_flagged?: number
        }
        Update: {
          auto_booked?: number
          avg_confidence?: number | null
          company_id?: string
          created_at?: string
          id?: string
          month?: string
          review_needed?: number
          rules_learned?: number | null
          total_transactions?: number
          user_flagged?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_confidence_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agi_periods: {
        Row: {
          company_id: string
          created_at: string
          id: string
          payroll_run_id: string | null
          period_month: number
          period_type: string
          period_year: number
          skatteverket_period_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          payroll_run_id?: string | null
          period_month: number
          period_type?: string
          period_year: number
          skatteverket_period_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          payroll_run_id?: string | null
          period_month?: number
          period_type?: string
          period_year?: number
          skatteverket_period_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agi_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agi_periods_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agi_submissions: {
        Row: {
          agi_period_id: string
          company_id: string
          created_at: string
          error_message: string | null
          id: string
          payroll_run_id: string
          response_data: Json | null
          skatteverket_reference: string | null
          status: string
          submission_data: Json
          submission_type: string
          submitted_at: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          agi_period_id: string
          company_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          payroll_run_id: string
          response_data?: Json | null
          skatteverket_reference?: string | null
          status?: string
          submission_data: Json
          submission_type: string
          submitted_at?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          agi_period_id?: string
          company_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          payroll_run_id?: string
          response_data?: Json | null
          skatteverket_reference?: string | null
          status?: string
          submission_data?: Json
          submission_type?: string
          submitted_at?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agi_submissions_agi_period_id_fkey"
            columns: ["agi_period_id"]
            isOneToOne: false
            referencedRelation: "agi_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agi_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agi_submissions_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_account_suggestions: {
        Row: {
          account_number: string
          company_id: string
          confidence: number | null
          created_at: string
          expected_impact_sek: number | null
          expires_at: string
          id: string
          period_hash: string
          reason: string | null
          suggested_value: number
        }
        Insert: {
          account_number: string
          company_id: string
          confidence?: number | null
          created_at?: string
          expected_impact_sek?: number | null
          expires_at?: string
          id?: string
          period_hash: string
          reason?: string | null
          suggested_value: number
        }
        Update: {
          account_number?: string
          company_id?: string
          confidence?: number | null
          created_at?: string
          expected_impact_sek?: number | null
          expires_at?: string
          id?: string
          period_hash?: string
          reason?: string | null
          suggested_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_account_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_dismissals: {
        Row: {
          action_id: string
          company_id: string
          created_at: string
          dismissed_until: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_id: string
          company_id: string
          created_at?: string
          dismissed_until?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_id?: string
          company_id?: string
          created_at?: string
          dismissed_until?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_dismissals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_feedback: {
        Row: {
          action_kind: string
          ai_confidence: number
          ai_reasoning: string | null
          ai_recommendation: Json
          ai_tier: string
          company_id: string
          counterparty_key: string | null
          created_at: string
          id: string
          module: string
          reference_id: string | null
          user_correction: Json | null
          user_id: string | null
          was_correct: boolean | null
        }
        Insert: {
          action_kind: string
          ai_confidence: number
          ai_reasoning?: string | null
          ai_recommendation: Json
          ai_tier: string
          company_id: string
          counterparty_key?: string | null
          created_at?: string
          id?: string
          module: string
          reference_id?: string | null
          user_correction?: Json | null
          user_id?: string | null
          was_correct?: boolean | null
        }
        Update: {
          action_kind?: string
          ai_confidence?: number
          ai_reasoning?: string | null
          ai_recommendation?: Json
          ai_tier?: string
          company_id?: string
          counterparty_key?: string | null
          created_at?: string
          id?: string
          module?: string
          reference_id?: string | null
          user_correction?: Json | null
          user_id?: string | null
          was_correct?: boolean | null
        }
        Relationships: []
      }
      ai_agent_registry: {
        Row: {
          agent_key: string
          allowed_actions: string[] | null
          company_id: string
          confidence_threshold: number | null
          created_at: string
          data_inputs: string[] | null
          escalation_policy: Json | null
          id: string
          is_paused: boolean
          last_run_at: string | null
          mission: string | null
          name: string
          owned_modules: string[] | null
          review_required: boolean | null
          triggers: string[] | null
          updated_at: string
        }
        Insert: {
          agent_key: string
          allowed_actions?: string[] | null
          company_id: string
          confidence_threshold?: number | null
          created_at?: string
          data_inputs?: string[] | null
          escalation_policy?: Json | null
          id?: string
          is_paused?: boolean
          last_run_at?: string | null
          mission?: string | null
          name: string
          owned_modules?: string[] | null
          review_required?: boolean | null
          triggers?: string[] | null
          updated_at?: string
        }
        Update: {
          agent_key?: string
          allowed_actions?: string[] | null
          company_id?: string
          confidence_threshold?: number | null
          created_at?: string
          data_inputs?: string[] | null
          escalation_policy?: Json | null
          id?: string
          is_paused?: boolean
          last_run_at?: string | null
          mission?: string | null
          name?: string
          owned_modules?: string[] | null
          review_required?: boolean | null
          triggers?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_registry_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cashflow_insights: {
        Row: {
          company_id: string
          confidence_score: number
          created_at: string
          dismissed_at: string | null
          id: string
          insight_type: string
          is_dismissed: boolean
          model_version: string
          module: string
          severity: string
          source_data_refs: Json
          source_snapshot_id: string | null
          summary: string
          title: string
        }
        Insert: {
          company_id: string
          confidence_score?: number
          created_at?: string
          dismissed_at?: string | null
          id?: string
          insight_type: string
          is_dismissed?: boolean
          model_version?: string
          module?: string
          severity?: string
          source_data_refs?: Json
          source_snapshot_id?: string | null
          summary: string
          title: string
        }
        Update: {
          company_id?: string
          confidence_score?: number
          created_at?: string
          dismissed_at?: string | null
          id?: string
          insight_type?: string
          is_dismissed?: boolean
          model_version?: string
          module?: string
          severity?: string
          source_data_refs?: Json
          source_snapshot_id?: string | null
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cashflow_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_cashflow_insights_source_snapshot_id_fkey"
            columns: ["source_snapshot_id"]
            isOneToOne: false
            referencedRelation: "forecast_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cashflow_recommendations: {
        Row: {
          action_type: string
          confidence_score: number
          created_at: string
          executable: boolean
          executed_at: string | null
          executed_by: string | null
          execution_status: string
          explanation: string | null
          id: string
          impact_amount: number | null
          impact_runway_days: number | null
          insight_id: string
          requires_confirmation: boolean
          title: string
        }
        Insert: {
          action_type: string
          confidence_score?: number
          created_at?: string
          executable?: boolean
          executed_at?: string | null
          executed_by?: string | null
          execution_status?: string
          explanation?: string | null
          id?: string
          impact_amount?: number | null
          impact_runway_days?: number | null
          insight_id: string
          requires_confirmation?: boolean
          title: string
        }
        Update: {
          action_type?: string
          confidence_score?: number
          created_at?: string
          executable?: boolean
          executed_at?: string | null
          executed_by?: string | null
          execution_status?: string
          explanation?: string | null
          id?: string
          impact_amount?: number | null
          impact_runway_days?: number | null
          insight_id?: string
          requires_confirmation?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cashflow_recommendations_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "ai_cashflow_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cfo_preferences: {
        Row: {
          company_id: string
          created_at: string
          evidence_count: number
          growth_bias: number
          id: string
          kind_weights: Json
          risk_tolerance: number
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          evidence_count?: number
          growth_bias?: number
          id?: string
          kind_weights?: Json
          risk_tolerance?: number
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          evidence_count?: number
          growth_bias?: number
          id?: string
          kind_weights?: Json
          risk_tolerance?: number
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cfo_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cfo_signals: {
        Row: {
          action: string
          company_id: string
          id: string
          insight_id: string
          insight_kind: string
          metadata: Json
          occurred_at: string
          user_id: string
          weight: number
        }
        Insert: {
          action: string
          company_id: string
          id?: string
          insight_id: string
          insight_kind: string
          metadata?: Json
          occurred_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          action?: string
          company_id?: string
          id?: string
          insight_id?: string
          insight_kind?: string
          metadata?: Json
          occurred_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_cfo_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_economist_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["cfo_action_type"]
          automation_mode: Database["public"]["Enums"]["cfo_automation_mode"]
          before_state: Json | null
          company_id: string
          confidence: number | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          financial_impact: number | null
          id: string
          insight_id: string | null
          payload: Json
          result: Json | null
          reverted_at: string | null
          reverted_by: string | null
          reverted_from: string | null
          scope: string[]
          status: Database["public"]["Enums"]["cfo_action_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["cfo_action_type"]
          automation_mode?: Database["public"]["Enums"]["cfo_automation_mode"]
          before_state?: Json | null
          company_id: string
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          financial_impact?: number | null
          id?: string
          insight_id?: string | null
          payload?: Json
          result?: Json | null
          reverted_at?: string | null
          reverted_by?: string | null
          reverted_from?: string | null
          scope?: string[]
          status?: Database["public"]["Enums"]["cfo_action_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["cfo_action_type"]
          automation_mode?: Database["public"]["Enums"]["cfo_automation_mode"]
          before_state?: Json | null
          company_id?: string
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          financial_impact?: number | null
          id?: string
          insight_id?: string | null
          payload?: Json
          result?: Json | null
          reverted_at?: string | null
          reverted_by?: string | null
          reverted_from?: string | null
          scope?: string[]
          status?: Database["public"]["Enums"]["cfo_action_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_economist_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_economist_actions_reverted_from_fkey"
            columns: ["reverted_from"]
            isOneToOne: false
            referencedRelation: "ai_economist_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_economist_settings: {
        Row: {
          auto_execute_threshold: number
          automation_mode: Database["public"]["Enums"]["cfo_automation_mode"]
          company_id: string
          created_at: string
          id: string
          persona_mode: Database["public"]["Enums"]["cfo_persona_mode"]
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_execute_threshold?: number
          automation_mode?: Database["public"]["Enums"]["cfo_automation_mode"]
          company_id: string
          created_at?: string
          id?: string
          persona_mode?: Database["public"]["Enums"]["cfo_persona_mode"]
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_execute_threshold?: number
          automation_mode?: Database["public"]["Enums"]["cfo_automation_mode"]
          company_id?: string
          created_at?: string
          id?: string
          persona_mode?: Database["public"]["Enums"]["cfo_persona_mode"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_economist_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_ekonom_decisions: {
        Row: {
          action_type: string
          company_id: string
          confidence: number | null
          created_at: string
          decision: string
          financial_impact: number | null
          id: string
          insight_id: string
          insight_kind: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action_type: string
          company_id: string
          confidence?: number | null
          created_at?: string
          decision: string
          financial_impact?: number | null
          id?: string
          insight_id: string
          insight_kind: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action_type?: string
          company_id?: string
          confidence?: number | null
          created_at?: string
          decision?: string
          financial_impact?: number | null
          id?: string
          insight_id?: string
          insight_kind?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_ekonom_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          ai_model_version: string | null
          company_id: string
          corrected_by: string
          corrected_data: Json
          correction_type: string
          created_at: string
          document_pattern: string | null
          id: string
          journal_entry_id: string
          original_suggestion: Json
          rejection_reason: string | null
        }
        Insert: {
          ai_model_version?: string | null
          company_id: string
          corrected_by: string
          corrected_data: Json
          correction_type: string
          created_at?: string
          document_pattern?: string | null
          id?: string
          journal_entry_id: string
          original_suggestion: Json
          rejection_reason?: string | null
        }
        Update: {
          ai_model_version?: string | null
          company_id?: string
          corrected_by?: string
          corrected_data?: Json
          correction_type?: string
          created_at?: string
          document_pattern?: string | null
          id?: string
          journal_entry_id?: string
          original_suggestion?: Json
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insight_refs: {
        Row: {
          company_id: string
          confidence_score: number
          created_at: string
          id: string
          insight_summary: string
          insight_type: string
          period_id: string | null
          row_id: string
          scenario_id: string | null
          source_refs_json: Json | null
        }
        Insert: {
          company_id: string
          confidence_score?: number
          created_at?: string
          id?: string
          insight_summary: string
          insight_type: string
          period_id?: string | null
          row_id: string
          scenario_id?: string | null
          source_refs_json?: Json | null
        }
        Update: {
          company_id?: string
          confidence_score?: number
          created_at?: string
          id?: string
          insight_summary?: string
          insight_type?: string
          period_id?: string | null
          row_id?: string
          scenario_id?: string | null
          source_refs_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insight_refs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insight_refs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insight_refs_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "report_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insight_refs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "report_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_report_adjustments: {
        Row: {
          account_number: string
          affected_areas: Json
          ai_suggestion_id: string | null
          annual_report_id: string
          company_id: string
          confidence: number | null
          created_at: string
          created_by: string
          credit: number
          debit: number
          description: string | null
          id: string
          is_reversed: boolean
          source: string
          updated_at: string
        }
        Insert: {
          account_number: string
          affected_areas?: Json
          ai_suggestion_id?: string | null
          annual_report_id: string
          company_id: string
          confidence?: number | null
          created_at?: string
          created_by: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          is_reversed?: boolean
          source?: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          affected_areas?: Json
          ai_suggestion_id?: string | null
          annual_report_id?: string
          company_id?: string
          confidence?: number | null
          created_at?: string
          created_by?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          is_reversed?: boolean
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_report_adjustments_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_report_ai_suggestions: {
        Row: {
          affected_accounts: Json
          annual_report_id: string
          applied_adjustment_id: string | null
          company_id: string
          confidence: number
          created_at: string
          dismissed_reason: string | null
          explanation: string
          id: string
          impact_amount: number | null
          model_version: string | null
          proposed_adjustment: Json | null
          severity: string
          source_refs: Json
          status: string
          suggestion_type: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_accounts?: Json
          annual_report_id: string
          applied_adjustment_id?: string | null
          company_id: string
          confidence?: number
          created_at?: string
          dismissed_reason?: string | null
          explanation: string
          id?: string
          impact_amount?: number | null
          model_version?: string | null
          proposed_adjustment?: Json | null
          severity?: string
          source_refs?: Json
          status?: string
          suggestion_type: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_accounts?: Json
          annual_report_id?: string
          applied_adjustment_id?: string | null
          company_id?: string
          confidence?: number
          created_at?: string
          dismissed_reason?: string | null
          explanation?: string
          id?: string
          impact_amount?: number | null
          model_version?: string | null
          proposed_adjustment?: Json | null
          severity?: string
          source_refs?: Json
          status?: string
          suggestion_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_report_ai_suggestions_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_ai_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_report_attachments: {
        Row: {
          account_number: string | null
          annual_report_id: string
          company_id: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          id: string
          section_id: string | null
          status: string
          uploaded_by: string
        }
        Insert: {
          account_number?: string | null
          annual_report_id: string
          company_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          id?: string
          section_id?: string | null
          status?: string
          uploaded_by: string
        }
        Update: {
          account_number?: string | null
          annual_report_id?: string
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          id?: string
          section_id?: string | null
          status?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_report_attachments_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_attachments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "annual_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_report_comments: {
        Row: {
          anchor_key: string | null
          annual_report_id: string
          author_id: string
          company_id: string
          content: string
          created_at: string
          id: string
          mentions: Json
          parent_comment_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          section_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          anchor_key?: string | null
          annual_report_id: string
          author_id: string
          company_id: string
          content: string
          created_at?: string
          id?: string
          mentions?: Json
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          anchor_key?: string | null
          annual_report_id?: string
          author_id?: string
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          mentions?: Json
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_report_comments_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "annual_report_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_comments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "annual_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_report_sections: {
        Row: {
          ai_generated: boolean
          annual_report_id: string
          company_id: string
          content: string | null
          created_at: string
          id: string
          label: string
          locked: boolean
          metadata: Json
          order_index: number
          parent_id: string | null
          section_type: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          ai_generated?: boolean
          annual_report_id: string
          company_id: string
          content?: string | null
          created_at?: string
          id?: string
          label: string
          locked?: boolean
          metadata?: Json
          order_index?: number
          parent_id?: string | null
          section_type: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          ai_generated?: boolean
          annual_report_id?: string
          company_id?: string
          content?: string | null
          created_at?: string
          id?: string
          label?: string
          locked?: boolean
          metadata?: Json
          order_index?: number
          parent_id?: string | null
          section_type?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "annual_report_sections_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_sections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "annual_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_report_versions: {
        Row: {
          annual_report_id: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_locked: boolean
          label: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          annual_report_id: string
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_locked?: boolean
          label: string
          snapshot: Json
          version_number: number
        }
        Update: {
          annual_report_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_locked?: boolean
          label?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "annual_report_versions_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          balance_sheet: Json | null
          bolagsverket_deadline: string | null
          bolagsverket_filing_fee_paid_at: string | null
          bolagsverket_last_reminder_at: string | null
          bolagsverket_last_reminder_kind: string | null
          bolagsverket_manual_reference: string | null
          bolagsverket_manual_submitted_at: string | null
          bolagsverket_notes: string | null
          bolagsverket_reference: string | null
          bolagsverket_status: string | null
          bolagsverket_submitted_at: string | null
          company_id: string
          created_at: string
          fiscal_year: number
          fiscal_year_end: string
          fiscal_year_start: string
          id: string
          income_statement: Json | null
          locked_sections: string[]
          net_profit: number | null
          notes: Json | null
          pdf_url: string | null
          prepared_at: string | null
          prepared_by: string | null
          report_type: string
          revenue: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          skatteverket_reference: string | null
          skatteverket_status: string | null
          skatteverket_submitted_at: string | null
          status: string
          total_assets: number | null
          total_equity: number | null
          total_liabilities: number | null
          updated_at: string
          workflow_status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          balance_sheet?: Json | null
          bolagsverket_deadline?: string | null
          bolagsverket_filing_fee_paid_at?: string | null
          bolagsverket_last_reminder_at?: string | null
          bolagsverket_last_reminder_kind?: string | null
          bolagsverket_manual_reference?: string | null
          bolagsverket_manual_submitted_at?: string | null
          bolagsverket_notes?: string | null
          bolagsverket_reference?: string | null
          bolagsverket_status?: string | null
          bolagsverket_submitted_at?: string | null
          company_id: string
          created_at?: string
          fiscal_year: number
          fiscal_year_end: string
          fiscal_year_start: string
          id?: string
          income_statement?: Json | null
          locked_sections?: string[]
          net_profit?: number | null
          notes?: Json | null
          pdf_url?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          report_type?: string
          revenue?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skatteverket_reference?: string | null
          skatteverket_status?: string | null
          skatteverket_submitted_at?: string | null
          status?: string
          total_assets?: number | null
          total_equity?: number | null
          total_liabilities?: number | null
          updated_at?: string
          workflow_status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          balance_sheet?: Json | null
          bolagsverket_deadline?: string | null
          bolagsverket_filing_fee_paid_at?: string | null
          bolagsverket_last_reminder_at?: string | null
          bolagsverket_last_reminder_kind?: string | null
          bolagsverket_manual_reference?: string | null
          bolagsverket_manual_submitted_at?: string | null
          bolagsverket_notes?: string | null
          bolagsverket_reference?: string | null
          bolagsverket_status?: string | null
          bolagsverket_submitted_at?: string | null
          company_id?: string
          created_at?: string
          fiscal_year?: number
          fiscal_year_end?: string
          fiscal_year_start?: string
          id?: string
          income_statement?: Json | null
          locked_sections?: string[]
          net_profit?: number | null
          notes?: Json | null
          pdf_url?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          report_type?: string
          revenue?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skatteverket_reference?: string | null
          skatteverket_status?: string | null
          skatteverket_submitted_at?: string | null
          status?: string
          total_assets?: number | null
          total_equity?: number | null
          total_liabilities?: number | null
          updated_at?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_resolutions: {
        Row: {
          anomaly_category: string
          anomaly_description: string | null
          anomaly_key: string
          anomaly_severity: string
          anomaly_title: string
          company_id: string
          created_at: string
          explanation: string | null
          id: string
          resolution_reason: string | null
          resolution_type: string
          resolved_at: string
          resolved_by: string | null
        }
        Insert: {
          anomaly_category: string
          anomaly_description?: string | null
          anomaly_key: string
          anomaly_severity: string
          anomaly_title: string
          company_id: string
          created_at?: string
          explanation?: string | null
          id?: string
          resolution_reason?: string | null
          resolution_type: string
          resolved_at?: string
          resolved_by?: string | null
        }
        Update: {
          anomaly_category?: string
          anomaly_description?: string | null
          anomaly_key?: string
          anomaly_severity?: string
          anomaly_title?: string
          company_id?: string
          created_at?: string
          explanation?: string | null
          id?: string
          resolution_reason?: string | null
          resolution_type?: string
          resolved_at?: string
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_resolutions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit: number | null
          scopes: string[] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit?: number | null
          scopes?: string[] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit?: number | null
          scopes?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_decisions: {
        Row: {
          comment: string | null
          decided_at: string
          decided_by: string
          decision: string
          id: string
          request_id: string
          step_order: number
        }
        Insert: {
          comment?: string | null
          decided_at?: string
          decided_by: string
          decision: string
          id?: string
          request_id: string
          step_order: number
        }
        Update: {
          comment?: string | null
          decided_at?: string
          decided_by?: string
          decision?: string
          id?: string
          request_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_flow_steps: {
        Row: {
          can_be_any_of_roles: Database["public"]["Enums"]["app_role"][] | null
          created_at: string
          description: string | null
          flow_id: string
          id: string
          required_count: number
          required_role: Database["public"]["Enums"]["app_role"] | null
          step_order: number
        }
        Insert: {
          can_be_any_of_roles?: Database["public"]["Enums"]["app_role"][] | null
          created_at?: string
          description?: string | null
          flow_id: string
          id?: string
          required_count?: number
          required_role?: Database["public"]["Enums"]["app_role"] | null
          step_order: number
        }
        Update: {
          can_be_any_of_roles?: Database["public"]["Enums"]["app_role"][] | null
          created_at?: string
          description?: string | null
          flow_id?: string
          id?: string
          required_count?: number
          required_role?: Database["public"]["Enums"]["app_role"] | null
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "approval_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_flows: {
        Row: {
          action_type: string
          company_id: string
          conditions: Json | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          module: string
          name: string
          steps_count: number
          updated_at: string
        }
        Insert: {
          action_type: string
          company_id: string
          conditions?: Json | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          module: string
          name: string
          steps_count?: number
          updated_at?: string
        }
        Update: {
          action_type?: string
          company_id?: string
          conditions?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          module?: string
          name?: string
          steps_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_flows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          current_step: number
          entity_id: string
          entity_type: string
          flow_id: string | null
          id: string
          metadata: Json | null
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          entity_id: string
          entity_type: string
          flow_id?: string | null
          id?: string
          metadata?: Json | null
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          entity_id?: string
          entity_type?: string
          flow_id?: string | null
          id?: string
          metadata?: Json | null
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "approval_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_ai_findings: {
        Row: {
          ai_confidence: number | null
          annual_report_id: string
          block_id: string | null
          category: string
          created_at: string
          detail: string
          id: string
          section_id: string | null
          severity: string
          status: string
          suggested_fix: Json | null
          title: string
        }
        Insert: {
          ai_confidence?: number | null
          annual_report_id: string
          block_id?: string | null
          category: string
          created_at?: string
          detail: string
          id?: string
          section_id?: string | null
          severity: string
          status?: string
          suggested_fix?: Json | null
          title: string
        }
        Update: {
          ai_confidence?: number | null
          annual_report_id?: string
          block_id?: string | null
          category?: string
          created_at?: string
          detail?: string
          id?: string
          section_id?: string | null
          severity?: string
          status?: string
          suggested_fix?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_ai_findings_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_ai_findings_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "ar_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_ai_findings_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "annual_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_approvals: {
        Row: {
          actor_id: string
          annual_report_id: string
          created_at: string
          from_status: string
          id: string
          note: string | null
          to_status: string
        }
        Insert: {
          actor_id: string
          annual_report_id: string
          created_at?: string
          from_status: string
          id?: string
          note?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string
          annual_report_id?: string
          created_at?: string
          from_status?: string
          id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_approvals_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_audit_comments: {
        Row: {
          author_name: string | null
          comment_text: string
          created_at: string
          id: string
          reply_text: string | null
          review_id: string
          section_ref: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          comment_text: string
          created_at?: string
          id?: string
          reply_text?: string | null
          review_id: string
          section_ref: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          comment_text?: string
          created_at?: string
          id?: string
          reply_text?: string | null
          review_id?: string
          section_ref?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_audit_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "ar_audit_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_audit_reviews: {
        Row: {
          annual_report_id: string
          audit_report_opinion: string | null
          audit_report_text: string | null
          audit_report_url: string | null
          auditor_email: string
          auditor_firm: string | null
          auditor_name: string | null
          auditor_phone: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          sent_at: string | null
          share_token: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          annual_report_id: string
          audit_report_opinion?: string | null
          audit_report_text?: string | null
          audit_report_url?: string | null
          auditor_email: string
          auditor_firm?: string | null
          auditor_name?: string | null
          auditor_phone?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          sent_at?: string | null
          share_token?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          annual_report_id?: string
          audit_report_opinion?: string | null
          audit_report_text?: string | null
          audit_report_url?: string | null
          auditor_email?: string
          auditor_firm?: string | null
          auditor_name?: string | null
          auditor_phone?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          sent_at?: string | null
          share_token?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_audit_reviews_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_blocks: {
        Row: {
          ai_confidence: number | null
          ai_generated: boolean
          annual_report_id: string
          block_type: string
          company_id: string
          content: Json
          created_at: string
          id: string
          is_locked: boolean
          metadata: Json
          section_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_generated?: boolean
          annual_report_id: string
          block_type: string
          company_id: string
          content?: Json
          created_at?: string
          id?: string
          is_locked?: boolean
          metadata?: Json
          section_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_generated?: boolean
          annual_report_id?: string
          block_type?: string
          company_id?: string
          content?: Json
          created_at?: string
          id?: string
          is_locked?: boolean
          metadata?: Json
          section_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_blocks_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_blocks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "annual_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_board_approvals: {
        Row: {
          annual_report_id: string
          board_member_id: string | null
          company_id: string
          created_at: string
          decision_at: string | null
          email: string
          full_name: string
          id: string
          objection_text: string | null
          reminded_at: string | null
          role: string
          share_token: string
          status: string
        }
        Insert: {
          annual_report_id: string
          board_member_id?: string | null
          company_id: string
          created_at?: string
          decision_at?: string | null
          email: string
          full_name: string
          id?: string
          objection_text?: string | null
          reminded_at?: string | null
          role: string
          share_token?: string
          status?: string
        }
        Update: {
          annual_report_id?: string
          board_member_id?: string | null
          company_id?: string
          created_at?: string
          decision_at?: string | null
          email?: string
          full_name?: string
          id?: string
          objection_text?: string | null
          reminded_at?: string | null
          role?: string
          share_token?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_board_approvals_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_board_approvals_board_member_id_fkey"
            columns: ["board_member_id"]
            isOneToOne: false
            referencedRelation: "ar_board_members"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_board_members: {
        Row: {
          company_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          personal_number_encrypted: string | null
          role: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          personal_number_encrypted?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          personal_number_encrypted?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      ar_bv_reminders: {
        Row: {
          annual_report_id: string
          company_id: string
          email_id: string | null
          error: string | null
          id: string
          recipients: string[]
          reminder_kind: string
          sent_at: string
          status: string
        }
        Insert: {
          annual_report_id: string
          company_id: string
          email_id?: string | null
          error?: string | null
          id?: string
          recipients?: string[]
          reminder_kind: string
          sent_at?: string
          status?: string
        }
        Update: {
          annual_report_id?: string
          company_id?: string
          email_id?: string | null
          error?: string | null
          id?: string
          recipients?: string[]
          reminder_kind?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_bv_reminders_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_collaborators: {
        Row: {
          annual_report_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          annual_report_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          annual_report_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_collaborators_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_comments: {
        Row: {
          anchor: string | null
          annual_report_id: string
          author_id: string
          block_id: string | null
          body: string
          created_at: string
          id: string
          mentions: string[]
          parent_comment_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          section_id: string | null
          status: string
        }
        Insert: {
          anchor?: string | null
          annual_report_id: string
          author_id: string
          block_id?: string | null
          body: string
          created_at?: string
          id?: string
          mentions?: string[]
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          status?: string
        }
        Update: {
          anchor?: string | null
          annual_report_id?: string
          author_id?: string
          block_id?: string | null
          body?: string
          created_at?: string
          id?: string
          mentions?: string[]
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_comments_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_comments_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "ar_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "ar_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_comments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "annual_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_deferred_tax: {
        Row: {
          annual_report_id: string
          created_at: string
          effective_tax_rate: number | null
          id: string
          net_deferred_tax_asset: number
          net_deferred_tax_liability: number
          notes: string | null
          tax_rate: number
          tax_reconciliation: Json
          temporary_differences: Json
          updated_at: string
        }
        Insert: {
          annual_report_id: string
          created_at?: string
          effective_tax_rate?: number | null
          id?: string
          net_deferred_tax_asset?: number
          net_deferred_tax_liability?: number
          notes?: string | null
          tax_rate?: number
          tax_reconciliation?: Json
          temporary_differences?: Json
          updated_at?: string
        }
        Update: {
          annual_report_id?: string
          created_at?: string
          effective_tax_rate?: number | null
          id?: string
          net_deferred_tax_asset?: number
          net_deferred_tax_liability?: number
          notes?: string | null
          tax_rate?: number
          tax_reconciliation?: Json
          temporary_differences?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_deferred_tax_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: true
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_financial_instruments: {
        Row: {
          account_number: string | null
          annual_report_id: string
          book_value: number
          category: string
          created_at: string
          fair_value: number
          fair_value_level: string | null
          id: string
          instrument_name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          annual_report_id: string
          book_value?: number
          category: string
          created_at?: string
          fair_value?: number
          fair_value_level?: string | null
          id?: string
          instrument_name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          annual_report_id?: string
          book_value?: number
          category?: string
          created_at?: string
          fair_value?: number
          fair_value_level?: string | null
          id?: string
          instrument_name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_financial_instruments_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_leases: {
        Row: {
          amortization_schedule: Json | null
          annual_report_id: string
          category: string
          created_at: string
          current_liability: number | null
          end_date: string
          has_index_clause: boolean
          id: string
          index_type: string | null
          initial_present_value: number | null
          interest_rate: number
          lease_term_months: number | null
          long_term_liability: number | null
          monthly_payment: number
          notes: string | null
          object_name: string
          rou_asset_value: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          amortization_schedule?: Json | null
          annual_report_id: string
          category: string
          created_at?: string
          current_liability?: number | null
          end_date: string
          has_index_clause?: boolean
          id?: string
          index_type?: string | null
          initial_present_value?: number | null
          interest_rate?: number
          lease_term_months?: number | null
          long_term_liability?: number | null
          monthly_payment: number
          notes?: string | null
          object_name: string
          rou_asset_value?: number | null
          start_date: string
          updated_at?: string
        }
        Update: {
          amortization_schedule?: Json | null
          annual_report_id?: string
          category?: string
          created_at?: string
          current_liability?: number | null
          end_date?: string
          has_index_clause?: boolean
          id?: string
          index_type?: string | null
          initial_present_value?: number | null
          interest_rate?: number
          lease_term_months?: number | null
          long_term_liability?: number | null
          monthly_payment?: number
          notes?: string | null
          object_name?: string
          rou_asset_value?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_leases_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_section_account_map: {
        Row: {
          account_number: string
          ai_confidence: number | null
          annual_report_id: string
          company_id: string
          created_at: string
          id: string
          is_locked: boolean
          override_reason: string | null
          section_id: string
          source: string
          weight: number
        }
        Insert: {
          account_number: string
          ai_confidence?: number | null
          annual_report_id: string
          company_id: string
          created_at?: string
          id?: string
          is_locked?: boolean
          override_reason?: string | null
          section_id: string
          source?: string
          weight?: number
        }
        Update: {
          account_number?: string
          ai_confidence?: number | null
          annual_report_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          override_reason?: string | null
          section_id?: string
          source?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ar_section_account_map_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_section_account_map_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_section_account_map_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "annual_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_signatures: {
        Row: {
          bankid_certificate: string | null
          bankid_order_ref: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          ip_address: string | null
          personal_number_masked: string | null
          role: string
          session_id: string
          share_token: string
          signed_at: string | null
          status: string
        }
        Insert: {
          bankid_certificate?: string | null
          bankid_order_ref?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          ip_address?: string | null
          personal_number_masked?: string | null
          role: string
          session_id: string
          share_token?: string
          signed_at?: string | null
          status?: string
        }
        Update: {
          bankid_certificate?: string | null
          bankid_order_ref?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          personal_number_masked?: string | null
          role?: string
          session_id?: string
          share_token?: string
          signed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_signatures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ar_signing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_signing_sessions: {
        Row: {
          annual_report_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          fallback_uploaded: boolean
          id: string
          initiated_at: string | null
          initiated_by: string | null
          mode: string
          signed_pdf_url: string | null
          status: string
        }
        Insert: {
          annual_report_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          fallback_uploaded?: boolean
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          mode?: string
          signed_pdf_url?: string | null
          status?: string
        }
        Update: {
          annual_report_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          fallback_uploaded?: boolean
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          mode?: string
          signed_pdf_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_signing_sessions_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_validations: {
        Row: {
          annual_report_id: string
          company_id: string
          created_at: string
          fix_action: Json | null
          id: string
          message: string
          resolved_at: string | null
          rule_code: string
          section_id: string | null
          severity: string
        }
        Insert: {
          annual_report_id: string
          company_id: string
          created_at?: string
          fix_action?: Json | null
          id?: string
          message: string
          resolved_at?: string | null
          rule_code: string
          section_id?: string | null
          severity: string
        }
        Update: {
          annual_report_id?: string
          company_id?: string
          created_at?: string
          fix_action?: Json | null
          id?: string
          message?: string
          resolved_at?: string | null
          rule_code?: string
          section_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_validations_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_validations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_validations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "annual_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_versions: {
        Row: {
          annual_report_id: string
          change_summary: string | null
          created_at: string
          created_by: string
          id: string
          is_named: boolean
          label: string | null
          snapshot: Json
          status: string
          version_number: number
        }
        Insert: {
          annual_report_id: string
          change_summary?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_named?: boolean
          label?: string | null
          snapshot: Json
          status: string
          version_number: number
        }
        Update: {
          annual_report_id?: string
          change_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_named?: boolean
          label?: string | null
          snapshot?: Json
          status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ar_versions_annual_report_id_fkey"
            columns: ["annual_report_id"]
            isOneToOne: false
            referencedRelation: "annual_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_events: {
        Row: {
          accounting_impact: Json | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          event_type: string
          fixed_asset_id: string
          id: string
          journal_entry_id: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          accounting_impact?: Json | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          event_type: string
          fixed_asset_id: string
          id?: string
          journal_entry_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          accounting_impact?: Json | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          event_type?: string
          fixed_asset_id?: string
          id?: string
          journal_entry_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_fixed_asset_id_fkey"
            columns: ["fixed_asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          company_id: string | null
          created_at: string
          data_categories: string[] | null
          data_subject_id: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          ip_address: string | null
          legal_basis: string | null
          new_data: Json | null
          old_data: Json | null
          processing_purpose: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          data_categories?: string[] | null
          data_subject_id?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          ip_address?: string | null
          legal_basis?: string | null
          new_data?: Json | null
          old_data?: Json | null
          processing_purpose?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          data_categories?: string[] | null
          data_subject_id?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          legal_basis?: string | null
          new_data?: Json | null
          old_data?: Json | null
          processing_purpose?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_state: Json | null
          previous_state: Json | null
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auditor_access: {
        Row: {
          company_id: string
          created_at: string
          email: string
          granted_by: string
          id: string
          last_accessed_at: string | null
          revoked_at: string | null
          scope_from: string | null
          scope_to: string | null
          scope_type: string
          scope_year: number | null
          token: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          granted_by: string
          id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          scope_from?: string | null
          scope_to?: string | null
          scope_type?: string
          scope_year?: number | null
          token?: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          granted_by?: string
          id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          scope_from?: string | null
          scope_to?: string | null
          scope_type?: string
          scope_year?: number | null
          token?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditor_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auditor_comments: {
        Row: {
          auditor_access_id: string
          comment: string
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          resolved_at: string | null
        }
        Insert: {
          auditor_access_id: string
          comment: string
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          resolved_at?: string | null
        }
        Update: {
          auditor_access_id?: string
          comment?: string
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditor_comments_auditor_access_id_fkey"
            columns: ["auditor_access_id"]
            isOneToOne: false
            referencedRelation: "auditor_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditor_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      autofix_findings: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          company_id: string
          confidence: number
          created_at: string
          description: string
          dismissed_at: string | null
          dismissed_by: string | null
          entity_id: string | null
          entity_table: string | null
          error_message: string | null
          id: string
          module: string
          payload: Json
          rule_key: string
          severity: string
          status: string
          suggested_action: string
          title: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          company_id: string
          confidence?: number
          created_at?: string
          description: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          entity_id?: string | null
          entity_table?: string | null
          error_message?: string | null
          id?: string
          module: string
          payload?: Json
          rule_key: string
          severity?: string
          status?: string
          suggested_action: string
          title: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          company_id?: string
          confidence?: number
          created_at?: string
          description?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          entity_id?: string | null
          entity_table?: string | null
          error_message?: string | null
          id?: string
          module?: string
          payload?: Json
          rule_key?: string
          severity?: string
          status?: string
          suggested_action?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      autofix_runs: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          duration_ms: number | null
          findings_applied: number | null
          findings_failed: number | null
          findings_new: number | null
          findings_total: number | null
          id: string
          kind: string
          module: string | null
          source: string
          triggered_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          findings_applied?: number | null
          findings_failed?: number | null
          findings_new?: number | null
          findings_total?: number | null
          id?: string
          kind: string
          module?: string | null
          source?: string
          triggered_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          findings_applied?: number | null
          findings_failed?: number | null
          findings_new?: number | null
          findings_total?: number | null
          id?: string
          kind?: string
          module?: string | null
          source?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      automation_settings: {
        Row: {
          agi_auto_prepare: boolean | null
          agi_auto_submit: boolean | null
          agi_reminder_days_before: number | null
          annual_report_auto_prepare: boolean | null
          annual_report_type: string | null
          audit_mode: boolean | null
          auto_defer_noncritical_payments: boolean
          auto_pay_skv_days_before: number
          auto_pay_skv_enabled: boolean
          auto_pay_skv_max_amount: number
          auto_pay_skv_types: string[]
          auto_prioritize_largest_ar: boolean
          auto_send_reminders_after_days: number | null
          company_id: string
          confidence_floor: number | null
          created_at: string
          escalation_destination: string | null
          id: string
          notify_email: string | null
          notify_on_completion: boolean | null
          system_boundaries: Json | null
          system_mission: string | null
          system_priorities: Json | null
          updated_at: string
          vat_auto_prepare: boolean | null
          vat_auto_submit: boolean | null
          vat_period_type: string | null
          vat_reminder_days_before: number | null
        }
        Insert: {
          agi_auto_prepare?: boolean | null
          agi_auto_submit?: boolean | null
          agi_reminder_days_before?: number | null
          annual_report_auto_prepare?: boolean | null
          annual_report_type?: string | null
          audit_mode?: boolean | null
          auto_defer_noncritical_payments?: boolean
          auto_pay_skv_days_before?: number
          auto_pay_skv_enabled?: boolean
          auto_pay_skv_max_amount?: number
          auto_pay_skv_types?: string[]
          auto_prioritize_largest_ar?: boolean
          auto_send_reminders_after_days?: number | null
          company_id: string
          confidence_floor?: number | null
          created_at?: string
          escalation_destination?: string | null
          id?: string
          notify_email?: string | null
          notify_on_completion?: boolean | null
          system_boundaries?: Json | null
          system_mission?: string | null
          system_priorities?: Json | null
          updated_at?: string
          vat_auto_prepare?: boolean | null
          vat_auto_submit?: boolean | null
          vat_period_type?: string | null
          vat_reminder_days_before?: number | null
        }
        Update: {
          agi_auto_prepare?: boolean | null
          agi_auto_submit?: boolean | null
          agi_reminder_days_before?: number | null
          annual_report_auto_prepare?: boolean | null
          annual_report_type?: string | null
          audit_mode?: boolean | null
          auto_defer_noncritical_payments?: boolean
          auto_pay_skv_days_before?: number
          auto_pay_skv_enabled?: boolean
          auto_pay_skv_max_amount?: number
          auto_pay_skv_types?: string[]
          auto_prioritize_largest_ar?: boolean
          auto_send_reminders_after_days?: number | null
          company_id?: string
          confidence_floor?: number | null
          created_at?: string
          escalation_destination?: string | null
          id?: string
          notify_email?: string | null
          notify_on_completion?: boolean | null
          system_boundaries?: Json | null
          system_mission?: string | null
          system_priorities?: Json | null
          updated_at?: string
          vat_auto_prepare?: boolean | null
          vat_auto_submit?: boolean | null
          vat_period_type?: string | null
          vat_reminder_days_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_tasks: {
        Row: {
          approval_summary: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          prepared_data: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          requires_approval: boolean | null
          result_data: Json | null
          retry_count: number | null
          rpa_session_id: string | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          submission_method: string | null
          task_type: string
          updated_at: string
        }
        Insert: {
          approval_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          prepared_data?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          requires_approval?: boolean | null
          result_data?: Json | null
          retry_count?: number | null
          rpa_session_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          submission_method?: string | null
          task_type: string
          updated_at?: string
        }
        Update: {
          approval_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          prepared_data?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          requires_approval?: boolean | null
          result_data?: Json | null
          retry_count?: number | null
          rpa_session_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          submission_method?: string | null
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_tasks_rpa_session_id_fkey"
            columns: ["rpa_session_id"]
            isOneToOne: false
            referencedRelation: "rpa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          balance: number | null
          bank_connection_id: string | null
          bank_name: string
          company_id: string
          connection_status: string
          created_at: string
          created_by: string
          currency: string
          iban: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          requisition_id: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          balance?: number | null
          bank_connection_id?: string | null
          bank_name: string
          company_id: string
          connection_status?: string
          created_at?: string
          created_by: string
          currency?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          requisition_id?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          balance?: number | null
          bank_connection_id?: string | null
          bank_name?: string
          company_id?: string
          connection_status?: string
          created_at?: string
          created_by?: string
          currency?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          requisition_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connection_events: {
        Row: {
          account_count: number | null
          company_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          transaction_count: number | null
        }
        Insert: {
          account_count?: number | null
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          transaction_count?: number | null
        }
        Update: {
          account_count?: number | null
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_connection_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_matching_rules: {
        Row: {
          auto_approve: boolean
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          match_field: string
          match_pattern: string
          priority: number
          rule_name: string
          suggested_account_id: string | null
          suggested_vat_code: string | null
          updated_at: string
        }
        Insert: {
          auto_approve?: boolean
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          match_field: string
          match_pattern: string
          priority?: number
          rule_name: string
          suggested_account_id?: string | null
          suggested_vat_code?: string | null
          updated_at?: string
        }
        Update: {
          auto_approve?: boolean
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          match_field?: string
          match_pattern?: string
          priority?: number
          rule_name?: string
          suggested_account_id?: string | null
          suggested_vat_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_matching_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_matching_rules_suggested_account_id_fkey"
            columns: ["suggested_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_notifications: {
        Row: {
          bank_account_id: string | null
          company_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          read_at: string | null
          severity: string
          title: string
        }
        Insert: {
          bank_account_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          read_at?: string | null
          severity?: string
          title: string
        }
        Update: {
          bank_account_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          read_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_notifications_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_payment_initiations: {
        Row: {
          amount: number
          auth_url: string | null
          bank_account_id: string
          company_id: string
          created_at: string
          created_by: string
          creditor_account: string
          creditor_name: string | null
          currency: string
          execution_date: string
          external_payment_id: string | null
          id: string
          journal_entry_id: string | null
          provider: string
          purpose: string
          raw_response: Json | null
          reference: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          auth_url?: string | null
          bank_account_id: string
          company_id: string
          created_at?: string
          created_by: string
          creditor_account: string
          creditor_name?: string | null
          currency?: string
          execution_date: string
          external_payment_id?: string | null
          id?: string
          journal_entry_id?: string | null
          provider?: string
          purpose?: string
          raw_response?: Json | null
          reference: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auth_url?: string | null
          bank_account_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          creditor_account?: string
          creditor_name?: string | null
          currency?: string
          execution_date?: string
          external_payment_id?: string | null
          id?: string
          journal_entry_id?: string | null
          provider?: string
          purpose?: string
          raw_response?: Json | null
          reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_payment_initiations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_payment_initiations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_payment_initiations_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_sync_log: {
        Row: {
          bank_account_id: string | null
          company_id: string
          duration_ms: number | null
          error_message: string | null
          id: string
          status: string
          synced_at: string
          transactions_added: number | null
        }
        Insert: {
          bank_account_id?: string | null
          company_id: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          status: string
          synced_at?: string
          transactions_added?: number | null
        }
        Update: {
          bank_account_id?: string | null
          company_id?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          status?: string
          synced_at?: string
          transactions_added?: number | null
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          ai_confidence: number | null
          ai_explanation: string | null
          ai_model_version: string | null
          amount: number
          bank_account_id: string
          booking_date: string
          company_id: string
          counterparty_account: string | null
          counterparty_name: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          journal_entry_id: string | null
          matched_invoice_id: string | null
          matched_transaction_id: string | null
          reference: string | null
          rejection_reason: string | null
          status: string
          suggested_account_id: string | null
          transaction_id: string
          transaction_type: string | null
          value_date: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_explanation?: string | null
          ai_model_version?: string | null
          amount: number
          bank_account_id: string
          booking_date: string
          company_id: string
          counterparty_account?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          matched_invoice_id?: string | null
          matched_transaction_id?: string | null
          reference?: string | null
          rejection_reason?: string | null
          status?: string
          suggested_account_id?: string | null
          transaction_id: string
          transaction_type?: string | null
          value_date?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_explanation?: string | null
          ai_model_version?: string | null
          amount?: number
          bank_account_id?: string
          booking_date?: string
          company_id?: string
          counterparty_account?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          matched_invoice_id?: string | null
          matched_transaction_id?: string | null
          reference?: string | null
          rejection_reason?: string | null
          status?: string
          suggested_account_id?: string | null
          transaction_id?: string
          transaction_type?: string | null
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_suggested_account_id_fkey"
            columns: ["suggested_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      board_mode_feedback: {
        Row: {
          action: string
          company_id: string
          created_at: string
          id: string
          insight_id: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          id?: string
          insight_id?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          id?: string
          insight_id?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_mode_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bolagsverket_documents: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          document_type: string
          fiscal_year: number | null
          id: string
          period_end: string | null
          source: string
          storage_path: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id: string
          document_type?: string
          fiscal_year?: number | null
          id?: string
          period_end?: string | null
          source?: string
          storage_path: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          document_type?: string
          fiscal_year?: number | null
          id?: string
          period_end?: string | null
          source?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "bolagsverket_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_ai_sessions: {
        Row: {
          budget_id: string
          created_at: string
          id: string
          last_activity: string
          messages: Json
        }
        Insert: {
          budget_id: string
          created_at?: string
          id?: string
          last_activity?: string
          messages?: Json
        }
        Update: {
          budget_id?: string
          created_at?: string
          id?: string
          last_activity?: string
          messages?: Json
        }
        Relationships: [
          {
            foreignKeyName: "budget_ai_sessions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_comments: {
        Row: {
          budget_id: string | null
          comment_text: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          section_key: string
          updated_at: string
        }
        Insert: {
          budget_id?: string | null
          comment_text?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          section_key: string
          updated_at?: string
        }
        Update: {
          budget_id?: string | null
          comment_text?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_comments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_forecasts: {
        Row: {
          account_number: string
          actual_amount: number | null
          ai_explanation: string | null
          budget_id: string
          created_at: string
          forecast_amount: number
          forecast_generated_at: string | null
          id: string
          month: string
          variance: number | null
          variance_pct: number | null
        }
        Insert: {
          account_number: string
          actual_amount?: number | null
          ai_explanation?: string | null
          budget_id: string
          created_at?: string
          forecast_amount?: number
          forecast_generated_at?: string | null
          id?: string
          month: string
          variance?: number | null
          variance_pct?: number | null
        }
        Update: {
          account_number?: string
          actual_amount?: number | null
          ai_explanation?: string | null
          budget_id?: string
          created_at?: string
          forecast_amount?: number
          forecast_generated_at?: string | null
          id?: string
          month?: string
          variance?: number | null
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_forecasts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_plans: {
        Row: {
          ai_assumptions: Json | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          creation_method: string | null
          fiscal_year: number
          growth_rate: number | null
          id: string
          name: string
          scenario_type: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_assumptions?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          creation_method?: string | null
          fiscal_year: number
          growth_rate?: number | null
          id?: string
          name?: string
          scenario_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_assumptions?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          creation_method?: string | null
          fiscal_year?: number
          growth_rate?: number | null
          id?: string
          name?: string
          scenario_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_rolling_forecasts: {
        Row: {
          budget_id: string
          company_id: string
          computed_at: string
          drivers_hash: string | null
          fiscal_year: number
          id: string
          latest_actual_date: string | null
          payload: Json
        }
        Insert: {
          budget_id: string
          company_id: string
          computed_at?: string
          drivers_hash?: string | null
          fiscal_year: number
          id?: string
          latest_actual_date?: string | null
          payload?: Json
        }
        Update: {
          budget_id?: string
          company_id?: string
          computed_at?: string
          drivers_hash?: string | null
          fiscal_year?: number
          id?: string
          latest_actual_date?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "budget_rolling_forecasts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: true
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rolling_forecasts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_rows: {
        Row: {
          account_name: string
          account_number: string
          ai_generated: boolean | null
          annual_total: number | null
          apr: number
          aug: number
          budget_id: string
          created_at: string
          dec: number
          feb: number
          id: string
          jan: number
          jul: number
          jun: number
          last_updated_by: string | null
          maj: number
          manually_adjusted: boolean | null
          mar: number
          notes: string | null
          nov: number
          okt: number
          sep: number
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          ai_generated?: boolean | null
          annual_total?: number | null
          apr?: number
          aug?: number
          budget_id: string
          created_at?: string
          dec?: number
          feb?: number
          id?: string
          jan?: number
          jul?: number
          jun?: number
          last_updated_by?: string | null
          maj?: number
          manually_adjusted?: boolean | null
          mar?: number
          notes?: string | null
          nov?: number
          okt?: number
          sep?: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          ai_generated?: boolean | null
          annual_total?: number | null
          apr?: number
          aug?: number
          budget_id?: string
          created_at?: string
          dec?: number
          feb?: number
          id?: string
          jan?: number
          jul?: number
          jun?: number
          last_updated_by?: string | null
          maj?: number
          manually_adjusted?: boolean | null
          mar?: number
          notes?: string | null
          nov?: number
          okt?: number
          sep?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_rows_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_scenarios: {
        Row: {
          assumptions: Json | null
          budget_id: string
          cost_pct: number
          created_at: string
          created_by: string | null
          description: string | null
          driver_patch: Json | null
          growth_pct: number
          id: string
          is_pinned: boolean
          kind: string
          name: string
          target_kpis: Json | null
          updated_at: string
        }
        Insert: {
          assumptions?: Json | null
          budget_id: string
          cost_pct?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver_patch?: Json | null
          growth_pct?: number
          id?: string
          is_pinned?: boolean
          kind?: string
          name?: string
          target_kpis?: Json | null
          updated_at?: string
        }
        Update: {
          assumptions?: Json | null
          budget_id?: string
          cost_pct?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver_patch?: Json | null
          growth_pct?: number
          id?: string
          is_pinned?: boolean
          kind?: string
          name?: string
          target_kpis?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_scenarios_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_targets: {
        Row: {
          budget_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          kpi: string
          notes: string | null
          target_period: string
          target_value: number
        }
        Insert: {
          budget_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kpi: string
          notes?: string | null
          target_period: string
          target_value: number
        }
        Update: {
          budget_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kpi?: string
          notes?: string | null
          target_period?: string
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_targets_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          account_id: string | null
          amount: number
          company_id: string
          cost_center_id: string | null
          created_at: string
          created_by: string
          id: string
          month: number | null
          notes: string | null
          updated_at: string
          year: number
        }
        Insert: {
          account_id?: string | null
          amount: number
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          month?: number | null
          notes?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          account_id?: string | null
          amount?: number
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          month?: number | null
          notes?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_alerts: {
        Row: {
          action_url: string | null
          code: string
          company_id: string | null
          created_at: string
          dismissed_until: string | null
          firm_client_id: string | null
          firm_id: string
          id: string
          message: string
          severity: string
          status: string
          title: string
        }
        Insert: {
          action_url?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          dismissed_until?: string | null
          firm_client_id?: string | null
          firm_id: string
          id?: string
          message: string
          severity: string
          status?: string
          title: string
        }
        Update: {
          action_url?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          dismissed_until?: string | null
          firm_client_id?: string | null
          firm_id?: string
          id?: string
          message?: string
          severity?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bureau_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_alerts_firm_client_id_fkey"
            columns: ["firm_client_id"]
            isOneToOne: false
            referencedRelation: "firm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_alerts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_automation_log: {
        Row: {
          created_at: string
          error_message: string | null
          firm_client_id: string | null
          firm_id: string
          id: string
          result_summary: string | null
          rule_id: string | null
          status: string
          template: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          firm_client_id?: string | null
          firm_id: string
          id?: string
          result_summary?: string | null
          rule_id?: string | null
          status: string
          template: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          firm_client_id?: string | null
          firm_id?: string
          id?: string
          result_summary?: string | null
          rule_id?: string | null
          status?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "bureau_automation_log_firm_client_id_fkey"
            columns: ["firm_client_id"]
            isOneToOne: false
            referencedRelation: "firm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_automation_log_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_automation_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "bureau_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_automation_rules: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          firm_id: string
          id: string
          name: string
          template: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          firm_id: string
          id?: string
          name: string
          template: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          firm_id?: string
          id?: string
          name?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bureau_automation_rules_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_client_notes: {
        Row: {
          author_id: string | null
          company_id: string
          content: string
          created_at: string
          edited_at: string | null
          firm_id: string
          id: string
          is_pinned: boolean
          tags: string[]
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          company_id: string
          content?: string
          created_at?: string
          edited_at?: string | null
          firm_id: string
          id?: string
          is_pinned?: boolean
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          company_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          firm_id?: string
          id?: string
          is_pinned?: boolean
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bureau_client_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_client_notes_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_client_risk: {
        Row: {
          calculated_at: string
          company_id: string
          firm_client_id: string
          firm_id: string
          id: string
          level: string
          score: number
          signals: Json
        }
        Insert: {
          calculated_at?: string
          company_id: string
          firm_client_id: string
          firm_id: string
          id?: string
          level?: string
          score?: number
          signals?: Json
        }
        Update: {
          calculated_at?: string
          company_id?: string
          firm_client_id?: string
          firm_id?: string
          id?: string
          level?: string
          score?: number
          signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bureau_client_risk_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_client_risk_firm_client_id_fkey"
            columns: ["firm_client_id"]
            isOneToOne: true
            referencedRelation: "firm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_client_risk_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_portfolio_insights: {
        Row: {
          body: string
          created_at: string
          data: Json
          firm_id: string
          id: string
          insight_type: string
          title: string
          week_starts_on: string | null
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          firm_id: string
          id?: string
          insight_type: string
          title: string
          week_starts_on?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          firm_id?: string
          id?: string
          insight_type?: string
          title?: string
          week_starts_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bureau_portfolio_insights_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_audit_log: {
        Row: {
          calculation_type: string
          company_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_refs: Json
          model_version: string | null
          output_refs: Json
          status: string
          trigger_source: string | null
        }
        Insert: {
          calculation_type: string
          company_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_refs?: Json
          model_version?: string | null
          output_refs?: Json
          status?: string
          trigger_source?: string | null
        }
        Update: {
          calculation_type?: string
          company_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_refs?: Json
          model_version?: string | null
          output_refs?: Json
          status?: string
          trigger_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calculation_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      camt054_imports: {
        Row: {
          bank_account_id: string | null
          company_id: string
          created_at: string
          file_name: string | null
          id: string
          imported_by: string
          matched_count: number
          status: string
          transaction_count: number
        }
        Insert: {
          bank_account_id?: string | null
          company_id: string
          created_at?: string
          file_name?: string | null
          id?: string
          imported_by: string
          matched_count?: number
          status?: string
          transaction_count?: number
        }
        Update: {
          bank_account_id?: string | null
          company_id?: string
          created_at?: string
          file_name?: string | null
          id?: string
          imported_by?: string
          matched_count?: number
          status?: string
          transaction_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "camt054_imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camt054_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      camt054_transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          booking_date: string
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          creditor_account: string | null
          creditor_name: string | null
          currency: string
          debtor_account: string | null
          debtor_name: string | null
          description: string | null
          end_to_end_id: string | null
          id: string
          import_id: string
          journal_entry_id: string | null
          match_confidence: number | null
          match_type: string
          matched_invoice_id: string | null
          ocr_reference: string | null
          reference: string | null
          status: string
          transaction_type: string
          value_date: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          booking_date: string
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          creditor_account?: string | null
          creditor_name?: string | null
          currency?: string
          debtor_account?: string | null
          debtor_name?: string | null
          description?: string | null
          end_to_end_id?: string | null
          id?: string
          import_id: string
          journal_entry_id?: string | null
          match_confidence?: number | null
          match_type?: string
          matched_invoice_id?: string | null
          ocr_reference?: string | null
          reference?: string | null
          status?: string
          transaction_type?: string
          value_date?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          booking_date?: string
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          creditor_account?: string | null
          creditor_name?: string | null
          currency?: string
          debtor_account?: string | null
          debtor_name?: string | null
          description?: string | null
          end_to_end_id?: string | null
          id?: string
          import_id?: string
          journal_entry_id?: string | null
          match_confidence?: number | null
          match_type?: string
          matched_invoice_id?: string | null
          ocr_reference?: string | null
          reference?: string | null
          status?: string
          transaction_type?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camt054_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camt054_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camt054_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "camt054_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camt054_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camt054_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_forecasts: {
        Row: {
          actual_balance: number | null
          company_id: string
          confidence_score: number | null
          created_at: string
          forecast_date: string
          id: string
          notes: string | null
          opening_balance: number
          predicted_balance: number
          predicted_expenses: number
          predicted_income: number
        }
        Insert: {
          actual_balance?: number | null
          company_id: string
          confidence_score?: number | null
          created_at?: string
          forecast_date: string
          id?: string
          notes?: string | null
          opening_balance: number
          predicted_balance: number
          predicted_expenses?: number
          predicted_income?: number
        }
        Update: {
          actual_balance?: number | null
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          forecast_date?: string
          id?: string
          notes?: string | null
          opening_balance?: number
          predicted_balance?: number
          predicted_expenses?: number
          predicted_income?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_forecasts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_scenarios: {
        Row: {
          base_snapshot_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          scenario_type: string
          updated_at: string
        }
        Insert: {
          base_snapshot_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scenario_type?: string
          updated_at?: string
        }
        Update: {
          base_snapshot_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scenario_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_scenarios_base_snapshot_fk"
            columns: ["base_snapshot_id"]
            isOneToOne: false
            referencedRelation: "forecast_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_learning_rules: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          expense_account: string
          expense_account_name: string | null
          hit_count: number
          id: string
          merchant_pattern: string
          updated_at: string
          vat_code: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          expense_account: string
          expense_account_name?: string | null
          hit_count?: number
          id?: string
          merchant_pattern: string
          updated_at?: string
          vat_code?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          expense_account?: string
          expense_account_name?: string | null
          hit_count?: number
          id?: string
          merchant_pattern?: string
          updated_at?: string
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cc_learning_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cfo_conversation_messages: {
        Row: {
          company_id: string
          content: string
          conversation_id: string
          created_at: string
          feedback: string | null
          id: string
          role: Database["public"]["Enums"]["cfo_message_role"]
          structured: Json | null
        }
        Insert: {
          company_id: string
          content: string
          conversation_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          role: Database["public"]["Enums"]["cfo_message_role"]
          structured?: Json | null
        }
        Update: {
          company_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          role?: Database["public"]["Enums"]["cfo_message_role"]
          structured?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cfo_conversation_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfo_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "cfo_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cfo_conversations: {
        Row: {
          company_id: string
          context_payload: Json
          context_type: Database["public"]["Enums"]["cfo_context_type"]
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          context_payload?: Json
          context_type?: Database["public"]["Enums"]["cfo_context_type"]
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          context_payload?: Json
          context_type?: Database["public"]["Enums"]["cfo_context_type"]
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfo_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cfo_user_preferences: {
        Row: {
          company_id: string
          created_at: string
          dimension: Database["public"]["Enums"]["cfo_pref_dimension"]
          evidence_count: number
          id: string
          last_signal_at: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dimension: Database["public"]["Enums"]["cfo_pref_dimension"]
          evidence_count?: number
          id?: string
          last_signal_at?: string
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dimension?: Database["public"]["Enums"]["cfo_pref_dimension"]
          evidence_count?: number
          id?: string
          last_signal_at?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfo_user_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string
          company_id: string
          created_at: string
          deprecated: boolean
          id: string
          is_active: boolean
          updated_at: string
          vat_code: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          account_type: string
          company_id: string
          created_at?: string
          deprecated?: boolean
          id?: string
          is_active?: boolean
          updated_at?: string
          vat_code?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string
          company_id?: string
          created_at?: string
          deprecated?: boolean
          id?: string
          is_active?: boolean
          updated_at?: string
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_request_attachments: {
        Row: {
          ai_match_confidence: number | null
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          request_id: string
          size_bytes: number | null
          uploaded_by: string
        }
        Insert: {
          ai_match_confidence?: number | null
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          request_id: string
          size_bytes?: number | null
          uploaded_by: string
        }
        Update: {
          ai_match_confidence?: number | null
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          request_id?: string
          size_bytes?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_request_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "client_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      client_requests: {
        Row: {
          ai_generated: boolean
          ai_suggestion: string | null
          assigned_to_user_id: string | null
          company_id: string
          created_at: string
          due_date: string | null
          entity_id: string | null
          entity_label: string | null
          firm_id: string
          id: string
          message: string | null
          module: Database["public"]["Enums"]["client_request_module"]
          priority: string
          request_type: Database["public"]["Enums"]["client_request_type"]
          requested_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          responded_at: string | null
          responded_by: string | null
          response_text: string | null
          status: Database["public"]["Enums"]["client_request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          ai_suggestion?: string | null
          assigned_to_user_id?: string | null
          company_id: string
          created_at?: string
          due_date?: string | null
          entity_id?: string | null
          entity_label?: string | null
          firm_id: string
          id?: string
          message?: string | null
          module?: Database["public"]["Enums"]["client_request_module"]
          priority?: string
          request_type?: Database["public"]["Enums"]["client_request_type"]
          requested_by: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["client_request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          ai_suggestion?: string | null
          assigned_to_user_id?: string | null
          company_id?: string
          created_at?: string
          due_date?: string | null
          entity_id?: string | null
          entity_label?: string | null
          firm_id?: string
          id?: string
          message?: string | null
          module?: Database["public"]["Enums"]["client_request_module"]
          priority?: string
          request_type?: Database["public"]["Enums"]["client_request_type"]
          requested_by?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["client_request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requests_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_checklist_items: {
        Row: {
          assigned_to: string | null
          auto_check_result: boolean | null
          auto_check_type: string | null
          category: string
          closing_period_id: string
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          is_required: boolean | null
          notes: string | null
          sort_order: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          auto_check_result?: boolean | null
          auto_check_type?: string | null
          category: string
          closing_period_id: string
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean | null
          notes?: string | null
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          auto_check_result?: boolean | null
          auto_check_type?: string | null
          category?: string
          closing_period_id?: string
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean | null
          notes?: string | null
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_checklist_items_closing_period_id_fkey"
            columns: ["closing_period_id"]
            isOneToOne: false
            referencedRelation: "closing_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_checklist_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_period_locks: {
        Row: {
          closing_period_id: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          locked_at: string
          locked_by: string
          locked_from: string
          locked_to: string
          unlock_reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
        }
        Insert: {
          closing_period_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          locked_at?: string
          locked_by: string
          locked_from: string
          locked_to: string
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Update: {
          closing_period_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          locked_at?: string
          locked_by?: string
          locked_from?: string
          locked_to?: string
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_period_locks_closing_period_id_fkey"
            columns: ["closing_period_id"]
            isOneToOne: false
            referencedRelation: "closing_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_period_locks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_periods: {
        Row: {
          company_id: string
          created_at: string
          hard_closed_at: string | null
          hard_closed_by: string | null
          id: string
          notes: string | null
          period_month: number | null
          period_type: string
          period_year: number
          progress_percent: number | null
          review_started_at: string | null
          review_started_by: string | null
          soft_closed_at: string | null
          soft_closed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          hard_closed_at?: string | null
          hard_closed_by?: string | null
          id?: string
          notes?: string | null
          period_month?: number | null
          period_type?: string
          period_year: number
          progress_percent?: number | null
          review_started_at?: string | null
          review_started_by?: string | null
          soft_closed_at?: string | null
          soft_closed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          hard_closed_at?: string | null
          hard_closed_by?: string | null
          id?: string
          notes?: string | null
          period_month?: number | null
          period_type?: string
          period_year?: number
          progress_percent?: number | null
          review_started_at?: string | null
          review_started_by?: string | null
          soft_closed_at?: string | null
          soft_closed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_runs: {
        Row: {
          adjustments_applied: Json
          ai_confidence: number | null
          blockers: Json
          company_id: string
          completed_at: string | null
          created_at: string
          critical_issues_count: number
          current_step: number
          error_message: string | null
          eta_seconds: number | null
          fiscal_year: number
          id: string
          is_dry_run: boolean
          live_preview: Json
          progress_pct: number
          started_at: string
          started_by: string | null
          status: string
          tasks: Json
          total_steps: number
          updated_at: string
          warning_issues_count: number
        }
        Insert: {
          adjustments_applied?: Json
          ai_confidence?: number | null
          blockers?: Json
          company_id: string
          completed_at?: string | null
          created_at?: string
          critical_issues_count?: number
          current_step?: number
          error_message?: string | null
          eta_seconds?: number | null
          fiscal_year: number
          id?: string
          is_dry_run?: boolean
          live_preview?: Json
          progress_pct?: number
          started_at?: string
          started_by?: string | null
          status?: string
          tasks?: Json
          total_steps?: number
          updated_at?: string
          warning_issues_count?: number
        }
        Update: {
          adjustments_applied?: Json
          ai_confidence?: number | null
          blockers?: Json
          company_id?: string
          completed_at?: string | null
          created_at?: string
          critical_issues_count?: number
          current_step?: number
          error_message?: string | null
          eta_seconds?: number | null
          fiscal_year?: number
          id?: string
          is_dry_run?: boolean
          live_preview?: Json
          progress_pct?: number
          started_at?: string
          started_by?: string | null
          status?: string
          tasks?: Json
          total_steps?: number
          updated_at?: string
          warning_issues_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "closing_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      co_signature_signers: {
        Row: {
          audit_metadata: Json
          co_signature_id: string
          email: string
          id: string
          invited_at: string
          ip: string | null
          name: string
          personal_number: string | null
          reminded_at: string | null
          role: string
          signed_at: string | null
          signed_with_bankid: boolean
          token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          audit_metadata?: Json
          co_signature_id: string
          email: string
          id?: string
          invited_at?: string
          ip?: string | null
          name: string
          personal_number?: string | null
          reminded_at?: string | null
          role: string
          signed_at?: string | null
          signed_with_bankid?: boolean
          token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          audit_metadata?: Json
          co_signature_id?: string
          email?: string
          id?: string
          invited_at?: string
          ip?: string | null
          name?: string
          personal_number?: string | null
          reminded_at?: string | null
          role?: string
          signed_at?: string | null
          signed_with_bankid?: boolean
          token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "co_signature_signers_co_signature_id_fkey"
            columns: ["co_signature_id"]
            isOneToOne: false
            referencedRelation: "co_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      co_signatures: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_count: number
          created_at: string
          created_by: string
          document_type: string
          document_version: string
          expires_at: string
          id: string
          metadata: Json
          required_count: number
          signatory_rule_mode: string
          signatory_rule_text: string | null
          status: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_count?: number
          created_at?: string
          created_by: string
          document_type?: string
          document_version?: string
          expires_at?: string
          id?: string
          metadata?: Json
          required_count?: number
          signatory_rule_mode?: string
          signatory_rule_text?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_count?: number
          created_at?: string
          created_by?: string
          document_type?: string
          document_version?: string
          expires_at?: string
          id?: string
          metadata?: Json
          required_count?: number
          signatory_rule_mode?: string
          signatory_rule_text?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_comments: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          company_id: string
          created_at: string
          entity_key: string
          entity_type: string
          id: string
          mentions: string[] | null
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          company_id: string
          created_at?: string
          entity_key: string
          entity_type: string
          id?: string
          mentions?: string[] | null
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          company_id?: string
          created_at?: string
          entity_key?: string
          entity_type?: string
          id?: string
          mentions?: string[] | null
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "collab_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_explanations: {
        Row: {
          ai_generated: boolean
          attached_amount_sek: number | null
          author_id: string
          company_id: string
          created_at: string
          entity_key: string
          explanation_text: string
          id: string
          period: string | null
        }
        Insert: {
          ai_generated?: boolean
          attached_amount_sek?: number | null
          author_id: string
          company_id: string
          created_at?: string
          entity_key: string
          explanation_text: string
          id?: string
          period?: string | null
        }
        Update: {
          ai_generated?: boolean
          attached_amount_sek?: number | null
          author_id?: string
          company_id?: string
          created_at?: string
          entity_key?: string
          explanation_text?: string
          id?: string
          period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collab_explanations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_activity: {
        Row: {
          activity_type: string
          company_id: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          company_id: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_activity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_comments: {
        Row: {
          company_id: string
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_resolved: boolean | null
          parent_comment_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "collaboration_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_mentions: {
        Row: {
          comment_id: string | null
          company_id: string
          created_at: string
          id: string
          is_read: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          read_at: string | null
          task_id: string | null
        }
        Insert: {
          comment_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          read_at?: string | null
          task_id?: string | null
        }
        Update: {
          comment_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentioned_by?: string
          mentioned_user_id?: string
          read_at?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "collaboration_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_mentions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_mentions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "collaboration_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_tasks: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_cases: {
        Row: {
          close_reason: string | null
          closed_at: string | null
          collection_fee: number | null
          company_id: string
          created_at: string
          created_by: string
          debtor_name: string | null
          debtor_org_number: string | null
          id: string
          inkassogram_reference: string | null
          interest_amount: number | null
          invoice_id: string
          original_amount: number
          paid_at: string | null
          remaining_amount: number | null
          reminder_count: number | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          close_reason?: string | null
          closed_at?: string | null
          collection_fee?: number | null
          company_id: string
          created_at?: string
          created_by: string
          debtor_name?: string | null
          debtor_org_number?: string | null
          id?: string
          inkassogram_reference?: string | null
          interest_amount?: number | null
          invoice_id: string
          original_amount: number
          paid_at?: string | null
          remaining_amount?: number | null
          reminder_count?: number | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          close_reason?: string | null
          closed_at?: string | null
          collection_fee?: number | null
          company_id?: string
          created_at?: string
          created_by?: string
          debtor_name?: string | null
          debtor_org_number?: string | null
          id?: string
          inkassogram_reference?: string | null
          interest_amount?: number | null
          invoice_id?: string
          original_amount?: number
          paid_at?: string | null
          remaining_amount?: number | null
          reminder_count?: number | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_cases_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      collective_agreements: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_template: boolean
          name: string
          rules: Json
          template_key: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          name: string
          rules?: Json
          template_key?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          name?: string
          rules?: Json
          template_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collective_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accounting_framework: string
          address: string | null
          bank_account_number: string | null
          bank_name: string | null
          bankgiro: string | null
          billing_email: string | null
          bolagsverket_data: Json | null
          bolagsverket_synced_at: string | null
          business_description: string | null
          company_type: string | null
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          created_by: string
          currency: string
          data_version: number
          email_inbox_address: string | null
          engagements_status: string | null
          eu_vat_liable: boolean | null
          fiscal_year_end: string | null
          fiscal_year_start: string | null
          group_id: string | null
          iban: string | null
          id: string
          industry: Database["public"]["Enums"]["industry_type"] | null
          kyc_status: string | null
          legal_form: string | null
          logo_url: string | null
          metadata: Json
          monthly_price: number | null
          name: string
          num_employees: number | null
          org_number: string
          plusgiro: string | null
          registered_for_fskatt: boolean | null
          registration_date: string | null
          sni_codes: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          swift_bic: string | null
          tax_mandate_accepted: boolean | null
          tax_mandate_accepted_at: string | null
          tax_mandate_accepted_by: string | null
          updated_at: string
          vat_liable_from: string | null
          vat_number: string | null
          vat_period_type: string | null
        }
        Insert: {
          accounting_framework?: string
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bankgiro?: string | null
          billing_email?: string | null
          bolagsverket_data?: Json | null
          bolagsverket_synced_at?: string | null
          business_description?: string | null
          company_type?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          created_by: string
          currency?: string
          data_version?: number
          email_inbox_address?: string | null
          engagements_status?: string | null
          eu_vat_liable?: boolean | null
          fiscal_year_end?: string | null
          fiscal_year_start?: string | null
          group_id?: string | null
          iban?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"] | null
          kyc_status?: string | null
          legal_form?: string | null
          logo_url?: string | null
          metadata?: Json
          monthly_price?: number | null
          name: string
          num_employees?: number | null
          org_number: string
          plusgiro?: string | null
          registered_for_fskatt?: boolean | null
          registration_date?: string | null
          sni_codes?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          swift_bic?: string | null
          tax_mandate_accepted?: boolean | null
          tax_mandate_accepted_at?: string | null
          tax_mandate_accepted_by?: string | null
          updated_at?: string
          vat_liable_from?: string | null
          vat_number?: string | null
          vat_period_type?: string | null
        }
        Update: {
          accounting_framework?: string
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bankgiro?: string | null
          billing_email?: string | null
          bolagsverket_data?: Json | null
          bolagsverket_synced_at?: string | null
          business_description?: string | null
          company_type?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          created_by?: string
          currency?: string
          data_version?: number
          email_inbox_address?: string | null
          engagements_status?: string | null
          eu_vat_liable?: boolean | null
          fiscal_year_end?: string | null
          fiscal_year_start?: string | null
          group_id?: string | null
          iban?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"] | null
          kyc_status?: string | null
          legal_form?: string | null
          logo_url?: string | null
          metadata?: Json
          monthly_price?: number | null
          name?: string
          num_employees?: number | null
          org_number?: string
          plusgiro?: string | null
          registered_for_fskatt?: boolean | null
          registration_date?: string | null
          sni_codes?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          swift_bic?: string | null
          tax_mandate_accepted?: boolean | null
          tax_mandate_accepted_at?: string | null
          tax_mandate_accepted_by?: string | null
          updated_at?: string
          vat_liable_from?: string | null
          vat_number?: string | null
          vat_period_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      company_annual_reports: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          error_message: string | null
          fetch_status: string
          file_format: string | null
          file_size: number | null
          financial_data: Json | null
          fiscal_year_end: string
          id: string
          registered_at: string | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id: string
          error_message?: string | null
          fetch_status?: string
          file_format?: string | null
          file_size?: number | null
          financial_data?: Json | null
          fiscal_year_end: string
          id?: string
          registered_at?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          error_message?: string | null
          fetch_status?: string
          file_format?: string | null
          file_size?: number | null
          financial_data?: Json | null
          fiscal_year_end?: string
          id?: string
          registered_at?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_annual_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_bank_sync_status: {
        Row: {
          accounts_synced: number | null
          company_id: string
          connection_status: string | null
          consecutive_failures: number | null
          created_at: string
          error_message: string | null
          id: string
          is_enabled: boolean | null
          last_error_message: string | null
          last_sync_completed_at: string | null
          last_sync_started_at: string | null
          next_scheduled_sync: string | null
          sync_interval_minutes: number | null
          sync_status: string
          transactions_synced: number | null
          updated_at: string
        }
        Insert: {
          accounts_synced?: number | null
          company_id: string
          connection_status?: string | null
          consecutive_failures?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_enabled?: boolean | null
          last_error_message?: string | null
          last_sync_completed_at?: string | null
          last_sync_started_at?: string | null
          next_scheduled_sync?: string | null
          sync_interval_minutes?: number | null
          sync_status?: string
          transactions_synced?: number | null
          updated_at?: string
        }
        Update: {
          accounts_synced?: number | null
          company_id?: string
          connection_status?: string | null
          consecutive_failures?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_enabled?: boolean | null
          last_error_message?: string | null
          last_sync_completed_at?: string | null
          last_sync_started_at?: string | null
          next_scheduled_sync?: string | null
          sync_interval_minutes?: number | null
          sync_status?: string
          transactions_synced?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_bank_sync_status_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_engagements: {
        Row: {
          company_id: string
          created_at: string
          engagement_type: string | null
          fetched_at: string
          id: string
          is_signatory: boolean | null
          person_id_hash: string | null
          person_name: string | null
          related_org_name: string | null
          related_org_number: string
          role: string
          source: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          engagement_type?: string | null
          fetched_at?: string
          id?: string
          is_signatory?: boolean | null
          person_id_hash?: string | null
          person_name?: string | null
          related_org_name?: string | null
          related_org_number: string
          role: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          engagement_type?: string | null
          fetched_at?: string
          id?: string
          is_signatory?: boolean | null
          person_id_hash?: string | null
          person_name?: string | null
          related_org_name?: string | null
          related_org_number?: string
          role?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_engagements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          accounting_method: string
          allow_negative_balance: boolean
          auto_approve_threshold: number | null
          company_id: string
          decimal_places: number
          fiscal_year_end: number
          fiscal_year_start: number
          id: string
          require_cost_center: boolean
          updated_at: string
        }
        Insert: {
          accounting_method?: string
          allow_negative_balance?: boolean
          auto_approve_threshold?: number | null
          company_id: string
          decimal_places?: number
          fiscal_year_end?: number
          fiscal_year_start?: number
          id?: string
          require_cost_center?: boolean
          updated_at?: string
        }
        Update: {
          accounting_method?: string
          allow_negative_balance?: boolean
          auto_approve_threshold?: number | null
          company_id?: string
          decimal_places?: number
          fiscal_year_end?: number
          fiscal_year_start?: number
          id?: string
          require_cost_center?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_signatories: {
        Row: {
          company_id: string
          created_at: string
          fetched_at: string
          id: string
          persons: Json | null
          signatory_rule: string | null
          source: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          fetched_at?: string
          id?: string
          persons?: Json | null
          signatory_rule?: string | null
          source?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          fetched_at?: string
          id?: string
          persons?: Json | null
          signatory_rule?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_signatories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidation_account_mapping: {
        Row: {
          created_at: string
          entity_account_name: string | null
          entity_account_no: string
          entity_id: string
          group_account_name: string | null
          group_account_no: string
          group_id: string
          id: string
        }
        Insert: {
          created_at?: string
          entity_account_name?: string | null
          entity_account_no: string
          entity_id: string
          group_account_name?: string | null
          group_account_no: string
          group_id: string
          id?: string
        }
        Update: {
          created_at?: string
          entity_account_name?: string | null
          entity_account_no?: string
          entity_id?: string
          group_account_name?: string | null
          group_account_no?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consolidation_account_mapping_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consolidation_account_mapping_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidation_adjustment_lines: {
        Row: {
          account_name: string | null
          account_no: string
          adjustment_id: string
          company_id: string | null
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          line_no: number
        }
        Insert: {
          account_name?: string | null
          account_no: string
          adjustment_id: string
          company_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          line_no?: number
        }
        Update: {
          account_name?: string | null
          account_no?: string
          adjustment_id?: string
          company_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          line_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "consolidation_adjustment_lines_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "consolidation_adjustments"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidation_adjustments: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["consolidation_adjustment_type"]
          affected_company_ids: string[]
          ai_suggestion_id: string | null
          applied_at: string | null
          confidence: number | null
          consolidation_period_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          reverted_at: string | null
          source: Database["public"]["Enums"]["consolidation_adjustment_source"]
          status: Database["public"]["Enums"]["consolidation_adjustment_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["consolidation_adjustment_type"]
          affected_company_ids?: string[]
          ai_suggestion_id?: string | null
          applied_at?: string | null
          confidence?: number | null
          consolidation_period_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          reverted_at?: string | null
          source?: Database["public"]["Enums"]["consolidation_adjustment_source"]
          status?: Database["public"]["Enums"]["consolidation_adjustment_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["consolidation_adjustment_type"]
          affected_company_ids?: string[]
          ai_suggestion_id?: string | null
          applied_at?: string | null
          confidence?: number | null
          consolidation_period_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          reverted_at?: string | null
          source?: Database["public"]["Enums"]["consolidation_adjustment_source"]
          status?: Database["public"]["Enums"]["consolidation_adjustment_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consolidation_adjustments_consolidation_period_id_fkey"
            columns: ["consolidation_period_id"]
            isOneToOne: false
            referencedRelation: "consolidation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidation_ai_suggestions: {
        Row: {
          affected_companies: Json
          affected_section: string | null
          applied_adjustment_id: string | null
          confidence: number
          consolidation_period_id: string
          created_at: string
          explanation: string
          financial_impact: number | null
          id: string
          model_version: string | null
          proposed_journal: Json | null
          severity: string
          source_refs: Json
          status: Database["public"]["Enums"]["consolidation_suggestion_status"]
          suggestion_type: Database["public"]["Enums"]["consolidation_suggestion_type"]
          title: string
          updated_at: string
        }
        Insert: {
          affected_companies?: Json
          affected_section?: string | null
          applied_adjustment_id?: string | null
          confidence?: number
          consolidation_period_id: string
          created_at?: string
          explanation: string
          financial_impact?: number | null
          id?: string
          model_version?: string | null
          proposed_journal?: Json | null
          severity?: string
          source_refs?: Json
          status?: Database["public"]["Enums"]["consolidation_suggestion_status"]
          suggestion_type: Database["public"]["Enums"]["consolidation_suggestion_type"]
          title: string
          updated_at?: string
        }
        Update: {
          affected_companies?: Json
          affected_section?: string | null
          applied_adjustment_id?: string | null
          confidence?: number
          consolidation_period_id?: string
          created_at?: string
          explanation?: string
          financial_impact?: number | null
          id?: string
          model_version?: string | null
          proposed_journal?: Json | null
          severity?: string
          source_refs?: Json
          status?: Database["public"]["Enums"]["consolidation_suggestion_status"]
          suggestion_type?: Database["public"]["Enums"]["consolidation_suggestion_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consolidation_ai_suggestions_consolidation_period_id_fkey"
            columns: ["consolidation_period_id"]
            isOneToOne: false
            referencedRelation: "consolidation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidation_elimination_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comment: string | null
          consolidation_period_id: string
          created_at: string
          created_by: string
          description: string | null
          elimination_type: string
          entity_a_id: string
          entity_b_id: string | null
          id: string
          is_auto: boolean
          is_recurring: boolean
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          consolidation_period_id: string
          created_at?: string
          created_by: string
          description?: string | null
          elimination_type: string
          entity_a_id: string
          entity_b_id?: string | null
          id?: string
          is_auto?: boolean
          is_recurring?: boolean
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          consolidation_period_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          elimination_type?: string
          entity_a_id?: string
          entity_b_id?: string | null
          id?: string
          is_auto?: boolean
          is_recurring?: boolean
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consolidation_elimination_entries_consolidation_period_id_fkey"
            columns: ["consolidation_period_id"]
            isOneToOne: false
            referencedRelation: "consolidation_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consolidation_elimination_entries_entity_a_id_fkey"
            columns: ["entity_a_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consolidation_elimination_entries_entity_b_id_fkey"
            columns: ["entity_b_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidation_elimination_lines: {
        Row: {
          account_name: string | null
          account_no: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          elimination_entry_id: string
          id: string
          line_no: number
        }
        Insert: {
          account_name?: string | null
          account_no: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          elimination_entry_id: string
          id?: string
          line_no?: number
        }
        Update: {
          account_name?: string | null
          account_no?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          elimination_entry_id?: string
          id?: string
          line_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "consolidation_elimination_lines_elimination_entry_id_fkey"
            columns: ["elimination_entry_id"]
            isOneToOne: false
            referencedRelation: "consolidation_elimination_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidation_periods: {
        Row: {
          created_at: string
          created_by: string
          group_id: string
          id: string
          locked_at: string | null
          locked_by: string | null
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consolidation_periods_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidation_versions: {
        Row: {
          consolidation_period_id: string
          created_at: string
          created_by: string
          id: string
          is_locked: boolean
          label: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          consolidation_period_id: string
          created_at?: string
          created_by: string
          id?: string
          is_locked?: boolean
          label: string
          snapshot?: Json
          version_number: number
        }
        Update: {
          consolidation_period_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_locked?: boolean
          label?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "consolidation_versions_consolidation_period_id_fkey"
            columns: ["consolidation_period_id"]
            isOneToOne: false
            referencedRelation: "consolidation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_invoices: {
        Row: {
          amount: number
          company_id: string
          contract_id: string
          created_at: string
          generated_at: string | null
          id: string
          invoice_id: string | null
          period_end: string
          period_start: string
          status: string
        }
        Insert: {
          amount: number
          company_id: string
          contract_id: string
          created_at?: string
          generated_at?: string | null
          id?: string
          invoice_id?: string | null
          period_end: string
          period_start: string
          status?: string
        }
        Update: {
          amount?: number
          company_id?: string
          contract_id?: string
          created_at?: string
          generated_at?: string | null
          id?: string
          invoice_id?: string | null
          period_end?: string
          period_start?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "service_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_items: {
        Row: {
          account_number: string | null
          contract_id: string
          created_at: string
          description: string
          discount_percent: number | null
          id: string
          line_total: number | null
          quantity: number
          sort_order: number | null
          unit_price: number
          vat_code: string | null
        }
        Insert: {
          account_number?: string | null
          contract_id: string
          created_at?: string
          description: string
          discount_percent?: number | null
          id?: string
          line_total?: number | null
          quantity?: number
          sort_order?: number | null
          unit_price: number
          vat_code?: string | null
        }
        Update: {
          account_number?: string | null
          contract_id?: string
          created_at?: string
          description?: string
          discount_percent?: number | null
          id?: string
          line_total?: number | null
          quantity?: number
          sort_order?: number | null
          unit_price?: number
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "service_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_events: {
        Row: {
          amount: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          documents: Json | null
          event_date: string
          event_type: string
          id: string
          journal_entry_id: string | null
          participants: Json | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          event_date: string
          event_type: string
          id?: string
          journal_entry_id?: string | null
          participants?: Json | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          event_date?: string
          event_type?: string
          id?: string
          journal_entry_id?: string | null
          participants?: Json | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_events_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          budget: number | null
          code: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          code: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparty_contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          parent_id: string
          parent_type: string
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          parent_id: string
          parent_type: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          parent_id?: string
          parent_type?: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterparty_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_settings: {
        Row: {
          auto_approve_threshold: number
          company_id: string
          created_at: string
          default_liability_account: string
          id: string
          preferred_mode: string
          updated_at: string
        }
        Insert: {
          auto_approve_threshold?: number
          company_id: string
          created_at?: string
          default_liability_account?: string
          id?: string
          preferred_mode?: string
          updated_at?: string
        }
        Update: {
          auto_approve_threshold?: number
          company_id?: string
          created_at?: string
          default_liability_account?: string
          id?: string
          preferred_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_statements: {
        Row: {
          card_issuer: string | null
          company_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          statement_period_end: string | null
          statement_period_start: string | null
          status: string
          total_amount: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          card_issuer?: string | null
          company_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          statement_period_end?: string | null
          statement_period_start?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          card_issuer?: string | null
          company_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          statement_period_end?: string | null
          statement_period_start?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_statements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_transactions: {
        Row: {
          ai_suggestion: Json | null
          amount: number
          category_hint: string | null
          clarification_answer: string | null
          clarification_question: string | null
          company_id: string
          confidence: number | null
          created_at: string
          currency: string
          id: string
          is_duplicate: boolean
          is_private: boolean
          journal_entry_id: string | null
          liability_account: string | null
          match_confidence: number | null
          match_status: string
          matched_journal_entry_id: string | null
          matched_receipt_id: string | null
          merchant_name: string | null
          raw_text: string | null
          statement_id: string | null
          status: string
          transaction_date: string
          updated_at: string
          vat_account: string | null
          vat_amount: number | null
        }
        Insert: {
          ai_suggestion?: Json | null
          amount?: number
          category_hint?: string | null
          clarification_answer?: string | null
          clarification_question?: string | null
          company_id: string
          confidence?: number | null
          created_at?: string
          currency?: string
          id?: string
          is_duplicate?: boolean
          is_private?: boolean
          journal_entry_id?: string | null
          liability_account?: string | null
          match_confidence?: number | null
          match_status?: string
          matched_journal_entry_id?: string | null
          matched_receipt_id?: string | null
          merchant_name?: string | null
          raw_text?: string | null
          statement_id?: string | null
          status?: string
          transaction_date: string
          updated_at?: string
          vat_account?: string | null
          vat_amount?: number | null
        }
        Update: {
          ai_suggestion?: Json | null
          amount?: number
          category_hint?: string | null
          clarification_answer?: string | null
          clarification_question?: string | null
          company_id?: string
          confidence?: number | null
          created_at?: string
          currency?: string
          id?: string
          is_duplicate?: boolean
          is_private?: boolean
          journal_entry_id?: string | null
          liability_account?: string | null
          match_confidence?: number | null
          match_status?: string
          matched_journal_entry_id?: string | null
          matched_receipt_id?: string | null
          merchant_name?: string | null
          raw_text?: string | null
          statement_id?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
          vat_account?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_matched_journal_entry_id_fkey"
            columns: ["matched_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_matched_receipt_id_fkey"
            columns: ["matched_receipt_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "credit_card_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoice_settings: {
        Row: {
          accent_color: string | null
          auto_iban_for_international: boolean | null
          auto_ocr_generation: boolean | null
          auto_send_on_approve: boolean | null
          company_id: string
          created_at: string
          currency_symbol: string | null
          default_currency: string | null
          default_language: string | null
          default_message: string | null
          display_name: string | null
          email_bcc: string | null
          email_body_template: string | null
          email_cc: string | null
          email_reply_to: string | null
          email_sender_name: string | null
          email_subject_template: string | null
          footer_contact_heading: string | null
          footer_contact_person: string | null
          footer_contact_position: string | null
          footer_email: string | null
          footer_phone: string | null
          footer_support_address: string | null
          footer_text: string | null
          header_field_order: Json | null
          id: string
          invoice_number_prefix: string | null
          invoice_number_suffix: string | null
          invoice_title: string | null
          late_interest_rate: number | null
          late_interest_text: string | null
          layout_mode: string | null
          legal_text: string | null
          logo_placement: string | null
          logo_size_pct: number
          ocr_same_as_invoice_number: boolean | null
          payment_display_location: string | null
          payment_terms_text: string | null
          phone: string | null
          primary_payment_method: string | null
          reference_label: string | null
          reminder_fee: number | null
          require_preview_before_send: boolean | null
          rot_rut_text: string | null
          secondary_payment_method: string | null
          send_method: string | null
          show_article_number: boolean | null
          show_company_name_with_logo: boolean | null
          show_discount: boolean | null
          show_footer_contact: boolean | null
          show_ocr_in_payment_box: boolean | null
          show_ore_adjustment: boolean | null
          show_org_number: boolean | null
          show_phone: boolean | null
          show_project_on_invoice: boolean | null
          show_unit: boolean | null
          show_vat_number: boolean | null
          show_vat_per_line: boolean | null
          show_website: boolean | null
          swish_number: string | null
          thank_you_text: string | null
          total_label: string | null
          updated_at: string
          visible_header_fields: Json | null
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          auto_iban_for_international?: boolean | null
          auto_ocr_generation?: boolean | null
          auto_send_on_approve?: boolean | null
          company_id: string
          created_at?: string
          currency_symbol?: string | null
          default_currency?: string | null
          default_language?: string | null
          default_message?: string | null
          display_name?: string | null
          email_bcc?: string | null
          email_body_template?: string | null
          email_cc?: string | null
          email_reply_to?: string | null
          email_sender_name?: string | null
          email_subject_template?: string | null
          footer_contact_heading?: string | null
          footer_contact_person?: string | null
          footer_contact_position?: string | null
          footer_email?: string | null
          footer_phone?: string | null
          footer_support_address?: string | null
          footer_text?: string | null
          header_field_order?: Json | null
          id?: string
          invoice_number_prefix?: string | null
          invoice_number_suffix?: string | null
          invoice_title?: string | null
          late_interest_rate?: number | null
          late_interest_text?: string | null
          layout_mode?: string | null
          legal_text?: string | null
          logo_placement?: string | null
          logo_size_pct?: number
          ocr_same_as_invoice_number?: boolean | null
          payment_display_location?: string | null
          payment_terms_text?: string | null
          phone?: string | null
          primary_payment_method?: string | null
          reference_label?: string | null
          reminder_fee?: number | null
          require_preview_before_send?: boolean | null
          rot_rut_text?: string | null
          secondary_payment_method?: string | null
          send_method?: string | null
          show_article_number?: boolean | null
          show_company_name_with_logo?: boolean | null
          show_discount?: boolean | null
          show_footer_contact?: boolean | null
          show_ocr_in_payment_box?: boolean | null
          show_ore_adjustment?: boolean | null
          show_org_number?: boolean | null
          show_phone?: boolean | null
          show_project_on_invoice?: boolean | null
          show_unit?: boolean | null
          show_vat_number?: boolean | null
          show_vat_per_line?: boolean | null
          show_website?: boolean | null
          swish_number?: string | null
          thank_you_text?: string | null
          total_label?: string | null
          updated_at?: string
          visible_header_fields?: Json | null
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          auto_iban_for_international?: boolean | null
          auto_ocr_generation?: boolean | null
          auto_send_on_approve?: boolean | null
          company_id?: string
          created_at?: string
          currency_symbol?: string | null
          default_currency?: string | null
          default_language?: string | null
          default_message?: string | null
          display_name?: string | null
          email_bcc?: string | null
          email_body_template?: string | null
          email_cc?: string | null
          email_reply_to?: string | null
          email_sender_name?: string | null
          email_subject_template?: string | null
          footer_contact_heading?: string | null
          footer_contact_person?: string | null
          footer_contact_position?: string | null
          footer_email?: string | null
          footer_phone?: string | null
          footer_support_address?: string | null
          footer_text?: string | null
          header_field_order?: Json | null
          id?: string
          invoice_number_prefix?: string | null
          invoice_number_suffix?: string | null
          invoice_title?: string | null
          late_interest_rate?: number | null
          late_interest_text?: string | null
          layout_mode?: string | null
          legal_text?: string | null
          logo_placement?: string | null
          logo_size_pct?: number
          ocr_same_as_invoice_number?: boolean | null
          payment_display_location?: string | null
          payment_terms_text?: string | null
          phone?: string | null
          primary_payment_method?: string | null
          reference_label?: string | null
          reminder_fee?: number | null
          require_preview_before_send?: boolean | null
          rot_rut_text?: string | null
          secondary_payment_method?: string | null
          send_method?: string | null
          show_article_number?: boolean | null
          show_company_name_with_logo?: boolean | null
          show_discount?: boolean | null
          show_footer_contact?: boolean | null
          show_ocr_in_payment_box?: boolean | null
          show_ore_adjustment?: boolean | null
          show_org_number?: boolean | null
          show_phone?: boolean | null
          show_project_on_invoice?: boolean | null
          show_unit?: boolean | null
          show_vat_number?: boolean | null
          show_vat_per_line?: boolean | null
          show_website?: boolean | null
          swish_number?: string | null
          thank_you_text?: string | null
          total_label?: string | null
          updated_at?: string
          visible_header_fields?: Json | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoice_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          company_id: string
          counterparty_type: string
          country: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          currency: string | null
          customer_id_label: string | null
          customer_number: string | null
          default_account_id: string | null
          default_revenue_account_id: string | null
          default_vat_rate: number | null
          discount_pct: number | null
          email: string | null
          general_email: string | null
          id: string
          internal_reference: string | null
          invoice_delivery: string | null
          is_active: boolean | null
          name: string
          notes: string | null
          org_number: string | null
          payment_terms_days: number | null
          peppol_id: string | null
          phone: string | null
          postal_code: string | null
          price_list_id: string | null
          source: string
          street: string | null
          updated_at: string | null
          vat_account_id: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          company_id: string
          counterparty_type?: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          currency?: string | null
          customer_id_label?: string | null
          customer_number?: string | null
          default_account_id?: string | null
          default_revenue_account_id?: string | null
          default_vat_rate?: number | null
          discount_pct?: number | null
          email?: string | null
          general_email?: string | null
          id?: string
          internal_reference?: string | null
          invoice_delivery?: string | null
          is_active?: boolean | null
          name: string
          notes?: string | null
          org_number?: string | null
          payment_terms_days?: number | null
          peppol_id?: string | null
          phone?: string | null
          postal_code?: string | null
          price_list_id?: string | null
          source?: string
          street?: string | null
          updated_at?: string | null
          vat_account_id?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          company_id?: string
          counterparty_type?: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          currency?: string | null
          customer_id_label?: string | null
          customer_number?: string | null
          default_account_id?: string | null
          default_revenue_account_id?: string | null
          default_vat_rate?: number | null
          discount_pct?: number | null
          email?: string | null
          general_email?: string | null
          id?: string
          internal_reference?: string | null
          invoice_delivery?: string | null
          is_active?: boolean | null
          name?: string
          notes?: string | null
          org_number?: string | null
          payment_terms_days?: number | null
          peppol_id?: string | null
          phone?: string | null
          postal_code?: string | null
          price_list_id?: string | null
          source?: string
          street?: string | null
          updated_at?: string | null
          vat_account_id?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_default_revenue_account_id_fkey"
            columns: ["default_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_vat_account_id_fkey"
            columns: ["vat_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_configs: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          error_message: string | null
          expires_at: string | null
          export_url: string | null
          id: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_url?: string | null
          id?: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_url?: string | null
          id?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          created_at: string
          date_column: string
          id: string
          is_active: boolean
          retention_days: number
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_column: string
          id?: string
          is_active?: boolean
          retention_days: number
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_column?: string
          id?: string
          is_active?: boolean
          retention_days?: number
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      depreciation_entries: {
        Row: {
          accumulated_depreciation: number
          book_value: number
          created_at: string
          depreciation_amount: number
          fixed_asset_id: string
          id: string
          journal_entry_id: string | null
          period_end: string
          period_start: string
        }
        Insert: {
          accumulated_depreciation: number
          book_value: number
          created_at?: string
          depreciation_amount: number
          fixed_asset_id: string
          id?: string
          journal_entry_id?: string | null
          period_end: string
          period_start: string
        }
        Update: {
          accumulated_depreciation?: number
          book_value?: number
          created_at?: string
          depreciation_amount?: number
          fixed_asset_id?: string
          id?: string
          journal_entry_id?: string | null
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "depreciation_entries_fixed_asset_id_fkey"
            columns: ["fixed_asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_confidence: number | null
          ai_document_type: string | null
          analyzed_at: string | null
          company_id: string
          contract_expiry_date: string | null
          contract_notice_period: string | null
          created_at: string
          document_category: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          extracted_data: Json | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          metadata: Json | null
          mime_type: string | null
          processing_status: string | null
          uploaded_by: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_document_type?: string | null
          analyzed_at?: string | null
          company_id: string
          contract_expiry_date?: string | null
          contract_notice_period?: string | null
          created_at?: string
          document_category?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          extracted_data?: Json | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          metadata?: Json | null
          mime_type?: string | null
          processing_status?: string | null
          uploaded_by: string
        }
        Update: {
          ai_confidence?: number | null
          ai_document_type?: string | null
          analyzed_at?: string | null
          company_id?: string
          contract_expiry_date?: string | null
          contract_notice_period?: string | null
          created_at?: string
          document_category?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          extracted_data?: Json | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          metadata?: Json | null
          mime_type?: string | null
          processing_status?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drilldown_links: {
        Row: {
          account_number: string | null
          company_id: string
          contribution_amount: number
          created_at: string
          id: string
          period_id: string
          row_id: string
          source_ref_id: string
          source_type: Database["public"]["Enums"]["drilldown_source_type"]
        }
        Insert: {
          account_number?: string | null
          company_id: string
          contribution_amount?: number
          created_at?: string
          id?: string
          period_id: string
          row_id: string
          source_ref_id: string
          source_type: Database["public"]["Enums"]["drilldown_source_type"]
        }
        Update: {
          account_number?: string | null
          company_id?: string
          contribution_amount?: number
          created_at?: string
          id?: string
          period_id?: string
          row_id?: string
          source_ref_id?: string
          source_type?: Database["public"]["Enums"]["drilldown_source_type"]
        }
        Relationships: [
          {
            foreignKeyName: "drilldown_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drilldown_links_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drilldown_links_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "report_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_inventory: {
        Row: {
          company_id: string
          cost_price_sek: number | null
          current_stock: number
          id: string
          last_updated: string
          platform: string | null
          product_name: string | null
          reorder_point: number | null
          reorder_quantity: number | null
          reserved_stock: number
          sku: string
          sync_source: string | null
        }
        Insert: {
          company_id: string
          cost_price_sek?: number | null
          current_stock?: number
          id?: string
          last_updated?: string
          platform?: string | null
          product_name?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_stock?: number
          sku: string
          sync_source?: string | null
        }
        Update: {
          company_id?: string
          cost_price_sek?: number | null
          current_stock?: number
          id?: string
          last_updated?: string
          platform?: string | null
          product_name?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_stock?: number
          sku?: string
          sync_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_order_lines: {
        Row: {
          company_id: string
          created_at: string
          id: string
          line_total_sek: number
          order_id: string
          product_category: string | null
          product_id: string | null
          product_name: string | null
          quantity: number
          sku: string | null
          unit_price_sek: number
          vat_amount_sek: number | null
          vat_rate: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          line_total_sek?: number
          order_id: string
          product_category?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          sku?: string | null
          unit_price_sek?: number
          vat_amount_sek?: number | null
          vat_rate?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          line_total_sek?: number
          order_id?: string
          product_category?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          sku?: string | null
          unit_price_sek?: number
          vat_amount_sek?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_order_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_orders: {
        Row: {
          bookkeeping_entry_id: string | null
          company_id: string
          created_at: string
          currency: string
          customer_country: string | null
          customer_vat_number: string | null
          discount_amount_sek: number | null
          gross_amount: number
          gross_amount_sek: number
          id: string
          net_revenue_sek: number | null
          order_date: string
          payment_fee_sek: number | null
          payout_id: string | null
          platform: string
          platform_fee_sek: number | null
          platform_order_id: string
          refunded_amount_sek: number | null
          shipping_amount_sek: number | null
          status: string
          sync_metadata: Json | null
          updated_at: string
          vat_amount_sek: number | null
        }
        Insert: {
          bookkeeping_entry_id?: string | null
          company_id: string
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_vat_number?: string | null
          discount_amount_sek?: number | null
          gross_amount?: number
          gross_amount_sek?: number
          id?: string
          net_revenue_sek?: number | null
          order_date: string
          payment_fee_sek?: number | null
          payout_id?: string | null
          platform: string
          platform_fee_sek?: number | null
          platform_order_id: string
          refunded_amount_sek?: number | null
          shipping_amount_sek?: number | null
          status?: string
          sync_metadata?: Json | null
          updated_at?: string
          vat_amount_sek?: number | null
        }
        Update: {
          bookkeeping_entry_id?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_vat_number?: string | null
          discount_amount_sek?: number | null
          gross_amount?: number
          gross_amount_sek?: number
          id?: string
          net_revenue_sek?: number | null
          order_date?: string
          payment_fee_sek?: number | null
          payout_id?: string | null
          platform?: string
          platform_fee_sek?: number | null
          platform_order_id?: string
          refunded_amount_sek?: number | null
          shipping_amount_sek?: number | null
          status?: string
          sync_metadata?: Json | null
          updated_at?: string
          vat_amount_sek?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_payouts: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          fees_sek: number | null
          gross_amount_sek: number
          id: string
          matched_bank_transaction_id: string | null
          net_amount_sek: number
          order_ids: Json | null
          payout_date: string
          platform: string
          platform_payout_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          fees_sek?: number | null
          gross_amount_sek?: number
          id?: string
          matched_bank_transaction_id?: string | null
          net_amount_sek?: number
          order_ids?: Json | null
          payout_date: string
          platform: string
          platform_payout_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          fees_sek?: number | null
          gross_amount_sek?: number
          id?: string
          matched_bank_transaction_id?: string | null
          net_amount_sek?: number
          order_ids?: Json | null
          payout_date?: string
          platform?: string
          platform_payout_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_payouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eliminations: {
        Row: {
          amount: number
          company_a_id: string
          company_b_id: string
          created_at: string
          created_by: string
          currency: string
          elimination_type: Database["public"]["Enums"]["elimination_type"]
          exchange_rate: number | null
          group_id: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_a_id: string
          company_b_id: string
          created_at?: string
          created_by: string
          currency: string
          elimination_type: Database["public"]["Enums"]["elimination_type"]
          exchange_rate?: number | null
          group_id: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_a_id?: string
          company_b_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          elimination_type?: Database["public"]["Enums"]["elimination_type"]
          exchange_rate?: number | null
          group_id?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eliminations_company_a_id_fkey"
            columns: ["company_a_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eliminations_company_b_id_fkey"
            columns: ["company_b_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eliminations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eliminations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_inbox_log: {
        Row: {
          attachment_count: number
          company_id: string | null
          created_at: string
          error_message: string | null
          from_address: string | null
          id: string
          received_at: string
          status: string
          subject: string | null
          to_address: string
          uploaded_files: Json
        }
        Insert: {
          attachment_count?: number
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          from_address?: string | null
          id?: string
          received_at?: string
          status?: string
          subject?: string | null
          to_address: string
          uploaded_files?: Json
        }
        Update: {
          attachment_count?: number
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          from_address?: string | null
          id?: string
          received_at?: string
          status?: string
          subject?: string | null
          to_address?: string
          uploaded_files?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_inbox_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_account_encrypted: string | null
          birth_date: string | null
          city: string | null
          collective_agreement_id: string | null
          company_id: string
          created_at: string
          created_by: string
          email: string | null
          employment_end: string | null
          employment_start: string
          employment_type: string
          first_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          last_name: string
          monthly_salary: number | null
          municipality: string | null
          notes: string | null
          notice_period_months: number | null
          personal_number: string
          personal_number_encrypted: string | null
          phone: string | null
          postal_code: string | null
          tax_column: number | null
          tax_table: string | null
          updated_at: string
          vacation_days_per_year: number | null
          vacation_days_used: number | null
          vacation_pay_percentage: number | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_account_encrypted?: string | null
          birth_date?: string | null
          city?: string | null
          collective_agreement_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          email?: string | null
          employment_end?: string | null
          employment_start: string
          employment_type?: string
          first_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name: string
          monthly_salary?: number | null
          municipality?: string | null
          notes?: string | null
          notice_period_months?: number | null
          personal_number: string
          personal_number_encrypted?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_column?: number | null
          tax_table?: string | null
          updated_at?: string
          vacation_days_per_year?: number | null
          vacation_days_used?: number | null
          vacation_pay_percentage?: number | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_account_encrypted?: string | null
          birth_date?: string | null
          city?: string | null
          collective_agreement_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          employment_end?: string | null
          employment_start?: string
          employment_type?: string
          first_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name?: string
          monthly_salary?: number | null
          municipality?: string | null
          notes?: string | null
          notice_period_months?: number | null
          personal_number?: string
          personal_number_encrypted?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_column?: number | null
          tax_table?: string | null
          updated_at?: string
          vacation_days_per_year?: number | null
          vacation_days_used?: number | null
          vacation_pay_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_collective_agreement_id_fkey"
            columns: ["collective_agreement_id"]
            isOneToOne: false
            referencedRelation: "collective_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_trial_balances: {
        Row: {
          account_name: string
          account_no: string
          closing_balance: number
          consolidation_period_id: string
          created_at: string
          credit: number
          currency: string
          debit: number
          entity_id: string
          id: string
          import_source: string
          imported_at: string
          opening_balance: number
          translated_sek_amount: number | null
          translation_rate_type: string | null
        }
        Insert: {
          account_name: string
          account_no: string
          closing_balance?: number
          consolidation_period_id: string
          created_at?: string
          credit?: number
          currency?: string
          debit?: number
          entity_id: string
          id?: string
          import_source?: string
          imported_at?: string
          opening_balance?: number
          translated_sek_amount?: number | null
          translation_rate_type?: string | null
        }
        Update: {
          account_name?: string
          account_no?: string
          closing_balance?: number
          consolidation_period_id?: string
          created_at?: string
          credit?: number
          currency?: string
          debit?: number
          entity_id?: string
          id?: string
          import_source?: string
          imported_at?: string
          opening_balance?: number
          translated_sek_amount?: number | null
          translation_rate_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_trial_balances_consolidation_period_id_fkey"
            columns: ["consolidation_period_id"]
            isOneToOne: false
            referencedRelation: "consolidation_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_trial_balances_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          breadcrumbs: Json
          company_id: string | null
          component_stack: string | null
          created_at: string
          error_id: string
          fix_affected_lines: string | null
          fix_analysis: string | null
          fix_code: string | null
          fix_confidence: number | null
          fix_description: string | null
          fix_filename: string | null
          fix_requires_manual_review: boolean
          fix_root_cause: string | null
          fix_status: string
          id: string
          message: string
          occurred_at: string
          resolved_at: string | null
          resolved_by: string | null
          stack: string | null
          updated_at: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          breadcrumbs?: Json
          company_id?: string | null
          component_stack?: string | null
          created_at?: string
          error_id: string
          fix_affected_lines?: string | null
          fix_analysis?: string | null
          fix_code?: string | null
          fix_confidence?: number | null
          fix_description?: string | null
          fix_filename?: string | null
          fix_requires_manual_review?: boolean
          fix_root_cause?: string | null
          fix_status?: string
          id?: string
          message: string
          occurred_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          stack?: string | null
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          breadcrumbs?: Json
          company_id?: string | null
          component_stack?: string | null
          created_at?: string
          error_id?: string
          fix_affected_lines?: string | null
          fix_analysis?: string | null
          fix_code?: string | null
          fix_confidence?: number | null
          fix_description?: string | null
          fix_filename?: string | null
          fix_requires_manual_review?: boolean
          fix_root_cause?: string | null
          fix_status?: string
          id?: string
          message?: string
          occurred_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          stack?: string | null
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      esg_data: {
        Row: {
          anti_corruption_training_percent: number | null
          company_id: string
          created_at: string | null
          employee_turnover_percent: number | null
          energy_kwh: number | null
          female_board_percent: number | null
          has_code_of_conduct: boolean | null
          has_whistleblower: boolean | null
          id: string
          notes: string | null
          recycled_percent: number | null
          renewable_energy_percent: number | null
          scope1_co2_tonnes: number | null
          scope2_co2_tonnes: number | null
          scope3_co2_tonnes: number | null
          sick_days_per_employee: number | null
          social_investment_sek: number | null
          updated_at: string | null
          waste_tonnes: number | null
          water_m3: number | null
          year: number
        }
        Insert: {
          anti_corruption_training_percent?: number | null
          company_id: string
          created_at?: string | null
          employee_turnover_percent?: number | null
          energy_kwh?: number | null
          female_board_percent?: number | null
          has_code_of_conduct?: boolean | null
          has_whistleblower?: boolean | null
          id?: string
          notes?: string | null
          recycled_percent?: number | null
          renewable_energy_percent?: number | null
          scope1_co2_tonnes?: number | null
          scope2_co2_tonnes?: number | null
          scope3_co2_tonnes?: number | null
          sick_days_per_employee?: number | null
          social_investment_sek?: number | null
          updated_at?: string | null
          waste_tonnes?: number | null
          water_m3?: number | null
          year: number
        }
        Update: {
          anti_corruption_training_percent?: number | null
          company_id?: string
          created_at?: string | null
          employee_turnover_percent?: number | null
          energy_kwh?: number | null
          female_board_percent?: number | null
          has_code_of_conduct?: boolean | null
          has_whistleblower?: boolean | null
          id?: string
          notes?: string | null
          recycled_percent?: number | null
          renewable_energy_percent?: number | null
          scope1_co2_tonnes?: number | null
          scope2_co2_tonnes?: number | null
          scope3_co2_tonnes?: number | null
          sick_days_per_employee?: number | null
          social_investment_sek?: number | null
          updated_at?: string | null
          waste_tonnes?: number | null
          water_m3?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "esg_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eu_vat_rates: {
        Row: {
          country_code: string
          country_name: string
          id: string
          reduced_rate: number | null
          reduced_rate_2: number | null
          standard_rate: number
          super_reduced_rate: number | null
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          id?: string
          reduced_rate?: number | null
          reduced_rate_2?: number | null
          standard_rate: number
          super_reduced_rate?: number | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          id?: string
          reduced_rate?: number | null
          reduced_rate_2?: number | null
          standard_rate?: number
          super_reduced_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_claim_comments: {
        Row: {
          comment: string
          created_at: string
          expense_claim_id: string
          id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          expense_claim_id: string
          id?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          expense_claim_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_claim_comments_expense_claim_id_fkey"
            columns: ["expense_claim_id"]
            isOneToOne: false
            referencedRelation: "expense_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_claim_files: {
        Row: {
          created_at: string
          expense_claim_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          expense_claim_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          expense_claim_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_claim_files_expense_claim_id_fkey"
            columns: ["expense_claim_id"]
            isOneToOne: false
            referencedRelation: "expense_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_claims: {
        Row: {
          account_number: string | null
          ai_confidence: number | null
          ai_suggested_account: string | null
          amount: number
          approver_id: string | null
          billable: boolean | null
          category: string | null
          company_id: string
          cost_center: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string
          expense_date: string
          id: string
          journal_entry_id: string | null
          memo: string | null
          payment_date: string | null
          payment_method: string | null
          project: string | null
          status: string
          updated_at: string
          user_id: string
          vat_amount: number | null
          vat_code: string | null
        }
        Insert: {
          account_number?: string | null
          ai_confidence?: number | null
          ai_suggested_account?: string | null
          amount?: number
          approver_id?: string | null
          billable?: boolean | null
          category?: string | null
          company_id: string
          cost_center?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          expense_date?: string
          id?: string
          journal_entry_id?: string | null
          memo?: string | null
          payment_date?: string | null
          payment_method?: string | null
          project?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vat_amount?: number | null
          vat_code?: string | null
        }
        Update: {
          account_number?: string | null
          ai_confidence?: number | null
          ai_suggested_account?: string | null
          amount?: number
          approver_id?: string | null
          billable?: boolean | null
          category?: string | null
          company_id?: string
          cost_center?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          expense_date?: string
          id?: string
          journal_entry_id?: string | null
          memo?: string | null
          payment_date?: string | null
          payment_method?: string | null
          project?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vat_amount?: number | null
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      factoring_requests: {
        Row: {
          approved_at: string | null
          capcito_reference: string | null
          company_id: string
          created_at: string
          created_by: string
          factoring_amount: number | null
          fee_amount: number | null
          fee_percentage: number | null
          id: string
          invoice_amount: number
          invoice_id: string
          paid_at: string | null
          rejected_reason: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          capcito_reference?: string | null
          company_id: string
          created_at?: string
          created_by: string
          factoring_amount?: number | null
          fee_amount?: number | null
          fee_percentage?: number | null
          id?: string
          invoice_amount: number
          invoice_id: string
          paid_at?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          capcito_reference?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          factoring_amount?: number | null
          fee_amount?: number | null
          fee_percentage?: number | null
          id?: string
          invoice_amount?: number
          invoice_id?: string
          paid_at?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factoring_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factoring_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_cache: {
        Row: {
          calculated_at: string
          calculation_type: string
          company_id: string
          created_at: string
          data_version: number
          fiscal_year: number
          id: string
          result_json: Json
          scenario: string
        }
        Insert: {
          calculated_at?: string
          calculation_type: string
          company_id: string
          created_at?: string
          data_version: number
          fiscal_year: number
          id?: string
          result_json?: Json
          scenario?: string
        }
        Update: {
          calculated_at?: string
          calculation_type?: string
          company_id?: string
          created_at?: string
          data_version?: number
          fiscal_year?: number
          id?: string
          result_json?: Json
          scenario?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_cache_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_report_explanations: {
        Row: {
          company_id: string
          confidence_reasoning: string | null
          created_at: string
          id: string
          imbalance_diff: number | null
          key_drivers: Json
          kpi_snapshot: Json
          model_version: string | null
          period_end: string
          period_label: string
          period_start: string
          recommended_actions: Json
          risk_signals: Json
          summary: string | null
          updated_at: string
          validation_findings: Json
        }
        Insert: {
          company_id: string
          confidence_reasoning?: string | null
          created_at?: string
          id?: string
          imbalance_diff?: number | null
          key_drivers?: Json
          kpi_snapshot?: Json
          model_version?: string | null
          period_end: string
          period_label: string
          period_start: string
          recommended_actions?: Json
          risk_signals?: Json
          summary?: string | null
          updated_at?: string
          validation_findings?: Json
        }
        Update: {
          company_id?: string
          confidence_reasoning?: string | null
          created_at?: string
          id?: string
          imbalance_diff?: number | null
          key_drivers?: Json
          kpi_snapshot?: Json
          model_version?: string | null
          period_end?: string
          period_label?: string
          period_start?: string
          recommended_actions?: Json
          risk_signals?: Json
          summary?: string | null
          updated_at?: string
          validation_findings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "financial_report_explanations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_values: {
        Row: {
          amount: number
          company_id: string
          computed_at: string
          created_at: string
          currency: string
          id: string
          is_stale: boolean
          period_id: string
          row_id: string
          scenario_id: string | null
          source_ref_id: string | null
          source_type: Database["public"]["Enums"]["financial_value_source"]
          updated_at: string
          value_layer: Database["public"]["Enums"]["financial_value_layer"]
        }
        Insert: {
          amount?: number
          company_id: string
          computed_at?: string
          created_at?: string
          currency?: string
          id?: string
          is_stale?: boolean
          period_id: string
          row_id: string
          scenario_id?: string | null
          source_ref_id?: string | null
          source_type?: Database["public"]["Enums"]["financial_value_source"]
          updated_at?: string
          value_layer: Database["public"]["Enums"]["financial_value_layer"]
        }
        Update: {
          amount?: number
          company_id?: string
          computed_at?: string
          created_at?: string
          currency?: string
          id?: string
          is_stale?: boolean
          period_id?: string
          row_id?: string
          scenario_id?: string | null
          source_ref_id?: string | null
          source_type?: Database["public"]["Enums"]["financial_value_source"]
          updated_at?: string
          value_layer?: Database["public"]["Enums"]["financial_value_layer"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_values_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_values_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "report_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_values_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "report_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_clients: {
        Row: {
          assigned_consultant_id: string | null
          automation_share: number | null
          company_id: string
          cost_ytd: number | null
          created_at: string
          firm_id: string
          id: string
          invitation_accepted_at: string | null
          invitation_sent_at: string | null
          invitation_token: string | null
          is_active: boolean
          mandate_signed_at: string | null
          mandate_status: string
          mandate_type: string | null
          mandate_valid_until: string | null
          margin_pct: number | null
          monthly_fee: number | null
          notes: string | null
          profitability_score: number | null
          revenue_ytd: number | null
          risk_score: number | null
          scores_updated_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_consultant_id?: string | null
          automation_share?: number | null
          company_id: string
          cost_ytd?: number | null
          created_at?: string
          firm_id: string
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          is_active?: boolean
          mandate_signed_at?: string | null
          mandate_status?: string
          mandate_type?: string | null
          mandate_valid_until?: string | null
          margin_pct?: number | null
          monthly_fee?: number | null
          notes?: string | null
          profitability_score?: number | null
          revenue_ytd?: number | null
          risk_score?: number | null
          scores_updated_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_consultant_id?: string | null
          automation_share?: number | null
          company_id?: string
          cost_ytd?: number | null
          created_at?: string
          firm_id?: string
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          is_active?: boolean
          mandate_signed_at?: string | null
          mandate_status?: string
          mandate_type?: string | null
          mandate_valid_until?: string | null
          margin_pct?: number | null
          monthly_fee?: number | null
          notes?: string | null
          profitability_score?: number | null
          revenue_ytd?: number | null
          risk_score?: number | null
          scores_updated_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_deadlines: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string
          deadline_type: string
          due_date: string
          firm_id: string
          id: string
          label: string
          metadata: Json
          related_task_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          deadline_type: string
          due_date: string
          firm_id: string
          id?: string
          label: string
          metadata?: Json
          related_task_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          deadline_type?: string
          due_date?: string
          firm_id?: string
          id?: string
          label?: string
          metadata?: Json
          related_task_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_deadlines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "firm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_deadlines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_deadlines_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_deadlines_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "firm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_insights: {
        Row: {
          action_payload: Json
          category: string | null
          client_id: string | null
          company_id: string | null
          confidence: number
          created_at: string
          explanation: string | null
          firm_id: string
          id: string
          impact_value: number | null
          insight_type: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action_payload?: Json
          category?: string | null
          client_id?: string | null
          company_id?: string | null
          confidence?: number
          created_at?: string
          explanation?: string | null
          firm_id: string
          id?: string
          impact_value?: number | null
          insight_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_payload?: Json
          category?: string | null
          client_id?: string | null
          company_id?: string | null
          confidence?: number
          created_at?: string
          explanation?: string | null
          firm_id?: string
          id?: string
          impact_value?: number | null
          insight_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_insights_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "firm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_insights_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          firm_id: string
          id: string
          invited_by: string | null
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          firm_id: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          firm_id?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_invitations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_members: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          is_active: boolean
          role: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          is_active?: boolean
          role?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          is_active?: boolean
          role?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_members_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          firm_id: string
          id: string
          priority: string
          status: string
          task_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          firm_id: string
          id?: string
          priority?: string
          status?: string
          task_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          priority?: string
          status?: string
          task_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          account_id: string | null
          acquisition_cost: number
          acquisition_date: string
          activation_date: string | null
          asset_class: string
          asset_name: string
          asset_type: string
          category: string | null
          company_id: string
          cost_center_id: string | null
          created_at: string
          created_by: string
          currency: string
          current_valuation: number | null
          depreciation_account_id: string | null
          depreciation_method: string
          disposal_amount: number | null
          disposal_date: string | null
          id: string
          interest_rate: number | null
          is_active: boolean
          last_valuation_date: string | null
          legal_duration_years: number | null
          location: string | null
          maturity_date: string | null
          notes: string | null
          original_journal_entry_id: string | null
          project_id: string | null
          residual_value: number | null
          responsible_person: string | null
          serial_number: string | null
          status: string
          supplier_name: string | null
          updated_at: string
          useful_life_years: number
        }
        Insert: {
          account_id?: string | null
          acquisition_cost: number
          acquisition_date: string
          activation_date?: string | null
          asset_class?: string
          asset_name: string
          asset_type: string
          category?: string | null
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          current_valuation?: number | null
          depreciation_account_id?: string | null
          depreciation_method?: string
          disposal_amount?: number | null
          disposal_date?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          last_valuation_date?: string | null
          legal_duration_years?: number | null
          location?: string | null
          maturity_date?: string | null
          notes?: string | null
          original_journal_entry_id?: string | null
          project_id?: string | null
          residual_value?: number | null
          responsible_person?: string | null
          serial_number?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
          useful_life_years: number
        }
        Update: {
          account_id?: string | null
          acquisition_cost?: number
          acquisition_date?: string
          activation_date?: string | null
          asset_class?: string
          asset_name?: string
          asset_type?: string
          category?: string | null
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          current_valuation?: number | null
          depreciation_account_id?: string | null
          depreciation_method?: string
          disposal_amount?: number | null
          disposal_date?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          last_valuation_date?: string | null
          legal_duration_years?: number | null
          location?: string | null
          maturity_date?: string | null
          notes?: string | null
          original_journal_entry_id?: string | null
          project_id?: string | null
          residual_value?: number | null
          responsible_person?: string | null
          serial_number?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_depreciation_account_id_fkey"
            columns: ["depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_original_journal_entry_id_fkey"
            columns: ["original_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      flagged_transactions: {
        Row: {
          auto_resolved: boolean
          company_id: string
          created_at: string
          description: string
          flag_type: string
          id: string
          is_reviewed: boolean
          journal_entry_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
        }
        Insert: {
          auto_resolved?: boolean
          company_id: string
          created_at?: string
          description: string
          flag_type: string
          id?: string
          is_reviewed?: boolean
          journal_entry_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
        }
        Update: {
          auto_resolved?: boolean
          company_id?: string
          created_at?: string
          description?: string
          flag_type?: string
          id?: string
          is_reviewed?: boolean
          journal_entry_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "flagged_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_accuracy: {
        Row: {
          account_class: string
          actual_amount: number | null
          company_id: string
          created_at: string
          error_pct: number | null
          forecast_month: string
          forecasted_amount: number
          id: string
        }
        Insert: {
          account_class: string
          actual_amount?: number | null
          company_id: string
          created_at?: string
          error_pct?: number | null
          forecast_month: string
          forecasted_amount?: number
          id?: string
        }
        Update: {
          account_class?: string
          actual_amount?: number | null
          company_id?: string
          created_at?: string
          error_pct?: number | null
          forecast_month?: string
          forecasted_amount?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_accuracy_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_adjustments: {
        Row: {
          account_number: string
          ai_suggestion_id: string | null
          applied_at: string
          applied_by: string | null
          budget_id: string | null
          company_id: string
          id: string
          new_value: number
          period_month: string
          prior_value: number | null
          reasoning: string | null
          source: string
          undone_at: string | null
        }
        Insert: {
          account_number: string
          ai_suggestion_id?: string | null
          applied_at?: string
          applied_by?: string | null
          budget_id?: string | null
          company_id: string
          id?: string
          new_value: number
          period_month: string
          prior_value?: number | null
          reasoning?: string | null
          source: string
          undone_at?: string | null
        }
        Update: {
          account_number?: string
          ai_suggestion_id?: string | null
          applied_at?: string
          applied_by?: string | null
          budget_id?: string | null
          company_id?: string
          id?: string
          new_value?: number
          period_month?: string
          prior_value?: number | null
          reasoning?: string | null
          source?: string
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_adjustments_ai_suggestion_id_fkey"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_account_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_adjustments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_confidence_history: {
        Row: {
          budget_id: string | null
          company_id: string
          components: Json
          computed_at: string
          drivers: Json
          id: string
          level: string
          overall_score: number
          weak_signals: Json
        }
        Insert: {
          budget_id?: string | null
          company_id: string
          components?: Json
          computed_at?: string
          drivers?: Json
          id?: string
          level: string
          overall_score: number
          weak_signals?: Json
        }
        Update: {
          budget_id?: string | null
          company_id?: string
          components?: Json
          computed_at?: string
          drivers?: Json
          id?: string
          level?: string
          overall_score?: number
          weak_signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "forecast_confidence_history_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_confidence_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_daily_points: {
        Row: {
          closing_balance: number
          confidence_score: number | null
          date: string
          expected_inflows: number
          expected_outflows: number
          id: string
          net_change: number
          opening_balance: number
          risk_level: string | null
          snapshot_id: string
        }
        Insert: {
          closing_balance: number
          confidence_score?: number | null
          date: string
          expected_inflows?: number
          expected_outflows?: number
          id?: string
          net_change?: number
          opening_balance: number
          risk_level?: string | null
          snapshot_id: string
        }
        Update: {
          closing_balance?: number
          confidence_score?: number | null
          date?: string
          expected_inflows?: number
          expected_outflows?: number
          id?: string
          net_change?: number
          opening_balance?: number
          risk_level?: string | null
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_daily_points_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "forecast_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_locks: {
        Row: {
          account_number: string
          budget_id: string | null
          company_id: string
          id: string
          locked_at: string
          locked_by: string | null
          locked_value: number
          note: string | null
          period_month: string
        }
        Insert: {
          account_number: string
          budget_id?: string | null
          company_id: string
          id?: string
          locked_at?: string
          locked_by?: string | null
          locked_value: number
          note?: string | null
          period_month: string
        }
        Update: {
          account_number?: string
          budget_id?: string | null
          company_id?: string
          id?: string
          locked_at?: string
          locked_by?: string | null
          locked_value?: number
          note?: string | null
          period_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_locks_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_locks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_snapshots: {
        Row: {
          baseline_balance: number
          burn_rate_monthly: number | null
          company_id: string
          created_at: string
          generated_at: string
          horizon_days: number
          id: string
          input_hash: string
          lowest_cash_date: string | null
          lowest_cash_point: number | null
          model_version: string
          output_json: Json
          runway_days: number | null
          scenario_id: string | null
        }
        Insert: {
          baseline_balance: number
          burn_rate_monthly?: number | null
          company_id: string
          created_at?: string
          generated_at?: string
          horizon_days?: number
          id?: string
          input_hash: string
          lowest_cash_date?: string | null
          lowest_cash_point?: number | null
          model_version?: string
          output_json?: Json
          runway_days?: number | null
          scenario_id?: string | null
        }
        Update: {
          baseline_balance?: number
          burn_rate_monthly?: number | null
          company_id?: string
          created_at?: string
          generated_at?: string
          horizon_days?: number
          id?: string
          input_hash?: string
          lowest_cash_date?: string | null
          lowest_cash_point?: number | null
          model_version?: string
          output_json?: Json
          runway_days?: number | null
          scenario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_snapshots_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "cashflow_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_versions: {
        Row: {
          base_confidence: number | null
          budget_id: string | null
          company_id: string
          created_at: string
          fiscal_year: number
          id: string
          kind: string
          label: string
          locked_at: string
          locked_by: string | null
          parent_version_id: string | null
          snapshot: Json
          updated_at: string
        }
        Insert: {
          base_confidence?: number | null
          budget_id?: string | null
          company_id: string
          created_at?: string
          fiscal_year: number
          id?: string
          kind?: string
          label: string
          locked_at?: string
          locked_by?: string | null
          parent_version_id?: string | null
          snapshot?: Json
          updated_at?: string
        }
        Update: {
          base_confidence?: number | null
          budget_id?: string | null
          company_id?: string
          created_at?: string
          fiscal_year?: number
          id?: string
          kind?: string
          label?: string
          locked_at?: string
          locked_by?: string | null
          parent_version_id?: string | null
          snapshot?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_versions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "forecast_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      fortnox_connections: {
        Row: {
          access_token: string
          company_id: string
          connected_at: string
          expires_at: string
          fortnox_company_id: string | null
          id: string
          refresh_token: string
          scopes: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          company_id: string
          connected_at?: string
          expires_at: string
          fortnox_company_id?: string | null
          id?: string
          refresh_token: string
          scopes?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          company_id?: string
          connected_at?: string
          expires_at?: string
          fortnox_company_id?: string | null
          id?: string
          refresh_token?: string
          scopes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fortnox_oauth_states: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string
          state: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      goodwill_schedule: {
        Row: {
          additions: number
          amortization: number
          amortization_years: number
          annual_charge: number | null
          closing_value: number
          consolidation_period_id: string
          created_at: string
          disposals: number
          group_structure_id: string
          id: string
          impairment: number
          opening_value: number
          updated_at: string
          years_remaining: number | null
        }
        Insert: {
          additions?: number
          amortization?: number
          amortization_years?: number
          annual_charge?: number | null
          closing_value?: number
          consolidation_period_id: string
          created_at?: string
          disposals?: number
          group_structure_id: string
          id?: string
          impairment?: number
          opening_value?: number
          updated_at?: string
          years_remaining?: number | null
        }
        Update: {
          additions?: number
          amortization?: number
          amortization_years?: number
          annual_charge?: number | null
          closing_value?: number
          consolidation_period_id?: string
          created_at?: string
          disposals?: number
          group_structure_id?: string
          id?: string
          impairment?: number
          opening_value?: number
          updated_at?: string
          years_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goodwill_schedule_consolidation_period_id_fkey"
            columns: ["consolidation_period_id"]
            isOneToOne: false
            referencedRelation: "consolidation_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goodwill_schedule_group_structure_id_fkey"
            columns: ["group_structure_id"]
            isOneToOne: false
            referencedRelation: "group_structure"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_audit_log: {
        Row: {
          action_type: string
          amount: number | null
          bankid_personal_number_masked: string | null
          company_id: string
          created_at: string
          document_reference: string | null
          id: string
          ip_address: string | null
          period: string | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          amount?: number | null
          bankid_personal_number_masked?: string | null
          company_id: string
          created_at?: string
          document_reference?: string | null
          id?: string
          ip_address?: string | null
          period?: string | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          amount?: number | null
          bankid_personal_number_masked?: string | null
          company_id?: string
          created_at?: string
          document_reference?: string | null
          id?: string
          ip_address?: string | null
          period?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      group_structure: {
        Row: {
          acquisition_date: string | null
          acquisition_price: number | null
          child_entity_id: string
          consolidation_method: string
          created_at: string
          currency: string
          disposal_date: string | null
          disposal_price: number | null
          fiscal_year_end: string | null
          fiscal_year_start: string | null
          goodwill_amount: number | null
          group_id: string
          id: string
          net_assets_at_acquisition: number | null
          ownership_pct: number
          parent_entity_id: string
          status: string
          updated_at: string
          voting_pct: number
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_price?: number | null
          child_entity_id: string
          consolidation_method?: string
          created_at?: string
          currency?: string
          disposal_date?: string | null
          disposal_price?: number | null
          fiscal_year_end?: string | null
          fiscal_year_start?: string | null
          goodwill_amount?: number | null
          group_id: string
          id?: string
          net_assets_at_acquisition?: number | null
          ownership_pct?: number
          parent_entity_id: string
          status?: string
          updated_at?: string
          voting_pct?: number
        }
        Update: {
          acquisition_date?: string | null
          acquisition_price?: number | null
          child_entity_id?: string
          consolidation_method?: string
          created_at?: string
          currency?: string
          disposal_date?: string | null
          disposal_price?: number | null
          fiscal_year_end?: string | null
          fiscal_year_start?: string | null
          goodwill_amount?: number | null
          group_id?: string
          id?: string
          net_assets_at_acquisition?: number | null
          ownership_pct?: number
          parent_entity_id?: string
          status?: string
          updated_at?: string
          voting_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_structure_child_entity_id_fkey"
            columns: ["child_entity_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_structure_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_structure_parent_entity_id_fkey"
            columns: ["parent_entity_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          billing_company_id: string | null
          created_at: string
          created_by: string
          currency: string
          fiscal_year_start: number
          id: string
          monthly_price: number | null
          name: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string
        }
        Insert: {
          billing_company_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          fiscal_year_start?: number
          id?: string
          monthly_price?: number | null
          name: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
        }
        Update: {
          billing_company_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          fiscal_year_start?: number
          id?: string
          monthly_price?: number | null
          name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_billing_company_id_fkey"
            columns: ["billing_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitality_insights: {
        Row: {
          action_suggestion: string | null
          body: string
          company_id: string
          created_at: string
          dismissed_at: string | null
          dismissed_by: string | null
          id: string
          insight_type: string
          metric_change_pct: number | null
          metric_label: string | null
          metric_value: number | null
          period_month: string
          severity: string
          source_data: Json
          source_receipt: string | null
          title: string
        }
        Insert: {
          action_suggestion?: string | null
          body: string
          company_id: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          insight_type: string
          metric_change_pct?: number | null
          metric_label?: string | null
          metric_value?: number | null
          period_month: string
          severity?: string
          source_data?: Json
          source_receipt?: string | null
          title: string
        }
        Update: {
          action_suggestion?: string | null
          body?: string
          company_id?: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          insight_type?: string
          metric_change_pct?: number | null
          metric_label?: string | null
          metric_value?: number | null
          period_month?: string
          severity?: string
          source_data?: Json
          source_receipt?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitality_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitality_reconciliation: {
        Row: {
          bank_matched_total: number
          company_id: string
          created_at: string
          diff_amount: number
          id: string
          matched_transaction_ids: Json
          notes: string | null
          pos_card: number
          pos_cash: number
          pos_swish: number
          pos_total: number
          reconciled_at: string | null
          reconciled_by: string | null
          sale_date: string
          status: string
          updated_at: string
        }
        Insert: {
          bank_matched_total?: number
          company_id: string
          created_at?: string
          diff_amount?: number
          id?: string
          matched_transaction_ids?: Json
          notes?: string | null
          pos_card?: number
          pos_cash?: number
          pos_swish?: number
          pos_total?: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          sale_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          bank_matched_total?: number
          company_id?: string
          created_at?: string
          diff_amount?: number
          id?: string
          matched_transaction_ids?: Json
          notes?: string | null
          pos_card?: number
          pos_cash?: number
          pos_swish?: number
          pos_total?: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          sale_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitality_reconciliation_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitality_supplier_intelligence: {
        Row: {
          account_number: string | null
          alert_active: boolean
          alert_reason: string | null
          avg_invoice_amount: number | null
          category: string
          company_id: string
          computed_at: string
          created_at: string
          id: string
          invoice_count: number
          last_invoice_amount: number | null
          last_invoice_date: string | null
          prev_invoice_amount: number | null
          prev_invoice_date: string | null
          price_change_pct: number | null
          rolling_30d_total: number | null
          rolling_90d_total: number | null
          supplier_id: string | null
          supplier_name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          alert_active?: boolean
          alert_reason?: string | null
          avg_invoice_amount?: number | null
          category: string
          company_id: string
          computed_at?: string
          created_at?: string
          id?: string
          invoice_count?: number
          last_invoice_amount?: number | null
          last_invoice_date?: string | null
          prev_invoice_amount?: number | null
          prev_invoice_date?: string | null
          price_change_pct?: number | null
          rolling_30d_total?: number | null
          rolling_90d_total?: number | null
          supplier_id?: string | null
          supplier_name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          alert_active?: boolean
          alert_reason?: string | null
          avg_invoice_amount?: number | null
          category?: string
          company_id?: string
          computed_at?: string
          created_at?: string
          id?: string
          invoice_count?: number
          last_invoice_amount?: number | null
          last_invoice_date?: string | null
          prev_invoice_amount?: number | null
          prev_invoice_date?: string | null
          price_change_pct?: number | null
          rolling_30d_total?: number | null
          rolling_90d_total?: number | null
          supplier_id?: string | null
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitality_supplier_intelligence_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_event_categories: {
        Row: {
          affects_salary: boolean
          category_key: string
          color_token: string
          created_at: string
          group_type: string
          id: string
          label_sv: string
          multiplier: number
          payroll_code: string | null
        }
        Insert: {
          affects_salary?: boolean
          category_key: string
          color_token?: string
          created_at?: string
          group_type: string
          id?: string
          label_sv: string
          multiplier?: number
          payroll_code?: string | null
        }
        Update: {
          affects_salary?: boolean
          category_key?: string
          color_token?: string
          created_at?: string
          group_type?: string
          id?: string
          label_sv?: string
          multiplier?: number
          payroll_code?: string | null
        }
        Relationships: []
      }
      hr_events: {
        Row: {
          ai_confidence: number | null
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          category_key: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          event_date: string
          event_end_date: string | null
          hours: number | null
          id: string
          metadata: Json
          payroll_run_id: string | null
          quantity: number | null
          source: string
          source_text: string | null
          status: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category_key: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          event_date: string
          event_end_date?: string | null
          hours?: number | null
          id?: string
          metadata?: Json
          payroll_run_id?: string | null
          quantity?: number | null
          source?: string
          source_text?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category_key?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          event_date?: string
          event_end_date?: string | null
          hours?: number | null
          id?: string
          metadata?: Json
          payroll_run_id?: string | null
          quantity?: number | null
          source?: string
          source_text?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_events_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "hr_event_categories"
            referencedColumns: ["category_key"]
          },
          {
            foreignKeyName: "hr_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_events_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_customer_invoices: {
        Row: {
          amount_excl_vat: number
          amount_incl_vat: number
          company_id: string
          currency: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          external_invoice_number: string | null
          id: string
          imported_at: string
          invoice_date: string
          migration_job_id: string | null
          our_reference: string | null
          paid_date: string | null
          source_system: string | null
          status: string | null
          vat_amount: number
        }
        Insert: {
          amount_excl_vat: number
          amount_incl_vat: number
          company_id: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          external_invoice_number?: string | null
          id?: string
          imported_at?: string
          invoice_date: string
          migration_job_id?: string | null
          our_reference?: string | null
          paid_date?: string | null
          source_system?: string | null
          status?: string | null
          vat_amount?: number
        }
        Update: {
          amount_excl_vat?: number
          amount_incl_vat?: number
          company_id?: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          external_invoice_number?: string | null
          id?: string
          imported_at?: string
          invoice_date?: string
          migration_job_id?: string | null
          our_reference?: string | null
          paid_date?: string | null
          source_system?: string | null
          status?: string | null
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "imported_customer_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_customer_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "imported_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_customer_invoices_migration_job_id_fkey"
            columns: ["migration_job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_customers: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          company_id: string
          country: string | null
          currency: string | null
          customer_number: string | null
          email: string | null
          external_id: string | null
          id: string
          imported_at: string
          is_active: boolean
          migration_job_id: string | null
          name: string
          org_number: string | null
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          source_system: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          currency?: string | null
          customer_number?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          imported_at?: string
          is_active?: boolean
          migration_job_id?: string | null
          name: string
          org_number?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          source_system?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          currency?: string | null
          customer_number?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          imported_at?: string
          is_active?: boolean
          migration_job_id?: string | null
          name?: string
          org_number?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          source_system?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_customers_migration_job_id_fkey"
            columns: ["migration_job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_supplier_invoices: {
        Row: {
          account_code: string | null
          amount_excl_vat: number
          amount_incl_vat: number
          company_id: string
          currency: string
          description: string | null
          due_date: string | null
          external_invoice_number: string | null
          id: string
          imported_at: string
          invoice_date: string
          migration_job_id: string | null
          paid_date: string | null
          source_system: string | null
          status: string | null
          supplier_id: string | null
          vat_amount: number
        }
        Insert: {
          account_code?: string | null
          amount_excl_vat: number
          amount_incl_vat: number
          company_id: string
          currency?: string
          description?: string | null
          due_date?: string | null
          external_invoice_number?: string | null
          id?: string
          imported_at?: string
          invoice_date: string
          migration_job_id?: string | null
          paid_date?: string | null
          source_system?: string | null
          status?: string | null
          supplier_id?: string | null
          vat_amount?: number
        }
        Update: {
          account_code?: string | null
          amount_excl_vat?: number
          amount_incl_vat?: number
          company_id?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          external_invoice_number?: string | null
          id?: string
          imported_at?: string
          invoice_date?: string
          migration_job_id?: string | null
          paid_date?: string | null
          source_system?: string | null
          status?: string | null
          supplier_id?: string | null
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "imported_supplier_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_supplier_invoices_migration_job_id_fkey"
            columns: ["migration_job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "imported_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_suppliers: {
        Row: {
          address: string | null
          bankgiro: string | null
          bic: string | null
          category: string | null
          city: string | null
          company_id: string
          country: string | null
          currency: string | null
          default_expense_account: string | null
          email: string | null
          external_id: string | null
          iban: string | null
          id: string
          imported_at: string
          is_active: boolean
          migration_job_id: string | null
          name: string
          org_number: string | null
          payment_terms: number | null
          phone: string | null
          plusgiro: string | null
          postal_code: string | null
          source_system: string | null
          supplier_number: string | null
        }
        Insert: {
          address?: string | null
          bankgiro?: string | null
          bic?: string | null
          category?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          currency?: string | null
          default_expense_account?: string | null
          email?: string | null
          external_id?: string | null
          iban?: string | null
          id?: string
          imported_at?: string
          is_active?: boolean
          migration_job_id?: string | null
          name: string
          org_number?: string | null
          payment_terms?: number | null
          phone?: string | null
          plusgiro?: string | null
          postal_code?: string | null
          source_system?: string | null
          supplier_number?: string | null
        }
        Update: {
          address?: string | null
          bankgiro?: string | null
          bic?: string | null
          category?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          currency?: string | null
          default_expense_account?: string | null
          email?: string | null
          external_id?: string | null
          iban?: string | null
          id?: string
          imported_at?: string
          is_active?: boolean
          migration_job_id?: string | null
          name?: string
          org_number?: string | null
          payment_terms?: number | null
          phone?: string | null
          plusgiro?: string | null
          postal_code?: string | null
          source_system?: string | null
          supplier_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_suppliers_migration_job_id_fkey"
            columns: ["migration_job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_emails: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          company_id: string
          created_at: string
          document_ids: string[] | null
          error_message: string | null
          from_email: string
          from_name: string | null
          id: string
          invoice_id: string | null
          processed_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          company_id: string
          created_at?: string
          document_ids?: string[] | null
          error_message?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          invoice_id?: string | null
          processed_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          company_id?: string
          created_at?: string
          document_ids?: string[] | null
          error_message?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          invoice_id?: string | null
          processed_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_emails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_emails_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_benchmarks: {
        Row: {
          account_class: string
          created_at: string
          id: string
          label: string
          median_pct_of_revenue: number
          p25_pct: number | null
          p75_pct: number | null
          sector: string
        }
        Insert: {
          account_class: string
          created_at?: string
          id?: string
          label: string
          median_pct_of_revenue?: number
          p25_pct?: number | null
          p75_pct?: number | null
          sector: string
        }
        Update: {
          account_class?: string
          created_at?: string
          id?: string
          label?: string
          median_pct_of_revenue?: number
          p25_pct?: number | null
          p75_pct?: number | null
          sector?: string
        }
        Relationships: []
      }
      integration_credentials: {
        Row: {
          company_id: string
          config: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_interest: {
        Row: {
          company_id: string | null
          contacted_at: string | null
          created_at: string
          id: string
          notes: string | null
          platform: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          contacted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          platform: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          contacted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          platform?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_interest_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          api_key_id: string | null
          company_id: string
          created_at: string
          direction: string
          duration_ms: number | null
          error_message: string | null
          id: string
          integration_type: string
          method: string | null
          path: string | null
          request_body: Json | null
          response_body: Json | null
          status_code: number | null
          webhook_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          company_id: string
          created_at?: string
          direction?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          integration_type: string
          method?: string | null
          path?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
          webhook_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          company_id?: string
          created_at?: string
          direction?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          integration_type?: string
          method?: string | null
          path?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_comments: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          invoice_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          invoice_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          invoice_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_comments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          account_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total_amount: number
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total_amount: number
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Update: {
          account_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total_amount?: number
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_overrides: {
        Row: {
          bankid_reference: string | null
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          override_type: string
          reason: string
          risk_score_at_override: number | null
          signals_snapshot: Json | null
          signed_at: string
          user_id: string
        }
        Insert: {
          bankid_reference?: string | null
          company_id: string
          created_at?: string
          id?: string
          invoice_id: string
          override_type: string
          reason: string
          risk_score_at_override?: number | null
          signals_snapshot?: Json | null
          signed_at?: string
          user_id: string
        }
        Update: {
          bankid_reference?: string | null
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          override_type?: string
          reason?: string
          risk_score_at_override?: number | null
          signals_snapshot?: Json | null
          signed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_overrides_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_preaccounting: {
        Row: {
          account: string | null
          company_id: string
          confidence: number | null
          cost_center: string | null
          created_at: string
          id: string
          invoice_id: string
          periodization_plan: Json | null
          project_code: string | null
          source: string | null
          updated_at: string
          vat_code: string | null
        }
        Insert: {
          account?: string | null
          company_id: string
          confidence?: number | null
          cost_center?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          periodization_plan?: Json | null
          project_code?: string | null
          source?: string | null
          updated_at?: string
          vat_code?: string | null
        }
        Update: {
          account?: string | null
          company_id?: string
          confidence?: number | null
          cost_center?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          periodization_plan?: Json | null
          project_code?: string | null
          source?: string | null
          updated_at?: string
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_preaccounting_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_preaccounting_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reminder_settings: {
        Row: {
          collection_api_key_encrypted: string | null
          collection_provider: string | null
          company_id: string
          created_at: string
          days_until_collection: number
          days_until_first_reminder: number
          days_until_second_reminder: number
          days_until_third_reminder: number
          id: string
          is_automatic_collection_enabled: boolean
          is_automatic_reminders_enabled: boolean
          late_payment_interest_rate: number
          reminder_email_subject_1: string | null
          reminder_email_subject_2: string | null
          reminder_email_subject_3: string | null
          reminder_template_1: string | null
          reminder_template_2: string | null
          reminder_template_3: string | null
          updated_at: string
        }
        Insert: {
          collection_api_key_encrypted?: string | null
          collection_provider?: string | null
          company_id: string
          created_at?: string
          days_until_collection?: number
          days_until_first_reminder?: number
          days_until_second_reminder?: number
          days_until_third_reminder?: number
          id?: string
          is_automatic_collection_enabled?: boolean
          is_automatic_reminders_enabled?: boolean
          late_payment_interest_rate?: number
          reminder_email_subject_1?: string | null
          reminder_email_subject_2?: string | null
          reminder_email_subject_3?: string | null
          reminder_template_1?: string | null
          reminder_template_2?: string | null
          reminder_template_3?: string | null
          updated_at?: string
        }
        Update: {
          collection_api_key_encrypted?: string | null
          collection_provider?: string | null
          company_id?: string
          created_at?: string
          days_until_collection?: number
          days_until_first_reminder?: number
          days_until_second_reminder?: number
          days_until_third_reminder?: number
          id?: string
          is_automatic_collection_enabled?: boolean
          is_automatic_reminders_enabled?: boolean
          late_payment_interest_rate?: number
          reminder_email_subject_1?: string | null
          reminder_email_subject_2?: string | null
          reminder_email_subject_3?: string | null
          reminder_template_1?: string | null
          reminder_template_2?: string | null
          reminder_template_3?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminder_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reminders: {
        Row: {
          delivery_status: string | null
          email_body: string | null
          email_subject: string | null
          id: string
          invoice_id: string
          reminder_fee: number
          reminder_number: number
          sent_at: string
          sent_to_email: string
        }
        Insert: {
          delivery_status?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          invoice_id: string
          reminder_fee?: number
          reminder_number: number
          sent_at?: string
          sent_to_email: string
        }
        Update: {
          delivery_status?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          invoice_id?: string
          reminder_fee?: number
          reminder_number?: number
          sent_at?: string
          sent_to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_risk_signals: {
        Row: {
          company_id: string
          created_at: string
          details: Json
          id: string
          invoice_id: string
          kind: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          score_contribution: number
          severity: string
        }
        Insert: {
          company_id: string
          created_at?: string
          details?: Json
          id?: string
          invoice_id: string
          kind: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          score_contribution?: number
          severity: string
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json
          id?: string
          invoice_id?: string
          kind?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          score_contribution?: number
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_risk_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_risk_signals_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_risk_signals_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          ai_confidence: number | null
          approval_step: number
          attest_comment: string | null
          attested_at: string | null
          attested_by: string | null
          bg_pg: string | null
          collection_reference: string | null
          collection_status: string | null
          company_id: string
          cost_center_id: string | null
          counterparty_name: string
          counterparty_org_number: string | null
          created_at: string
          created_by: string
          currency: string
          customer_email: string | null
          document_id: string | null
          due_date: string
          id: string
          invoice_date: string
          invoice_direction: string
          invoice_number: string
          invoice_type: string
          is_blocked: boolean
          journal_entry_id: string | null
          last_reminder_sent_at: string | null
          next_approver_email: string | null
          notes: string | null
          paid_at: string | null
          peppol_id: string | null
          periodization_plan: Json | null
          project_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          reminder_count: number
          risk_last_evaluated_at: string | null
          risk_level: string | null
          risk_score: number | null
          sent_at: string | null
          sent_to_collection_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          supplier_id: string | null
          total_amount: number
          updated_at: string
          vat_amount: number
          vat_code: string | null
          workflow_state: string
        }
        Insert: {
          ai_confidence?: number | null
          approval_step?: number
          attest_comment?: string | null
          attested_at?: string | null
          attested_by?: string | null
          bg_pg?: string | null
          collection_reference?: string | null
          collection_status?: string | null
          company_id: string
          cost_center_id?: string | null
          counterparty_name: string
          counterparty_org_number?: string | null
          created_at?: string
          created_by: string
          currency?: string
          customer_email?: string | null
          document_id?: string | null
          due_date: string
          id?: string
          invoice_date: string
          invoice_direction?: string
          invoice_number: string
          invoice_type: string
          is_blocked?: boolean
          journal_entry_id?: string | null
          last_reminder_sent_at?: string | null
          next_approver_email?: string | null
          notes?: string | null
          paid_at?: string | null
          peppol_id?: string | null
          periodization_plan?: Json | null
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          reminder_count?: number
          risk_last_evaluated_at?: string | null
          risk_level?: string | null
          risk_score?: number | null
          sent_at?: string | null
          sent_to_collection_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_id?: string | null
          total_amount: number
          updated_at?: string
          vat_amount: number
          vat_code?: string | null
          workflow_state?: string
        }
        Update: {
          ai_confidence?: number | null
          approval_step?: number
          attest_comment?: string | null
          attested_at?: string | null
          attested_by?: string | null
          bg_pg?: string | null
          collection_reference?: string | null
          collection_status?: string | null
          company_id?: string
          cost_center_id?: string | null
          counterparty_name?: string
          counterparty_org_number?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          customer_email?: string | null
          document_id?: string | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_direction?: string
          invoice_number?: string
          invoice_type?: string
          is_blocked?: boolean
          journal_entry_id?: string | null
          last_reminder_sent_at?: string | null
          next_approver_email?: string | null
          notes?: string | null
          paid_at?: string | null
          peppol_id?: string | null
          periodization_plan?: Json | null
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          reminder_count?: number
          risk_last_evaluated_at?: string | null
          risk_level?: string | null
          risk_score?: number | null
          sent_at?: string | null
          sent_to_collection_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
          vat_amount?: number
          vat_code?: string | null
          workflow_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_attested_by_fkey"
            columns: ["attested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          ai_confidence: number | null
          ai_explanation: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          document_id: string | null
          entry_date: string
          id: string
          import_session_id: string | null
          journal_number: string | null
          payment_completed_at: string | null
          payment_initiated_at: string | null
          payment_reference: string | null
          payment_status: string | null
          receipt_match_confidence: number | null
          receipt_match_method: string | null
          receipt_matched: boolean | null
          series_code: string | null
          series_number: number | null
          source: string | null
          status: Database["public"]["Enums"]["journal_status"]
          supplier_iban: string | null
          supplier_name: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_explanation?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          document_id?: string | null
          entry_date: string
          id?: string
          import_session_id?: string | null
          journal_number?: string | null
          payment_completed_at?: string | null
          payment_initiated_at?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          receipt_match_confidence?: number | null
          receipt_match_method?: string | null
          receipt_matched?: boolean | null
          series_code?: string | null
          series_number?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          supplier_iban?: string | null
          supplier_name?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_explanation?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          document_id?: string | null
          entry_date?: string
          id?: string
          import_session_id?: string | null
          journal_number?: string | null
          payment_completed_at?: string | null
          payment_initiated_at?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          receipt_match_confidence?: number | null
          receipt_match_method?: string | null
          receipt_matched?: boolean | null
          series_code?: string | null
          series_number?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          supplier_iban?: string | null
          supplier_name?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_import_session_id_fkey"
            columns: ["import_session_id"]
            isOneToOne: false
            referencedRelation: "sie_import_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          cost_center_id: string | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          dimension: string | null
          id: string
          journal_entry_id: string
          vat_amount: number | null
          vat_code: string | null
        }
        Insert: {
          account_id: string
          cost_center_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          dimension?: string | null
          id?: string
          journal_entry_id: string
          vat_amount?: number | null
          vat_code?: string | null
        }
        Update: {
          account_id?: string
          cost_center_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          dimension?: string | null
          id?: string
          journal_entry_id?: string
          vat_amount?: number | null
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_series_counters: {
        Row: {
          company_id: string
          created_at: string
          fiscal_year: number
          id: string
          next_number: number
          series_code: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          fiscal_year: number
          id?: string
          next_number?: number
          series_code: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          fiscal_year?: number
          id?: string
          next_number?: number
          series_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_series_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kam_assignments: {
        Row: {
          assigned_by: string | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          kam_user_id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          kam_user_id: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          kam_user_id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kam_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kassaregister_sales: {
        Row: {
          company_id: string
          created_at: string | null
          gross_amount: number | null
          id: string
          payment_method: string | null
          pos_system: string | null
          receipt_number: string | null
          sale_date: string
          vat_12: number | null
          vat_25: number | null
          vat_6: number | null
          z_report_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          gross_amount?: number | null
          id?: string
          payment_method?: string | null
          pos_system?: string | null
          receipt_number?: string | null
          sale_date: string
          vat_12?: number | null
          vat_25?: number | null
          vat_6?: number | null
          z_report_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          gross_amount?: number | null
          id?: string
          payment_method?: string | null
          pos_system?: string | null
          receipt_number?: string | null
          sale_date?: string
          vat_12?: number | null
          vat_25?: number | null
          vat_6?: number | null
          z_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kassaregister_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kivra_deliveries: {
        Row: {
          company_id: string
          content_type: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          invoice_id: string | null
          kivra_content_id: string | null
          paid_at: string | null
          recipient_org_number: string | null
          recipient_ssn: string | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content_type?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          kivra_content_id?: string | null
          paid_at?: string | null
          recipient_org_number?: string | null
          recipient_ssn?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content_type?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          kivra_content_id?: string | null
          paid_at?: string | null
          recipient_org_number?: string | null
          recipient_ssn?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kivra_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kivra_deliveries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      kivra_settings: {
        Row: {
          company_id: string
          created_at: string | null
          default_delivery_method: string | null
          id: string
          is_active: boolean | null
          send_documents: boolean | null
          send_invoices: boolean | null
          send_payroll_slips: boolean | null
          tenant_key: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_delivery_method?: string | null
          id?: string
          is_active?: boolean | null
          send_documents?: boolean | null
          send_invoices?: boolean | null
          send_payroll_slips?: boolean | null
          tenant_key?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_delivery_method?: string | null
          id?: string
          is_active?: boolean | null
          send_documents?: boolean | null
          send_invoices?: boolean | null
          send_payroll_slips?: boolean | null
          tenant_key?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kivra_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_records: {
        Row: {
          address_verified: boolean | null
          bankid_personal_number: string | null
          bankid_verification_date: string | null
          bankid_verified: boolean | null
          company_id: string
          company_name_verified: boolean | null
          created_at: string
          id: string
          notes: string | null
          org_number_verified: boolean | null
          rejection_reason: string | null
          risk_factors: Json | null
          risk_level: string | null
          sanctions_check_date: string | null
          sanctions_check_performed: boolean | null
          sanctions_check_result: Json | null
          ubo_data: Json | null
          ubo_identified: boolean | null
          ubo_verified: boolean | null
          updated_at: string
          verification_date: string | null
          verification_documents: Json | null
          verification_status: string
          verified_by: string | null
        }
        Insert: {
          address_verified?: boolean | null
          bankid_personal_number?: string | null
          bankid_verification_date?: string | null
          bankid_verified?: boolean | null
          company_id: string
          company_name_verified?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          org_number_verified?: boolean | null
          rejection_reason?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          sanctions_check_date?: string | null
          sanctions_check_performed?: boolean | null
          sanctions_check_result?: Json | null
          ubo_data?: Json | null
          ubo_identified?: boolean | null
          ubo_verified?: boolean | null
          updated_at?: string
          verification_date?: string | null
          verification_documents?: Json | null
          verification_status?: string
          verified_by?: string | null
        }
        Update: {
          address_verified?: boolean | null
          bankid_personal_number?: string | null
          bankid_verification_date?: string | null
          bankid_verified?: boolean | null
          company_id?: string
          company_name_verified?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          org_number_verified?: boolean | null
          rejection_reason?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          sanctions_check_date?: string | null
          sanctions_check_performed?: boolean | null
          sanctions_check_result?: Json | null
          ubo_data?: Json | null
          ubo_identified?: boolean | null
          ubo_verified?: boolean | null
          updated_at?: string
          verification_date?: string | null
          verification_documents?: Json | null
          verification_status?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      linked_companies: {
        Row: {
          company_id: string
          id: string
          is_primary: boolean | null
          linked_at: string
          personal_number_hash: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          is_primary?: boolean | null
          linked_at?: string
          personal_number_hash?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          is_primary?: boolean | null
          linked_at?: string
          personal_number_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linked_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_jobs: {
        Row: {
          ai_report: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          errors: Json
          id: string
          source_format: string
          source_system: string
          stats: Json
          status: string
          transition_date: string | null
        }
        Insert: {
          ai_report?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          errors?: Json
          id?: string
          source_format: string
          source_system: string
          stats?: Json
          status?: string
          transition_date?: string | null
        }
        Update: {
          ai_report?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          errors?: Json
          id?: string
          source_format?: string
          source_system?: string
          stats?: Json
          status?: string
          transition_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "migration_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_commentaries: {
        Row: {
          company_id: string
          created_at: string
          generated_by: string | null
          id: string
          metrics: Json
          period_month: number
          period_year: number
          sections: Json
          share_token: string | null
          shared_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          generated_by?: string | null
          id?: string
          metrics?: Json
          period_month: number
          period_year: number
          sections?: Json
          share_token?: string | null
          shared_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          metrics?: Json
          period_month?: number
          period_year?: number
          sections?: Json
          share_token?: string | null
          shared_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          company_id: string
          email_enabled: boolean
          id: string
          notification_type: string
          push_enabled: boolean
          sms_enabled: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          email_enabled?: boolean
          id?: string
          notification_type: string
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          email_enabled?: boolean
          id?: string
          notification_type?: string
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_balances: {
        Row: {
          account_code: string
          account_name: string | null
          balance: number
          balance_type: string | null
          company_id: string
          id: string
          imported_at: string
          migration_job_id: string | null
          transition_date: string
        }
        Insert: {
          account_code: string
          account_name?: string | null
          balance: number
          balance_type?: string | null
          company_id: string
          id?: string
          imported_at?: string
          migration_job_id?: string | null
          transition_date: string
        }
        Update: {
          account_code?: string
          account_name?: string | null
          balance?: number
          balance_type?: string | null
          company_id?: string
          id?: string
          imported_at?: string
          migration_job_id?: string | null
          transition_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "opening_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_balances_migration_job_id_fkey"
            columns: ["migration_job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          environment: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string | null
          partner_id: string
          revoked_at: string | null
          scopes: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          environment: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string | null
          partner_id: string
          revoked_at?: string | null
          scopes?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string | null
          partner_id?: string
          revoked_at?: string | null
          scopes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "partner_api_keys_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_api_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip: string | null
          latency_ms: number | null
          method: string
          partner_id: string | null
          request_id: string
          status_code: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip?: string | null
          latency_ms?: number | null
          method: string
          partner_id?: string | null
          request_id: string
          status_code: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip?: string | null
          latency_ms?: number | null
          method?: string
          partner_id?: string | null
          request_id?: string
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "partner_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_api_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_clients: {
        Row: {
          company_id: string
          created_at: string
          external_client_ref: string
          id: string
          metadata: Json | null
          partner_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          external_client_ref: string
          id?: string
          metadata?: Json | null
          partner_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          external_client_ref?: string
          id?: string
          metadata?: Json | null
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_clients_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          contact_email: string | null
          created_at: string
          created_by: string | null
          environment_default: string
          id: string
          ip_allowlist: string[] | null
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          environment_default?: string
          id?: string
          ip_allowlist?: string[] | null
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          environment_default?: string
          id?: string
          ip_allowlist?: string[] | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_initiations: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          creditor_iban: string | null
          creditor_name: string | null
          currency: string
          debtor_iban: string | null
          error_message: string | null
          id: string
          initiated_by: string
          metadata: Json
          payment_batch_id: string | null
          provider: string
          provider_payment_id: string | null
          redirect_url: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_initiation_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          creditor_iban?: string | null
          creditor_name?: string | null
          currency?: string
          debtor_iban?: string | null
          error_message?: string | null
          id?: string
          initiated_by: string
          metadata?: Json
          payment_batch_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          redirect_url?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_initiation_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          creditor_iban?: string | null
          creditor_name?: string | null
          currency?: string
          debtor_iban?: string | null
          error_message?: string | null
          id?: string
          initiated_by?: string
          metadata?: Json
          payment_batch_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          redirect_url?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_initiation_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payment_proposal_invoices: {
        Row: {
          amount: number
          bankgiro: string | null
          bic: string | null
          created_at: string
          currency: string | null
          iban: string | null
          id: string
          invoice_id: string
          proposal_id: string
          reference: string | null
        }
        Insert: {
          amount: number
          bankgiro?: string | null
          bic?: string | null
          created_at?: string
          currency?: string | null
          iban?: string | null
          id?: string
          invoice_id: string
          proposal_id: string
          reference?: string | null
        }
        Update: {
          amount?: number
          bankgiro?: string | null
          bic?: string | null
          created_at?: string
          currency?: string | null
          iban?: string | null
          id?: string
          invoice_id?: string
          proposal_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proposal_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proposal_invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "payment_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proposals: {
        Row: {
          approval_level: string | null
          approver_1_at: string | null
          approver_1_id: string | null
          approver_2_at: string | null
          approver_2_id: string | null
          bank_approval_status: string
          bank_reference: string | null
          company_id: string
          created_at: string
          created_by: string
          exported_at: string | null
          external_provider_reference: string | null
          failure_reason: string | null
          id: string
          invoice_count: number
          journal_entry_id: string | null
          paid_at: string | null
          pain001_filename: string | null
          pain001_xml: string | null
          pay_immediately: boolean | null
          payment_date: string
          provider_name: string
          provider_type: string
          reconciliation_status: string
          reference_type: string | null
          rejection_comment: string | null
          status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          approval_level?: string | null
          approver_1_at?: string | null
          approver_1_id?: string | null
          approver_2_at?: string | null
          approver_2_id?: string | null
          bank_approval_status?: string
          bank_reference?: string | null
          company_id: string
          created_at?: string
          created_by: string
          exported_at?: string | null
          external_provider_reference?: string | null
          failure_reason?: string | null
          id?: string
          invoice_count?: number
          journal_entry_id?: string | null
          paid_at?: string | null
          pain001_filename?: string | null
          pain001_xml?: string | null
          pay_immediately?: boolean | null
          payment_date: string
          provider_name?: string
          provider_type?: string
          reconciliation_status?: string
          reference_type?: string | null
          rejection_comment?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approval_level?: string | null
          approver_1_at?: string | null
          approver_1_id?: string | null
          approver_2_at?: string | null
          approver_2_id?: string | null
          bank_approval_status?: string
          bank_reference?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          exported_at?: string | null
          external_provider_reference?: string | null
          failure_reason?: string | null
          id?: string
          invoice_count?: number
          journal_entry_id?: string | null
          paid_at?: string | null
          pain001_filename?: string | null
          pain001_xml?: string | null
          pay_immediately?: boolean | null
          payment_date?: string
          provider_name?: string
          provider_type?: string
          reconciliation_status?: string
          reference_type?: string | null
          rejection_comment?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proposals_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          credentials_ref: string | null
          display_name: string
          id: string
          provider_name: string
          provider_type: string
          status: string
          supports_account_information: boolean
          supports_payment_initiation: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          credentials_ref?: string | null
          display_name: string
          id?: string
          provider_name: string
          provider_type: string
          status?: string
          supports_account_information?: boolean
          supports_payment_initiation?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          credentials_ref?: string | null
          display_name?: string
          id?: string
          provider_name?: string
          provider_type?: string
          status?: string
          supports_account_information?: boolean
          supports_payment_initiation?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_providers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_status_log: {
        Row: {
          changed_at: string
          changed_by: string
          company_id: string
          from_status: string | null
          id: string
          metadata: Json
          note: string | null
          proposal_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          company_id: string
          from_status?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          proposal_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          company_id?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          proposal_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_status_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_log_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "payment_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          created_at: string
          created_by: string
          description: string | null
          hours: number | null
          id: string
          payroll_line_id: string
        }
        Insert: {
          adjustment_type: string
          amount: number
          created_at?: string
          created_by: string
          description?: string | null
          hours?: number | null
          id?: string
          payroll_line_id: string
        }
        Update: {
          adjustment_type?: string
          amount?: number
          created_at?: string
          created_by?: string
          description?: string | null
          hours?: number | null
          id?: string
          payroll_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_payroll_line_id_fkey"
            columns: ["payroll_line_id"]
            isOneToOne: false
            referencedRelation: "payroll_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_agi_adjustments: {
        Row: {
          adjusted_at: string
          adjusted_by: string
          adjusted_value: number
          adjustment_reason: string | null
          ai_value: number
          employee_id: string | null
          field_code: string
          id: string
          submission_id: string
        }
        Insert: {
          adjusted_at?: string
          adjusted_by: string
          adjusted_value?: number
          adjustment_reason?: string | null
          ai_value?: number
          employee_id?: string | null
          field_code: string
          id?: string
          submission_id: string
        }
        Update: {
          adjusted_at?: string
          adjusted_by?: string
          adjusted_value?: number
          adjustment_reason?: string | null
          ai_value?: number
          employee_id?: string | null
          field_code?: string
          id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_agi_adjustments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "payroll_agi_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_agi_submissions: {
        Row: {
          ai_prepared_at: string | null
          company_id: string
          corrects_submission_id: string | null
          created_at: string
          data: Json | null
          employee_count: number | null
          fk_data: Json | null
          id: string
          is_correction: boolean | null
          period: string
          previous_period_comparison: Json | null
          reviewed_at: string | null
          skv_reference_number: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_employer_contributions: number | null
          total_gross_salary: number | null
          total_tax_withheld: number | null
          total_to_pay: number | null
          updated_at: string
          warnings: Json | null
        }
        Insert: {
          ai_prepared_at?: string | null
          company_id: string
          corrects_submission_id?: string | null
          created_at?: string
          data?: Json | null
          employee_count?: number | null
          fk_data?: Json | null
          id?: string
          is_correction?: boolean | null
          period: string
          previous_period_comparison?: Json | null
          reviewed_at?: string | null
          skv_reference_number?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_employer_contributions?: number | null
          total_gross_salary?: number | null
          total_tax_withheld?: number | null
          total_to_pay?: number | null
          updated_at?: string
          warnings?: Json | null
        }
        Update: {
          ai_prepared_at?: string | null
          company_id?: string
          corrects_submission_id?: string | null
          created_at?: string
          data?: Json | null
          employee_count?: number | null
          fk_data?: Json | null
          id?: string
          is_correction?: boolean | null
          period?: string
          previous_period_comparison?: Json | null
          reviewed_at?: string | null
          skv_reference_number?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_employer_contributions?: number | null
          total_gross_salary?: number | null
          total_tax_withheld?: number | null
          total_to_pay?: number | null
          updated_at?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_agi_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_agi_submissions_corrects_submission_id_fkey"
            columns: ["corrects_submission_id"]
            isOneToOne: false
            referencedRelation: "payroll_agi_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_employee_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          employee_id: string
          excluded: boolean
          id: string
          notes: string | null
          payroll_run_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          excluded?: boolean
          id?: string
          notes?: string | null
          payroll_run_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          excluded?: boolean
          id?: string
          notes?: string | null
          payroll_run_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_approvals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_approvals_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_lines: {
        Row: {
          created_at: string
          employee_id: string
          employer_social_fees: number
          gross_salary: number
          id: string
          net_salary: number
          other_benefits: number | null
          other_deductions: number | null
          payroll_run_id: string
          pension: number | null
          sick_days: number | null
          tax_deduction: number
          vacation_days: number | null
          vacation_pay: number | null
          worked_hours: number | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          employer_social_fees?: number
          gross_salary: number
          id?: string
          net_salary: number
          other_benefits?: number | null
          other_deductions?: number | null
          payroll_run_id: string
          pension?: number | null
          sick_days?: number | null
          tax_deduction?: number
          vacation_days?: number | null
          vacation_pay?: number | null
          worked_hours?: number | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          employer_social_fees?: number
          gross_salary?: number
          id?: string
          net_salary?: number
          other_benefits?: number | null
          other_deductions?: number | null
          payroll_run_id?: string
          pension?: number | null
          sick_days?: number | null
          tax_deduction?: number
          vacation_days?: number | null
          vacation_pay?: number | null
          worked_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_review_flags: {
        Row: {
          ai_recommendation: string | null
          company_id: string
          created_at: string
          description: string | null
          employee_id: string | null
          flag_type: string
          id: string
          payroll_run_id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          ai_recommendation?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          employee_id?: string | null
          flag_type: string
          id?: string
          payroll_run_id: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          ai_recommendation?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          employee_id?: string | null
          flag_type?: string
          id?: string
          payroll_run_id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_review_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_review_flags_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_review_flags_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          agi_file_generated: boolean | null
          agi_file_url: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          payment_date: string
          period_end: string
          period_start: string
          status: string
          total_employer_cost: number
          total_gross: number
          total_net: number
          total_tax: number
          updated_at: string
        }
        Insert: {
          agi_file_generated?: boolean | null
          agi_file_url?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          payment_date: string
          period_end: string
          period_start: string
          status?: string
          total_employer_cost?: number
          total_gross?: number
          total_net?: number
          total_tax?: number
          updated_at?: string
        }
        Update: {
          agi_file_generated?: boolean | null
          agi_file_url?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          payment_date?: string
          period_end?: string
          period_start?: string
          status?: string
          total_employer_cost?: number
          total_gross?: number
          total_net?: number
          total_tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          fiscal_year_id: string | null
          id: string
          is_closed: boolean
          month: number
          period_code: string
          quarter: number
          start_date: string
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          fiscal_year_id?: string | null
          id?: string
          is_closed?: boolean
          month: number
          period_code: string
          quarter?: number
          start_date: string
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          fiscal_year_id?: string | null
          id?: string
          is_closed?: boolean
          month?: number
          period_code?: string
          quarter?: number
          start_date?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          company_id: string
          config: Json | null
          created_at: string
          credentials_encrypted: Json | null
          id: string
          last_sync_at: string | null
          platform: string
          status: string
          sync_cursor: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json | null
          created_at?: string
          credentials_encrypted?: Json | null
          id?: string
          last_sync_at?: string | null
          platform: string
          status?: string
          sync_cursor?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json | null
          created_at?: string
          credentials_encrypted?: Json | null
          id?: string
          last_sync_at?: string | null
          platform?: string
          status?: string
          sync_cursor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_action_items: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          firm_id: string
          id: string
          item_type: string
          response_data: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          firm_id: string
          id?: string
          item_type: string
          response_data?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          firm_id?: string
          id?: string
          item_type?: string
          response_data?: Json | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_action_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_action_items_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          attachments: Json
          body: string
          company_id: string
          created_at: string
          firm_id: string
          id: string
          read_at: string | null
          sender_id: string | null
          sender_side: string
        }
        Insert: {
          attachments?: Json
          body?: string
          company_id: string
          created_at?: string
          firm_id: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_side: string
        }
        Update: {
          attachments?: Json
          body?: string
          company_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_side?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_messages_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "accounting_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_connections: {
        Row: {
          access_token_encrypted: string | null
          api_key_encrypted: string | null
          company_id: string
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          provider: string
          provider_name: string
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          api_key_encrypted?: string | null
          company_id: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider: string
          provider_name: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          api_key_encrypted?: string | null
          company_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider?: string
          provider_name?: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_daily_sales: {
        Row: {
          card_amount: number
          cash_amount: number
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string
          id: string
          is_booked: boolean
          journal_entry_id: string | null
          other_amount: number
          sale_date: string
          swish_amount: number
          total_sales: number
          transaction_count: number
          updated_at: string
          vat_breakdown: Json | null
        }
        Insert: {
          card_amount?: number
          cash_amount?: number
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_booked?: boolean
          journal_entry_id?: string | null
          other_amount?: number
          sale_date: string
          swish_amount?: number
          total_sales?: number
          transaction_count?: number
          updated_at?: string
          vat_breakdown?: Json | null
        }
        Update: {
          card_amount?: number
          cash_amount?: number
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_booked?: boolean
          journal_entry_id?: string | null
          other_amount?: number
          sale_date?: string
          swish_amount?: number
          total_sales?: number
          transaction_count?: number
          updated_at?: string
          vat_breakdown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_daily_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_daily_sales_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_vat_categories: {
        Row: {
          account_name: string | null
          account_number: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          pos_category: string
          vat_rate: number
        }
        Insert: {
          account_name?: string | null
          account_number?: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          pos_category: string
          vat_rate?: number
        }
        Update: {
          account_name?: string | null
          account_number?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          pos_category?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_vat_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_z_reports: {
        Row: {
          card_amount: number | null
          cash_amount: number | null
          company_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          notes: string | null
          report_date: string
          report_number: string | null
          returns_amount: number | null
          source: string | null
          swish_amount: number | null
          total_sales: number
          uploaded_by: string | null
        }
        Insert: {
          card_amount?: number | null
          cash_amount?: number | null
          company_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          report_date: string
          report_number?: string | null
          returns_amount?: number | null
          source?: string | null
          swish_amount?: number | null
          total_sales?: number
          uploaded_by?: string | null
        }
        Update: {
          card_amount?: number | null
          cash_amount?: number | null
          company_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          report_date?: string
          report_number?: string | null
          returns_amount?: number | null
          source?: string | null
          swish_amount?: number | null
          total_sales?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_z_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_costs: {
        Row: {
          company_id: string
          cost_price_sek: number
          currency: string | null
          id: string
          last_updated: string
          product_name: string | null
          sku: string
          supplier: string | null
        }
        Insert: {
          company_id: string
          cost_price_sek?: number
          currency?: string | null
          id?: string
          last_updated?: string
          product_name?: string | null
          sku: string
          supplier?: string | null
        }
        Update: {
          company_id?: string
          cost_price_sek?: number
          currency?: string | null
          id?: string
          last_updated?: string
          product_name?: string | null
          sku?: string
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_transactions: {
        Row: {
          amount: number
          auto_linked: boolean | null
          created_at: string
          description: string | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          project_id: string
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount?: number
          auto_linked?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          project_id: string
          transaction_date?: string
          transaction_type?: string
        }
        Update: {
          amount?: number
          auto_linked?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          project_id?: string
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          budget_cost: number | null
          budget_revenue: number | null
          client_id: string | null
          client_name: string | null
          closed_at: string | null
          closed_by: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          is_active: boolean | null
          logged_hours: number | null
          name: string
          project_type: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          budget_cost?: number | null
          budget_revenue?: number | null
          client_id?: string | null
          client_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          logged_hours?: number | null
          name: string
          project_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          budget_cost?: number | null
          budget_revenue?: number | null
          client_id?: string | null
          client_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          logged_hours?: number | null
          name?: string
          project_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_cash_events: {
        Row: {
          active: boolean
          company_id: string
          confidence_score: number | null
          created_at: string
          day_of_month: number | null
          detected_from_pattern: boolean | null
          direction: string
          event_type: string
          expected_amount: number
          frequency: string
          id: string
          label: string
          next_expected_date: string
          source_account_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          confidence_score?: number | null
          created_at?: string
          day_of_month?: number | null
          detected_from_pattern?: boolean | null
          direction: string
          event_type: string
          expected_amount: number
          frequency?: string
          id?: string
          label: string
          next_expected_date: string
          source_account_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          day_of_month?: number | null
          detected_from_pattern?: boolean | null
          direction?: string
          event_type?: string
          expected_amount?: number
          frequency?: string
          id?: string
          label?: string
          next_expected_date?: string
          source_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_cash_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_cash_events_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      report_rows: {
        Row: {
          calculation_type: Database["public"]["Enums"]["report_calc_type"]
          code: string
          created_at: string
          display_style: Database["public"]["Enums"]["report_display_style"]
          formula_expression: string | null
          id: string
          is_drillable: boolean
          is_editable: boolean
          is_visible_default: boolean
          label: string
          level: number
          parent_row_id: string | null
          row_type: Database["public"]["Enums"]["report_row_type"]
          section_id: string | null
          sequence: number
          sign_behavior: Database["public"]["Enums"]["report_sign_behavior"]
          supports_margin_percent: boolean
          supports_scenario: boolean
          supports_validation: boolean
          supports_variance: boolean
          template_id: string
          updated_at: string
        }
        Insert: {
          calculation_type?: Database["public"]["Enums"]["report_calc_type"]
          code: string
          created_at?: string
          display_style?: Database["public"]["Enums"]["report_display_style"]
          formula_expression?: string | null
          id?: string
          is_drillable?: boolean
          is_editable?: boolean
          is_visible_default?: boolean
          label: string
          level?: number
          parent_row_id?: string | null
          row_type?: Database["public"]["Enums"]["report_row_type"]
          section_id?: string | null
          sequence?: number
          sign_behavior?: Database["public"]["Enums"]["report_sign_behavior"]
          supports_margin_percent?: boolean
          supports_scenario?: boolean
          supports_validation?: boolean
          supports_variance?: boolean
          template_id: string
          updated_at?: string
        }
        Update: {
          calculation_type?: Database["public"]["Enums"]["report_calc_type"]
          code?: string
          created_at?: string
          display_style?: Database["public"]["Enums"]["report_display_style"]
          formula_expression?: string | null
          id?: string
          is_drillable?: boolean
          is_editable?: boolean
          is_visible_default?: boolean
          label?: string
          level?: number
          parent_row_id?: string | null
          row_type?: Database["public"]["Enums"]["report_row_type"]
          section_id?: string | null
          sequence?: number
          sign_behavior?: Database["public"]["Enums"]["report_sign_behavior"]
          supports_margin_percent?: boolean
          supports_scenario?: boolean
          supports_validation?: boolean
          supports_variance?: boolean
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_rows_parent_row_id_fkey"
            columns: ["parent_row_id"]
            isOneToOne: false
            referencedRelation: "report_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_rows_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "report_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_rows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_scenario_adjustments: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["report_scenario_adjustment_type"]
          company_id: string
          created_at: string
          delta_amount: number | null
          delta_percent: number | null
          id: string
          payload_json: Json | null
          period_id: string | null
          row_id: string
          scenario_id: string
          updated_at: string
        }
        Insert: {
          adjustment_type?: Database["public"]["Enums"]["report_scenario_adjustment_type"]
          company_id: string
          created_at?: string
          delta_amount?: number | null
          delta_percent?: number | null
          id?: string
          payload_json?: Json | null
          period_id?: string | null
          row_id: string
          scenario_id: string
          updated_at?: string
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["report_scenario_adjustment_type"]
          company_id?: string
          created_at?: string
          delta_amount?: number | null
          delta_percent?: number | null
          id?: string
          payload_json?: Json | null
          period_id?: string | null
          row_id?: string
          scenario_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_scenario_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_scenario_adjustments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_scenario_adjustments_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "report_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_scenario_adjustments_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "report_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      report_scenarios: {
        Row: {
          base_layer:
            | Database["public"]["Enums"]["financial_value_layer"]
            | null
          base_period_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          scenario_type: Database["public"]["Enums"]["report_scenario_type"]
          updated_at: string
        }
        Insert: {
          base_layer?:
            | Database["public"]["Enums"]["financial_value_layer"]
            | null
          base_period_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scenario_type?: Database["public"]["Enums"]["report_scenario_type"]
          updated_at?: string
        }
        Update: {
          base_layer?:
            | Database["public"]["Enums"]["financial_value_layer"]
            | null
          base_period_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scenario_type?: Database["public"]["Enums"]["report_scenario_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_scenarios_base_period_id_fkey"
            columns: ["base_period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_sections: {
        Row: {
          code: string
          created_at: string
          id: string
          is_collapsible: boolean
          label: string
          level: number
          parent_section_id: string | null
          section_type: Database["public"]["Enums"]["report_section_type"]
          sequence: number
          template_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_collapsible?: boolean
          label: string
          level?: number
          parent_section_id?: string | null
          section_type?: Database["public"]["Enums"]["report_section_type"]
          sequence?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_collapsible?: boolean
          label?: string
          level?: number
          parent_section_id?: string | null
          section_type?: Database["public"]["Enums"]["report_section_type"]
          sequence?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "report_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          code: string
          created_at: string
          description: string | null
          framework: Database["public"]["Enums"]["report_framework"]
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          tenant_id: string | null
          type: Database["public"]["Enums"]["report_template_type"]
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          framework?: Database["public"]["Enums"]["report_framework"]
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          tenant_id?: string | null
          type: Database["public"]["Enums"]["report_template_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          framework?: Database["public"]["Enums"]["report_framework"]
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["report_template_type"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_views: {
        Row: {
          code: string
          created_at: string
          enabled_value_layers_json: Json
          id: string
          is_system: boolean
          name: string
          row_filters_json: Json
          supports_ai: boolean
          supports_drilldown: boolean
          supports_export_docx: boolean
          supports_export_excel: boolean
          supports_export_pdf: boolean
          supports_validation: boolean
          template_id: string
          tenant_id: string | null
          updated_at: string
          visible_columns_json: Json
        }
        Insert: {
          code: string
          created_at?: string
          enabled_value_layers_json?: Json
          id?: string
          is_system?: boolean
          name: string
          row_filters_json?: Json
          supports_ai?: boolean
          supports_drilldown?: boolean
          supports_export_docx?: boolean
          supports_export_excel?: boolean
          supports_export_pdf?: boolean
          supports_validation?: boolean
          template_id: string
          tenant_id?: string | null
          updated_at?: string
          visible_columns_json?: Json
        }
        Update: {
          code?: string
          created_at?: string
          enabled_value_layers_json?: Json
          id?: string
          is_system?: boolean
          name?: string
          row_filters_json?: Json
          supports_ai?: boolean
          supports_drilldown?: boolean
          supports_export_docx?: boolean
          supports_export_excel?: boolean
          supports_export_pdf?: boolean
          supports_validation?: boolean
          template_id?: string
          tenant_id?: string | null
          updated_at?: string
          visible_columns_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "report_views_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      return_events: {
        Row: {
          company_id: string
          correction_entry_id: string | null
          created_at: string
          id: string
          order_id: string | null
          platform: string
          platform_return_id: string | null
          reason: string | null
          refund_amount_sek: number
          restocking_fee_sek: number | null
          return_date: string
          return_type: string
          returnable_to_stock: boolean | null
          status: string
        }
        Insert: {
          company_id: string
          correction_entry_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          platform: string
          platform_return_id?: string | null
          reason?: string | null
          refund_amount_sek?: number
          restocking_fee_sek?: number | null
          return_date?: string
          return_type?: string
          returnable_to_stock?: boolean | null
          status?: string
        }
        Update: {
          company_id?: string
          correction_entry_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          platform?: string
          platform_return_id?: string | null
          reason?: string | null
          refund_amount_sek?: number
          restocking_fee_sek?: number | null
          return_date?: string
          return_type?: string
          returnable_to_stock?: boolean | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      review_logs: {
        Row: {
          changes_made: Json | null
          created_at: string
          id: string
          journal_entry_id: string
          review_action: string
          review_notes: string | null
          reviewer_id: string
        }
        Insert: {
          changes_made?: Json | null
          created_at?: string
          id?: string
          journal_entry_id: string
          review_action: string
          review_notes?: string | null
          reviewer_id: string
        }
        Update: {
          changes_made?: Json | null
          created_at?: string
          id?: string
          journal_entry_id?: string
          review_action?: string
          review_notes?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_logs_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_logs_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rpa_sessions: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          personal_number_hash: string | null
          skatteverket_reference: string | null
          status: string
          task_data: Json | null
          task_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          personal_number_hash?: string | null
          skatteverket_reference?: string | null
          status?: string
          task_data?: Json | null
          task_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          personal_number_hash?: string | null
          skatteverket_reference?: string | null
          status?: string
          task_data?: Json | null
          task_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpa_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rut_rot_customer_limits: {
        Row: {
          company_id: string
          created_at: string
          customer_name: string | null
          customer_personal_id: string
          deduction_type: string
          id: string
          total_used: number
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_name?: string | null
          customer_personal_id: string
          deduction_type: string
          id?: string
          total_used?: number
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_name?: string | null
          customer_personal_id?: string
          deduction_type?: string
          id?: string
          total_used?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "rut_rot_customer_limits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rut_rot_invoices: {
        Row: {
          company_id: string
          created_at: string
          customer_pays: number
          customer_personal_id: string
          deduction_amount: number
          deduction_type: string
          id: string
          invoice_id: string
          journal_entry_id: string | null
          labor_cost: number
          material_cost: number
          property_designation: string | null
          skv_applied_at: string | null
          skv_paid_amount: number | null
          skv_paid_at: string | null
          skv_payment_journal_id: string | null
          skv_reference: string | null
          skv_rejection_reason: string | null
          skv_status: string
          travel_cost: number
          updated_at: string
          work_description: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_pays?: number
          customer_personal_id: string
          deduction_amount?: number
          deduction_type: string
          id?: string
          invoice_id: string
          journal_entry_id?: string | null
          labor_cost?: number
          material_cost?: number
          property_designation?: string | null
          skv_applied_at?: string | null
          skv_paid_amount?: number | null
          skv_paid_at?: string | null
          skv_payment_journal_id?: string | null
          skv_reference?: string | null
          skv_rejection_reason?: string | null
          skv_status?: string
          travel_cost?: number
          updated_at?: string
          work_description?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_pays?: number
          customer_personal_id?: string
          deduction_amount?: number
          deduction_type?: string
          id?: string
          invoice_id?: string
          journal_entry_id?: string | null
          labor_cost?: number
          material_cost?: number
          property_designation?: string | null
          skv_applied_at?: string | null
          skv_paid_amount?: number | null
          skv_paid_at?: string | null
          skv_payment_journal_id?: string | null
          skv_reference?: string | null
          skv_rejection_reason?: string | null
          skv_status?: string
          travel_cost?: number
          updated_at?: string
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rut_rot_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rut_rot_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rut_rot_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rut_rot_invoices_skv_payment_journal_id_fkey"
            columns: ["skv_payment_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      rut_rot_settings: {
        Row: {
          company_id: string
          created_at: string
          f_skatt_confirmed: boolean
          id: string
          rot_enabled: boolean
          rut_enabled: boolean
          skv_registered_confirmed: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          f_skatt_confirmed?: boolean
          id?: string
          rot_enabled?: boolean
          rut_enabled?: boolean
          skv_registered_confirmed?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          f_skatt_confirmed?: boolean
          id?: string
          rot_enabled?: boolean
          rut_enabled?: boolean
          skv_registered_confirmed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rut_rot_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          icon: string | null
          id: string
          is_default: boolean
          name: string
          owner_id: string
          payload: Json
          pinned: boolean
          position: number
          route: string
          scope: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          owner_id: string
          payload?: Json
          pinned?: boolean
          position?: number
          route: string
          scope?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          owner_id?: string
          payload?: Json
          pinned?: boolean
          position?: number
          route?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string
          delta_amount: number | null
          delta_days: number | null
          id: string
          payload_json: Json | null
          reference_entity_id: string | null
          reference_entity_type: string | null
          scenario_id: string
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          delta_amount?: number | null
          delta_days?: number | null
          id?: string
          payload_json?: Json | null
          reference_entity_id?: string | null
          reference_entity_type?: string | null
          scenario_id: string
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          delta_amount?: number | null
          delta_days?: number | null
          id?: string
          payload_json?: Json | null
          reference_entity_id?: string | null
          reference_entity_type?: string | null
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_adjustments_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "cashflow_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_explanations: {
        Row: {
          created_at: string
          driver_hash: string
          id: string
          opportunities: Json
          recommendation: string | null
          risks: Json
          scenario_id: string
          summary: string
        }
        Insert: {
          created_at?: string
          driver_hash: string
          id?: string
          opportunities?: Json
          recommendation?: string | null
          risks?: Json
          scenario_id: string
          summary: string
        }
        Update: {
          created_at?: string
          driver_hash?: string
          id?: string
          opportunities?: Json
          recommendation?: string | null
          risks?: Json
          scenario_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_explanations_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          scenario_id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          scenario_id: string
          snapshot: Json
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          scenario_id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenario_versions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "budget_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      securities_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          account_type: string
          broker: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          legal_treatment: string | null
          opening_balance: number | null
          opening_date: string | null
          owner_personnummer: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          account_type: string
          broker: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          legal_treatment?: string | null
          opening_balance?: number | null
          opening_date?: string | null
          owner_personnummer?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          account_type?: string
          broker?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          legal_treatment?: string | null
          opening_balance?: number | null
          opening_date?: string | null
          owner_personnummer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "securities_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      securities_classifications: {
        Row: {
          account_type_proposed: string | null
          ai_model: string | null
          ambiguity_flags: Json | null
          classified_by: string
          company_id: string
          confidence: number | null
          created_at: string
          created_by: string | null
          id: string
          instrument_type: string | null
          override_reason: string | null
          source_excerpt: string | null
          transaction_id: string | null
          tx_type_final: string | null
          tx_type_proposed: string | null
        }
        Insert: {
          account_type_proposed?: string | null
          ai_model?: string | null
          ambiguity_flags?: Json | null
          classified_by?: string
          company_id: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          instrument_type?: string | null
          override_reason?: string | null
          source_excerpt?: string | null
          transaction_id?: string | null
          tx_type_final?: string | null
          tx_type_proposed?: string | null
        }
        Update: {
          account_type_proposed?: string | null
          ai_model?: string | null
          ambiguity_flags?: Json | null
          classified_by?: string
          company_id?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          instrument_type?: string | null
          override_reason?: string | null
          source_excerpt?: string | null
          transaction_id?: string | null
          tx_type_final?: string | null
          tx_type_proposed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "securities_classifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_classifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "securities_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      securities_documents: {
        Row: {
          company_id: string
          document_type: string
          file_name: string
          holding_id: string | null
          id: string
          notes: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          valuation_amount: number | null
          valuation_date: string | null
        }
        Insert: {
          company_id: string
          document_type?: string
          file_name: string
          holding_id?: string | null
          id?: string
          notes?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          valuation_amount?: number | null
          valuation_date?: string | null
        }
        Update: {
          company_id?: string
          document_type?: string
          file_name?: string
          holding_id?: string | null
          id?: string
          notes?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          valuation_amount?: number | null
          valuation_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "securities_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_documents_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "securities_holdings"
            referencedColumns: ["id"]
          },
        ]
      }
      securities_holdings: {
        Row: {
          acquisition_date: string | null
          avg_cost: number | null
          company_id: string
          created_at: string
          currency: string | null
          current_price: number | null
          current_value: number | null
          id: string
          is_naringsbetingad: boolean
          is_unlisted: boolean
          isin: string | null
          last_updated_at: string
          manual_valuation: number | null
          name: string
          ownership_percentage: number | null
          quantity: number
          securities_account_id: string
          ticker: string | null
          valuation_date: string | null
        }
        Insert: {
          acquisition_date?: string | null
          avg_cost?: number | null
          company_id: string
          created_at?: string
          currency?: string | null
          current_price?: number | null
          current_value?: number | null
          id?: string
          is_naringsbetingad?: boolean
          is_unlisted?: boolean
          isin?: string | null
          last_updated_at?: string
          manual_valuation?: number | null
          name: string
          ownership_percentage?: number | null
          quantity?: number
          securities_account_id: string
          ticker?: string | null
          valuation_date?: string | null
        }
        Update: {
          acquisition_date?: string | null
          avg_cost?: number | null
          company_id?: string
          created_at?: string
          currency?: string | null
          current_price?: number | null
          current_value?: number | null
          id?: string
          is_naringsbetingad?: boolean
          is_unlisted?: boolean
          isin?: string | null
          last_updated_at?: string
          manual_valuation?: number | null
          name?: string
          ownership_percentage?: number | null
          quantity?: number
          securities_account_id?: string
          ticker?: string | null
          valuation_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "securities_holdings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_holdings_securities_account_id_fkey"
            columns: ["securities_account_id"]
            isOneToOne: false
            referencedRelation: "securities_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      securities_statements: {
        Row: {
          company_id: string
          extracted_count: number | null
          file_name: string
          id: string
          parse_confidence: number | null
          parse_data: Json | null
          parse_error: string | null
          parse_status: string
          parsed_at: string | null
          period_end: string | null
          period_start: string | null
          securities_account_id: string | null
          source: string
          statement_type: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          extracted_count?: number | null
          file_name: string
          id?: string
          parse_confidence?: number | null
          parse_data?: Json | null
          parse_error?: string | null
          parse_status?: string
          parsed_at?: string | null
          period_end?: string | null
          period_start?: string | null
          securities_account_id?: string | null
          source?: string
          statement_type?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          extracted_count?: number | null
          file_name?: string
          id?: string
          parse_confidence?: number | null
          parse_data?: Json | null
          parse_error?: string | null
          parse_status?: string
          parsed_at?: string | null
          period_end?: string | null
          period_start?: string | null
          securities_account_id?: string | null
          source?: string
          statement_type?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "securities_statements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_statements_securities_account_id_fkey"
            columns: ["securities_account_id"]
            isOneToOne: false
            referencedRelation: "securities_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      securities_tax_calculations: {
        Row: {
          calculated_at: string
          calculation_data: Json | null
          calculation_type: string
          capital_base: number | null
          company_id: string
          created_at: string
          id: string
          journal_entry_id: string | null
          securities_account_id: string | null
          status: string
          tax_amount: number | null
          tax_rate: number | null
          tax_year: number
        }
        Insert: {
          calculated_at?: string
          calculation_data?: Json | null
          calculation_type: string
          capital_base?: number | null
          company_id: string
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          securities_account_id?: string | null
          status?: string
          tax_amount?: number | null
          tax_rate?: number | null
          tax_year: number
        }
        Update: {
          calculated_at?: string
          calculation_data?: Json | null
          calculation_type?: string
          capital_base?: number | null
          company_id?: string
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          securities_account_id?: string | null
          status?: string
          tax_amount?: number | null
          tax_rate?: number | null
          tax_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "securities_tax_calculations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_tax_calculations_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_tax_calculations_securities_account_id_fkey"
            columns: ["securities_account_id"]
            isOneToOne: false
            referencedRelation: "securities_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      securities_transactions: {
        Row: {
          ambiguity_notes: string | null
          amount: number
          classification_confidence: number | null
          company_id: string
          created_at: string
          currency: string | null
          duplicate_of_id: string | null
          fee: number | null
          fx_rate: number | null
          id: string
          isin: string | null
          journal_entry_id: string | null
          name: string | null
          notes: string | null
          price: number | null
          quantity: number | null
          review_status: string
          securities_account_id: string
          settlement_date: string | null
          source: string
          statement_id: string | null
          ticker: string | null
          trade_date: string
          transaction_type: string
        }
        Insert: {
          ambiguity_notes?: string | null
          amount: number
          classification_confidence?: number | null
          company_id: string
          created_at?: string
          currency?: string | null
          duplicate_of_id?: string | null
          fee?: number | null
          fx_rate?: number | null
          id?: string
          isin?: string | null
          journal_entry_id?: string | null
          name?: string | null
          notes?: string | null
          price?: number | null
          quantity?: number | null
          review_status?: string
          securities_account_id: string
          settlement_date?: string | null
          source?: string
          statement_id?: string | null
          ticker?: string | null
          trade_date: string
          transaction_type: string
        }
        Update: {
          ambiguity_notes?: string | null
          amount?: number
          classification_confidence?: number | null
          company_id?: string
          created_at?: string
          currency?: string | null
          duplicate_of_id?: string | null
          fee?: number | null
          fx_rate?: number | null
          id?: string
          isin?: string | null
          journal_entry_id?: string | null
          name?: string | null
          notes?: string | null
          price?: number | null
          quantity?: number | null
          review_status?: string
          securities_account_id?: string
          settlement_date?: string | null
          source?: string
          statement_id?: string | null
          ticker?: string | null
          trade_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "securities_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_transactions_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "securities_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_transactions_securities_account_id_fkey"
            columns: ["securities_account_id"]
            isOneToOne: false
            referencedRelation: "securities_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "securities_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      segregation_rules: {
        Row: {
          action_a: string
          action_b: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          action_a: string
          action_b: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          action_a?: string
          action_b?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "segregation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_agreements: {
        Row: {
          content: string
          created_at: string
          effective_date: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      service_contracts: {
        Row: {
          ai_pricing_suggestion: Json | null
          billing_interval: string
          churn_risk_factors: Json | null
          churn_risk_score: number | null
          company_id: string
          contract_number: string
          created_at: string
          created_by: string
          currency: string
          customer_id: string | null
          description: string | null
          end_date: string | null
          id: string
          indexation_applied_at: string | null
          indexation_enabled: boolean | null
          indexation_percent: number | null
          indexation_type: string | null
          last_invoice_date: string | null
          next_invoice_date: string | null
          notes: string | null
          notice_period_days: number | null
          renewal_type: string
          start_date: string
          status: string
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          ai_pricing_suggestion?: Json | null
          billing_interval?: string
          churn_risk_factors?: Json | null
          churn_risk_score?: number | null
          company_id: string
          contract_number: string
          created_at?: string
          created_by: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          indexation_applied_at?: string | null
          indexation_enabled?: boolean | null
          indexation_percent?: number | null
          indexation_type?: string | null
          last_invoice_date?: string | null
          next_invoice_date?: string | null
          notes?: string | null
          notice_period_days?: number | null
          renewal_type?: string
          start_date: string
          status?: string
          title: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          ai_pricing_suggestion?: Json | null
          billing_interval?: string
          churn_risk_factors?: Json | null
          churn_risk_score?: number | null
          company_id?: string
          contract_number?: string
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          indexation_applied_at?: string | null
          indexation_enabled?: boolean | null
          indexation_percent?: number | null
          indexation_type?: string | null
          last_invoice_date?: string | null
          next_invoice_date?: string | null
          notes?: string | null
          notice_period_days?: number | null
          renewal_type?: string
          start_date?: string
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shareholders: {
        Row: {
          acquisition_date: string | null
          acquisition_price: number | null
          company_id: string
          created_at: string | null
          id: string
          name: string
          personal_org_number: string | null
          share_class: string | null
          shares: number | null
          updated_at: string | null
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_price?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          personal_org_number?: string | null
          share_class?: string | null
          shares?: number | null
          updated_at?: string | null
        }
        Update: {
          acquisition_date?: string | null
          acquisition_price?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          personal_org_number?: string | null
          share_class?: string | null
          shares?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shareholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sie_account_mapping_history: {
        Row: {
          account_name: string | null
          account_number: string
          company_id: string
          confidence: number
          created_at: string
          created_by: string | null
          id: string
          mapped_row_code: string | null
          mapped_row_id: string | null
          reason: string | null
          session_id: string | null
          source: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          company_id: string
          confidence?: number
          created_at?: string
          created_by?: string | null
          id?: string
          mapped_row_code?: string | null
          mapped_row_id?: string | null
          reason?: string | null
          session_id?: string | null
          source: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          company_id?: string
          confidence?: number
          created_at?: string
          created_by?: string | null
          id?: string
          mapped_row_code?: string | null
          mapped_row_id?: string | null
          reason?: string | null
          session_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "sie_account_mapping_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sie_account_mapping_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sie_import_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sie_import_sessions: {
        Row: {
          committed_at: string | null
          company_id: string
          company_name: string | null
          created_at: string
          created_by: string
          error_message: string | null
          file_hash: string
          file_name: string
          file_size_bytes: number | null
          fiscal_year_end: string | null
          fiscal_year_start: string | null
          id: string
          mapping_summary: Json | null
          org_number: string | null
          parsed_summary: Json | null
          sie_type: string | null
          status: string
          validation_report: Json | null
        }
        Insert: {
          committed_at?: string | null
          company_id: string
          company_name?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          file_hash: string
          file_name: string
          file_size_bytes?: number | null
          fiscal_year_end?: string | null
          fiscal_year_start?: string | null
          id?: string
          mapping_summary?: Json | null
          org_number?: string | null
          parsed_summary?: Json | null
          sie_type?: string | null
          status?: string
          validation_report?: Json | null
        }
        Update: {
          committed_at?: string | null
          company_id?: string
          company_name?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          file_hash?: string
          file_name?: string
          file_size_bytes?: number | null
          fiscal_year_end?: string | null
          fiscal_year_start?: string | null
          id?: string
          mapping_summary?: Json | null
          org_number?: string | null
          parsed_summary?: Json | null
          sie_type?: string | null
          status?: string
          validation_report?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sie_import_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_envelopes: {
        Row: {
          cancelled_at: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          document_title: string
          document_type: string
          file_url: string | null
          id: string
          payload: Json | null
          public_token: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          scrive_document_id: string | null
          sent_at: string | null
          signatories: Json | null
          signed_file_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          document_title: string
          document_type: string
          file_url?: string | null
          id?: string
          payload?: Json | null
          public_token?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scrive_document_id?: string | null
          sent_at?: string | null
          signatories?: Json | null
          signed_file_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          document_title?: string
          document_type?: string
          file_url?: string | null
          id?: string
          payload?: Json | null
          public_token?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scrive_document_id?: string | null
          sent_at?: string | null
          signatories?: Json | null
          signed_file_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signing_envelopes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      skatteverket_credentials: {
        Row: {
          client_id: string
          client_secret_encrypted: string
          company_id: string
          created_at: string
          created_by: string
          environment: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          client_secret_encrypted: string
          company_id: string
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret_encrypted?: string
          company_id?: string
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skatteverket_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      skv_payment_obligations: {
        Row: {
          amount: number
          auto_pay_enabled: boolean
          company_id: string
          created_at: string
          due_date: string
          id: string
          journal_entry_id: string | null
          last_reminder_sent_at: string | null
          notes: string | null
          ocr_reference: string | null
          payment_id: string | null
          payment_type: string
          period: string
          reminder_stage: string | null
          source_ref: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          auto_pay_enabled?: boolean
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          journal_entry_id?: string | null
          last_reminder_sent_at?: string | null
          notes?: string | null
          ocr_reference?: string | null
          payment_id?: string | null
          payment_type: string
          period: string
          reminder_stage?: string | null
          source_ref?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_pay_enabled?: boolean
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          journal_entry_id?: string | null
          last_reminder_sent_at?: string | null
          notes?: string | null
          ocr_reference?: string | null
          payment_id?: string | null
          payment_type?: string
          period?: string
          reminder_stage?: string | null
          source_ref?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skv_payment_obligations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skv_payment_obligations_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_usage: {
        Row: {
          company_id: string
          created_at: string
          id: string
          month: string
          sms_budget: number
          sms_count: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          month: string
          sms_budget?: number
          sms_count?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          month?: string
          sms_budget?: number
          sms_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_cost_imports: {
        Row: {
          actual_cost: number | null
          company_id: string
          created_at: string
          id: string
          imported_at: string
          period_month: string
          scheduled_cost: number | null
          source: string
          total_cost: number
          total_hours: number
        }
        Insert: {
          actual_cost?: number | null
          company_id: string
          created_at?: string
          id?: string
          imported_at?: string
          period_month: string
          scheduled_cost?: number | null
          source?: string
          total_cost?: number
          total_hours?: number
        }
        Update: {
          actual_cost?: number | null
          company_id?: string
          created_at?: string
          id?: string
          imported_at?: string
          period_month?: string
          scheduled_cost?: number | null
          source?: string
          total_cost?: number
          total_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_cost_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string
          end_date: string | null
          environment: string | null
          id: string
          metadata: Json | null
          monthly_price: number
          product_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          end_date?: string | null
          environment?: string | null
          id?: string
          metadata?: Json | null
          monthly_price: number
          product_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          end_date?: string | null
          environment?: string | null
          id?: string
          metadata?: Json | null
          monthly_price?: number
          product_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contracts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          monthly_amount: number
          notes: string | null
          supplier_id: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          monthly_amount: number
          notes?: string | null
          supplier_id?: string | null
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          monthly_amount?: number
          notes?: string | null
          supplier_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_profiles: {
        Row: {
          avg_amount: number | null
          avg_amount_12m: number | null
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          first_seen_at: string
          flagged: boolean | null
          id: string
          invoice_count: number
          is_confirmed: boolean
          known_bg_pg: string[] | null
          last_amount: number | null
          last_bg: string | null
          last_iban: string | null
          last_invoice_date: string | null
          last_seen_at: string
          metadata: Json
          org_number: string | null
          stddev_amount_12m: number | null
          supplier_id: string | null
          supplier_name: string
          typical_interval_days: number | null
          updated_at: string
        }
        Insert: {
          avg_amount?: number | null
          avg_amount_12m?: number | null
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          first_seen_at?: string
          flagged?: boolean | null
          id?: string
          invoice_count?: number
          is_confirmed?: boolean
          known_bg_pg?: string[] | null
          last_amount?: number | null
          last_bg?: string | null
          last_iban?: string | null
          last_invoice_date?: string | null
          last_seen_at?: string
          metadata?: Json
          org_number?: string | null
          stddev_amount_12m?: number | null
          supplier_id?: string | null
          supplier_name: string
          typical_interval_days?: number | null
          updated_at?: string
        }
        Update: {
          avg_amount?: number | null
          avg_amount_12m?: number | null
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          first_seen_at?: string
          flagged?: boolean | null
          id?: string
          invoice_count?: number
          is_confirmed?: boolean
          known_bg_pg?: string[] | null
          last_amount?: number | null
          last_bg?: string | null
          last_iban?: string | null
          last_invoice_date?: string | null
          last_seen_at?: string
          metadata?: Json
          org_number?: string | null
          stddev_amount_12m?: number | null
          supplier_id?: string | null
          supplier_name?: string
          typical_interval_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_profiles_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_profiles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_name: string | null
          bankgiro: string | null
          bic: string | null
          category: string | null
          city: string | null
          company_id: string
          counterparty_type: string
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          default_account_id: string | null
          default_expense_account: string | null
          default_expense_account_id: string | null
          default_vat_code: string | null
          default_vat_rate: number | null
          email: string | null
          general_email: string | null
          gln: string | null
          iban: string | null
          id: string
          internal_reference: string | null
          is_active: boolean | null
          name: string
          notes: string | null
          org_number: string | null
          payment_terms_days: number | null
          peppol_id: string | null
          phone: string | null
          plusgiro: string | null
          postal_code: string | null
          reference: string | null
          source: string
          street: string | null
          supplier_id_label: string | null
          supplier_number: string | null
          updated_at: string | null
          vat_account_id: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bankgiro?: string | null
          bic?: string | null
          category?: string | null
          city?: string | null
          company_id: string
          counterparty_type?: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          default_account_id?: string | null
          default_expense_account?: string | null
          default_expense_account_id?: string | null
          default_vat_code?: string | null
          default_vat_rate?: number | null
          email?: string | null
          general_email?: string | null
          gln?: string | null
          iban?: string | null
          id?: string
          internal_reference?: string | null
          is_active?: boolean | null
          name: string
          notes?: string | null
          org_number?: string | null
          payment_terms_days?: number | null
          peppol_id?: string | null
          phone?: string | null
          plusgiro?: string | null
          postal_code?: string | null
          reference?: string | null
          source?: string
          street?: string | null
          supplier_id_label?: string | null
          supplier_number?: string | null
          updated_at?: string | null
          vat_account_id?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bankgiro?: string | null
          bic?: string | null
          category?: string | null
          city?: string | null
          company_id?: string
          counterparty_type?: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          default_account_id?: string | null
          default_expense_account?: string | null
          default_expense_account_id?: string | null
          default_vat_code?: string | null
          default_vat_rate?: number | null
          email?: string | null
          general_email?: string | null
          gln?: string | null
          iban?: string | null
          id?: string
          internal_reference?: string | null
          is_active?: boolean | null
          name?: string
          notes?: string | null
          org_number?: string | null
          payment_terms_days?: number | null
          peppol_id?: string | null
          phone?: string | null
          plusgiro?: string | null
          postal_code?: string | null
          reference?: string | null
          source?: string
          street?: string | null
          supplier_id_label?: string | null
          supplier_number?: string | null
          updated_at?: string | null
          vat_account_id?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_default_expense_account_id_fkey"
            columns: ["default_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_vat_account_id_fkey"
            columns: ["vat_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_incidents: {
        Row: {
          actions_taken: Json | null
          classification: string | null
          company_id: string | null
          context: Json | null
          created_at: string
          error_message: string | null
          escalated: boolean
          id: string
          incident_type: string
          module: string | null
          outcome: string | null
          user_id: string | null
        }
        Insert: {
          actions_taken?: Json | null
          classification?: string | null
          company_id?: string | null
          context?: Json | null
          created_at?: string
          error_message?: string | null
          escalated?: boolean
          id?: string
          incident_type: string
          module?: string | null
          outcome?: string | null
          user_id?: string | null
        }
        Update: {
          actions_taken?: Json | null
          classification?: string | null
          company_id?: string | null
          context?: Json | null
          created_at?: string
          error_message?: string | null
          escalated?: boolean
          id?: string
          incident_type?: string
          module?: string | null
          outcome?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      swish_connections: {
        Row: {
          bank_name: string | null
          certificate_uploaded: boolean
          company_id: string
          connection_type: string
          created_at: string
          id: string
          is_active: boolean
          merchant_number: string | null
          updated_at: string
        }
        Insert: {
          bank_name?: string | null
          certificate_uploaded?: boolean
          company_id: string
          connection_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_number?: string | null
          updated_at?: string
        }
        Update: {
          bank_name?: string | null
          certificate_uploaded?: boolean
          company_id?: string
          connection_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swish_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      swish_payment_requests: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          expired_at: string | null
          id: string
          invoice_id: string | null
          message: string | null
          paid_at: string | null
          phone_number: string
          sent_at: string | null
          status: string
          swish_request_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          expired_at?: string | null
          id?: string
          invoice_id?: string | null
          message?: string | null
          paid_at?: string | null
          phone_number: string
          sent_at?: string | null
          status?: string
          swish_request_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          expired_at?: string | null
          id?: string
          invoice_id?: string | null
          message?: string | null
          paid_at?: string | null
          phone_number?: string
          sent_at?: string | null
          status?: string
          swish_request_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swish_payment_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swish_payment_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      swish_payments: {
        Row: {
          amount: number
          booked: boolean
          company_id: string
          created_at: string
          currency: string
          id: string
          journal_entry_id: string | null
          match_confidence: number | null
          match_status: string
          matched_invoice_id: string | null
          message: string | null
          payment_date: string
          sender_name: string | null
          sender_phone: string | null
          swish_connection_id: string | null
          swish_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          booked?: boolean
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          journal_entry_id?: string | null
          match_confidence?: number | null
          match_status?: string
          matched_invoice_id?: string | null
          message?: string | null
          payment_date?: string
          sender_name?: string | null
          sender_phone?: string | null
          swish_connection_id?: string | null
          swish_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booked?: boolean
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          journal_entry_id?: string | null
          match_confidence?: number | null
          match_status?: string
          matched_invoice_id?: string | null
          message?: string | null
          payment_date?: string
          sender_name?: string | null
          sender_phone?: string | null
          swish_connection_id?: string | null
          swish_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swish_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swish_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swish_payments_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swish_payments_swish_connection_id_fkey"
            columns: ["swish_connection_id"]
            isOneToOne: false
            referencedRelation: "swish_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          company_id: string
          duration_ms: number | null
          errors: Json | null
          id: string
          orders_booked: number | null
          orders_fetched: number | null
          platform: string
          synced_at: string
        }
        Insert: {
          company_id: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          orders_booked?: number | null
          orders_fetched?: number | null
          platform: string
          synced_at?: string
        }
        Update: {
          company_id?: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          orders_booked?: number | null
          orders_fetched?: number | null
          platform?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_action_log: {
        Row: {
          action_type: string
          company_id: string
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          result: Json | null
          reversible_until: string | null
          source_module: string
          status: string
          target_module: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          company_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          reversible_until?: string | null
          source_module: string
          status?: string
          target_module: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          company_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          reversible_until?: string | null
          source_module?: string
          status?: string
          target_module?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_action_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_logs: {
        Row: {
          created_at: string
          fixes: Json | null
          id: string
          status: string
          tests: Json | null
          timestamp: string
        }
        Insert: {
          created_at?: string
          fixes?: Json | null
          id?: string
          status: string
          tests?: Json | null
          timestamp?: string
        }
        Update: {
          created_at?: string
          fixes?: Json | null
          id?: string
          status?: string
          tests?: Json | null
          timestamp?: string
        }
        Relationships: []
      }
      system_secrets: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value_encrypted: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value_encrypted: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value_encrypted?: string
        }
        Relationships: []
      }
      tax_account_entries: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          description: string | null
          entry_date: string
          id: string
          reference: string | null
          type: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          description?: string | null
          entry_date: string
          id?: string
          reference?: string | null
          type: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          reference?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_account_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_declaration_adjustments: {
        Row: {
          adjusted_at: string
          adjusted_by: string
          adjusted_value: number | null
          adjustment_reason: string | null
          declaration_id: string
          field_code: string
          id: string
          original_ai_value: number | null
        }
        Insert: {
          adjusted_at?: string
          adjusted_by: string
          adjusted_value?: number | null
          adjustment_reason?: string | null
          declaration_id: string
          field_code: string
          id?: string
          original_ai_value?: number | null
        }
        Update: {
          adjusted_at?: string
          adjusted_by?: string
          adjusted_value?: number | null
          adjustment_reason?: string | null
          declaration_id?: string
          field_code?: string
          id?: string
          original_ai_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_declaration_adjustments_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "tax_declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_declarations: {
        Row: {
          ai_confidence_score: number | null
          ai_prepared_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          data: Json
          declaration_type: string
          id: string
          notes: string | null
          period: string | null
          skatteverket_reference: string | null
          status: string
          submitted_at: string | null
          tax_year: number
          updated_at: string
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_prepared_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          data?: Json
          declaration_type: string
          id?: string
          notes?: string | null
          period?: string | null
          skatteverket_reference?: string | null
          status?: string
          submitted_at?: string | null
          tax_year: number
          updated_at?: string
        }
        Update: {
          ai_confidence_score?: number | null
          ai_prepared_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          declaration_type?: string
          id?: string
          notes?: string | null
          period?: string | null
          skatteverket_reference?: string | null
          status?: string
          submitted_at?: string | null
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_declarations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_form_catalog: {
        Row: {
          ai_supported: boolean
          auto_fetch: boolean
          category: string
          created_at: string
          deadline_rule: Json | null
          entity_types: Json
          form_code: string
          id: string
          name_sv: string
          relevance_rule: string | null
          requires_forms: Json | null
          skv_number: string
          updated_at: string
        }
        Insert: {
          ai_supported?: boolean
          auto_fetch?: boolean
          category: string
          created_at?: string
          deadline_rule?: Json | null
          entity_types?: Json
          form_code: string
          id?: string
          name_sv: string
          relevance_rule?: string | null
          requires_forms?: Json | null
          skv_number: string
          updated_at?: string
        }
        Update: {
          ai_supported?: boolean
          auto_fetch?: boolean
          category?: string
          created_at?: string
          deadline_rule?: Json | null
          entity_types?: Json
          form_code?: string
          id?: string
          name_sv?: string
          relevance_rule?: string | null
          requires_forms?: Json | null
          skv_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_mandates: {
        Row: {
          company_id: string
          consent_given_at: string
          consent_ip_address: string | null
          consent_text: string
          created_at: string
          id: string
          mandate_type: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          skatteverket_mandate_id: string | null
          skatteverket_status: string | null
          status: string
          updated_at: string
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          consent_given_at?: string
          consent_ip_address?: string | null
          consent_text: string
          created_at?: string
          id?: string
          mandate_type: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          skatteverket_mandate_id?: string | null
          skatteverket_status?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          consent_given_at?: string
          consent_ip_address?: string | null
          consent_text?: string
          created_at?: string
          id?: string
          mandate_type?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          skatteverket_mandate_id?: string | null
          skatteverket_status?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_mandates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_reserves: {
        Row: {
          account_number: string | null
          amount: number
          company_id: string
          created_at: string
          id: string
          must_reverse_by: string | null
          status: string
          type: string
          updated_at: string
          year_set: number
        }
        Insert: {
          account_number?: string | null
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          must_reverse_by?: string | null
          status?: string
          type: string
          updated_at?: string
          year_set: number
        }
        Update: {
          account_number?: string | null
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          must_reverse_by?: string | null
          status?: string
          type?: string
          updated_at?: string
          year_set?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_reserves_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rules: {
        Row: {
          base_amount: number | null
          created_at: string | null
          effective_from: string
          effective_to: string | null
          id: string
          municipality: string | null
          percentage: number | null
          rate: string | null
          rule_type: string
          threshold_max: number | null
          threshold_min: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          base_amount?: number | null
          created_at?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          municipality?: string | null
          percentage?: number | null
          rate?: string | null
          rule_type: string
          threshold_max?: number | null
          threshold_min?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          base_amount?: number | null
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          municipality?: string | null
          percentage?: number | null
          rate?: string | null
          rule_type?: string
          threshold_max?: number | null
          threshold_min?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      tenant_ai_config: {
        Row: {
          ai_name: string
          ai_tone: string
          created_at: string
          explanation_mode_default: string
          intro_text: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_name?: string
          ai_tone?: string
          created_at?: string
          explanation_mode_default?: string
          intro_text?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_name?: string
          ai_tone?: string
          created_at?: string
          explanation_mode_default?: string
          intro_text?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          accent_color: string | null
          body_font: string
          created_at: string
          favicon_url: string | null
          heading_font: string
          logo_dark_url: string | null
          logo_url: string | null
          primary_color: string
          style_preset: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          body_font?: string
          created_at?: string
          favicon_url?: string | null
          heading_font?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          primary_color?: string
          style_preset?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          body_font?: string
          created_at?: string
          favicon_url?: string | null
          heading_font?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          primary_color?: string
          style_preset?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_feature_flags: {
        Row: {
          created_at: string
          enabled_ai_features: string[]
          enabled_export_types: string[]
          enabled_modules: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled_ai_features?: string[]
          enabled_export_types?: string[]
          enabled_modules?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled_ai_features?: string[]
          enabled_export_types?: string[]
          enabled_modules?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_login_config: {
        Row: {
          created_at: string
          footer_attribution: string | null
          headline: string
          show_bankid: boolean
          show_password_login: boolean
          subheadline: string | null
          support_email: string | null
          support_url: string | null
          tenant_id: string
          trust_bullets: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          footer_attribution?: string | null
          headline?: string
          show_bankid?: boolean
          show_password_login?: boolean
          subheadline?: string | null
          support_email?: string | null
          support_url?: string | null
          tenant_id: string
          trust_bullets?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          footer_attribution?: string | null
          headline?: string
          show_bankid?: boolean
          show_password_login?: boolean
          subheadline?: string | null
          support_email?: string | null
          support_url?: string | null
          tenant_id?: string
          trust_bullets?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_login_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string | null
          domain_status: string
          domain_verification_token: string | null
          domain_verified_at: string | null
          id: string
          locale: string
          name: string
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          domain_status?: string
          domain_verification_token?: string | null
          domain_verified_at?: string | null
          id?: string
          locale?: string
          name: string
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          domain_status?: string
          domain_verification_token?: string | null
          domain_verified_at?: string | null
          id?: string
          locale?: string
          name?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          billed_invoice_id: string | null
          client_name: string | null
          company_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          end_time: string | null
          entry_date: string
          hourly_rate: number | null
          id: string
          is_billable: boolean
          is_billed: boolean
          project_id: string | null
          rate_id: string | null
          start_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billed_invoice_id?: string | null
          client_name?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          entry_date?: string
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean
          is_billed?: boolean
          project_id?: string | null
          rate_id?: string | null
          start_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billed_invoice_id?: string | null
          client_name?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          entry_date?: string
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean
          is_billed?: boolean
          project_id?: string | null
          rate_id?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_billed_invoice_id_fkey"
            columns: ["billed_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_rates: {
        Row: {
          client_name: string | null
          company_id: string
          created_at: string
          hourly_rate: number
          id: string
          is_default: boolean
          project_id: string | null
          rate_label: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          company_id: string
          created_at?: string
          hourly_rate?: number
          id?: string
          is_default?: boolean
          project_id?: string | null
          rate_label?: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          company_id?: string
          created_at?: string
          hourly_rate?: number
          id?: string
          is_default?: boolean
          project_id?: string | null
          rate_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          company_id: string
          counterparty: string | null
          created_at: string
          currency: string
          description: string | null
          iban: string | null
          id: string
          reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          counterparty?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          iban?: string | null
          id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          counterparty?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          iban?: string | null
          id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agreements: {
        Row: {
          agreement_id: string
          bankid_name: string | null
          bankid_personal_number: string | null
          bankid_transaction_id: string | null
          company_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          pdf_url: string | null
          signature_method: string | null
          signed_at: string | null
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agreement_id: string
          bankid_name?: string | null
          bankid_personal_number?: string | null
          bankid_transaction_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          pdf_url?: string | null
          signature_method?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agreement_id?: string
          bankid_name?: string | null
          bankid_personal_number?: string | null
          bankid_transaction_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          pdf_url?: string | null
          signature_method?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agreements_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "service_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_date: string
          consent_given: boolean
          consent_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          consent_date?: string
          consent_given?: boolean
          consent_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          consent_date?: string
          consent_given?: boolean
          consent_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      user_error_tracking: {
        Row: {
          error_count: number | null
          error_message: string | null
          error_stack: string | null
          error_type: string
          first_seen_at: string
          id: string
          is_notified: boolean | null
          last_seen_at: string
          page_url: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          error_count?: number | null
          error_message?: string | null
          error_stack?: string | null
          error_type: string
          first_seen_at?: string
          id?: string
          is_notified?: boolean | null
          last_seen_at?: string
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          error_count?: number | null
          error_message?: string | null
          error_stack?: string | null
          error_type?: string
          first_seen_at?: string
          id?: string
          is_notified?: boolean | null
          last_seen_at?: string
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          company_id: string
          created_at: string
          granted_by: string | null
          id: string
          module: Database["public"]["Enums"]["app_module"]
          permission: Database["public"]["Enums"]["permission_level"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          permission?: Database["public"]["Enums"]["permission_level"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          permission?: Database["public"]["Enums"]["permission_level"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          module_order: Json | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_order?: Json | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_order?: Json | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_results: {
        Row: {
          company_id: string
          created_at: string
          difference_amount: number | null
          id: string
          message: string
          period_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          row_id: string | null
          severity: Database["public"]["Enums"]["validation_severity"]
          status: Database["public"]["Enums"]["validation_status"]
          supporting_refs_json: Json | null
          template_id: string | null
          updated_at: string
          validation_type: Database["public"]["Enums"]["validation_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          difference_amount?: number | null
          id?: string
          message: string
          period_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          row_id?: string | null
          severity?: Database["public"]["Enums"]["validation_severity"]
          status?: Database["public"]["Enums"]["validation_status"]
          supporting_refs_json?: Json | null
          template_id?: string | null
          updated_at?: string
          validation_type: Database["public"]["Enums"]["validation_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          difference_amount?: number | null
          id?: string
          message?: string
          period_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          row_id?: string | null
          severity?: Database["public"]["Enums"]["validation_severity"]
          status?: Database["public"]["Enums"]["validation_status"]
          supporting_refs_json?: Json | null
          template_id?: string | null
          updated_at?: string
          validation_type?: Database["public"]["Enums"]["validation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "validation_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_results_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_results_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "report_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_results_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_rules: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          rule_key: string
          rule_type: string
          rule_value: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          rule_key: string
          rule_type: string
          rule_value: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          rule_key?: string
          rule_type?: string
          rule_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_ai_reviews: {
        Row: {
          company_id: string
          confidence: number
          confidence_breakdown: Json
          created_at: string
          created_by: string | null
          findings: Json
          id: string
          model_used: string | null
          period_end: string | null
          period_label: string
          period_start: string | null
          recommendation: string | null
          summary: string
          vat_data_snapshot: Json | null
          verdict: string
        }
        Insert: {
          company_id: string
          confidence?: number
          confidence_breakdown?: Json
          created_at?: string
          created_by?: string | null
          findings?: Json
          id?: string
          model_used?: string | null
          period_end?: string | null
          period_label: string
          period_start?: string | null
          recommendation?: string | null
          summary: string
          vat_data_snapshot?: Json | null
          verdict: string
        }
        Update: {
          company_id?: string
          confidence?: number
          confidence_breakdown?: Json
          created_at?: string
          created_by?: string | null
          findings?: Json
          id?: string
          model_used?: string | null
          period_end?: string | null
          period_label?: string
          period_start?: string | null
          recommendation?: string | null
          summary?: string
          vat_data_snapshot?: Json | null
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "vat_ai_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_box_overrides: {
        Row: {
          box: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          original_value: number
          override_value: number
          period_label: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          box: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          original_value: number
          override_value: number
          period_label: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          box?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          original_value?: number
          override_value?: number
          period_label?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vat_box_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_declarations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bankid_personal_number_masked: string | null
          bankid_signature: string | null
          calculated_at: string | null
          company_id: string
          created_at: string
          eskd_xml_path: string | null
          eu_purchases: number | null
          eu_sales: number | null
          filed_at: string | null
          id: string
          import_purchases: number | null
          input_vat: number | null
          output_vat_12: number | null
          output_vat_25: number | null
          output_vat_6: number | null
          period_month: number | null
          period_quarter: number | null
          period_type: string
          period_year: number
          sales_0_percent: number | null
          sales_12_percent: number | null
          sales_25_percent: number | null
          sales_6_percent: number | null
          skatteverket_reference: string | null
          skatteverket_response: Json | null
          skv_receipt: Json | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          vat_to_pay: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bankid_personal_number_masked?: string | null
          bankid_signature?: string | null
          calculated_at?: string | null
          company_id: string
          created_at?: string
          eskd_xml_path?: string | null
          eu_purchases?: number | null
          eu_sales?: number | null
          filed_at?: string | null
          id?: string
          import_purchases?: number | null
          input_vat?: number | null
          output_vat_12?: number | null
          output_vat_25?: number | null
          output_vat_6?: number | null
          period_month?: number | null
          period_quarter?: number | null
          period_type?: string
          period_year: number
          sales_0_percent?: number | null
          sales_12_percent?: number | null
          sales_25_percent?: number | null
          sales_6_percent?: number | null
          skatteverket_reference?: string | null
          skatteverket_response?: Json | null
          skv_receipt?: Json | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          vat_to_pay?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bankid_personal_number_masked?: string | null
          bankid_signature?: string | null
          calculated_at?: string | null
          company_id?: string
          created_at?: string
          eskd_xml_path?: string | null
          eu_purchases?: number | null
          eu_sales?: number | null
          filed_at?: string | null
          id?: string
          import_purchases?: number | null
          input_vat?: number | null
          output_vat_12?: number | null
          output_vat_25?: number | null
          output_vat_6?: number | null
          period_month?: number | null
          period_quarter?: number | null
          period_type?: string
          period_year?: number
          sales_0_percent?: number | null
          sales_12_percent?: number | null
          sales_25_percent?: number | null
          sales_6_percent?: number | null
          skatteverket_reference?: string | null
          skatteverket_response?: Json | null
          skv_receipt?: Json | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          vat_to_pay?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vat_declarations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_periods: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          period_type: string
          reference_number: string | null
          ruta_values: Json | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          period_type: string
          reference_number?: string | null
          ruta_values?: Json | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          reference_number?: string | null
          ruta_values?: Json | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vat_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_settlements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          direction: string
          id: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          payment_journal_entry_id: string | null
          period_label: string | null
          settlement_journal_entry_id: string | null
          status: string
          updated_at: string
          vat_declaration_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          direction: string
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          payment_journal_entry_id?: string | null
          period_label?: string | null
          settlement_journal_entry_id?: string | null
          status?: string
          updated_at?: string
          vat_declaration_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          direction?: string
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          payment_journal_entry_id?: string | null
          period_label?: string | null
          settlement_journal_entry_id?: string | null
          status?: string
          updated_at?: string
          vat_declaration_id?: string | null
        }
        Relationships: []
      }
      view_dismissed_insights: {
        Row: {
          dismissed_at: string
          insight_key: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          insight_key: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          insight_key?: string
          user_id?: string
        }
        Relationships: []
      }
      view_usage_log: {
        Row: {
          company_id: string
          id: string
          opened_at: string
          payload: Json
          route: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          opened_at?: string
          payload?: Json
          route: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          opened_at?: string
          payload?: Json
          route?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "view_usage_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      visma_connections: {
        Row: {
          access_token: string
          company_id: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          scopes: string | null
          updated_at: string
          visma_company_id: string | null
        }
        Insert: {
          access_token: string
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          scopes?: string | null
          updated_at?: string
          visma_company_id?: string | null
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          scopes?: string | null
          updated_at?: string
          visma_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visma_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      visma_oauth_states: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string
          state: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visma_oauth_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          source: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string | null
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          events: string[] | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          events?: string[] | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          events?: string[] | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ar_company_id: { Args: { _ar_id: string }; Returns: string }
      auto_generate_matching_rules: {
        Args: { _company_id: string }
        Returns: number
      }
      calculate_vacation_pay: {
        Args: {
          p_employment_type: string
          p_gross_salary: number
          p_vacation_pay_percentage: number
        }
        Returns: number
      }
      can_read_bureau_client_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      check_company_already_registered: {
        Args: { _org_number: string }
        Returns: {
          company_id: string
          company_name: string
          exists_already: boolean
        }[]
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_limit_per_minute?: number
          p_user_id: string
        }
        Returns: boolean
      }
      check_segregation: {
        Args: {
          p_action: string
          p_company_id: string
          p_entity_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      cleanup_orphaned_sie_import_entries: {
        Args: { _company_id: string }
        Returns: number
      }
      current_user_email: { Args: never; Returns: string }
      dashboard_financials: {
        Args: { p_company_id: string; p_from: string; p_to: string }
        Returns: {
          bruttomarginal: number
          ksv: number
          likvida: number
          omsattning: number
          ovriga: number
          resultat: number
        }[]
      }
      decrypt_employee_pii: { Args: { ciphertext: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      encrypt_employee_pii: { Args: { plaintext: string }; Returns: string }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_matching_entry_for_receipt:
        | {
            Args: {
              p_amount: number
              p_company_id: string
              p_date: string
              p_document_id: string
            }
            Returns: {
              journal_entry_id: string
              match_reason: string
              match_score: number
            }[]
          }
        | {
            Args: {
              p_amount: number
              p_company_id: string
              p_date: string
              p_description?: string
              p_document_id: string
            }
            Returns: {
              journal_entry_id: string
              match_reason: string
              match_score: number
            }[]
          }
      generate_project_code: { Args: { p_company_id: string }; Returns: string }
      get_account_suggestions: {
        Args: { _amount?: number; _company_id: string; _description: string }
        Returns: {
          account_id: string
          account_name: string
          account_number: string
          confidence: number
          reason: string
          usage_count: number
        }[]
      }
      get_ai_learning_data: {
        Args: { _company_id: string; _limit?: number }
        Returns: {
          avg_confidence: number
          correction_count: number
          last_used: string
          pattern: string
          suggested_account: string
          suggested_account_name: string
        }[]
      }
      get_bank_account_full_details: {
        Args: { p_bank_account_id: string }
        Returns: {
          account_name: string
          account_number: string
          balance: number
          bank_name: string
          currency: string
          iban: string
          id: string
        }[]
      }
      get_bureau_client_financials: {
        Args: { _company_id: string }
        Returns: {
          accounts_payable_amount: number
          accounts_receivable_amount: number
          annual_revenue_12m: number
          cash_balance: number
          current_month_costs: number
          current_month_result: number
          current_month_revenue: number
          dso_days: number
          gross_margin_pct: number
          input_vat: number
          last_bookkeeping_date: string
          missing_receipts_count: number
          output_vat: number
          overdue_customer_invoices_amount: number
          overdue_customer_invoices_count: number
          overdue_supplier_invoices_amount: number
          overdue_supplier_invoices_count: number
          unreconciled_transactions: number
          vat_amount_due: number
          vat_next_deadline: string
        }[]
      }
      get_client_revenues: {
        Args: { company_ids: string[] }
        Returns: {
          company_id: string
          revenue: number
        }[]
      }
      get_company_member_profiles: {
        Args: { _company_id: string; _user_ids: string[] }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_effective_subscription: {
        Args: { _company_id: string }
        Returns: {
          billing_company_name: string
          group_id: string
          group_name: string
          is_group_subscription: boolean
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
        }[]
      }
      get_employee_pii: {
        Args: { p_employee_id: string }
        Returns: {
          bank_account: string
          personal_number: string
        }[]
      }
      get_signing_envelope_by_token: {
        Args: { _token: string }
        Returns: {
          completed_at: string
          document_title: string
          document_type: string
          id: string
          payload: Json
          sent_at: string
          signatories: Json
          status: string
        }[]
      }
      has_annual_report_access: {
        Args: { _annual_report_id: string; _user_id: string }
        Returns: boolean
      }
      has_company_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_company_edit_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_company_membership: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_consent: {
        Args: { p_consent_type: string; p_user_id: string }
        Returns: boolean
      }
      has_feature: {
        Args: { _company_id: string; _feature: string }
        Returns: boolean
      }
      has_module_permission: {
        Args: {
          _company_id: string
          _module: Database["public"]["Enums"]["app_module"]
          _required_level: Database["public"]["Enums"]["permission_level"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _company_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_sie_journal_entry: {
        Args: {
          _approved?: boolean
          _company_id: string
          _created_by: string
          _description: string
          _entry_date: string
          _journal_number: string
          _lines: Json
          _series_code: string
          _series_number: number
          _session_id: string
        }
        Returns: Json
      }
      is_company_member:
        | { Args: { _company_id: string }; Returns: boolean }
        | { Args: { _company_id: string; _user_id: string }; Returns: boolean }
      is_firm_admin: {
        Args: { _firm_id: string; _user_id: string }
        Returns: boolean
      }
      is_firm_member: {
        Args: { _firm_id: string; _user_id: string }
        Returns: boolean
      }
      is_firm_member_for_company: {
        Args: { _company_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      link_receipt_to_entry: {
        Args: {
          p_confidence?: number
          p_document_id: string
          p_journal_entry_id: string
          p_method?: string
        }
        Returns: boolean
      }
      log_data_access: {
        Args: {
          p_action: string
          p_data_categories: string[]
          p_entity_id: string
          p_entity_type: string
          p_legal_basis?: string
          p_purpose?: string
          p_user_id: string
        }
        Returns: string
      }
      mask_bank_account: { Args: { bank_account: string }; Returns: string }
      mask_iban: { Args: { iban: string }; Returns: string }
      mask_personal_number: {
        Args: { personal_number: string }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalized_org_number: { Args: { _org: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      seed_bas_2026_accounts: {
        Args: { p_company_id: string }
        Returns: number
      }
      seed_default_ai_agents: {
        Args: { p_company_id: string }
        Returns: number
      }
      seed_skv_matching_rules: {
        Args: { p_company_id: string }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_can_access_company_accruals: {
        Args: { _company_id: string }
        Returns: boolean
      }
      user_can_delete_company_accruals: {
        Args: { _company_id: string }
        Returns: boolean
      }
      user_owns_consolidation_period: {
        Args: { _period_id: string; _user_id: string }
        Returns: boolean
      }
      validate_agi_submission: {
        Args: { p_payroll_run_id: string }
        Returns: {
          employee_count: number
          is_valid: boolean
          total_gross: number
          total_social_fees: number
          total_tax: number
          validation_errors: string[]
        }[]
      }
      validate_journal_balance: {
        Args: { p_journal_entry_id: string }
        Returns: {
          difference: number
          is_valid: boolean
          total_credit: number
          total_debit: number
          validation_errors: string[]
        }[]
      }
      validate_vat_declaration: {
        Args: { p_declaration_id: string }
        Returns: {
          calculated_input_vat: number
          calculated_output_vat: number
          calculated_vat_to_pay: number
          is_valid: boolean
          validation_errors: string[]
        }[]
      }
    }
    Enums: {
      account_mapping_scope:
        | "single_company"
        | "group"
        | "all"
        | "tenant_specific"
      account_mapping_type:
        | "actual"
        | "budget"
        | "forecast"
        | "tax"
        | "management"
      app_module:
        | "invoices"
        | "bookkeeping"
        | "payroll"
        | "bank"
        | "reports"
        | "tax"
        | "employees"
        | "settings"
        | "consolidation"
      app_role:
        | "owner"
        | "cfo"
        | "accountant"
        | "auditor"
        | "limited_user"
        | "kam"
        | "admin"
        | "payroll"
        | "project_manager"
        | "board_member"
      cfo_action_status: "pending" | "executed" | "failed" | "reverted"
      cfo_action_type:
        | "create_accrual"
        | "send_reminder"
        | "reclassify"
        | "apply_deferral"
        | "generate_report"
      cfo_automation_mode: "manual" | "assisted" | "autonomous"
      cfo_context_type: "kpi" | "benchmark" | "scenario" | "action" | "general"
      cfo_message_role: "user" | "assistant" | "system"
      cfo_persona_mode: "business_owner" | "accountant"
      cfo_pref_dimension:
        | "growth_bias"
        | "cost_focus"
        | "risk_appetite"
        | "tone"
      client_request_module:
        | "tasks"
        | "vat"
        | "agi"
        | "supplier_invoice"
        | "annual_report"
        | "tax"
        | "other"
      client_request_status: "requested" | "received" | "resolved" | "cancelled"
      client_request_type:
        | "receipt"
        | "invoice"
        | "payroll"
        | "signature"
        | "clarification"
        | "other"
      consolidation_adjustment_source: "manual" | "ai_suggestion" | "recurring"
      consolidation_adjustment_status: "draft" | "applied" | "reverted"
      consolidation_adjustment_type:
        | "goodwill"
        | "fair_value"
        | "nci"
        | "reclassification"
        | "fx_translation"
        | "unrealized_profit"
        | "group_correction"
        | "manual_override"
      consolidation_suggestion_status:
        | "pending"
        | "accepted"
        | "dismissed"
        | "applied"
      consolidation_suggestion_type:
        | "elimination"
        | "goodwill"
        | "nci"
        | "fx_adjustment"
        | "unrealized_profit"
        | "reclassification"
        | "overvalue"
        | "fair_value"
      country_code: "SE" | "NO" | "DK" | "FI"
      document_type:
        | "invoice_incoming"
        | "invoice_outgoing"
        | "receipt"
        | "bank_statement"
        | "peppol"
        | "other"
      drilldown_source_type:
        | "account"
        | "journal_entry"
        | "voucher"
        | "document"
        | "tax_box"
        | "adjustment"
      elimination_type:
        | "intercompany_sales"
        | "intercompany_receivable"
        | "intercompany_payable"
        | "other"
      financial_value_layer:
        | "actual_opening_balance"
        | "actual_opening_saldo"
        | "actual_period_movement"
        | "actual_closing_balance"
        | "budget_period_value"
        | "budget_ytd_value"
        | "budget_closing_projection"
        | "forecast_period_value"
        | "forecast_ytd_value"
        | "forecast_closing_projection"
        | "scenario_period_value"
        | "variance_actual_vs_budget"
        | "variance_actual_vs_forecast"
        | "variance_percent"
        | "margin_percent"
      financial_value_source:
        | "ledger"
        | "budget"
        | "forecast"
        | "scenario"
        | "adjustment"
        | "elimination"
        | "manual_override"
        | "derived"
      industry_type:
        | "general"
        | "real_estate"
        | "construction"
        | "restaurant"
        | "retail"
        | "ecommerce"
        | "consulting"
        | "saas"
        | "manufacturing"
        | "healthcare"
        | "education"
        | "other"
        | "holding"
        | "hotel"
        | "services"
      invoice_status:
        | "draft"
        | "sent"
        | "paid"
        | "overdue"
        | "cancelled"
        | "credited"
        | "attested"
        | "rejected"
        | "blocked"
      journal_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "posted"
      payment_initiation_status:
        | "pending"
        | "redirected"
        | "authorized"
        | "executed"
        | "failed"
        | "cancelled"
      permission_level: "none" | "view" | "create" | "edit" | "approve" | "full"
      report_calc_type:
        | "sum"
        | "formula"
        | "mapped_accounts"
        | "derived"
        | "manual"
        | "none"
      report_display_style:
        | "normal"
        | "bold"
        | "subtotal"
        | "total"
        | "muted"
        | "highlighted"
      report_framework: "k2" | "k3" | "internal" | "tax" | "other"
      report_row_type:
        | "section"
        | "group"
        | "account"
        | "subtotal"
        | "total"
        | "calculated"
        | "note_reference"
      report_scenario_adjustment_type:
        | "delta"
        | "percent"
        | "override"
        | "formula"
      report_scenario_type: "budget" | "forecast" | "sensitivity" | "custom"
      report_section_type: "header" | "body" | "subtotal_group" | "total_group"
      report_sign_behavior: "normal" | "invert" | "custom"
      report_template_type:
        | "rr"
        | "br"
        | "cashflow"
        | "management_report"
        | "budget"
        | "forecast"
        | "other"
      subscription_status:
        | "trialing"
        | "active"
        | "cancelled"
        | "past_due"
        | "unpaid"
      subscription_tier: "mini" | "starter" | "pro" | "enterprise"
      tenant_role: "owner" | "admin" | "member"
      transaction_status: "pending" | "matched" | "reconciled" | "unmatched"
      validation_severity: "info" | "warning" | "error" | "critical"
      validation_status: "open" | "resolved" | "ignored"
      validation_type:
        | "balance_sheet_not_balanced"
        | "result_mismatch_rr_vs_br"
        | "abnormal_negative_balance"
        | "missing_account_mapping"
        | "incomplete_period_data"
        | "formula_cycle"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_mapping_scope: [
        "single_company",
        "group",
        "all",
        "tenant_specific",
      ],
      account_mapping_type: [
        "actual",
        "budget",
        "forecast",
        "tax",
        "management",
      ],
      app_module: [
        "invoices",
        "bookkeeping",
        "payroll",
        "bank",
        "reports",
        "tax",
        "employees",
        "settings",
        "consolidation",
      ],
      app_role: [
        "owner",
        "cfo",
        "accountant",
        "auditor",
        "limited_user",
        "kam",
        "admin",
        "payroll",
        "project_manager",
        "board_member",
      ],
      cfo_action_status: ["pending", "executed", "failed", "reverted"],
      cfo_action_type: [
        "create_accrual",
        "send_reminder",
        "reclassify",
        "apply_deferral",
        "generate_report",
      ],
      cfo_automation_mode: ["manual", "assisted", "autonomous"],
      cfo_context_type: ["kpi", "benchmark", "scenario", "action", "general"],
      cfo_message_role: ["user", "assistant", "system"],
      cfo_persona_mode: ["business_owner", "accountant"],
      cfo_pref_dimension: [
        "growth_bias",
        "cost_focus",
        "risk_appetite",
        "tone",
      ],
      client_request_module: [
        "tasks",
        "vat",
        "agi",
        "supplier_invoice",
        "annual_report",
        "tax",
        "other",
      ],
      client_request_status: ["requested", "received", "resolved", "cancelled"],
      client_request_type: [
        "receipt",
        "invoice",
        "payroll",
        "signature",
        "clarification",
        "other",
      ],
      consolidation_adjustment_source: ["manual", "ai_suggestion", "recurring"],
      consolidation_adjustment_status: ["draft", "applied", "reverted"],
      consolidation_adjustment_type: [
        "goodwill",
        "fair_value",
        "nci",
        "reclassification",
        "fx_translation",
        "unrealized_profit",
        "group_correction",
        "manual_override",
      ],
      consolidation_suggestion_status: [
        "pending",
        "accepted",
        "dismissed",
        "applied",
      ],
      consolidation_suggestion_type: [
        "elimination",
        "goodwill",
        "nci",
        "fx_adjustment",
        "unrealized_profit",
        "reclassification",
        "overvalue",
        "fair_value",
      ],
      country_code: ["SE", "NO", "DK", "FI"],
      document_type: [
        "invoice_incoming",
        "invoice_outgoing",
        "receipt",
        "bank_statement",
        "peppol",
        "other",
      ],
      drilldown_source_type: [
        "account",
        "journal_entry",
        "voucher",
        "document",
        "tax_box",
        "adjustment",
      ],
      elimination_type: [
        "intercompany_sales",
        "intercompany_receivable",
        "intercompany_payable",
        "other",
      ],
      financial_value_layer: [
        "actual_opening_balance",
        "actual_opening_saldo",
        "actual_period_movement",
        "actual_closing_balance",
        "budget_period_value",
        "budget_ytd_value",
        "budget_closing_projection",
        "forecast_period_value",
        "forecast_ytd_value",
        "forecast_closing_projection",
        "scenario_period_value",
        "variance_actual_vs_budget",
        "variance_actual_vs_forecast",
        "variance_percent",
        "margin_percent",
      ],
      financial_value_source: [
        "ledger",
        "budget",
        "forecast",
        "scenario",
        "adjustment",
        "elimination",
        "manual_override",
        "derived",
      ],
      industry_type: [
        "general",
        "real_estate",
        "construction",
        "restaurant",
        "retail",
        "ecommerce",
        "consulting",
        "saas",
        "manufacturing",
        "healthcare",
        "education",
        "other",
        "holding",
        "hotel",
        "services",
      ],
      invoice_status: [
        "draft",
        "sent",
        "paid",
        "overdue",
        "cancelled",
        "credited",
        "attested",
        "rejected",
        "blocked",
      ],
      journal_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "posted",
      ],
      payment_initiation_status: [
        "pending",
        "redirected",
        "authorized",
        "executed",
        "failed",
        "cancelled",
      ],
      permission_level: ["none", "view", "create", "edit", "approve", "full"],
      report_calc_type: [
        "sum",
        "formula",
        "mapped_accounts",
        "derived",
        "manual",
        "none",
      ],
      report_display_style: [
        "normal",
        "bold",
        "subtotal",
        "total",
        "muted",
        "highlighted",
      ],
      report_framework: ["k2", "k3", "internal", "tax", "other"],
      report_row_type: [
        "section",
        "group",
        "account",
        "subtotal",
        "total",
        "calculated",
        "note_reference",
      ],
      report_scenario_adjustment_type: [
        "delta",
        "percent",
        "override",
        "formula",
      ],
      report_scenario_type: ["budget", "forecast", "sensitivity", "custom"],
      report_section_type: ["header", "body", "subtotal_group", "total_group"],
      report_sign_behavior: ["normal", "invert", "custom"],
      report_template_type: [
        "rr",
        "br",
        "cashflow",
        "management_report",
        "budget",
        "forecast",
        "other",
      ],
      subscription_status: [
        "trialing",
        "active",
        "cancelled",
        "past_due",
        "unpaid",
      ],
      subscription_tier: ["mini", "starter", "pro", "enterprise"],
      tenant_role: ["owner", "admin", "member"],
      transaction_status: ["pending", "matched", "reconciled", "unmatched"],
      validation_severity: ["info", "warning", "error", "critical"],
      validation_status: ["open", "resolved", "ignored"],
      validation_type: [
        "balance_sheet_not_balanced",
        "result_mismatch_rr_vs_br",
        "abnormal_negative_balance",
        "missing_account_mapping",
        "incomplete_period_data",
        "formula_cycle",
        "other",
      ],
    },
  },
} as const

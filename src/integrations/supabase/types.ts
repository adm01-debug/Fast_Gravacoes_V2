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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abc_activities: {
        Row: {
          cost_driver: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          technique_id: string | null
          updated_at: string
        }
        Insert: {
          cost_driver: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          technique_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_driver?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          technique_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abc_activities_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      abc_activity_rates: {
        Row: {
          activity_id: string
          cost_pool_id: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          rate_per_unit: number
          updated_at: string
        }
        Insert: {
          activity_id: string
          cost_pool_id: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          rate_per_unit?: number
          updated_at?: string
        }
        Update: {
          activity_id?: string
          cost_pool_id?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          rate_per_unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abc_activity_rates_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "abc_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abc_activity_rates_cost_pool_id_fkey"
            columns: ["cost_pool_id"]
            isOneToOne: false
            referencedRelation: "abc_cost_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      abc_cost_pools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          monthly_budget: number
          name: string
          pool_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_budget?: number
          name: string
          pool_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_budget?: number
          name?: string
          pool_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      abc_job_costs: {
        Row: {
          activity_id: string
          calculated_at: string
          cost_pool_id: string
          created_at: string
          driver_quantity: number
          id: string
          job_id: string
          total_cost: number
          unit_rate: number
        }
        Insert: {
          activity_id: string
          calculated_at?: string
          cost_pool_id: string
          created_at?: string
          driver_quantity?: number
          id?: string
          job_id: string
          total_cost?: number
          unit_rate?: number
        }
        Update: {
          activity_id?: string
          calculated_at?: string
          cost_pool_id?: string
          created_at?: string
          driver_quantity?: number
          id?: string
          job_id?: string
          total_cost?: number
          unit_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "abc_job_costs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "abc_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abc_job_costs_cost_pool_id_fkey"
            columns: ["cost_pool_id"]
            isOneToOne: false
            referencedRelation: "abc_cost_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abc_job_costs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          changed_fields: string[] | null
          created_at: string
          entity_id: string
          entity_type: string
          hash: string | null
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          previous_hash: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          entity_id: string
          entity_type: string
          hash?: string | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          previous_hash?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          hash?: string | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          previous_hash?: string | null
        }
        Relationships: []
      }
      bitrix24_field_mappings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          mapping_type: string
          priority: number
          source_key: string
          target_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          mapping_type: string
          priority?: number
          source_key: string
          target_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          mapping_type?: string
          priority?: number
          source_key?: string
          target_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      bitrix24_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      bitrix24_sync_history: {
        Row: {
          completed_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          jobs_failed: number | null
          jobs_synced: number | null
          started_at: string
          status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          jobs_failed?: number | null
          jobs_synced?: number | null
          started_at?: string
          status: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          jobs_failed?: number | null
          jobs_synced?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          ip_address: unknown
          is_permanent: boolean
          reason: string
          request_count_at_block: number | null
          unblocked_at: string | null
          unblocked_by: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address: unknown
          is_permanent?: boolean
          reason: string
          request_count_at_block?: number | null
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_permanent?: boolean
          reason?: string
          request_count_at_block?: number | null
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Relationships: []
      }
      business_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_name: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: []
      }
      cron_health_history: {
        Row: {
          active: boolean | null
          captured_at: string
          consecutive_failures: number
          created_at: string
          expected_interval_minutes: number | null
          id: string
          is_stale: boolean
          jobid: number
          jobname: string | null
          last_duration_ms: number | null
          last_error: string | null
          last_run: string | null
          last_status: string | null
          schedule: string | null
        }
        Insert: {
          active?: boolean | null
          captured_at?: string
          consecutive_failures?: number
          created_at?: string
          expected_interval_minutes?: number | null
          id?: string
          is_stale?: boolean
          jobid: number
          jobname?: string | null
          last_duration_ms?: number | null
          last_error?: string | null
          last_run?: string | null
          last_status?: string | null
          schedule?: string | null
        }
        Update: {
          active?: boolean | null
          captured_at?: string
          consecutive_failures?: number
          created_at?: string
          expected_interval_minutes?: number | null
          id?: string
          is_stale?: boolean
          jobid?: number
          jobname?: string | null
          last_duration_ms?: number | null
          last_error?: string | null
          last_run?: string | null
          last_status?: string | null
          schedule?: string | null
        }
        Relationships: []
      }
      cron_p95_daily: {
        Row: {
          avg_ms: number | null
          created_at: string
          day: string
          failure_rate_pct: number
          id: string
          jobid: number
          jobname: string | null
          max_ms: number | null
          p95_ms: number | null
          samples: number
          updated_at: string
        }
        Insert: {
          avg_ms?: number | null
          created_at?: string
          day: string
          failure_rate_pct?: number
          id?: string
          jobid: number
          jobname?: string | null
          max_ms?: number | null
          p95_ms?: number | null
          samples?: number
          updated_at?: string
        }
        Update: {
          avg_ms?: number | null
          created_at?: string
          day?: string
          failure_rate_pct?: number
          id?: string
          jobid?: number
          jobname?: string | null
          max_ms?: number | null
          p95_ms?: number | null
          samples?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          created_at: string
          data: Json
          date: string
          id: string
          summary_type: string
        }
        Insert: {
          created_at?: string
          data?: Json
          date: string
          id?: string
          summary_type: string
        }
        Update: {
          created_at?: string
          data?: Json
          date?: string
          id?: string
          summary_type?: string
        }
        Relationships: []
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_presets: {
        Row: {
          created_at: string
          dashboard_id: string
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          change_notes: string | null
          created_at: string
          document_id: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          change_notes?: string | null
          created_at?: string
          document_id: string
          file_name: string
          file_size?: number
          file_url: string
          id?: string
          uploaded_by?: string | null
          version: number
        }
        Update: {
          change_notes?: string | null
          created_at?: string
          document_id?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "technical_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_health_history: {
        Row: {
          captured_at: string
          checks: Json
          created_at: string
          id: string
          latency_ms: number | null
          source: string
          status: string
        }
        Insert: {
          captured_at?: string
          checks?: Json
          created_at?: string
          id?: string
          latency_ms?: number | null
          source?: string
          status: string
        }
        Update: {
          captured_at?: string
          checks?: Json
          created_at?: string
          id?: string
          latency_ms?: number | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      efficiency_alert_history: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          detected_at: string
          id: string
          machine_id: string | null
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          technique_id: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          detected_at?: string
          id?: string
          machine_id?: string | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          technique_id?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          detected_at?: string
          id?: string
          machine_id?: string | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          technique_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "efficiency_alert_history_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      energy_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_value: number
          id: string
          is_resolved: boolean
          machine_id: string | null
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          threshold_value: number
        }
        Insert: {
          alert_type: string
          created_at?: string
          current_value: number
          id?: string
          is_resolved?: boolean
          machine_id?: string | null
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          threshold_value: number
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_value?: number
          id?: string
          is_resolved?: boolean
          machine_id?: string | null
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          threshold_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "energy_alerts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_consumption: {
        Row: {
          consumption_kwh: number
          cost_per_kwh: number | null
          created_at: string
          current_amps: number | null
          id: string
          machine_id: string | null
          notes: string | null
          peak_demand_kw: number | null
          power_factor: number | null
          reading_type: string
          recorded_at: string
          total_cost: number | null
          voltage: number | null
        }
        Insert: {
          consumption_kwh?: number
          cost_per_kwh?: number | null
          created_at?: string
          current_amps?: number | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          peak_demand_kw?: number | null
          power_factor?: number | null
          reading_type?: string
          recorded_at?: string
          total_cost?: number | null
          voltage?: number | null
        }
        Update: {
          consumption_kwh?: number
          cost_per_kwh?: number | null
          created_at?: string
          current_amps?: number | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          peak_demand_kw?: number | null
          power_factor?: number | null
          reading_type?: string
          recorded_at?: string
          total_cost?: number | null
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_consumption_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_targets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          machine_id: string | null
          period_end: string
          period_start: string
          target_type: string
          target_value: number
          technique_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          machine_id?: string | null
          period_end: string
          period_start: string
          target_type: string
          target_value: number
          technique_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          machine_id?: string | null
          period_end?: string
          period_start?: string
          target_type?: string
          target_value?: number
          technique_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_targets_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component_name: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          stack: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          stack?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          stack?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          rules: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          rules?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          rules?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gamification_rewards: {
        Row: {
          color_class: string | null
          cost_points: number
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          stock: number | null
        }
        Insert: {
          color_class?: string | null
          cost_points: number
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          stock?: number | null
        }
        Update: {
          color_class?: string | null
          cost_points?: number
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          stock?: number | null
        }
        Relationships: []
      }
      gamification_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      geo_blocking_logs: {
        Row: {
          action: string
          country_code: string | null
          country_name: string | null
          created_at: string
          id: string
          ip_address: unknown
          request_path: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          ip_address: unknown
          request_path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          request_path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      geo_blocking_rules: {
        Row: {
          block_type: string
          country_code: string
          country_name: string
          created_at: string
          created_by: string | null
          id: string
          is_blocked: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          block_type?: string
          country_code: string
          country_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_blocked?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: string
          country_code?: string
          country_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_blocked?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      geo_blocking_settings: {
        Row: {
          block_unknown_countries: boolean
          id: string
          is_enabled: boolean
          log_blocked_attempts: boolean
          mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_unknown_countries?: boolean
          id?: string
          is_enabled?: boolean
          log_blocked_attempts?: boolean
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_unknown_countries?: boolean
          id?: string
          is_enabled?: boolean
          log_blocked_attempts?: boolean
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string | null
          current_stock: number
          daily_usage_avg: number | null
          days_of_supply: number | null
          id: string
          location: string | null
          min_stock_level: number
          name: string
          price_per_unit: number | null
          specification: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          current_stock?: number
          daily_usage_avg?: number | null
          days_of_supply?: number | null
          id?: string
          location?: string | null
          min_stock_level?: number
          name: string
          price_per_unit?: number | null
          specification?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          current_stock?: number
          daily_usage_avg?: number | null
          days_of_supply?: number | null
          id?: string
          location?: string | null
          min_stock_level?: number
          name?: string
          price_per_unit?: number | null
          specification?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          from_location: string | null
          id: string
          item_id: string | null
          job_id: string | null
          quantity: number
          reason: string | null
          to_location: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_location?: string | null
          id?: string
          item_id?: string | null
          job_id?: string | null
          quantity: number
          reason?: string | null
          to_location?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_location?: string | null
          id?: string
          item_id?: string | null
          job_id?: string | null
          quantity?: number
          reason?: string | null
          to_location?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_allowlist: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean
          is_global: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          ip_address: unknown
          is_active?: boolean
          is_global?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean
          is_global?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      job_status_audit: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          job_id: string
          new_lost_pieces: number | null
          new_produced_quantity: number | null
          new_status: string | null
          old_lost_pieces: number | null
          old_produced_quantity: number | null
          old_status: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          job_id: string
          new_lost_pieces?: number | null
          new_produced_quantity?: number | null
          new_status?: string | null
          old_lost_pieces?: number | null
          old_produced_quantity?: number | null
          old_status?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          job_id?: string
          new_lost_pieces?: number | null
          new_produced_quantity?: number | null
          new_status?: string | null
          old_lost_pieces?: number | null
          old_produced_quantity?: number | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_status_audit_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          job_id: string
          new_status: string
          previous_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          new_status: string
          previous_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          new_status?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          client: string
          created_at: string
          delay_reason: string | null
          end_time: string | null
          estimated_duration: number
          gravure_color: string | null
          id: string
          loss_category: string | null
          lost_pieces: number | null
          machine_id: string | null
          notes: string | null
          operator_id: string | null
          order_number: string
          parent_job_id: string | null
          priority: string
          produced_quantity: number | null
          product: string
          product_category_id: string | null
          production_photos: string[] | null
          quantity: number
          rework_reason: string | null
          scheduled_date: string | null
          shipment_id: string | null
          shipping_status: string | null
          sort_order: number | null
          start_time: string | null
          status: string
          technique_id: string
          updated_at: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          client: string
          created_at?: string
          delay_reason?: string | null
          end_time?: string | null
          estimated_duration?: number
          gravure_color?: string | null
          id?: string
          loss_category?: string | null
          lost_pieces?: number | null
          machine_id?: string | null
          notes?: string | null
          operator_id?: string | null
          order_number: string
          parent_job_id?: string | null
          priority?: string
          produced_quantity?: number | null
          product: string
          product_category_id?: string | null
          production_photos?: string[] | null
          quantity: number
          rework_reason?: string | null
          scheduled_date?: string | null
          shipment_id?: string | null
          shipping_status?: string | null
          sort_order?: number | null
          start_time?: string | null
          status?: string
          technique_id: string
          updated_at?: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          client?: string
          created_at?: string
          delay_reason?: string | null
          end_time?: string | null
          estimated_duration?: number
          gravure_color?: string | null
          id?: string
          loss_category?: string | null
          lost_pieces?: number | null
          machine_id?: string | null
          notes?: string | null
          operator_id?: string | null
          order_number?: string
          parent_job_id?: string | null
          priority?: string
          produced_quantity?: number | null
          product?: string
          product_category_id?: string | null
          production_photos?: string[] | null
          quantity?: number
          rework_reason?: string | null
          scheduled_date?: string | null
          shipment_id?: string | null
          shipping_status?: string | null
          sort_order?: number | null
          start_time?: string | null
          status?: string
          technique_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_product_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_alerts: {
        Row: {
          created_at: string | null
          id: string
          is_resolved: boolean | null
          machine_id: string | null
          metric_name: string
          metric_value: number
          severity: string | null
          threshold: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          machine_id?: string | null
          metric_name: string
          metric_value: number
          severity?: string | null
          threshold: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          machine_id?: string | null
          metric_name?: string
          metric_value?: number
          severity?: string | null
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_alerts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      login_audit: {
        Row: {
          created_at: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          login_status: string
          user_agent: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          login_status: string
          user_agent?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          login_status?: string
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      login_lockouts: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          identifier: string
          identifier_type: string
          last_failed_at: string | null
          locked_until: string | null
          lockout_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          identifier: string
          identifier_type: string
          last_failed_at?: string | null
          locked_until?: string | null
          lockout_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          identifier?: string
          identifier_type?: string
          last_failed_at?: string | null
          locked_until?: string | null
          lockout_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      lot_components: {
        Row: {
          batch_number: string | null
          component_lot_id: string | null
          component_name: string
          created_at: string
          id: string
          lot_id: string
          material_id: string | null
          notes: string | null
          quantity_used: number
          supplier: string | null
          unit: string | null
        }
        Insert: {
          batch_number?: string | null
          component_lot_id?: string | null
          component_name: string
          created_at?: string
          id?: string
          lot_id: string
          material_id?: string | null
          notes?: string | null
          quantity_used?: number
          supplier?: string | null
          unit?: string | null
        }
        Update: {
          batch_number?: string | null
          component_lot_id?: string | null
          component_name?: string
          created_at?: string
          id?: string
          lot_id?: string
          material_id?: string | null
          notes?: string | null
          quantity_used?: number
          supplier?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_components_component_lot_id_fkey"
            columns: ["component_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_components_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_components_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_movements: {
        Row: {
          created_at: string
          from_location: string | null
          id: string
          job_id: string | null
          lot_id: string
          movement_type: string
          performed_by: string | null
          performed_by_name: string | null
          quantity: number
          reason: string | null
          to_location: string | null
        }
        Insert: {
          created_at?: string
          from_location?: string | null
          id?: string
          job_id?: string | null
          lot_id: string
          movement_type: string
          performed_by?: string | null
          performed_by_name?: string | null
          quantity: number
          reason?: string | null
          to_location?: string | null
        }
        Update: {
          created_at?: string
          from_location?: string | null
          id?: string
          job_id?: string | null
          lot_id?: string
          movement_type?: string
          performed_by?: string | null
          performed_by_name?: string | null
          quantity?: number
          reason?: string | null
          to_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_movements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_quality_inspections: {
        Row: {
          created_at: string
          defects_found: number | null
          id: string
          inspected_at: string
          inspection_type: string
          inspector_id: string | null
          inspector_name: string | null
          lot_id: string
          notes: string | null
          photos: string[] | null
          result: string
          sample_size: number | null
        }
        Insert: {
          created_at?: string
          defects_found?: number | null
          id?: string
          inspected_at?: string
          inspection_type: string
          inspector_id?: string | null
          inspector_name?: string | null
          lot_id: string
          notes?: string | null
          photos?: string[] | null
          result: string
          sample_size?: number | null
        }
        Update: {
          created_at?: string
          defects_found?: number | null
          id?: string
          inspected_at?: string
          inspection_type?: string
          inspector_id?: string | null
          inspector_name?: string | null
          lot_id?: string
          notes?: string | null
          photos?: string[] | null
          result?: string
          sample_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_quality_inspections_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_downtime: {
        Row: {
          created_at: string | null
          downtime_type: string
          end_time: string | null
          id: string
          job_id: string | null
          machine_id: string
          operator_id: string | null
          reason: string | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          downtime_type: string
          end_time?: string | null
          id?: string
          job_id?: string | null
          machine_id: string
          operator_id?: string | null
          reason?: string | null
          start_time?: string
        }
        Update: {
          created_at?: string | null
          downtime_type?: string
          end_time?: string | null
          id?: string
          job_id?: string | null
          machine_id?: string
          operator_id?: string | null
          reason?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_downtime_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_downtime_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_event_audit: {
        Row: {
          event_type: string
          id: string
          machine_id: string
          new_value: string | null
          old_value: string | null
          performed_at: string | null
          performed_by: string | null
        }
        Insert: {
          event_type: string
          id?: string
          machine_id: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string | null
          performed_by?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          machine_id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_event_audit_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_health_metrics: {
        Row: {
          avg_repair_time: number | null
          avg_time_between_failures: number | null
          calculated_at: string
          corrective_maintenance_count: number
          id: string
          machine_id: string
          maintenance_count: number
          oee_score: number | null
          period_end: string
          period_start: string
          total_jobs: number
          total_losses: number
          total_produced: number
          total_production_hours: number
        }
        Insert: {
          avg_repair_time?: number | null
          avg_time_between_failures?: number | null
          calculated_at?: string
          corrective_maintenance_count?: number
          id?: string
          machine_id: string
          maintenance_count?: number
          oee_score?: number | null
          period_end: string
          period_start: string
          total_jobs?: number
          total_losses?: number
          total_produced?: number
          total_production_hours?: number
        }
        Update: {
          avg_repair_time?: number | null
          avg_time_between_failures?: number | null
          calculated_at?: string
          corrective_maintenance_count?: number
          id?: string
          machine_id?: string
          maintenance_count?: number
          oee_score?: number | null
          period_end?: string
          period_start?: string
          total_jobs?: number
          total_losses?: number
          total_produced?: number
          total_production_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "machine_health_metrics_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_predictions: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          confidence: number
          created_at: string
          expires_at: string
          factors: Json
          id: string
          is_active: boolean
          machine_id: string
          model_version: string
          predicted_failure_date: string | null
          prediction_type: string
          recommendations: string[] | null
          risk_score: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          confidence: number
          created_at?: string
          expires_at?: string
          factors?: Json
          id?: string
          is_active?: boolean
          machine_id: string
          model_version?: string
          predicted_failure_date?: string | null
          prediction_type: string
          recommendations?: string[] | null
          risk_score: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          confidence?: number
          created_at?: string
          expires_at?: string
          factors?: Json
          id?: string
          is_active?: boolean
          machine_id?: string
          model_version?: string
          predicted_failure_date?: string | null
          prediction_type?: string
          recommendations?: string[] | null
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "machine_predictions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          technique_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          technique_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          technique_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          is_resolved: boolean
          machine_id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          schedule_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean
          is_resolved?: boolean
          machine_id: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          schedule_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          is_resolved?: boolean
          machine_id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_alerts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_alerts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_checklist_items: {
        Row: {
          checklist_id: string
          created_at: string
          description: string
          id: string
          is_critical: boolean
          item_order: number
          max_value: number | null
          measurement_unit: string | null
          min_value: number | null
          requires_measurement: boolean
          requires_photo: boolean
        }
        Insert: {
          checklist_id: string
          created_at?: string
          description: string
          id?: string
          is_critical?: boolean
          item_order?: number
          max_value?: number | null
          measurement_unit?: string | null
          min_value?: number | null
          requires_measurement?: boolean
          requires_photo?: boolean
        }
        Update: {
          checklist_id?: string
          created_at?: string
          description?: string
          id?: string
          is_critical?: boolean
          item_order?: number
          max_value?: number | null
          measurement_unit?: string | null
          min_value?: number | null
          requires_measurement?: boolean
          requires_photo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "maintenance_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_checklists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          machine_category: string | null
          maintenance_type_id: string
          name: string
          technique_id: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          machine_category?: string | null
          maintenance_type_id: string
          name: string
          technique_id?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          machine_category?: string | null
          maintenance_type_id?: string
          name?: string
          technique_id?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_checklists_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "maintenance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_checklists_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_item_responses: {
        Row: {
          checklist_item_id: string
          id: string
          is_checked: boolean
          measurement_value: number | null
          notes: string | null
          photo_url: string | null
          record_id: string
          responded_at: string
        }
        Insert: {
          checklist_item_id: string
          id?: string
          is_checked?: boolean
          measurement_value?: number | null
          notes?: string | null
          photo_url?: string | null
          record_id: string
          responded_at?: string
        }
        Update: {
          checklist_item_id?: string
          id?: string
          is_checked?: boolean
          measurement_value?: number | null
          notes?: string | null
          photo_url?: string | null
          record_id?: string
          responded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_item_responses_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "maintenance_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_item_responses_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          adjustment_parameters: Json | null
          approved_at: string | null
          approver_id: string | null
          checklist_snapshot: Json | null
          checklist_version: number | null
          completed_at: string | null
          correction_deadline: string | null
          correction_notes: string | null
          created_at: string
          downtime_minutes: number | null
          id: string
          justification: string | null
          machine_id: string
          maintenance_type_id: string
          next_scheduled_date_after_approval: string | null
          notes: string | null
          override_by: string | null
          override_justification: string | null
          performed_by: string | null
          performed_by_name: string | null
          photos: string[] | null
          quality_responses: Json | null
          schedule_id: string
          signature_url: string | null
          started_at: string
          status: string
          technical_sheet_id: string | null
          technical_sheet_version: number | null
          total_cost: number | null
        }
        Insert: {
          adjustment_parameters?: Json | null
          approved_at?: string | null
          approver_id?: string | null
          checklist_snapshot?: Json | null
          checklist_version?: number | null
          completed_at?: string | null
          correction_deadline?: string | null
          correction_notes?: string | null
          created_at?: string
          downtime_minutes?: number | null
          id?: string
          justification?: string | null
          machine_id: string
          maintenance_type_id: string
          next_scheduled_date_after_approval?: string | null
          notes?: string | null
          override_by?: string | null
          override_justification?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          photos?: string[] | null
          quality_responses?: Json | null
          schedule_id: string
          signature_url?: string | null
          started_at?: string
          status?: string
          technical_sheet_id?: string | null
          technical_sheet_version?: number | null
          total_cost?: number | null
        }
        Update: {
          adjustment_parameters?: Json | null
          approved_at?: string | null
          approver_id?: string | null
          checklist_snapshot?: Json | null
          checklist_version?: number | null
          completed_at?: string | null
          correction_deadline?: string | null
          correction_notes?: string | null
          created_at?: string
          downtime_minutes?: number | null
          id?: string
          justification?: string | null
          machine_id?: string
          maintenance_type_id?: string
          next_scheduled_date_after_approval?: string | null
          notes?: string | null
          override_by?: string | null
          override_justification?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          photos?: string[] | null
          quality_responses?: Json | null
          schedule_id?: string
          signature_url?: string | null
          started_at?: string
          status?: string
          technical_sheet_id?: string | null
          technical_sheet_version?: number | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "maintenance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          estimated_duration_minutes: number
          id: string
          interval_days: number
          is_active: boolean
          last_completed_at: string | null
          machine_id: string
          maintenance_type_id: string
          name: string
          next_due_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_duration_minutes?: number
          id?: string
          interval_days?: number
          is_active?: boolean
          last_completed_at?: string | null
          machine_id: string
          maintenance_type_id: string
          name: string
          next_due_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_duration_minutes?: number
          id?: string
          interval_days?: number
          is_active?: boolean
          last_completed_at?: string | null
          machine_id?: string
          maintenance_type_id?: string
          name?: string
          next_due_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "maintenance_types"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_types: {
        Row: {
          color: string
          created_at: string
          default_interval_days: number
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          default_interval_days?: number
          description?: string | null
          id: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          default_interval_days?: number
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      new_device_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          created_at: string
          device_id: string | null
          email_sent: boolean
          email_sent_at: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          created_at?: string
          device_id?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          created_at?: string
          device_id?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "new_device_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_achievements: {
        Row: {
          achieved_at: string
          achievement_name: string
          achievement_type: string
          created_at: string
          description: string | null
          icon: string
          id: string
          metadata: Json | null
          operator_id: string
          period_end: string | null
          period_start: string | null
          points: number
        }
        Insert: {
          achieved_at?: string
          achievement_name: string
          achievement_type: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          metadata?: Json | null
          operator_id: string
          period_end?: string | null
          period_start?: string | null
          points?: number
        }
        Update: {
          achieved_at?: string
          achievement_name?: string
          achievement_type?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          metadata?: Json | null
          operator_id?: string
          period_end?: string | null
          period_start?: string | null
          points?: number
        }
        Relationships: []
      }
      operator_goals: {
        Row: {
          created_at: string
          created_by: string | null
          goal_type: string
          id: string
          operator_id: string
          period_end: string
          period_start: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          goal_type: string
          id?: string
          operator_id: string
          period_end: string
          period_start: string
          target_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          goal_type?: string
          id?: string
          operator_id?: string
          period_end?: string
          period_start?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      operator_machines: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          machine_id: string
          operator_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          machine_id: string
          operator_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          machine_id?: string
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_machines_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_rankings: {
        Row: {
          calculated_at: string
          efficiency_rate: number | null
          id: string
          operator_id: string
          period_end: string
          period_start: string
          position: number
          quality_rate: number | null
          ranking_type: string
          total_points: number
          total_produced: number
        }
        Insert: {
          calculated_at?: string
          efficiency_rate?: number | null
          id?: string
          operator_id: string
          period_end: string
          period_start: string
          position: number
          quality_rate?: number | null
          ranking_type: string
          total_points?: number
          total_produced?: number
        }
        Update: {
          calculated_at?: string
          efficiency_rate?: number | null
          id?: string
          operator_id?: string
          period_end?: string
          period_start?: string
          position?: number
          quality_rate?: number | null
          ranking_type?: string
          total_points?: number
          total_produced?: number
        }
        Relationships: []
      }
      operator_skills: {
        Row: {
          certified_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          operator_id: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          technique_id: string
          updated_at: string | null
        }
        Insert: {
          certified_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          operator_id: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          technique_id: string
          updated_at?: string | null
        }
        Update: {
          certified_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          operator_id?: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          technique_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      operator_status_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          operator_id: string
          operator_name: string | null
          performed_by: string
          performed_by_name: string | null
          reason: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          operator_id: string
          operator_name?: string | null
          performed_by: string
          performed_by_name?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          operator_id?: string
          operator_name?: string | null
          performed_by?: string
          performed_by_name?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      packaging_checklist_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_required: boolean
          item_order: number
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          item_order?: number
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          item_order?: number
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      packaging_defects: {
        Row: {
          created_at: string
          decision: string
          defect_type: string
          id: string
          notes: string | null
          packaging_task_id: string
          photo_url: string | null
          quantity: number
          reported_by: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision?: string
          defect_type: string
          id?: string
          notes?: string | null
          packaging_task_id: string
          photo_url?: string | null
          quantity: number
          reported_by?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision?: string
          defect_type?: string
          id?: string
          notes?: string | null
          packaging_task_id?: string
          photo_url?: string | null
          quantity?: number
          reported_by?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_defects_packaging_task_id_fkey"
            columns: ["packaging_task_id"]
            isOneToOne: false
            referencedRelation: "packaging_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_equipment: {
        Row: {
          created_at: string | null
          id: string
          last_maintenance_at: string | null
          name: string
          next_maintenance_at: string | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_maintenance_at?: string | null
          name: string
          next_maintenance_at?: string | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_maintenance_at?: string | null
          name?: string
          next_maintenance_at?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      packaging_settings: {
        Row: {
          created_at: string
          defect_reasons: string[]
          id: string
          package_types: string[]
          sla_packaging_hours: number
          sla_total_hours: number
          sla_triage_hours: number
          updated_at: string
          warning_threshold_pct: number
          weight_unit: string
        }
        Insert: {
          created_at?: string
          defect_reasons?: string[]
          id?: string
          package_types?: string[]
          sla_packaging_hours?: number
          sla_total_hours?: number
          sla_triage_hours?: number
          updated_at?: string
          warning_threshold_pct?: number
          weight_unit?: string
        }
        Update: {
          created_at?: string
          defect_reasons?: string[]
          id?: string
          package_types?: string[]
          sla_packaging_hours?: number
          sla_total_hours?: number
          sla_triage_hours?: number
          updated_at?: string
          warning_threshold_pct?: number
          weight_unit?: string
        }
        Relationships: []
      }
      packaging_sla_overrides: {
        Row: {
          client: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          sla_packaging_hours: number
          sla_total_hours: number
          sla_triage_hours: number
          technique_id: string | null
          updated_at: string
          warning_threshold_pct: number
        }
        Insert: {
          client?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          sla_packaging_hours?: number
          sla_total_hours?: number
          sla_triage_hours?: number
          technique_id?: string | null
          updated_at?: string
          warning_threshold_pct?: number
        }
        Update: {
          client?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          sla_packaging_hours?: number
          sla_total_hours?: number
          sla_triage_hours?: number
          technique_id?: string | null
          updated_at?: string
          warning_threshold_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "packaging_sla_overrides_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_task_checklist: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          is_checked: boolean
          item_id: string
          notes: string | null
          packaging_task_id: string
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean
          item_id: string
          notes?: string | null
          packaging_task_id: string
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean
          item_id?: string
          notes?: string | null
          packaging_task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_task_checklist_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "packaging_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_task_checklist_packaging_task_id_fkey"
            columns: ["packaging_task_id"]
            isOneToOne: false
            referencedRelation: "packaging_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_tasks: {
        Row: {
          approved_quantity: number
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          delay_category: string | null
          delay_reason: string | null
          id: string
          job_id: string
          notes: string | null
          package_type: string | null
          packages_count: number | null
          received_quantity: number
          rejected_quantity: number
          started_at: string | null
          status: string
          total_weight_kg: number | null
          updated_at: string
          was_overdue_on_complete: boolean
        }
        Insert: {
          approved_quantity?: number
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          delay_category?: string | null
          delay_reason?: string | null
          id?: string
          job_id: string
          notes?: string | null
          package_type?: string | null
          packages_count?: number | null
          received_quantity?: number
          rejected_quantity?: number
          started_at?: string | null
          status?: string
          total_weight_kg?: number | null
          updated_at?: string
          was_overdue_on_complete?: boolean
        }
        Update: {
          approved_quantity?: number
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          delay_category?: string | null
          delay_reason?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          package_type?: string | null
          packages_count?: number | null
          received_quantity?: number
          rejected_quantity?: number
          started_at?: string | null
          status?: string
          total_weight_kg?: number | null
          updated_at?: string
          was_overdue_on_complete?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "packaging_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_waste: {
        Row: {
          created_at: string | null
          id: string
          material_type: string
          operator_id: string | null
          task_id: string | null
          weight_kg: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_type: string
          operator_id?: string | null
          task_id?: string | null
          weight_kg: number
        }
        Update: {
          created_at?: string | null
          id?: string
          material_type?: string
          operator_id?: string | null
          task_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "packaging_waste_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "packaging_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          rejection_reason: string | null
          requested_by_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          status: string
          user_email: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          rejection_reason?: string | null
          requested_by_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
          user_email: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          rejection_reason?: string | null
          requested_by_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
          user_email?: string
        }
        Relationships: []
      }
      pre_production_checklists: {
        Row: {
          checked_by: string | null
          checked_by_name: string | null
          color_verified: boolean
          completed_at: string | null
          consumables_confirmed: Json | null
          created_at: string
          id: string
          job_id: string
          machine_clean: boolean
          material_verified: boolean
          notes: string | null
          pressure: string | null
          speed: string | null
          squeegee_passes: string | null
          technical_sheet_version: number | null
          temperature: string | null
          tools_ready: boolean
        }
        Insert: {
          checked_by?: string | null
          checked_by_name?: string | null
          color_verified?: boolean
          completed_at?: string | null
          consumables_confirmed?: Json | null
          created_at?: string
          id?: string
          job_id: string
          machine_clean?: boolean
          material_verified?: boolean
          notes?: string | null
          pressure?: string | null
          speed?: string | null
          squeegee_passes?: string | null
          technical_sheet_version?: number | null
          temperature?: string | null
          tools_ready?: boolean
        }
        Update: {
          checked_by?: string | null
          checked_by_name?: string | null
          color_verified?: boolean
          completed_at?: string | null
          consumables_confirmed?: Json | null
          created_at?: string
          id?: string
          job_id?: string
          machine_clean?: boolean
          material_verified?: boolean
          notes?: string | null
          pressure?: string | null
          speed?: string | null
          squeegee_passes?: string | null
          technical_sheet_version?: number | null
          temperature?: string | null
          tools_ready?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pre_production_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_history: {
        Row: {
          accuracy_notes: string | null
          actual_failure_date: string | null
          created_at: string
          id: string
          machine_id: string
          predicted_failure_date: string | null
          predicted_risk_score: number
          prediction_id: string
          resolved_at: string | null
          was_accurate: boolean | null
        }
        Insert: {
          accuracy_notes?: string | null
          actual_failure_date?: string | null
          created_at?: string
          id?: string
          machine_id: string
          predicted_failure_date?: string | null
          predicted_risk_score: number
          prediction_id: string
          resolved_at?: string | null
          was_accurate?: boolean | null
        }
        Update: {
          accuracy_notes?: string | null
          actual_failure_date?: string | null
          created_at?: string
          id?: string
          machine_id?: string
          predicted_failure_date?: string | null
          predicted_risk_score?: number
          prediction_id?: string
          resolved_at?: string | null
          was_accurate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_history_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_history_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "machine_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_losses: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          loss_type: string | null
          notes: string | null
          operator_id: string | null
          quantity: number
          shift: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          loss_type?: string | null
          notes?: string | null
          operator_id?: string | null
          quantity?: number
          shift?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          loss_type?: string | null
          notes?: string | null
          operator_id?: string | null
          quantity?: number
          shift?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_losses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      production_lots: {
        Row: {
          created_at: string
          expiration_date: string | null
          id: string
          job_id: string | null
          lot_number: string
          notes: string | null
          produced_quantity: number
          product_name: string
          production_date: string
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          job_id?: string | null
          lot_number: string
          notes?: string | null
          produced_quantity?: number
          product_name: string
          production_date?: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          job_id?: string | null
          lot_number?: string
          notes?: string | null
          produced_quantity?: number
          product_name?: string
          production_date?: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_lots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          error_message: string | null
          icon: string | null
          id: string
          sent_at: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          icon?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          icon?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_scan_history: {
        Row: {
          action: string
          device_info: string | null
          id: string
          job_id: string
          notes: string | null
          operator_id: string
          scanned_at: string
        }
        Insert: {
          action: string
          device_info?: string | null
          id?: string
          job_id: string
          notes?: string | null
          operator_id: string
          scanned_at?: string
        }
        Update: {
          action?: string
          device_info?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          operator_id?: string
          scanned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_scan_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      query_telemetry: {
        Row: {
          count_mode: string | null
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          operation: string
          query_limit: number | null
          query_offset: number | null
          record_count: number | null
          rpc_name: string | null
          severity: string
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          operation: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          operation?: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limit_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown
          is_blocked: boolean
          request_count: number
          user_email: string | null
          user_id: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: unknown
          is_blocked?: boolean
          request_count?: number
          user_email?: string | null
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown
          is_blocked?: boolean
          request_count?: number
          user_email?: string | null
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_settings: {
        Row: {
          block_duration_minutes: number
          created_at: string
          created_by: string | null
          endpoint_pattern: string
          id: string
          is_active: boolean
          max_requests: number
          updated_at: string
          window_seconds: number
        }
        Insert: {
          block_duration_minutes?: number
          created_at?: string
          created_by?: string | null
          endpoint_pattern: string
          id?: string
          is_active?: boolean
          max_requests?: number
          updated_at?: string
          window_seconds?: number
        }
        Update: {
          block_duration_minutes?: number
          created_at?: string
          created_by?: string | null
          endpoint_pattern?: string
          id?: string
          is_active?: boolean
          max_requests?: number
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          columns: string[]
          created_at: string
          filters: Json | null
          format_type: string | null
          id: string
          is_public: boolean | null
          name: string
          table_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          columns: string[]
          created_at?: string
          filters?: Json | null
          format_type?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          table_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          columns?: string[]
          created_at?: string
          filters?: Json | null
          format_type?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          table_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string | null
          id: string
          points_spent: number
          reward_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_spent: number
          reward_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "gamification_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rls_test_results: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          operation: string
          passed: boolean
          role: string
          table_name: string
          test_name: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation: string
          passed: boolean
          role: string
          table_name: string
          test_name: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation?: string
          passed?: boolean
          role?: string
          table_name?: string
          test_name?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          id: string
          is_granted: boolean
          permission: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_granted?: boolean
          permission: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_granted?: boolean
          permission?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          severity: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          severity?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          severity?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shift_checklist_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          items: Json
          machine_id: string | null
          name: string
          technique_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          machine_id?: string | null
          name: string
          technique_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          machine_id?: string | null
          name?: string
          technique_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_checklist_templates_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handover_checklist: {
        Row: {
          checked_at: string | null
          created_at: string
          handover_id: string
          id: string
          is_checked: boolean
          item_description: string
          item_order: number
          notes: string | null
        }
        Insert: {
          checked_at?: string | null
          created_at?: string
          handover_id: string
          id?: string
          is_checked?: boolean
          item_description: string
          item_order?: number
          notes?: string | null
        }
        Update: {
          checked_at?: string | null
          created_at?: string
          handover_id?: string
          id?: string
          is_checked?: boolean
          item_description?: string
          item_order?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_handover_checklist_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "shift_handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handovers: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          general_notes: string | null
          id: string
          incoming_operator_id: string | null
          machine_id: string | null
          outgoing_operator_id: string
          shift_date: string
          shift_type: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          general_notes?: string | null
          id?: string
          incoming_operator_id?: string | null
          machine_id?: string | null
          outgoing_operator_id: string
          shift_date?: string
          shift_type: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          general_notes?: string | null
          id?: string
          incoming_operator_id?: string | null
          machine_id?: string | null
          outgoing_operator_id?: string
          shift_date?: string
          shift_type?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_handovers_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_occurrences: {
        Row: {
          created_at: string
          description: string
          handover_id: string
          id: string
          job_id: string | null
          machine_id: string | null
          occurred_at: string
          occurrence_type: string
          photos: string[] | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          handover_id: string
          id?: string
          job_id?: string | null
          machine_id?: string | null
          occurred_at?: string
          occurrence_type: string
          photos?: string[] | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          handover_id?: string
          id?: string
          job_id?: string | null
          machine_id?: string | null
          occurred_at?: string
          occurrence_type?: string
          photos?: string[] | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_occurrences_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "shift_handovers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_occurrences_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_occurrences_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_pending_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string | null
          handover_id: string
          id: string
          job_id: string | null
          machine_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          handover_id: string
          id?: string
          job_id?: string | null
          machine_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          handover_id?: string
          id?: string
          job_id?: string | null
          machine_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_pending_tasks_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "shift_handovers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_pending_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_pending_tasks_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_costs: {
        Row: {
          amount: number
          cost_type: string
          created_at: string
          currency: string
          description: string | null
          id: string
          shipment_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          cost_type: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          shipment_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cost_type?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          shipment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_costs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_delivery: string | null
          cost_currency: string | null
          created_at: string
          destination: string | null
          estimated_delivery: string | null
          freight_cost: number | null
          id: string
          insurance_cost: number | null
          job_id: string | null
          notes: string | null
          origin: string | null
          provider_id: string | null
          status: string
          tax_cost: number | null
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          cost_currency?: string | null
          created_at?: string
          destination?: string | null
          estimated_delivery?: string | null
          freight_cost?: number | null
          id?: string
          insurance_cost?: number | null
          job_id?: string | null
          notes?: string | null
          origin?: string | null
          provider_id?: string | null
          status?: string
          tax_cost?: number | null
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          cost_currency?: string | null
          created_at?: string
          destination?: string | null
          estimated_delivery?: string | null
          freight_cost?: number | null
          id?: string
          insurance_cost?: number | null
          job_id?: string | null
          notes?: string | null
          origin?: string | null
          provider_id?: string | null
          status?: string
          tax_cost?: number | null
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_providers: {
        Row: {
          contact_info: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      spc_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          description: string
          id: string
          is_acknowledged: boolean
          measurement_id: string | null
          parameter_id: string
          resolution: string | null
          resolved_at: string | null
          severity: string
          title: string
          value: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          description: string
          id?: string
          is_acknowledged?: boolean
          measurement_id?: string | null
          parameter_id: string
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          title: string
          value?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          is_acknowledged?: boolean
          measurement_id?: string | null
          parameter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          title?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spc_alerts_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "spc_measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spc_alerts_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "spc_control_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      spc_capability_history: {
        Row: {
          calculated_at: string
          cp: number | null
          cpk: number | null
          id: string
          mean: number
          parameter_id: string
          period_end: string
          period_start: string
          pp: number | null
          ppk: number | null
          sample_count: number
          std_deviation: number
        }
        Insert: {
          calculated_at?: string
          cp?: number | null
          cpk?: number | null
          id?: string
          mean: number
          parameter_id: string
          period_end: string
          period_start: string
          pp?: number | null
          ppk?: number | null
          sample_count: number
          std_deviation: number
        }
        Update: {
          calculated_at?: string
          cp?: number | null
          cpk?: number | null
          id?: string
          mean?: number
          parameter_id?: string
          period_end?: string
          period_start?: string
          pp?: number | null
          ppk?: number | null
          sample_count?: number
          std_deviation?: number
        }
        Relationships: [
          {
            foreignKeyName: "spc_capability_history_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "spc_control_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      spc_control_parameters: {
        Row: {
          created_at: string
          frequency_minutes: number
          id: string
          is_active: boolean
          lower_control_limit: number | null
          lower_spec_limit: number
          machine_id: string | null
          measurement_type: string
          name: string
          product_name: string | null
          sample_size: number
          target_value: number
          technique_id: string | null
          unit: string
          updated_at: string
          upper_control_limit: number | null
          upper_spec_limit: number
        }
        Insert: {
          created_at?: string
          frequency_minutes?: number
          id?: string
          is_active?: boolean
          lower_control_limit?: number | null
          lower_spec_limit: number
          machine_id?: string | null
          measurement_type: string
          name: string
          product_name?: string | null
          sample_size?: number
          target_value: number
          technique_id?: string | null
          unit?: string
          updated_at?: string
          upper_control_limit?: number | null
          upper_spec_limit: number
        }
        Update: {
          created_at?: string
          frequency_minutes?: number
          id?: string
          is_active?: boolean
          lower_control_limit?: number | null
          lower_spec_limit?: number
          machine_id?: string | null
          measurement_type?: string
          name?: string
          product_name?: string | null
          sample_size?: number
          target_value?: number
          technique_id?: string | null
          unit?: string
          updated_at?: string
          upper_control_limit?: number | null
          upper_spec_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "spc_control_parameters_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      spc_measurements: {
        Row: {
          created_at: string
          id: string
          is_in_control: boolean
          job_id: string | null
          lot_id: string | null
          mean_value: number
          measured_at: string
          notes: string | null
          operator_id: string | null
          operator_name: string | null
          out_of_control_type: string | null
          parameter_id: string
          range_value: number
          sample_number: number
          std_deviation: number | null
          values: number[]
        }
        Insert: {
          created_at?: string
          id?: string
          is_in_control?: boolean
          job_id?: string | null
          lot_id?: string | null
          mean_value: number
          measured_at?: string
          notes?: string | null
          operator_id?: string | null
          operator_name?: string | null
          out_of_control_type?: string | null
          parameter_id: string
          range_value: number
          sample_number: number
          std_deviation?: number | null
          values: number[]
        }
        Update: {
          created_at?: string
          id?: string
          is_in_control?: boolean
          job_id?: string | null
          lot_id?: string | null
          mean_value?: number
          measured_at?: string
          notes?: string | null
          operator_id?: string | null
          operator_name?: string | null
          out_of_control_type?: string | null
          parameter_id?: string
          range_value?: number
          sample_number?: number
          std_deviation?: number | null
          values?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "spc_measurements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spc_measurements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spc_measurements_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "spc_control_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technical_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          is_current: boolean
          rejection_reason: string | null
          status: string
          technical_sheet_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number
          file_type?: string
          file_url: string
          id?: string
          is_current?: boolean
          rejection_reason?: string | null
          status?: string
          technical_sheet_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          is_current?: boolean
          rejection_reason?: string | null
          status?: string
          technical_sheet_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "technical_documents_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "technical_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheet_audit: {
        Row: {
          action: string
          change_summary: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          previous_data: Json | null
          technical_sheet_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          change_summary?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          technical_sheet_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          change_summary?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          technical_sheet_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheet_audit_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheet_audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          technical_sheet_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          technical_sheet_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          technical_sheet_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheet_audit_logs_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheet_favorites: {
        Row: {
          created_at: string | null
          id: string
          technical_sheet_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          technical_sheet_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          technical_sheet_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheet_favorites_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheet_materials: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          name: string
          notes: string | null
          quantity: string | null
          specification: string | null
          technical_sheet_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          name: string
          notes?: string | null
          quantity?: string | null
          specification?: string | null
          technical_sheet_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          name?: string
          notes?: string | null
          quantity?: string | null
          specification?: string | null
          technical_sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheet_materials_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheet_materials_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheet_steps: {
        Row: {
          created_at: string
          description: string
          id: string
          step_number: number
          technical_sheet_id: string
          tips: string | null
          title: string
          warnings: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          step_number: number
          technical_sheet_id: string
          tips?: string | null
          title: string
          warnings?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          step_number?: number
          technical_sheet_id?: string
          tips?: string | null
          title?: string
          warnings?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheet_steps_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheet_tips: {
        Row: {
          content: string
          created_at: string
          id: string
          technical_sheet_id: string
          tip_type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          technical_sheet_id: string
          tip_type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          technical_sheet_id?: string
          tip_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheet_tips_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheet_versions: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          sheet_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          id?: string
          sheet_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          sheet_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheet_versions_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheets: {
        Row: {
          challenges_notes: string | null
          consumables: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_time_minutes: number | null
          failure_scenarios: string | null
          failure_standard_image_url: string | null
          gap_specifications: string | null
          gold_standard_image_url: string | null
          id: string
          ink_specifications: string | null
          is_active: boolean
          machine_settings: Json | null
          material_id: string | null
          product_category_id: string | null
          quality_checklist: Json | null
          quality_requirements: string | null
          recommended_machine_id: string | null
          settings_ranges: Json | null
          setup_instructions: string | null
          status: Database["public"]["Enums"]["sheet_status"] | null
          technique_id: string
          title: string
          tooling_specifications: string | null
          updated_at: string
          updated_by: string | null
          version: number | null
          view_count: number | null
        }
        Insert: {
          challenges_notes?: string | null
          consumables?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_time_minutes?: number | null
          failure_scenarios?: string | null
          failure_standard_image_url?: string | null
          gap_specifications?: string | null
          gold_standard_image_url?: string | null
          id?: string
          ink_specifications?: string | null
          is_active?: boolean
          machine_settings?: Json | null
          material_id?: string | null
          product_category_id?: string | null
          quality_checklist?: Json | null
          quality_requirements?: string | null
          recommended_machine_id?: string | null
          settings_ranges?: Json | null
          setup_instructions?: string | null
          status?: Database["public"]["Enums"]["sheet_status"] | null
          technique_id: string
          title: string
          tooling_specifications?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          view_count?: number | null
        }
        Update: {
          challenges_notes?: string | null
          consumables?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_time_minutes?: number | null
          failure_scenarios?: string | null
          failure_standard_image_url?: string | null
          gap_specifications?: string | null
          gold_standard_image_url?: string | null
          id?: string
          ink_specifications?: string | null
          is_active?: boolean
          machine_settings?: Json | null
          material_id?: string | null
          product_category_id?: string | null
          quality_checklist?: Json | null
          quality_requirements?: string | null
          recommended_machine_id?: string | null
          settings_ranges?: Json | null
          setup_instructions?: string | null
          status?: Database["public"]["Enums"]["sheet_status"] | null
          technique_id?: string
          title?: string
          tooling_specifications?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheets_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheets_product_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheets_recommended_machine_id_fkey"
            columns: ["recommended_machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheets_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      techniques: {
        Row: {
          color: string
          created_at: string
          high_threshold: number | null
          id: string
          low_threshold: number | null
          medium_threshold: number | null
          name: string
          setup_time: number
          short_name: string
        }
        Insert: {
          color?: string
          created_at?: string
          high_threshold?: number | null
          id: string
          low_threshold?: number | null
          medium_threshold?: number | null
          name: string
          setup_time?: number
          short_name: string
        }
        Update: {
          color?: string
          created_at?: string
          high_threshold?: number | null
          id?: string
          low_threshold?: number | null
          medium_threshold?: number | null
          name?: string
          setup_time?: number
          short_name?: string
        }
        Relationships: []
      }
      telemetry_traces: {
        Row: {
          attributes: Json | null
          created_at: string | null
          duration_ms: number | null
          id: string
          name: string
          parent_span_id: string | null
          service_name: string
          span_id: string
          status: string | null
          trace_id: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name: string
          parent_span_id?: string | null
          service_name: string
          span_id: string
          status?: string | null
          trace_id: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name?: string
          parent_span_id?: string | null
          service_name?: string
          span_id?: string
          status?: string | null
          trace_id?: string
        }
        Relationships: []
      }
      tpm_execution_alerts: {
        Row: {
          actual_value: string | null
          alert_type: string
          created_at: string | null
          description: string | null
          evidence_urls: string[] | null
          execution_id: string
          expected_range: string | null
          id: string
          is_critical: boolean | null
          parameter_name: string | null
          resolved: boolean | null
          severity: string | null
        }
        Insert: {
          actual_value?: string | null
          alert_type: string
          created_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          execution_id: string
          expected_range?: string | null
          id?: string
          is_critical?: boolean | null
          parameter_name?: string | null
          resolved?: boolean | null
          severity?: string | null
        }
        Update: {
          actual_value?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          execution_id?: string
          expected_range?: string | null
          id?: string
          is_critical?: boolean | null
          parameter_name?: string | null
          resolved?: boolean | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_execution_alerts_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "tpm_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_execution_audit_logs: {
        Row: {
          changed_by: string | null
          created_at: string | null
          execution_id: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          execution_id: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          execution_id?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_execution_audit_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_execution_checklist: {
        Row: {
          created_at: string | null
          execution_id: string | null
          id: string
          is_compliant: boolean | null
          item_description: string
          observation: string | null
          photo_url: string | null
        }
        Insert: {
          created_at?: string | null
          execution_id?: string | null
          id?: string
          is_compliant?: boolean | null
          item_description: string
          observation?: string | null
          photo_url?: string | null
        }
        Update: {
          created_at?: string | null
          execution_id?: string | null
          id?: string
          is_compliant?: boolean | null
          item_description?: string
          observation?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_execution_checklist_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "tpm_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_execution_parts: {
        Row: {
          cost: number | null
          created_at: string | null
          execution_id: string | null
          id: string
          part_code: string | null
          part_name: string
          quantity: number | null
          unit: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          execution_id?: string | null
          id?: string
          part_code?: string | null
          part_name: string
          quantity?: number | null
          unit?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          execution_id?: string | null
          id?: string
          part_code?: string | null
          part_name?: string
          quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_execution_parts_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "tpm_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_execution_supplies: {
        Row: {
          alternative_used: boolean | null
          created_at: string | null
          execution_id: string
          id: string
          name: string
          original_recommended_id: string | null
          quantity: string
        }
        Insert: {
          alternative_used?: boolean | null
          created_at?: string | null
          execution_id: string
          id?: string
          name: string
          original_recommended_id?: string | null
          quantity: string
        }
        Update: {
          alternative_used?: boolean | null
          created_at?: string | null
          execution_id?: string
          id?: string
          name?: string
          original_recommended_id?: string | null
          quantity?: string
        }
        Relationships: [
          {
            foreignKeyName: "tpm_execution_supplies_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "tpm_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_executions: {
        Row: {
          adjustment_parameters: Json | null
          checklist_snapshot: Json | null
          checklist_version: number | null
          created_at: string | null
          duration_minutes: number | null
          failure_risk_detected: boolean | null
          finished_at: string | null
          id: string
          machine_id: string | null
          notes: string | null
          quality_checklist_results: Json | null
          schedule_id: string | null
          signature_url: string | null
          started_at: string | null
          status: string | null
          technical_sheet_id: string | null
          technical_sheet_version: number | null
          technician_id: string | null
          updated_at: string | null
        }
        Insert: {
          adjustment_parameters?: Json | null
          checklist_snapshot?: Json | null
          checklist_version?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          failure_risk_detected?: boolean | null
          finished_at?: string | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          quality_checklist_results?: Json | null
          schedule_id?: string | null
          signature_url?: string | null
          started_at?: string | null
          status?: string | null
          technical_sheet_id?: string | null
          technical_sheet_version?: number | null
          technician_id?: string | null
          updated_at?: string | null
        }
        Update: {
          adjustment_parameters?: Json | null
          checklist_snapshot?: Json | null
          checklist_version?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          failure_risk_detected?: boolean | null
          finished_at?: string | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          quality_checklist_results?: Json | null
          schedule_id?: string | null
          signature_url?: string | null
          started_at?: string | null
          status?: string | null
          technical_sheet_id?: string | null
          technical_sheet_version?: number | null
          technician_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_executions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpm_executions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpm_executions_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_notification_logs: {
        Row: {
          channel: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          last_retry_at: string | null
          machine_id: string | null
          payload: Json | null
          recipient: string | null
          retry_attempts: number | null
          sent_at: string | null
          severity: string
          status: string
          user_id: string | null
        }
        Insert: {
          channel: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          last_retry_at?: string | null
          machine_id?: string | null
          payload?: Json | null
          recipient?: string | null
          retry_attempts?: number | null
          sent_at?: string | null
          severity: string
          status: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          last_retry_at?: string | null
          machine_id?: string | null
          payload?: Json | null
          recipient?: string | null
          retry_attempts?: number | null
          sent_at?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_notification_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_notification_queue: {
        Row: {
          channel: string
          created_at: string | null
          error_log: string | null
          id: string
          machine_id: string | null
          max_retries: number | null
          next_retry_at: string | null
          payload: Json | null
          processed_at: string | null
          recipient: string
          retry_count: number | null
          severity: string
          status: string | null
          template_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_log?: string | null
          id?: string
          machine_id?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          payload?: Json | null
          processed_at?: string | null
          recipient: string
          retry_count?: number | null
          severity: string
          status?: string | null
          template_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_log?: string | null
          id?: string
          machine_id?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          payload?: Json | null
          processed_at?: string | null
          recipient?: string
          retry_count?: number | null
          severity?: string
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_notification_queue_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpm_notification_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tpm_notification_templates_published"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_notification_templates: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_published_at: string | null
          severity: string
          status: string | null
          subject: string | null
          template_body: string
          updated_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_published_at?: string | null
          severity: string
          status?: string | null
          subject?: string | null
          template_body: string
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_published_at?: string | null
          severity?: string
          status?: string | null
          subject?: string | null
          template_body?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tpm_notification_templates_published: {
        Row: {
          channel: string
          id: string
          published_at: string | null
          severity: string
          subject: string | null
          template_body: string
          template_id: string | null
        }
        Insert: {
          channel: string
          id?: string
          published_at?: string | null
          severity: string
          subject?: string | null
          template_body: string
          template_id?: string | null
        }
        Update: {
          channel?: string
          id?: string
          published_at?: string | null
          severity?: string
          subject?: string | null
          template_body?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_notification_templates_published_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tpm_notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_parameter_alerts: {
        Row: {
          created_at: string | null
          evidence_files: string[] | null
          evidence_notes: string | null
          evidence_url: string | null
          execution_id: string | null
          id: string
          is_critical: boolean | null
          is_resolved: boolean | null
          parameter_name: string
          recommended_range: string | null
          recorded_value: string | null
          risk_level: string | null
          severity: string | null
        }
        Insert: {
          created_at?: string | null
          evidence_files?: string[] | null
          evidence_notes?: string | null
          evidence_url?: string | null
          execution_id?: string | null
          id?: string
          is_critical?: boolean | null
          is_resolved?: boolean | null
          parameter_name: string
          recommended_range?: string | null
          recorded_value?: string | null
          risk_level?: string | null
          severity?: string | null
        }
        Update: {
          created_at?: string | null
          evidence_files?: string[] | null
          evidence_notes?: string | null
          evidence_url?: string | null
          execution_id?: string | null
          id?: string
          is_critical?: boolean | null
          is_resolved?: boolean | null
          parameter_name?: string
          recommended_range?: string | null
          recorded_value?: string | null
          risk_level?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_parameter_alerts_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "tpm_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      tpm_severity_configs: {
        Row: {
          created_at: string | null
          days_threshold: number | null
          id: string
          is_enabled: boolean | null
          machine_id: string | null
          message_override: string | null
          severity: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_threshold?: number | null
          id?: string
          is_enabled?: boolean | null
          machine_id?: string | null
          message_override?: string | null
          severity: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_threshold?: number | null
          id?: string
          is_enabled?: boolean | null
          machine_id?: string | null
          message_override?: string | null
          severity?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tpm_severity_configs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          browser_name: string | null
          city: string | null
          country: string | null
          created_at: string
          device_fingerprint: string
          device_type: string | null
          first_seen_at: string
          id: string
          ip_address: unknown
          is_trusted: boolean
          last_seen_at: string
          os_name: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: unknown
          is_trusted?: boolean
          last_seen_at?: string
          os_name?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: unknown
          is_trusted?: boolean
          last_seen_at?: string
          os_name?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          favorites: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favorites?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favorites?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          backup_codes_generated_at: string | null
          created_at: string
          id: string
          totp_enabled: boolean
          totp_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes_generated_at?: string | null
          created_at?: string
          id?: string
          totp_enabled?: boolean
          totp_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes_generated_at?: string | null
          created_at?: string
          id?: string
          totp_enabled?: boolean
          totp_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_settings: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          event_configs: Json | null
          id: string
          machine_filters: string[] | null
          notification_types: string[] | null
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
          whatsapp_enabled: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          event_configs?: Json | null
          id?: string
          machine_filters?: string[] | null
          notification_types?: string[] | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          event_configs?: Json | null
          id?: string
          machine_filters?: string[] | null
          notification_types?: string[] | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          type: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          type: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          type?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event: string
          id: string
          payload: Json | null
          source: string
          status_code: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event: string
          id?: string
          payload?: Json | null
          source: string
          status_code?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event?: string
          id?: string
          payload?: Json | null
          source?: string
          status_code?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_reassign_stale_packaging_tasks: { Args: never; Returns: undefined }
      calculate_audit_hash: {
        Args: { rec: Database["public"]["Tables"]["audit_log"]["Row"] }
        Returns: string
      }
      check_and_notify_kpi_alert: {
        Args: {
          p_machine_id: string
          p_metric_name: string
          p_metric_value: number
          p_severity: string
          p_threshold: number
        }
        Returns: undefined
      }
      check_tpm_schedules_notifications: { Args: never; Returns: undefined }
      compute_audit_hash: {
        Args: {
          _action: string
          _actor_id: string
          _created_at: string
          _entity_id: string
          _entity_type: string
          _new_data: Json
          _old_data: Json
          _previous_hash: string
        }
        Returns: string
      }
      cron_expected_interval_minutes: {
        Args: { _schedule: string }
        Returns: number
      }
      get_cron_health: {
        Args: never
        Returns: {
          active: boolean
          consecutive_failures: number
          jobid: number
          jobname: string
          last_duration_ms: number
          last_error: string
          last_run: string
          last_status: string
          schedule: string
        }[]
      }
      get_packaging_leaderboard: {
        Args: never
        Returns: {
          avg_time_minutes: number
          operator_name: string
          quality_rate: number
          tasks_completed: number
        }[]
      }
      get_packaging_manifest: {
        Args: { p_task_ids: string[] }
        Returns: {
          client_name: string
          order_number: string
          package_type: string
          packages_count: number
          shipping_address: string
          total_weight: number
        }[]
      }
      get_system_status_summary: {
        Args: never
        Returns: {
          edge_last_check: string
          edge_status: string
          failing_jobs: number
          healthy_jobs: number
          last_capture: string
          stale_jobs: number
          total_jobs: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_active_role: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_sheet_view_count: {
        Args: { sheet_id: string }
        Returns: undefined
      }
      packaging_task_sla_status: {
        Args: {
          _created_at: string
          _sla_packaging: number
          _sla_total: number
          _sla_triage: number
          _started_at: string
          _status: string
          _warn_pct: number
        }
        Returns: {
          elapsed_hours: number
          level: string
          progress_pct: number
          sla_hours: number
        }[]
      }
      process_tpm_notifications_cron: { Args: never; Returns: undefined }
      purge_old_logs: {
        Args: never
        Returns: {
          deleted_count: number
          table_name: string
        }[]
      }
      refresh_operator_rankings: {
        Args: { p_type: string }
        Returns: undefined
      }
      rollup_cron_p95_daily: { Args: { _days?: number }; Returns: number }
      snapshot_cron_health: { Args: never; Returns: number }
      test_rls_policies: {
        Args: { p_role: string; p_table_name: string; p_test_user_id: string }
        Returns: {
          can_delete: boolean
          can_insert: boolean
          can_select: boolean
          can_update: boolean
          operation: string
        }[]
      }
      verify_audit_chain:
        | {
            Args: never
            Returns: {
              broken_count: number
              is_integral: boolean
              total_records: number
              verified_count: number
            }[]
          }
        | {
            Args: { _limit?: number }
            Returns: {
              broken: number
              first_broken_id: string
              total_records: number
              verified: number
            }[]
          }
    }
    Enums: {
      app_role: "coordinator" | "operator" | "manager" | "admin"
      sheet_status: "draft" | "published" | "review_needed"
      skill_level: "basic" | "advanced" | "expert"
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
      app_role: ["coordinator", "operator", "manager", "admin"],
      sheet_status: ["draft", "published", "review_needed"],
      skill_level: ["basic", "advanced", "expert"],
    },
  },
} as const

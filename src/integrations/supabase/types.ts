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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          input_summary: Json
          job_type: string
          output: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          input_summary?: Json
          job_type: string
          output?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          input_summary?: Json
          job_type?: string
          output?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alert_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          frequency: Database["public"]["Enums"]["alert_frequency"] | null
          last_seen_at: string | null
          quiet_hours: Json | null
          regions: string[] | null
          severity_threshold:
            | Database["public"]["Enums"]["news_severity"]
            | null
          topics: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          frequency?: Database["public"]["Enums"]["alert_frequency"] | null
          last_seen_at?: string | null
          quiet_hours?: Json | null
          regions?: string[] | null
          severity_threshold?:
            | Database["public"]["Enums"]["news_severity"]
            | null
          topics?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          frequency?: Database["public"]["Enums"]["alert_frequency"] | null
          last_seen_at?: string | null
          quiet_hours?: Json | null
          regions?: string[] | null
          severity_threshold?:
            | Database["public"]["Enums"]["news_severity"]
            | null
          topics?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          ciphertext_bundle: string
          created_at: string
          id: string
          iv: string
          salt: string
          user_id: string
          version: number
        }
        Insert: {
          ciphertext_bundle: string
          created_at?: string
          id?: string
          iv: string
          salt: string
          user_id: string
          version?: number
        }
        Update: {
          ciphertext_bundle?: string
          created_at?: string
          id?: string
          iv?: string
          salt?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          kind: string
          ref_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          ref_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          ref_id?: string
          user_id?: string
        }
        Relationships: []
      }
      checkin_reminders: {
        Row: {
          expires_at: string
          id: string
          reminder_number: number
          responded_at: string | null
          sent_at: string
          session_id: string
          status: string
          token: string
          user_id: string
        }
        Insert: {
          expires_at: string
          id?: string
          reminder_number: number
          responded_at?: string | null
          sent_at?: string
          session_id: string
          status?: string
          token: string
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          reminder_number?: number
          responded_at?: string | null
          sent_at?: string
          session_id?: string
          status?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_reminders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "checkin_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          interval_hours: number
          missed_count: number
          next_checkin_due: string
          paused_at: string | null
          scenario_type: Database["public"]["Enums"]["panic_scenario_type"]
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          interval_hours?: number
          missed_count?: number
          next_checkin_due: string
          paused_at?: string | null
          scenario_type: Database["public"]["Enums"]["panic_scenario_type"]
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          interval_hours?: number
          missed_count?: number
          next_checkin_due?: string
          paused_at?: string | null
          scenario_type?: Database["public"]["Enums"]["panic_scenario_type"]
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emails_sent: {
        Row: {
          email: string
          id: string
          sent_at: string | null
          source: string | null
          stripe_event_id: string | null
          template_type: string
        }
        Insert: {
          email: string
          id?: string
          sent_at?: string | null
          source?: string | null
          stripe_event_id?: string | null
          template_type: string
        }
        Update: {
          email?: string
          id?: string
          sent_at?: string | null
          source?: string | null
          stripe_event_id?: string | null
          template_type?: string
        }
        Relationships: []
      }
      expert_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          category: string
          created_at: string | null
          id: string
          question: string
          status: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          category: string
          created_at?: string | null
          id?: string
          question: string
          status?: string | null
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          category?: string
          created_at?: string | null
          id?: string
          question?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exports: {
        Row: {
          created_at: string
          export_type: string
          id: string
          locale: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          export_type: string
          id?: string
          locale?: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          export_type?: string
          id?: string
          locale?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      guest_purchases: {
        Row: {
          amount_cents: number
          claim_code: string
          claimed_at: string | null
          created_at: string
          currency: string
          guest_session_id: string
          id: string
          paid_at: string | null
          payer_email: string | null
          payment_intent_id: string
          source: string
          status: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          claim_code: string
          claimed_at?: string | null
          created_at?: string
          currency?: string
          guest_session_id: string
          id?: string
          paid_at?: string | null
          payer_email?: string | null
          payment_intent_id: string
          source?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          claim_code?: string
          claimed_at?: string | null
          created_at?: string
          currency?: string
          guest_session_id?: string
          id?: string
          paid_at?: string | null
          payer_email?: string | null
          payment_intent_id?: string
          source?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      news_domain_allowlist: {
        Row: {
          domain: string
          enabled: boolean
          label: string | null
          region_scope: string
        }
        Insert: {
          domain: string
          enabled?: boolean
          label?: string | null
          region_scope?: string
        }
        Update: {
          domain?: string
          enabled?: boolean
          label?: string | null
          region_scope?: string
        }
        Relationships: []
      }
      news_items: {
        Row: {
          created_at: string | null
          dedupe_key: string
          domain: string | null
          fetched_at: string | null
          id: string
          kind: string
          language: string | null
          published_at: string | null
          region: string | null
          severity: string | null
          source_id: string | null
          summary: string | null
          title: string
          topics: string[] | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          dedupe_key: string
          domain?: string | null
          fetched_at?: string | null
          id?: string
          kind?: string
          language?: string | null
          published_at?: string | null
          region?: string | null
          severity?: string | null
          source_id?: string | null
          summary?: string | null
          title: string
          topics?: string[] | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          dedupe_key?: string
          domain?: string | null
          fetched_at?: string | null
          id?: string
          kind?: string
          language?: string | null
          published_at?: string | null
          region?: string | null
          severity?: string | null
          source_id?: string | null
          summary?: string | null
          title?: string
          topics?: string[] | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_sources: {
        Row: {
          base_url: string
          created_at: string | null
          enabled: boolean | null
          id: string
          kind: string
          name: string
          region_scope: string | null
          topics: string[] | null
          trust_level: string
          type: Database["public"]["Enums"]["news_source_type"]
        }
        Insert: {
          base_url: string
          created_at?: string | null
          enabled?: boolean | null
          id: string
          kind?: string
          name: string
          region_scope?: string | null
          topics?: string[] | null
          trust_level?: string
          type: Database["public"]["Enums"]["news_source_type"]
        }
        Update: {
          base_url?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          kind?: string
          name?: string
          region_scope?: string | null
          topics?: string[] | null
          trust_level?: string
          type?: Database["public"]["Enums"]["news_source_type"]
        }
        Relationships: []
      }
      onboarding_state: {
        Row: {
          completed: boolean
          step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          step?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      panic_activations: {
        Row: {
          activated_at: string
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          id: string
          is_test: boolean
          location_snapshot: Json | null
          scenario_type: Database["public"]["Enums"]["panic_scenario_type"]
          shared_data: Json | null
          status: Database["public"]["Enums"]["panic_activation_status"]
          user_id: string
        }
        Insert: {
          activated_at?: string
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          id?: string
          is_test?: boolean
          location_snapshot?: Json | null
          scenario_type: Database["public"]["Enums"]["panic_scenario_type"]
          shared_data?: Json | null
          status?: Database["public"]["Enums"]["panic_activation_status"]
          user_id: string
        }
        Update: {
          activated_at?: string
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          id?: string
          is_test?: boolean
          location_snapshot?: Json | null
          scenario_type?: Database["public"]["Enums"]["panic_scenario_type"]
          shared_data?: Json | null
          status?: Database["public"]["Enums"]["panic_activation_status"]
          user_id?: string
        }
        Relationships: []
      }
      panic_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          priority: number
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          priority?: number
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          priority?: number
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      panic_notifications: {
        Row: {
          activation_id: string
          channel: Database["public"]["Enums"]["panic_notification_channel"]
          contact_id: string
          delivered_at: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["panic_notification_status"]
        }
        Insert: {
          activation_id: string
          channel: Database["public"]["Enums"]["panic_notification_channel"]
          contact_id: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["panic_notification_status"]
        }
        Update: {
          activation_id?: string
          channel?: Database["public"]["Enums"]["panic_notification_channel"]
          contact_id?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["panic_notification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "panic_notifications_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "panic_activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panic_notifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "panic_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      panic_scenarios: {
        Row: {
          created_at: string
          custom_label: string | null
          enabled: boolean
          id: string
          scenario_type: Database["public"]["Enums"]["panic_scenario_type"]
          share_config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_label?: string | null
          enabled?: boolean
          id?: string
          scenario_type: Database["public"]["Enums"]["panic_scenario_type"]
          share_config?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_label?: string | null
          enabled?: boolean
          id?: string
          scenario_type?: Database["public"]["Enums"]["panic_scenario_type"]
          share_config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_items: {
        Row: {
          ciphertext: string
          created_at: string
          id: string
          iv: string
          plan_type: string
          salt: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          ciphertext: string
          created_at?: string
          id?: string
          iv: string
          plan_type: string
          salt: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          ciphertext?: string
          created_at?: string
          id?: string
          iv?: string
          plan_type?: string
          salt?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      premium_entitlements: {
        Row: {
          granted_at: string | null
          is_premium: boolean
          plan_name: string
          price_eur: number
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          is_premium?: boolean
          plan_name?: string
          price_eur?: number
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          is_premium?: boolean
          plan_name?: string
          price_eur?: number
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_plans: {
        Row: {
          comms_config: Json | null
          constraints: Json | null
          created_at: string
          generation_version: number | null
          home_location: Json | null
          id: string
          last_generated_at: string | null
          plan_a_json: Json | null
          plan_b_json: Json | null
          priorities: string[] | null
          safe_locations: Json | null
          scenario_set: string[] | null
          status: string
          updated_at: string
          user_id: string
          wizard_inputs: Json
        }
        Insert: {
          comms_config?: Json | null
          constraints?: Json | null
          created_at?: string
          generation_version?: number | null
          home_location?: Json | null
          id?: string
          last_generated_at?: string | null
          plan_a_json?: Json | null
          plan_b_json?: Json | null
          priorities?: string[] | null
          safe_locations?: Json | null
          scenario_set?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
          wizard_inputs?: Json
        }
        Update: {
          comms_config?: Json | null
          constraints?: Json | null
          created_at?: string
          generation_version?: number | null
          home_location?: Json | null
          id?: string
          last_generated_at?: string | null
          plan_a_json?: Json | null
          plan_b_json?: Json | null
          priorities?: string[] | null
          safe_locations?: Json | null
          scenario_set?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
          wizard_inputs?: Json
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          ai_insights: Json | null
          breakdown: Json
          city: string | null
          country: string | null
          created_at: string
          id: string
          inputs: Json
          risk_level: string | null
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights?: Json | null
          breakdown?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          risk_level?: string | null
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insights?: Json | null
          breakdown?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          risk_level?: string | null
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          created_at: string | null
          email: string
          error: string | null
          id: string
          send_at: string
          sent_at: string | null
          status: string | null
          stripe_event_id: string | null
          template_data: Json | null
          template_type: string
        }
        Insert: {
          created_at?: string | null
          email: string
          error?: string | null
          id?: string
          send_at: string
          sent_at?: string | null
          status?: string | null
          stripe_event_id?: string | null
          template_data?: Json | null
          template_type: string
        }
        Update: {
          created_at?: string | null
          email?: string
          error?: string | null
          id?: string
          send_at?: string
          sent_at?: string | null
          status?: string | null
          stripe_event_id?: string | null
          template_data?: Json | null
          template_type?: string
        }
        Relationships: []
      }
      stripe_customer_map: {
        Row: {
          created_at: string | null
          id: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          event_id: string
          processed_at: string | null
        }
        Insert: {
          event_id: string
          processed_at?: string | null
        }
        Update: {
          event_id?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      supplies_plans: {
        Row: {
          created_at: string
          days: number
          household_size_bucket: string | null
          id: string
          inputs: Json
          plan: Json
          preparedness_pct: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days?: number
          household_size_bucket?: string | null
          id?: string
          inputs?: Json
          plan?: Json
          preparedness_pct?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: number
          household_size_bucket?: string | null
          id?: string
          inputs?: Json
          plan?: Json
          preparedness_pct?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_cursors: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          last_synced_at: string | null
          table_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          last_synced_at?: string | null
          table_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          last_synced_at?: string | null
          table_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string | null
          device_id: string
          device_name: string | null
          id: string
          last_seen_at: string | null
          platform: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          device_name?: string | null
          id?: string
          last_seen_at?: string | null
          platform?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          device_name?: string | null
          id?: string
          last_seen_at?: string | null
          platform?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          country: string | null
          created_at: string
          locale: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          locale?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          locale?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_items: {
        Row: {
          ciphertext: string
          created_at: string
          id: string
          iv: string
          salt: string
          section: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          ciphertext: string
          created_at?: string
          id?: string
          iv: string
          salt: string
          section: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          ciphertext?: string
          created_at?: string
          id?: string
          iv?: string
          salt?: string
          section?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      weekly_briefings: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: string
          is_public: boolean
          item_ids: string[] | null
          last_updated_at: string | null
          rendered_summary: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean
          item_ids?: string[] | null
          last_updated_at?: string | null
          rendered_summary?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean
          item_ids?: string[] | null
          last_updated_at?: string | null
          rendered_summary?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_premium: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      alert_frequency: "immediate" | "daily" | "weekly"
      news_severity: "major" | "moderate"
      news_source_type: "rss" | "api"
      panic_activation_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
      panic_notification_channel: "email" | "sms"
      panic_notification_status: "pending" | "sent" | "delivered" | "failed"
      panic_scenario_type: "medical" | "natural" | "security" | "custom"
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
      alert_frequency: ["immediate", "daily", "weekly"],
      news_severity: ["major", "moderate"],
      news_source_type: ["rss", "api"],
      panic_activation_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
      ],
      panic_notification_channel: ["email", "sms"],
      panic_notification_status: ["pending", "sent", "delivered", "failed"],
      panic_scenario_type: ["medical", "natural", "security", "custom"],
    },
  },
} as const

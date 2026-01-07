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
          is_premium: boolean
          plan_name: string
          price_eur: number
          updated_at: string
          user_id: string
        }
        Insert: {
          is_premium?: boolean
          plan_name?: string
          price_eur?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          is_premium?: boolean
          plan_name?: string
          price_eur?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
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
      [_ in never]: never
    }
    Enums: {
      alert_frequency: "immediate" | "daily" | "weekly"
      news_severity: "major" | "moderate"
      news_source_type: "rss" | "api"
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
    },
  },
} as const

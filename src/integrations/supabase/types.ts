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
      alert_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          frequency: Database["public"]["Enums"]["alert_frequency"] | null
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
      news_items: {
        Row: {
          created_at: string | null
          dedupe_key: string
          fetched_at: string | null
          id: string
          published_at: string | null
          region: string | null
          severity: Database["public"]["Enums"]["news_severity"] | null
          source_id: string | null
          summary: string | null
          title: string
          topics: string[] | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          dedupe_key: string
          fetched_at?: string | null
          id?: string
          published_at?: string | null
          region?: string | null
          severity?: Database["public"]["Enums"]["news_severity"] | null
          source_id?: string | null
          summary?: string | null
          title: string
          topics?: string[] | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          dedupe_key?: string
          fetched_at?: string | null
          id?: string
          published_at?: string | null
          region?: string | null
          severity?: Database["public"]["Enums"]["news_severity"] | null
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
          name: string
          region_scope: string | null
          topics: string[] | null
          type: Database["public"]["Enums"]["news_source_type"]
        }
        Insert: {
          base_url: string
          created_at?: string | null
          enabled?: boolean | null
          id: string
          name: string
          region_scope?: string | null
          topics?: string[] | null
          type: Database["public"]["Enums"]["news_source_type"]
        }
        Update: {
          base_url?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          region_scope?: string | null
          topics?: string[] | null
          type?: Database["public"]["Enums"]["news_source_type"]
        }
        Relationships: []
      }
      weekly_briefings: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: string
          item_ids: string[] | null
          rendered_summary: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          item_ids?: string[] | null
          rendered_summary?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          item_ids?: string[] | null
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

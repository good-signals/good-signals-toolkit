export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_custom_metrics: {
        Row: {
          account_id: string
          category: string
          created_at: string
          default_target_value: number | null
          description: string | null
          higher_is_better: boolean
          id: string
          metric_identifier: string
          name: string
          units: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          category?: string
          created_at?: string
          default_target_value?: number | null
          description?: string | null
          higher_is_better?: boolean
          id?: string
          metric_identifier: string
          name: string
          units?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          category?: string
          created_at?: string
          default_target_value?: number | null
          description?: string | null
          higher_is_better?: boolean
          id?: string
          metric_identifier?: string
          name?: string
          units?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_custom_metrics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_memberships: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_signal_thresholds: {
        Row: {
          account_id: string
          bad_threshold: number
          created_at: string
          good_threshold: number
          id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          bad_threshold?: number
          created_at?: string
          good_threshold?: number
          id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          bad_threshold?: number
          created_at?: string
          good_threshold?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          address: string | null
          category: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      assessment_documents: {
        Row: {
          assessment_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_documents_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "site_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_metric_values: {
        Row: {
          assessment_id: string
          category: string
          created_at: string
          entered_value: number
          id: string
          image_url: string | null
          label: string
          measurement_type: string | null
          metric_identifier: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          category: string
          created_at?: string
          entered_value: number
          id?: string
          image_url?: string | null
          label: string
          measurement_type?: string | null
          metric_identifier: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          category?: string
          created_at?: string
          entered_value?: number
          id?: string
          image_url?: string | null
          label?: string
          measurement_type?: string | null
          metric_identifier?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_metric_values_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "site_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_site_visit_ratings: {
        Row: {
          assessment_id: string
          created_at: string
          criterion_key: Database["public"]["Enums"]["site_visit_criterion_key"]
          id: string
          image_url: string | null
          notes: string | null
          rating_description: string | null
          rating_grade: Database["public"]["Enums"]["site_visit_rating_grade"]
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          criterion_key: Database["public"]["Enums"]["site_visit_criterion_key"]
          id?: string
          image_url?: string | null
          notes?: string | null
          rating_description?: string | null
          rating_grade: Database["public"]["Enums"]["site_visit_rating_grade"]
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          criterion_key?: Database["public"]["Enums"]["site_visit_criterion_key"]
          id?: string
          image_url?: string | null
          notes?: string | null
          rating_description?: string | null
          rating_grade?: Database["public"]["Enums"]["site_visit_rating_grade"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_site_visit_ratings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "site_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_metric_sections: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_assessments: {
        Row: {
          account_id: string
          address_line1: string | null
          address_line2: string | null
          assessment_name: string | null
          city: string | null
          completion_percentage: number | null
          country: string | null
          created_at: string
          executive_summary: string | null
          id: string
          last_summary_generated_at: string | null
          latitude: number | null
          longitude: number | null
          postal_code: string | null
          site_signal_score: number | null
          site_status: string | null
          state_province: string | null
          target_metric_set_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          address_line1?: string | null
          address_line2?: string | null
          assessment_name?: string | null
          city?: string | null
          completion_percentage?: number | null
          country?: string | null
          created_at?: string
          executive_summary?: string | null
          id?: string
          last_summary_generated_at?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          site_signal_score?: number | null
          site_status?: string | null
          state_province?: string | null
          target_metric_set_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          address_line1?: string | null
          address_line2?: string | null
          assessment_name?: string | null
          city?: string | null
          completion_percentage?: number | null
          country?: string | null
          created_at?: string
          executive_summary?: string | null
          id?: string
          last_summary_generated_at?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          site_signal_score?: number | null
          site_status?: string | null
          state_province?: string | null
          target_metric_set_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_assessments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_assessments_target_metric_set_id_fkey"
            columns: ["target_metric_set_id"]
            isOneToOne: false
            referencedRelation: "target_metric_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_target_metric_set_enabled_sections: {
        Row: {
          created_at: string
          id: string
          metric_set_id: string
          section_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_set_id: string
          section_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_set_id?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_target_metric_set_enabled_sections_metric_set_id_fkey"
            columns: ["metric_set_id"]
            isOneToOne: false
            referencedRelation: "standard_target_metric_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_target_metric_sets: {
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
      standard_target_metric_settings: {
        Row: {
          category: string
          created_at: string
          higher_is_better: boolean
          id: string
          is_custom: boolean
          label: string
          measurement_type: string | null
          metric_identifier: string
          metric_set_id: string
          target_value: number
          units: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          higher_is_better?: boolean
          id?: string
          is_custom?: boolean
          label: string
          measurement_type?: string | null
          metric_identifier: string
          metric_set_id: string
          target_value: number
          units?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          higher_is_better?: boolean
          id?: string
          is_custom?: boolean
          label?: string
          measurement_type?: string | null
          metric_identifier?: string
          metric_set_id?: string
          target_value?: number
          units?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_target_metric_settings_metric_set_id_fkey"
            columns: ["metric_set_id"]
            isOneToOne: false
            referencedRelation: "standard_target_metric_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      target_metric_set_enabled_sections: {
        Row: {
          created_at: string
          id: string
          metric_set_id: string
          section_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_set_id: string
          section_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_set_id?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_metric_set_enabled_sections_metric_set_id_fkey"
            columns: ["metric_set_id"]
            isOneToOne: false
            referencedRelation: "target_metric_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      target_metric_sets: {
        Row: {
          account_id: string
          created_at: string
          has_enabled_sections_data: boolean
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          has_enabled_sections_data?: boolean
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          has_enabled_sections_data?: boolean
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_target_metric_sets_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      treasure_map_settings: {
        Row: {
          account_id: string
          created_at: string
          embed_code: string | null
          id: string
          map_type: string
          map_url: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          embed_code?: string | null
          id?: string
          map_type: string
          map_url?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          embed_code?: string | null
          id?: string
          map_type?: string
          map_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasure_map_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_metrics_settings: {
        Row: {
          account_id: string
          category: string
          created_at: string
          higher_is_better: boolean
          id: string
          label: string
          measurement_type: string | null
          metric_identifier: string
          metric_set_id: string | null
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          category: string
          created_at?: string
          higher_is_better: boolean
          id?: string
          label: string
          measurement_type?: string | null
          metric_identifier: string
          metric_set_id?: string | null
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          category?: string
          created_at?: string
          higher_is_better?: boolean
          id?: string
          label?: string
          measurement_type?: string | null
          metric_identifier?: string
          metric_set_id?: string | null
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_custom_metrics_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_metrics_settings_metric_set_id_fkey"
            columns: ["metric_set_id"]
            isOneToOne: false
            referencedRelation: "target_metric_sets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "super_admin" | "account_admin" | "account_user"
      site_visit_criterion_key:
        | "visibility"
        | "signage"
        | "accessibility"
        | "parking"
        | "loading"
        | "safety"
        | "aesthetics"
        | "storefront_traffic"
        | "layout_size_of_space"
        | "delivery_condition"
      site_visit_rating_grade: "A" | "B" | "C" | "D" | "F"
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
      app_role: ["super_admin", "account_admin", "account_user"],
      site_visit_criterion_key: [
        "visibility",
        "signage",
        "accessibility",
        "parking",
        "loading",
        "safety",
        "aesthetics",
        "storefront_traffic",
        "layout_size_of_space",
        "delivery_condition",
      ],
      site_visit_rating_grade: ["A", "B", "C", "D", "F"],
    },
  },
} as const

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
      analysis_results: {
        Row: {
          analysis_type: string
          analyzed_at: string | null
          case_id: string | null
          id: string
          result_data: Json | null
          sentiment_data: Json | null
          target: string
        }
        Insert: {
          analysis_type: string
          analyzed_at?: string | null
          case_id?: string | null
          id?: string
          result_data?: Json | null
          sentiment_data?: Json | null
          target: string
        }
        Update: {
          analysis_type?: string
          analyzed_at?: string | null
          case_id?: string | null
          id?: string
          result_data?: Json | null
          sentiment_data?: Json | null
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "investigation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      investigation_cases: {
        Row: {
          cache_duration_days: number | null
          case_name: string
          case_number: string
          case_password_hash: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          lead_investigator: string | null
          priority: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cache_duration_days?: number | null
          case_name: string
          case_number: string
          case_password_hash?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          lead_investigator?: string | null
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cache_duration_days?: number | null
          case_name?: string
          case_number?: string
          case_password_hash?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          lead_investigator?: string | null
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investigation_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_reports: {
        Row: {
          case_id: string | null
          export_format: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          report_data: Json | null
          report_type: string
          selected_modules: Json | null
        }
        Insert: {
          case_id?: string | null
          export_format?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_data?: Json | null
          report_type: string
          selected_modules?: Json | null
        }
        Update: {
          case_id?: string | null
          export_format?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_data?: Json | null
          report_type?: string
          selected_modules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "investigation_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "investigation_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investigation_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_sessions: {
        Row: {
          activities: Json | null
          case_id: string | null
          ended_at: string | null
          id: string
          new_activity_count: number | null
          profile_data: Json | null
          search_type: string
          started_at: string | null
          target_name: string
          word_cloud_data: Json | null
        }
        Insert: {
          activities?: Json | null
          case_id?: string | null
          ended_at?: string | null
          id?: string
          new_activity_count?: number | null
          profile_data?: Json | null
          search_type: string
          started_at?: string | null
          target_name: string
          word_cloud_data?: Json | null
        }
        Update: {
          activities?: Json | null
          case_id?: string | null
          ended_at?: string | null
          id?: string
          new_activity_count?: number | null
          profile_data?: Json | null
          search_type?: string
          started_at?: string | null
          target_name?: string
          word_cloud_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "investigation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reddit_comments: {
        Row: {
          author: string | null
          body: string | null
          case_id: string | null
          collected_at: string | null
          comment_id: string | null
          created_utc: string | null
          id: string
          link_title: string | null
          metadata: Json | null
          permalink: string | null
          score: number | null
          sentiment: string | null
          sentiment_explanation: string | null
          subreddit: string | null
        }
        Insert: {
          author?: string | null
          body?: string | null
          case_id?: string | null
          collected_at?: string | null
          comment_id?: string | null
          created_utc?: string | null
          id?: string
          link_title?: string | null
          metadata?: Json | null
          permalink?: string | null
          score?: number | null
          sentiment?: string | null
          sentiment_explanation?: string | null
          subreddit?: string | null
        }
        Update: {
          author?: string | null
          body?: string | null
          case_id?: string | null
          collected_at?: string | null
          comment_id?: string | null
          created_utc?: string | null
          id?: string
          link_title?: string | null
          metadata?: Json | null
          permalink?: string | null
          score?: number | null
          sentiment?: string | null
          sentiment_explanation?: string | null
          subreddit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reddit_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "investigation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      reddit_posts: {
        Row: {
          author: string | null
          case_id: string | null
          collected_at: string | null
          content: string | null
          created_utc: string | null
          id: string
          metadata: Json | null
          num_comments: number | null
          permalink: string | null
          post_id: string | null
          score: number | null
          sentiment: string | null
          sentiment_explanation: string | null
          subreddit: string | null
          title: string | null
        }
        Insert: {
          author?: string | null
          case_id?: string | null
          collected_at?: string | null
          content?: string | null
          created_utc?: string | null
          id?: string
          metadata?: Json | null
          num_comments?: number | null
          permalink?: string | null
          post_id?: string | null
          score?: number | null
          sentiment?: string | null
          sentiment_explanation?: string | null
          subreddit?: string | null
          title?: string | null
        }
        Update: {
          author?: string | null
          case_id?: string | null
          collected_at?: string | null
          content?: string | null
          created_utc?: string | null
          id?: string
          metadata?: Json | null
          num_comments?: number | null
          permalink?: string | null
          post_id?: string | null
          score?: number | null
          sentiment?: string | null
          sentiment_explanation?: string | null
          subreddit?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reddit_posts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "investigation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          invite_token: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
        }
        Relationships: []
      }
      user_profiles_analyzed: {
        Row: {
          account_age: string | null
          active_subreddits: Json | null
          activity_pattern: Json | null
          analyzed_at: string | null
          behavior_patterns: Json | null
          case_id: string | null
          comment_karma: number | null
          comment_sentiments: Json | null
          id: string
          location_indicators: Json | null
          post_karma: number | null
          post_sentiments: Json | null
          sentiment_analysis: Json | null
          total_karma: number | null
          username: string
          word_cloud: Json | null
        }
        Insert: {
          account_age?: string | null
          active_subreddits?: Json | null
          activity_pattern?: Json | null
          analyzed_at?: string | null
          behavior_patterns?: Json | null
          case_id?: string | null
          comment_karma?: number | null
          comment_sentiments?: Json | null
          id?: string
          location_indicators?: Json | null
          post_karma?: number | null
          post_sentiments?: Json | null
          sentiment_analysis?: Json | null
          total_karma?: number | null
          username: string
          word_cloud?: Json | null
        }
        Update: {
          account_age?: string | null
          active_subreddits?: Json | null
          activity_pattern?: Json | null
          analyzed_at?: string | null
          behavior_patterns?: Json | null
          case_id?: string | null
          comment_karma?: number | null
          comment_sentiments?: Json | null
          id?: string
          location_indicators?: Json | null
          post_karma?: number | null
          post_sentiments?: Json | null
          sentiment_analysis?: Json | null
          total_karma?: number | null
          username?: string
          word_cloud?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_analyzed_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "investigation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_token: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_case_password: { Args: { p_password: string }; Returns: string }
      log_audit_event: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: string
      }
      mark_invite_used: { Args: { p_invite_token: string }; Returns: boolean }
      verify_case_password: {
        Args: { p_case_id: string; p_password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

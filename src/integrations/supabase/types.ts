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
      analyses: {
        Row: {
          analysis_text: string
          company_id: string | null
          company_name: string | null
          created_at: string
          file_name: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          analysis_text: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          file_name: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          analysis_text?: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          file_name?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_comments: {
        Row: {
          analysis_id: string
          comment_text: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          comment_text: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_comments_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_shares: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          owner_id: string
          permission: string
          shared_with_email: string
          shared_with_user_id: string | null
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          owner_id: string
          permission: string
          shared_with_email: string
          shared_with_user_id?: string | null
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          permission?: string
          shared_with_email?: string
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_shares_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      app_updates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          include_in_next_email: boolean | null
          is_published: boolean | null
          published_at: string | null
          status: string | null
          title: string
          version: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          include_in_next_email?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          status?: string | null
          title: string
          version?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          include_in_next_email?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          status?: string | null
          title?: string
          version?: string | null
        }
        Relationships: []
      }
      chat_analytics: {
        Row: {
          avg_conversation_length: number | null
          avg_response_time_ms: number | null
          avg_user_satisfaction: number | null
          created_at: string
          emerging_patterns: Json | null
          id: string
          period_end: string
          period_start: string
          top_categories: Json | null
          total_conversations: number | null
          total_messages: number | null
        }
        Insert: {
          avg_conversation_length?: number | null
          avg_response_time_ms?: number | null
          avg_user_satisfaction?: number | null
          created_at?: string
          emerging_patterns?: Json | null
          id?: string
          period_end: string
          period_start: string
          top_categories?: Json | null
          total_conversations?: number | null
          total_messages?: number | null
        }
        Update: {
          avg_conversation_length?: number | null
          avg_response_time_ms?: number | null
          avg_user_satisfaction?: number | null
          created_at?: string
          emerging_patterns?: Json | null
          id?: string
          period_end?: string
          period_start?: string
          top_categories?: Json | null
          total_conversations?: number | null
          total_messages?: number | null
        }
        Relationships: []
      }
      chat_cache: {
        Row: {
          answer_text: string
          created_at: string
          expires_at: string
          hit_count: number | null
          id: string
          last_used_at: string
          question_hash: string
          question_text: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_used_at?: string
          question_hash: string
          question_text: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_used_at?: string
          question_hash?: string
          question_text?: string
        }
        Relationships: []
      }
      chat_feedback: {
        Row: {
          conversation_message_id: string | null
          created_at: string
          feedback_text: string | null
          id: string
          question_category: string | null
          rating: number
          response_length: number | null
          response_time_ms: number | null
          user_id: string
        }
        Insert: {
          conversation_message_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          question_category?: string | null
          rating: number
          response_length?: number | null
          response_time_ms?: number | null
          user_id: string
        }
        Update: {
          conversation_message_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          question_category?: string | null
          rating?: number
          response_length?: number | null
          response_time_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_feedback_conversation_message_id_fkey"
            columns: ["conversation_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_history"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_insights: {
        Row: {
          analysis_id: string | null
          created_at: string | null
          description: string
          id: string
          insight_type: string
          is_read: boolean | null
          metadata: Json | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          insight_type: string
          is_read?: boolean | null
          metadata?: Json | null
          severity: string
          title: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          insight_type?: string
          is_read?: boolean | null
          metadata?: Json | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_insights_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_patterns: {
        Row: {
          avg_response_time: number | null
          created_at: string
          frequency: number | null
          id: string
          last_asked_at: string | null
          metadata: Json | null
          question_category: string
          question_pattern: string
          success_rate: number | null
          suggested_response_template: string | null
        }
        Insert: {
          avg_response_time?: number | null
          created_at?: string
          frequency?: number | null
          id?: string
          last_asked_at?: string | null
          metadata?: Json | null
          question_category: string
          question_pattern: string
          success_rate?: number | null
          suggested_response_template?: string | null
        }
        Update: {
          avg_response_time?: number | null
          created_at?: string
          frequency?: number | null
          id?: string
          last_asked_at?: string | null
          metadata?: Json | null
          question_category?: string
          question_pattern?: string
          success_rate?: number | null
          suggested_response_template?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          cif: string | null
          company_name: string
          contact_person: string | null
          created_at: string
          id: string
          notes: string | null
          phone: string | null
          registration_number: string | null
          tax_type: Database["public"]["Enums"]["tax_type"] | null
          updated_at: string
          user_id: string
          vat_payer: boolean | null
        }
        Insert: {
          address?: string | null
          cif?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          phone?: string | null
          registration_number?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          updated_at?: string
          user_id: string
          vat_payer?: boolean | null
        }
        Update: {
          address?: string | null
          cif?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          phone?: string | null
          registration_number?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          updated_at?: string
          user_id?: string
          vat_payer?: boolean | null
        }
        Relationships: []
      }
      companies_audit_log: {
        Row: {
          accessed_at: string | null
          accessed_by: string | null
          action: string
          company_id: string | null
          id: string
        }
        Insert: {
          accessed_at?: string | null
          accessed_by?: string | null
          action: string
          company_id?: string | null
          id?: string
        }
        Update: {
          accessed_at?: string | null
          accessed_by?: string | null
          action?: string
          company_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_history: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      email_broadcasts: {
        Row: {
          created_at: string
          created_by: string
          filter_criteria: Json | null
          id: string
          message: string
          scheduled_at: string | null
          sent_at: string | null
          sent_to_count: number | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          created_by: string
          filter_criteria?: Json | null
          id?: string
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_to_count?: number | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          created_by?: string
          filter_criteria?: Json | null
          id?: string
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_to_count?: number | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      email_contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          last_used_at: string
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_used_at?: string
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_used_at?: string
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          email_type: string
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string
          status: string | null
          subject: string
        }
        Insert: {
          email_type: string
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string
          status?: string | null
          subject: string
        }
        Update: {
          email_type?: string
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      favorite_analyses: {
        Row: {
          analysis_id: string
          color: string | null
          created_at: string
          id: string
          label: string
          notes: string | null
          user_id: string
        }
        Insert: {
          analysis_id: string
          color?: string | null
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string
          color?: string | null
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_analyses_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_news: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          link: string
          published_at: string
          source: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          link: string
          published_at: string
          source: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          link?: string
          published_at?: string
          source?: string
          title?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          avg_rating: number | null
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          priority: number | null
          response_template: string
          topic: string
          total_ratings: number | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          avg_rating?: number | null
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          priority?: number | null
          response_template: string
          topic: string
          total_ratings?: number | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          avg_rating?: number | null
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          priority?: number | null
          response_template?: string
          topic?: string
          total_ratings?: number | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      legal_document_analyses: {
        Row: {
          analysis_summary: Json | null
          conversation_id: string
          created_at: string
          document_name: string
          document_path: string
          document_type: string
          extracted_text: string | null
          id: string
          key_points: Json | null
          risk_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_summary?: Json | null
          conversation_id: string
          created_at?: string
          document_name: string
          document_path: string
          document_type: string
          extracted_text?: string | null
          id?: string
          key_points?: Json | null
          risk_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_summary?: Json | null
          conversation_id?: string
          created_at?: string
          document_name?: string
          document_path?: string
          document_type?: string
          extracted_text?: string | null
          id?: string
          key_points?: Json | null
          risk_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      research_data: {
        Row: {
          case_studies: Json
          course_name: string
          created_at: string
          data_collection_date: string
          id: string
          metrics_collected: Json
          research_notes: string | null
          research_theme: string
          theoretical_frameworks: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          case_studies?: Json
          course_name: string
          created_at?: string
          data_collection_date: string
          id?: string
          metrics_collected?: Json
          research_notes?: string | null
          research_theme: string
          theoretical_frameworks?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          case_studies?: Json
          course_name?: string
          created_at?: string
          data_collection_date?: string
          id?: string
          metrics_collected?: Json
          research_notes?: string | null
          research_theme?: string
          theoretical_frameworks?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      voice_usage: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          minutes_used: number
          month_year: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          minutes_used?: number
          month_year: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          minutes_used?: number
          month_year?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: { p_endpoint: string; p_max_requests?: number; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      extract_question_pattern: {
        Args: { question_text: string }
        Returns: {
          category: string
          pattern: string
        }[]
      }
      get_voice_usage_for_month: {
        Args: Record<PropertyKey, never>
        Returns: {
          minutes_remaining: number
          minutes_used: number
          month_year: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_voice_usage: {
        Args: { minutes_to_add: number }
        Returns: {
          minutes_remaining: number
          new_minutes_used: number
          success: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      tax_type: "profit" | "micro" | "dividend" | "norma_venit"
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
      tax_type: ["profit", "micro", "dividend", "norma_venit"],
    },
  },
} as const

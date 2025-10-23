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
      accountant_invitations: {
        Row: {
          accepted_at: string | null
          accountant_id: string
          client_email: string
          client_name: string | null
          company_name: string
          created_at: string | null
          expires_at: string | null
          id: string
          invitation_token: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          accountant_id: string
          client_email: string
          client_name?: string | null
          company_name: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_token?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          accountant_id?: string
          client_email?: string
          client_name?: string | null
          company_name?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_token?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accountant_invitations_accountant_id_fkey"
            columns: ["accountant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accountant_tasks: {
        Row: {
          actual_hours: number | null
          assigned_by: string
          assigned_to: string
          attachments: Json | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string | null
          started_at: string | null
          status: string | null
          tags: Json | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_by: string
          assigned_to: string
          attachments?: Json | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          started_at?: string | null
          status?: string | null
          tags?: Json | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_by?: string
          assigned_to?: string
          attachments?: Json | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          started_at?: string | null
          status?: string | null
          tags?: Json | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accountant_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_budget_limits: {
        Row: {
          alert_at_percent: number
          created_at: string
          id: string
          is_active: boolean
          monthly_budget_cents: number
          trial_credits_cents: number | null
          trial_credits_granted_at: string | null
          trial_credits_used_cents: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_at_percent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_budget_cents?: number
          trial_credits_cents?: number | null
          trial_credits_granted_at?: string | null
          trial_credits_used_cents?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_at_percent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_budget_cents?: number
          trial_credits_cents?: number | null
          trial_credits_granted_at?: string | null
          trial_credits_used_cents?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          endpoint: string
          error_message: string | null
          estimated_cost_cents: number
          id: string
          input_tokens: number
          model: string
          month_year: string
          output_tokens: number
          request_duration_ms: number | null
          success: boolean
          total_tokens: number
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_message?: string | null
          estimated_cost_cents?: number
          id?: string
          input_tokens?: number
          model: string
          month_year: string
          output_tokens?: number
          request_duration_ms?: number | null
          success?: boolean
          total_tokens?: number
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_message?: string | null
          estimated_cost_cents?: number
          id?: string
          input_tokens?: number
          model?: string
          month_year?: string
          output_tokens?: number
          request_duration_ms?: number | null
          success?: boolean
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      analyses: {
        Row: {
          analysis_text: string
          company_id: string | null
          company_name: string | null
          created_at: string
          file_name: string
          id: string
          is_locked: boolean | null
          locked_at: string | null
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
          is_locked?: boolean | null
          locked_at?: string | null
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
          is_locked?: boolean | null
          locked_at?: string | null
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
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_name: string
          id: string
          ip_address: string | null
          page_url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_name: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_name?: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
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
      client_contacts: {
        Row: {
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          company_id: string
          created_at: string | null
          document_name: string
          document_type: string | null
          file_path: string
          file_size: number | null
          id: string
          notes: string | null
          period: string | null
          tags: Json | null
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          document_name: string
          document_type?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          notes?: string | null
          period?: string | null
          tags?: Json | null
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          document_name?: string
          document_type?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          notes?: string | null
          period?: string | null
          tags?: Json | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          access_token: string
          company_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          login_count: number | null
        }
        Insert: {
          access_token?: string
          company_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          login_count?: number | null
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          login_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accountant_brand_color: string | null
          accountant_logo_url: string | null
          address: string | null
          billing_cycle: string | null
          caen_codes: Json | null
          cash_accounting_vat: boolean | null
          cif: string | null
          client_category: string | null
          client_status: string | null
          company_name: string
          contact_email: string | null
          contact_person: string | null
          created_at: string
          cui: string | null
          fiscal_history: Json | null
          id: string
          is_active: boolean | null
          is_own_company: boolean | null
          last_fiscal_update: string | null
          managed_by_accountant_id: string | null
          notes: string | null
          phone: string | null
          registration_number: string | null
          special_regime: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          subscription_type: string | null
          tax_regime: string | null
          tax_type: Database["public"]["Enums"]["tax_type"] | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
          vat_payer: boolean | null
          vat_regime: string | null
        }
        Insert: {
          accountant_brand_color?: string | null
          accountant_logo_url?: string | null
          address?: string | null
          billing_cycle?: string | null
          caen_codes?: Json | null
          cash_accounting_vat?: boolean | null
          cif?: string | null
          client_category?: string | null
          client_status?: string | null
          company_name: string
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          cui?: string | null
          fiscal_history?: Json | null
          id?: string
          is_active?: boolean | null
          is_own_company?: boolean | null
          last_fiscal_update?: string | null
          managed_by_accountant_id?: string | null
          notes?: string | null
          phone?: string | null
          registration_number?: string | null
          special_regime?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          tax_regime?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
          vat_payer?: boolean | null
          vat_regime?: string | null
        }
        Update: {
          accountant_brand_color?: string | null
          accountant_logo_url?: string | null
          address?: string | null
          billing_cycle?: string | null
          caen_codes?: Json | null
          cash_accounting_vat?: boolean | null
          cif?: string | null
          client_category?: string | null
          client_status?: string | null
          company_name?: string
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          cui?: string | null
          fiscal_history?: Json | null
          id?: string
          is_active?: boolean | null
          is_own_company?: boolean | null
          last_fiscal_update?: string | null
          managed_by_accountant_id?: string | null
          notes?: string | null
          phone?: string | null
          registration_number?: string | null
          special_regime?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          tax_regime?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
          vat_payer?: boolean | null
          vat_regime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_managed_by_accountant_id_fkey"
            columns: ["managed_by_accountant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_summaries: {
        Row: {
          action_items: Json | null
          conversation_id: string
          created_at: string
          id: string
          key_points: Json | null
          strategies_discussed: Json | null
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          key_points?: Json | null
          strategies_discussed?: Json | null
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          key_points?: Json | null
          strategies_discussed?: Json | null
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credits_purchases: {
        Row: {
          amount_paid_cents: number
          created_at: string | null
          credits_added: number
          id: string
          metadata: Json | null
          package_name: string | null
          purchase_date: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid_cents: number
          created_at?: string | null
          credits_added: number
          id?: string
          metadata?: Json | null
          package_name?: string | null
          purchase_date?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid_cents?: number
          created_at?: string | null
          credits_added?: number
          id?: string
          metadata?: Json | null
          package_name?: string | null
          purchase_date?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_messages: {
        Row: {
          attachments: Json | null
          company_id: string | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          is_read: boolean | null
          message: string
          parent_message_id: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          subject: string | null
        }
        Insert: {
          attachments?: Json | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          is_read?: boolean | null
          message: string
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          subject?: string | null
        }
        Update: {
          attachments?: Json | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          is_read?: boolean | null
          message?: string
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "crm_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_users: {
        Row: {
          created_at: string
          deleted_at: string
          deleted_by: string | null
          deleted_by_email: string | null
          deletion_reason: string | null
          email: string
          full_name: string | null
          id: string
          original_user_id: string
          subscription_status: string | null
          subscription_type: string | null
          user_metadata: Json | null
        }
        Insert: {
          created_at: string
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_email?: string | null
          deletion_reason?: string | null
          email: string
          full_name?: string | null
          id?: string
          original_user_id: string
          subscription_status?: string | null
          subscription_type?: string | null
          user_metadata?: Json | null
        }
        Update: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_email?: string | null
          deletion_reason?: string | null
          email?: string
          full_name?: string | null
          id?: string
          original_user_id?: string
          subscription_status?: string | null
          subscription_type?: string | null
          user_metadata?: Json | null
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
      email_config: {
        Row: {
          accountant_id: string
          created_at: string | null
          email_provider: string
          from_email: string
          from_name: string | null
          id: string
          is_active: boolean | null
          last_tested: string | null
          smtp_host: string | null
          smtp_password_encrypted: string | null
          smtp_port: number | null
          smtp_user: string | null
          test_status: string | null
          updated_at: string | null
        }
        Insert: {
          accountant_id: string
          created_at?: string | null
          email_provider: string
          from_email: string
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          last_tested?: string | null
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          test_status?: string | null
          updated_at?: string | null
        }
        Update: {
          accountant_id?: string
          created_at?: string | null
          email_provider?: string
          from_email?: string
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          last_tested?: string | null
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          test_status?: string | null
          updated_at?: string | null
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
      email_templates: {
        Row: {
          accountant_id: string
          body: string
          category: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          subject: string
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          accountant_id: string
          body: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          accountant_id?: string
          body?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
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
      fiscal_deadlines: {
        Row: {
          accountant_id: string
          company_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          declaration_name: string
          declaration_type: string
          due_date: string
          id: string
          notes: string | null
          period: string | null
          priority: string | null
          reminder_days: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accountant_id: string
          company_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          declaration_name: string
          declaration_type: string
          due_date: string
          id?: string
          notes?: string | null
          period?: string | null
          priority?: string | null
          reminder_days?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accountant_id?: string
          company_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          declaration_name?: string
          declaration_type?: string
          due_date?: string
          id?: string
          notes?: string | null
          period?: string | null
          priority?: string | null
          reminder_days?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_deadlines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          account_type_selected: boolean | null
          created_at: string
          email: string
          full_name: string | null
          has_free_access: boolean | null
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          subscription_type:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          account_type_selected?: boolean | null
          created_at?: string
          email: string
          full_name?: string | null
          has_free_access?: boolean | null
          id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          account_type_selected?: boolean | null
          created_at?: string
          email?: string
          full_name?: string | null
          has_free_access?: boolean | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      research_data: {
        Row: {
          case_studies: Json
          content: string | null
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
          content?: string | null
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
          content?: string | null
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
      saved_strategies: {
        Row: {
          action_items: Json | null
          category: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_favorite: boolean | null
          related_strategies: Json | null
          tags: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          category: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          related_strategies?: Json | null
          tags?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          category?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          related_strategies?: Json | null
          tags?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          accountant_id: string
          body: string
          company_ids: string[]
          created_at: string | null
          failed_count: number | null
          id: string
          send_at: string
          sent_at: string | null
          sent_count: number | null
          status: string | null
          subject: string
          template_id: string | null
        }
        Insert: {
          accountant_id: string
          body: string
          company_ids: string[]
          created_at?: string | null
          failed_count?: number | null
          id?: string
          send_at: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject: string
          template_id?: string | null
        }
        Update: {
          accountant_id?: string
          body?: string
          company_ids?: string[]
          created_at?: string | null
          failed_count?: number | null
          id?: string
          send_at?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      smartbill_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_cif: string | null
          customer_email: string
          customer_name: string
          error_message: string | null
          id: string
          invoice_number: string | null
          invoice_series: string
          invoice_url: string | null
          smartbill_response: Json | null
          status: string
          stripe_customer_id: string
          stripe_session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_cif?: string | null
          customer_email: string
          customer_name: string
          error_message?: string | null
          id?: string
          invoice_number?: string | null
          invoice_series?: string
          invoice_url?: string | null
          smartbill_response?: Json | null
          status?: string
          stripe_customer_id: string
          stripe_session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_cif?: string | null
          customer_email?: string
          customer_name?: string
          error_message?: string | null
          id?: string
          invoice_number?: string | null
          invoice_series?: string
          invoice_url?: string | null
          smartbill_response?: Json | null
          status?: string
          stripe_customer_id?: string
          stripe_session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategic_council_members: {
        Row: {
          created_at: string
          entrepreneur_id: string
          id: string
          invited_at: string
          joined_at: string | null
          last_active_at: string | null
          member_email: string
          member_name: string | null
          role: Database["public"]["Enums"]["council_role"]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entrepreneur_id: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          last_active_at?: string | null
          member_email: string
          member_name?: string | null
          role?: Database["public"]["Enums"]["council_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entrepreneur_id?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          last_active_at?: string | null
          member_email?: string
          member_name?: string | null
          role?: Database["public"]["Enums"]["council_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategic_invitations: {
        Row: {
          created_at: string
          entrepreneur_id: string
          expires_at: string
          id: string
          invitation_token: string
          member_email: string
          member_name: string | null
          message: string | null
          role: Database["public"]["Enums"]["council_role"]
          status: string
        }
        Insert: {
          created_at?: string
          entrepreneur_id: string
          expires_at?: string
          id?: string
          invitation_token?: string
          member_email: string
          member_name?: string | null
          message?: string | null
          role?: Database["public"]["Enums"]["council_role"]
          status?: string
        }
        Update: {
          created_at?: string
          entrepreneur_id?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          member_email?: string
          member_name?: string | null
          message?: string | null
          role?: Database["public"]["Enums"]["council_role"]
          status?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          name: string
          plan_type: Database["public"]["Enums"]["subscription_type"]
          price_monthly_eur: number
          stripe_price_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          name: string
          plan_type: Database["public"]["Enums"]["subscription_type"]
          price_monthly_eur: number
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          plan_type?: Database["public"]["Enums"]["subscription_type"]
          price_monthly_eur?: number
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_health: {
        Row: {
          check_type: string
          checked_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          status: string
        }
        Insert: {
          check_type: string
          checked_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status: string
        }
        Update: {
          check_type?: string
          checked_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          terms_version: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          terms_version?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          terms_version?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      time_tracking: {
        Row: {
          company_id: string | null
          created_at: string | null
          date: string
          description: string | null
          hours: number
          id: string
          is_billable: boolean | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          hours: number
          id?: string
          is_billable?: boolean | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          hours?: number
          id?: string
          is_billable?: boolean | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "accountant_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_notifications: {
        Row: {
          created_at: string | null
          id: string
          notification_type: string
          sent: boolean | null
          sent_at: string | null
          trial_ends_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_type: string
          sent?: boolean | null
          sent_at?: string | null
          trial_ends_at: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_type?: string
          sent?: boolean | null
          sent_at?: string | null
          trial_ends_at?: string
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
      check_admin_access_rate: { Args: never; Returns: boolean }
      check_ai_budget: {
        Args: { p_user_id: string }
        Returns: {
          budget_cents: number
          can_proceed: boolean
          current_usage_cents: number
          message: string
          usage_percent: number
        }[]
      }
      check_rate_limit: {
        Args: { p_endpoint: string; p_max_requests?: number; p_user_id: string }
        Returns: boolean
      }
      check_trial_expiration_notifications: { Args: never; Returns: undefined }
      cleanup_old_data: { Args: never; Returns: undefined }
      extract_question_pattern: {
        Args: { question_text: string }
        Returns: {
          category: string
          pattern: string
        }[]
      }
      get_monthly_ai_usage: {
        Args: { p_month_year?: string; p_user_id?: string }
        Returns: {
          budget_cents: number
          month_year: string
          total_cost_cents: number
          total_requests: number
          total_tokens: number
          usage_percent: number
          user_id: string
        }[]
      }
      get_user_credits_report: {
        Args: { p_user_id: string }
        Returns: {
          current_budget_cents: number
          last_purchase_date: string
          purchase_count: number
          remaining_budget_cents: number
          total_credits_added: number
          total_purchased_cents: number
          total_spent_cents: number
          usage_count: number
          usage_percent: number
          user_email: string
        }[]
      }
      get_voice_usage_for_month: {
        Args: never
        Returns: {
          minutes_remaining: number
          minutes_used: number
          month_year: string
        }[]
      }
      grant_trial_credits_if_eligible: {
        Args: { p_user_id: string }
        Returns: {
          granted: boolean
          message: string
          trial_credits_cents: number
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
      log_admin_access: {
        Args: { p_action?: string; p_record_id: string; p_table_name: string }
        Returns: undefined
      }
      log_audit_event: {
        Args: {
          p_action_type: string
          p_metadata?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: { event_details?: Json; event_type: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      council_role: "advisor" | "partner" | "accountant" | "observer"
      subscription_type: "entrepreneur" | "accounting_firm"
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
      council_role: ["advisor", "partner", "accountant", "observer"],
      subscription_type: ["entrepreneur", "accounting_firm"],
      tax_type: ["profit", "micro", "dividend", "norma_venit"],
    },
  },
} as const

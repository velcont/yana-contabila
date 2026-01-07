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
      accountant_profiles: {
        Row: {
          created_at: string | null
          firm_name: string
          id: string
          location: string | null
          rating: number | null
          response_time_hours: number | null
          reviews_count: number | null
          specializations: string[] | null
          total_clients: number | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          firm_name: string
          id?: string
          location?: string | null
          rating?: number | null
          response_time_hours?: number | null
          reviews_count?: number | null
          specializations?: string[] | null
          total_clients?: number | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          firm_name?: string
          id?: string
          location?: string | null
          rating?: number | null
          response_time_hours?: number | null
          reviews_count?: number | null
          specializations?: string[] | null
          total_clients?: number | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          years_experience?: number | null
        }
        Relationships: []
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
      active_sessions: {
        Row: {
          current_page: string
          email: string
          id: string
          last_activity: string
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          current_page?: string
          email: string
          id?: string
          last_activity?: string
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          current_page?: string
          email?: string
          id?: string
          last_activity?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          details: Json | null
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_batch_queue: {
        Row: {
          batch_id: string | null
          conversation_id: string
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          priority: number | null
          processed_at: string | null
          result: Json | null
          similarity_hash: string | null
          status: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          conversation_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          priority?: number | null
          processed_at?: string | null
          result?: Json | null
          similarity_hash?: string | null
          status?: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          conversation_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          priority?: number | null
          processed_at?: string | null
          result?: Json | null
          similarity_hash?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
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
      ai_company_preferences: {
        Row: {
          company_id: string
          confidence: number | null
          created_at: string
          examples_count: number | null
          id: string
          preference_type: string
          preference_value: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          confidence?: number | null
          created_at?: string
          examples_count?: number | null
          id?: string
          preference_type: string
          preference_value: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          confidence?: number | null
          created_at?: string
          examples_count?: number | null
          id?: string
          preference_type?: string
          preference_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_company_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          answer: string
          company_id: string | null
          context: Json | null
          conversation_duration_seconds: number | null
          created_at: string
          id: string
          model_used: string | null
          question: string
          rating: number | null
          tokens_used: number | null
          updated_at: string
          user_feedback: string | null
          user_id: string
          was_helpful: boolean | null
        }
        Insert: {
          answer: string
          company_id?: string | null
          context?: Json | null
          conversation_duration_seconds?: number | null
          created_at?: string
          id?: string
          model_used?: string | null
          question: string
          rating?: number | null
          tokens_used?: number | null
          updated_at?: string
          user_feedback?: string | null
          user_id: string
          was_helpful?: boolean | null
        }
        Update: {
          answer?: string
          company_id?: string | null
          context?: Json | null
          conversation_duration_seconds?: number | null
          created_at?: string
          id?: string
          model_used?: string | null
          question?: string
          rating?: number | null
          tokens_used?: number | null
          updated_at?: string
          user_feedback?: string | null
          user_id?: string
          was_helpful?: boolean | null
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
      ai_corrections: {
        Row: {
          admin_notes: string | null
          applied_to_knowledge: boolean | null
          conversation_id: string | null
          correct_answer: string
          correction_type: string | null
          created_at: string | null
          id: string
          original_question: string
          updated_at: string | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
          validated_by_admin: boolean | null
          wrong_answer: string | null
        }
        Insert: {
          admin_notes?: string | null
          applied_to_knowledge?: boolean | null
          conversation_id?: string | null
          correct_answer: string
          correction_type?: string | null
          created_at?: string | null
          id?: string
          original_question: string
          updated_at?: string | null
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          validated_by_admin?: boolean | null
          wrong_answer?: string | null
        }
        Update: {
          admin_notes?: string | null
          applied_to_knowledge?: boolean | null
          conversation_id?: string | null
          correct_answer?: string
          correction_type?: string | null
          created_at?: string | null
          id?: string
          original_question?: string
          updated_at?: string | null
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_by_admin?: boolean | null
          wrong_answer?: string | null
        }
        Relationships: []
      }
      ai_experiments: {
        Row: {
          action_taken: string
          anonymized_pattern: string | null
          conversation_id: string | null
          created_at: string | null
          emotional_resonance: number | null
          evaluated_at: string | null
          experiment_type: string
          hypothesis: string | null
          id: string
          learning: string | null
          outcome: string | null
          user_id: string
          user_reaction: string | null
        }
        Insert: {
          action_taken: string
          anonymized_pattern?: string | null
          conversation_id?: string | null
          created_at?: string | null
          emotional_resonance?: number | null
          evaluated_at?: string | null
          experiment_type: string
          hypothesis?: string | null
          id?: string
          learning?: string | null
          outcome?: string | null
          user_id: string
          user_reaction?: string | null
        }
        Update: {
          action_taken?: string
          anonymized_pattern?: string | null
          conversation_id?: string | null
          created_at?: string | null
          emotional_resonance?: number | null
          evaluated_at?: string | null
          experiment_type?: string
          hypothesis?: string | null
          id?: string
          learning?: string | null
          outcome?: string | null
          user_id?: string
          user_reaction?: string | null
        }
        Relationships: []
      }
      ai_learned_patterns: {
        Row: {
          applies_to_company_id: string | null
          applies_to_company_size: string | null
          applies_to_industry: string | null
          confidence_score: number | null
          created_at: string
          example_questions: string[] | null
          first_seen_at: string
          id: string
          last_used_at: string | null
          pattern_description: string
          pattern_key: string
          pattern_type: string
          related_context: Json | null
          suggested_answer_template: string | null
          times_used: number | null
          times_validated: number | null
          updated_at: string
        }
        Insert: {
          applies_to_company_id?: string | null
          applies_to_company_size?: string | null
          applies_to_industry?: string | null
          confidence_score?: number | null
          created_at?: string
          example_questions?: string[] | null
          first_seen_at?: string
          id?: string
          last_used_at?: string | null
          pattern_description: string
          pattern_key: string
          pattern_type: string
          related_context?: Json | null
          suggested_answer_template?: string | null
          times_used?: number | null
          times_validated?: number | null
          updated_at?: string
        }
        Update: {
          applies_to_company_id?: string | null
          applies_to_company_size?: string | null
          applies_to_industry?: string | null
          confidence_score?: number | null
          created_at?: string
          example_questions?: string[] | null
          first_seen_at?: string
          id?: string
          last_used_at?: string | null
          pattern_description?: string
          pattern_key?: string
          pattern_type?: string
          related_context?: Json | null
          suggested_answer_template?: string | null
          times_used?: number | null
          times_validated?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_learned_patterns_applies_to_company_id_fkey"
            columns: ["applies_to_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reflection_logs: {
        Row: {
          answer_preview: string
          confidence_level: string
          conversation_id: string
          created_at: string
          id: string
          missing_context: string | null
          model_used: string
          processing_time_ms: number | null
          question: string
          self_score: number
          suggested_sources: string[] | null
          tokens_used: number | null
          user_id: string
          what_could_improve: string[] | null
          what_went_well: string[] | null
        }
        Insert: {
          answer_preview: string
          confidence_level: string
          conversation_id: string
          created_at?: string
          id?: string
          missing_context?: string | null
          model_used?: string
          processing_time_ms?: number | null
          question: string
          self_score: number
          suggested_sources?: string[] | null
          tokens_used?: number | null
          user_id: string
          what_could_improve?: string[] | null
          what_went_well?: string[] | null
        }
        Update: {
          answer_preview?: string
          confidence_level?: string
          conversation_id?: string
          created_at?: string
          id?: string
          missing_context?: string | null
          model_used?: string
          processing_time_ms?: number | null
          question?: string
          self_score?: number
          suggested_sources?: string[] | null
          tokens_used?: number | null
          user_id?: string
          what_could_improve?: string[] | null
          what_went_well?: string[] | null
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          cache_key: string
          cache_type: string
          cost_cents: number | null
          created_at: string | null
          expires_at: string | null
          hit_count: number | null
          id: string
          last_accessed_at: string | null
          model_used: string
          request_hash: string
          response_data: Json
          tokens_used: number | null
        }
        Insert: {
          cache_key: string
          cache_type: string
          cost_cents?: number | null
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          model_used: string
          request_hash: string
          response_data: Json
          tokens_used?: number | null
        }
        Update: {
          cache_key?: string
          cache_type?: string
          cost_cents?: number | null
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          model_used?: string
          request_hash?: string
          response_data?: Json
          tokens_used?: number | null
        }
        Relationships: []
      }
      ai_response_feedback: {
        Row: {
          conversation_id: string
          created_at: string
          feedback_type: string
          id: string
          missing_information: string | null
          rating: number | null
          response_segment: string | null
          suggested_improvement: string | null
          user_comment: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          feedback_type: string
          id?: string
          missing_information?: string | null
          rating?: number | null
          response_segment?: string | null
          suggested_improvement?: string | null
          user_comment?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          feedback_type?: string
          id?: string
          missing_information?: string | null
          rating?: number | null
          response_segment?: string | null
          suggested_improvement?: string | null
          user_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_response_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_surprises: {
        Row: {
          contradiction_type: string
          conversation_id: string | null
          created_at: string | null
          id: string
          new_information: string
          previous_belief: string
          resolution_approach: string | null
          resolution_status: string | null
          resolved_at: string | null
          surprise_intensity: number | null
          user_id: string
        }
        Insert: {
          contradiction_type: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          new_information: string
          previous_belief: string
          resolution_approach?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          surprise_intensity?: number | null
          user_id: string
        }
        Update: {
          contradiction_type?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          new_information?: string
          previous_belief?: string
          resolution_approach?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          surprise_intensity?: number | null
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
          council_validation: Json | null
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
          council_validation?: Json | null
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
          council_validation?: Json | null
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
          is_current_version: boolean | null
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
          is_current_version?: boolean | null
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
          is_current_version?: boolean | null
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
      balance_confirmations: {
        Row: {
          accounts_data: Json
          company_id: string | null
          company_name: string
          created_at: string
          cui: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accounts_data?: Json
          company_id?: string | null
          company_name: string
          created_at?: string
          cui?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accounts_data?: Json
          company_id?: string | null
          company_name?: string
          created_at?: string
          cui?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_confirmations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          color_id: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          event_category: string | null
          event_date: string
          event_type: string
          google_event_id: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          reminder_minutes: number | null
          start_time: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_category?: string | null
          event_date: string
          event_type: string
          google_event_id?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          reminder_minutes?: number | null
          start_time?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_category?: string | null
          event_date?: string
          event_type?: string
          google_event_id?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          reminder_minutes?: number | null
          start_time?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          refresh_token: string
          token_expiry: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          refresh_token: string
          token_expiry: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          refresh_token?: string
          token_expiry?: string
          updated_at?: string | null
          user_id?: string
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
      client_verification_history: {
        Row: {
          company_id: string
          created_at: string
          findings: Json
          id: string
          metadata: Json | null
          risk_level: string
          risk_score: number
          verified_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          findings?: Json
          id?: string
          metadata?: Json | null
          risk_level: string
          risk_score: number
          verified_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          findings?: Json
          id?: string
          metadata?: Json | null
          risk_level?: string
          risk_score?: number
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_verification_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
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
      company_team_assignments: {
        Row: {
          accountant_id: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          role_on_company: string
          team_member_id: string
          updated_at: string
        }
        Insert: {
          accountant_id: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role_on_company: string
          team_member_id: string
          updated_at?: string
        }
        Update: {
          accountant_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role_on_company?: string
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_team_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_team_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "workflow_team_members"
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
      cross_user_insights: {
        Row: {
          anti_pattern: string | null
          company_sizes: string[] | null
          created_at: string | null
          emotional_approach: string | null
          id: string
          industries: string[] | null
          last_updated: string | null
          occurrence_count: number | null
          pattern_description: string
          pattern_type: string
          recommended_response: string | null
          success_rate: number | null
        }
        Insert: {
          anti_pattern?: string | null
          company_sizes?: string[] | null
          created_at?: string | null
          emotional_approach?: string | null
          id?: string
          industries?: string[] | null
          last_updated?: string | null
          occurrence_count?: number | null
          pattern_description: string
          pattern_type: string
          recommended_response?: string | null
          success_rate?: number | null
        }
        Update: {
          anti_pattern?: string | null
          company_sizes?: string[] | null
          created_at?: string | null
          emotional_approach?: string | null
          id?: string
          industries?: string[] | null
          last_updated?: string | null
          occurrence_count?: number | null
          pattern_description?: string
          pattern_type?: string
          recommended_response?: string | null
          success_rate?: number | null
        }
        Relationships: []
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
      doctorate_chapter_files: {
        Row: {
          chapter_number: number
          chapter_title: string
          content: string | null
          file_name: string
          file_path: string
          id: string
          is_final_version: boolean | null
          uploaded_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          chapter_number: number
          chapter_title: string
          content?: string | null
          file_name: string
          file_path: string
          id?: string
          is_final_version?: boolean | null
          uploaded_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          chapter_number?: number
          chapter_title?: string
          content?: string | null
          file_name?: string
          file_path?: string
          id?: string
          is_final_version?: boolean | null
          uploaded_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      doctorate_chapters: {
        Row: {
          chapter_number: number
          chapter_title: string
          content: string | null
          created_at: string | null
          file_name: string | null
          file_path: string | null
          id: string
          last_modified: string | null
          metadata: Json | null
          status: string | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
          version: number | null
          word_count: number | null
        }
        Insert: {
          chapter_number: number
          chapter_title: string
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          last_modified?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
          version?: number | null
          word_count?: number | null
        }
        Update: {
          chapter_number?: number
          chapter_title?: string
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          last_modified?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
          version?: number | null
          word_count?: number | null
        }
        Relationships: []
      }
      doctorate_structure: {
        Row: {
          abstract: string | null
          completion_percent: number | null
          created_at: string | null
          id: string
          keywords: string[] | null
          last_compiled: string | null
          title: string
          total_word_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          abstract?: string | null
          completion_percent?: number | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          last_compiled?: string | null
          title?: string
          total_word_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          abstract?: string | null
          completion_percent?: number | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          last_compiled?: string | null
          title?: string
          total_word_count?: number | null
          updated_at?: string | null
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
      generated_documents: {
        Row: {
          bibliography_file_path: string | null
          created_at: string
          document_title: string
          document_type: string
          guide_file_path: string | null
          id: string
          main_file_path: string
          metadata: Json | null
          updated_at: string
          user_id: string
          word_count: number | null
          zip_file_path: string | null
        }
        Insert: {
          bibliography_file_path?: string | null
          created_at?: string
          document_title: string
          document_type: string
          guide_file_path?: string | null
          id?: string
          main_file_path: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
          word_count?: number | null
          zip_file_path?: string | null
        }
        Update: {
          bibliography_file_path?: string | null
          created_at?: string
          document_title?: string
          document_type?: string
          guide_file_path?: string | null
          id?: string
          main_file_path?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
          word_count?: number | null
          zip_file_path?: string | null
        }
        Relationships: []
      }
      humanized_texts: {
        Row: {
          changes_percent: number | null
          created_at: string
          humanization_level: string
          humanized_text: string
          id: string
          original_text: string
          statistics: Json | null
          tone_style: string
          updated_at: string
          user_id: string
          word_count_humanized: number | null
          word_count_original: number | null
        }
        Insert: {
          changes_percent?: number | null
          created_at?: string
          humanization_level?: string
          humanized_text: string
          id?: string
          original_text: string
          statistics?: Json | null
          tone_style?: string
          updated_at?: string
          user_id: string
          word_count_humanized?: number | null
          word_count_original?: number | null
        }
        Update: {
          changes_percent?: number | null
          created_at?: string
          humanization_level?: string
          humanized_text?: string
          id?: string
          original_text?: string
          statistics?: Json | null
          tone_style?: string
          updated_at?: string
          user_id?: string
          word_count_humanized?: number | null
          word_count_original?: number | null
        }
        Relationships: []
      }
      inactivity_notifications: {
        Row: {
          created_at: string | null
          id: string
          last_activity_at: string
          notification_sent: boolean | null
          sent_at: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_activity_at: string
          notification_sent?: boolean | null
          sent_at?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_activity_at?: string
          notification_sent?: boolean | null
          sent_at?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inactivity_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          accountant_id: string
          contact_email: string
          contact_phone: string
          contact_whatsapp: string | null
          created_at: string | null
          id: string
          job_posting_id: string
          message: string
          price_per_month: number
          responded_at: string | null
          services_included: string[] | null
          status: string | null
          viewed_at: string | null
        }
        Insert: {
          accountant_id: string
          contact_email?: string
          contact_phone?: string
          contact_whatsapp?: string | null
          created_at?: string | null
          id?: string
          job_posting_id: string
          message: string
          price_per_month: number
          responded_at?: string | null
          services_included?: string[] | null
          status?: string | null
          viewed_at?: string | null
        }
        Update: {
          accountant_id?: string
          contact_email?: string
          contact_phone?: string
          contact_whatsapp?: string | null
          created_at?: string | null
          id?: string
          job_posting_id?: string
          message?: string
          price_per_month?: number
          responded_at?: string | null
          services_included?: string[] | null
          status?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          company_name: string
          contact_email: string
          contact_phone: string
          created_at: string | null
          cui: string
          documents_per_month: string | null
          employees_count: string | null
          expires_at: string | null
          id: string
          is_vat_payer: boolean | null
          offers_count: number | null
          prefer_email: boolean | null
          prefer_phone: boolean | null
          prefer_whatsapp: boolean | null
          special_requirements: string | null
          status: string | null
          tax_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          company_name: string
          contact_email?: string
          contact_phone?: string
          created_at?: string | null
          cui: string
          documents_per_month?: string | null
          employees_count?: string | null
          expires_at?: string | null
          id?: string
          is_vat_payer?: boolean | null
          offers_count?: number | null
          prefer_email?: boolean | null
          prefer_phone?: boolean | null
          prefer_whatsapp?: boolean | null
          special_requirements?: string | null
          status?: string | null
          tax_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          company_name?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string | null
          cui?: string
          documents_per_month?: string | null
          employees_count?: string | null
          expires_at?: string | null
          id?: string
          is_vat_payer?: boolean | null
          offers_count?: number | null
          prefer_email?: boolean | null
          prefer_phone?: boolean | null
          prefer_whatsapp?: boolean | null
          special_requirements?: string | null
          status?: string | null
          tax_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journey_milestones: {
        Row: {
          created_at: string | null
          description: string
          id: string
          impact_score: number | null
          journey_id: string
          milestone_type: string
          triggered_by_conversation: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          impact_score?: number | null
          journey_id: string
          milestone_type: string
          triggered_by_conversation?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          impact_score?: number | null
          journey_id?: string
          milestone_type?: string
          triggered_by_conversation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_milestones_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "user_journey"
            referencedColumns: ["id"]
          },
        ]
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
      monthly_company_workflows: {
        Row: {
          accountant_id: string
          company_id: string
          created_at: string
          id: string
          month_year: string
          overall_status: string
          progress_percent: number
          stages: Json
          template_id: string | null
          updated_at: string
        }
        Insert: {
          accountant_id: string
          company_id: string
          created_at?: string
          id?: string
          month_year: string
          overall_status?: string
          progress_percent?: number
          stages?: Json
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          accountant_id?: string
          company_id?: string
          created_at?: string
          id?: string
          month_year?: string
          overall_status?: string
          progress_percent?: number
          stages?: Json
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_company_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_company_workflows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "monthly_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_workflow_instances: {
        Row: {
          accountant_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          month_year: string
          overall_status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          accountant_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          month_year: string
          overall_status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          accountant_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          month_year?: string
          overall_status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_workflow_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_workflow_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "monthly_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_workflow_stages: {
        Row: {
          completed_at: string | null
          created_at: string
          estimated_days: number
          id: string
          notes: string | null
          responsible_person_id: string | null
          responsible_person_name: string | null
          stage_name: string
          stage_number: number
          started_at: string | null
          status: string
          updated_at: string
          workflow_instance_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          estimated_days?: number
          id?: string
          notes?: string | null
          responsible_person_id?: string | null
          responsible_person_name?: string | null
          stage_name: string
          stage_number: number
          started_at?: string | null
          status?: string
          updated_at?: string
          workflow_instance_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          estimated_days?: number
          id?: string
          notes?: string | null
          responsible_person_id?: string | null
          responsible_person_name?: string | null
          stage_name?: string
          stage_number?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_workflow_stages_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "workflow_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_workflow_stages_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "monthly_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_workflow_templates: {
        Row: {
          accountant_id: string
          created_at: string
          id: string
          is_default: boolean
          stages: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          accountant_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          stages?: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          accountant_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          stages?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_processes: {
        Row: {
          accountant_id: string
          created_at: string
          id: string
          is_default: boolean
          process_name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          accountant_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          process_name: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          accountant_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          process_name?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_processes_accountant_id_fkey"
            columns: ["accountant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_steps_progress: {
        Row: {
          client_company_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          process_id: string
          step_number: number
          updated_at: string
        }
        Insert: {
          client_company_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          process_id: string
          step_number: number
          updated_at?: string
        }
        Update: {
          client_company_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          process_id?: string
          step_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_progress_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_steps_progress_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      plagiarism_analyses: {
        Row: {
          analysis_date: string
          chapter_id: string | null
          chapter_number: number
          chapter_title: string
          created_at: string
          detailed_report: Json
          id: string
          overall_score: number
          plagiarism_probability: number
          recommendations: string[] | null
          risk_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_date?: string
          chapter_id?: string | null
          chapter_number: number
          chapter_title: string
          created_at?: string
          detailed_report: Json
          id?: string
          overall_score: number
          plagiarism_probability: number
          recommendations?: string[] | null
          risk_level: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_date?: string
          chapter_id?: string | null
          chapter_number?: number
          chapter_title?: string
          created_at?: string
          detailed_report?: Json
          id?: string
          overall_score?: number
          plagiarism_probability?: number
          recommendations?: string[] | null
          risk_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plagiarism_analyses_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "doctorate_chapter_files"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type_selected: boolean | null
          ai_credits: number
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
          trial_credit_remaining: number | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          account_type_selected?: boolean | null
          ai_credits?: number
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
          trial_credit_remaining?: number | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          account_type_selected?: boolean | null
          ai_credits?: number
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
          trial_credit_remaining?: number | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rapoarte_metadata: {
        Row: {
          capital_lucru: number | null
          cash_banca: number | null
          cash_casa: number | null
          ccc_zile: number | null
          cheltuieli_totale: number | null
          company_name: string | null
          created_at: string | null
          cui: string
          dpo_zile: number | null
          dso_zile: number | null
          id: string
          lichiditate_generala: number | null
          lichiditate_rapida: number | null
          marja_neta: number | null
          perioada_end: string
          perioada_start: string
          profit_net: number | null
          rotatie_stocuri_zile: number | null
          top_cheltuieli: Json | null
          user_id: string | null
          venituri_totale: number | null
        }
        Insert: {
          capital_lucru?: number | null
          cash_banca?: number | null
          cash_casa?: number | null
          ccc_zile?: number | null
          cheltuieli_totale?: number | null
          company_name?: string | null
          created_at?: string | null
          cui: string
          dpo_zile?: number | null
          dso_zile?: number | null
          id?: string
          lichiditate_generala?: number | null
          lichiditate_rapida?: number | null
          marja_neta?: number | null
          perioada_end: string
          perioada_start: string
          profit_net?: number | null
          rotatie_stocuri_zile?: number | null
          top_cheltuieli?: Json | null
          user_id?: string | null
          venituri_totale?: number | null
        }
        Update: {
          capital_lucru?: number | null
          cash_banca?: number | null
          cash_casa?: number | null
          ccc_zile?: number | null
          cheltuieli_totale?: number | null
          company_name?: string | null
          created_at?: string | null
          cui?: string
          dpo_zile?: number | null
          dso_zile?: number | null
          id?: string
          lichiditate_generala?: number | null
          lichiditate_rapida?: number | null
          marja_neta?: number | null
          perioada_end?: string
          perioada_start?: string
          profit_net?: number | null
          rotatie_stocuri_zile?: number | null
          top_cheltuieli?: Json | null
          user_id?: string | null
          venituri_totale?: number | null
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
      service_providers: {
        Row: {
          commission_rate: number
          company_name: string
          contact_person: string | null
          created_at: string
          description: string | null
          email: string
          id: string
          is_verified: boolean
          phone: string | null
          provider_type: string
          rating: number | null
          specializations: Json | null
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          company_name: string
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email: string
          id?: string
          is_verified?: boolean
          phone?: string | null
          provider_type: string
          rating?: number | null
          specializations?: Json | null
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          company_name?: string
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          is_verified?: boolean
          phone?: string | null
          provider_type?: string
          rating?: number | null
          specializations?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      service_recommendations: {
        Row: {
          accountant_id: string
          client_company_id: string
          commission_amount: number | null
          commission_paid: boolean
          created_at: string
          id: string
          provider_id: string
          service_description: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accountant_id: string
          client_company_id: string
          commission_amount?: number | null
          commission_paid?: boolean
          created_at?: string
          id?: string
          provider_id: string
          service_description?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accountant_id?: string
          client_company_id?: string
          commission_amount?: number | null
          commission_paid?: boolean
          created_at?: string
          id?: string
          provider_id?: string
          service_description?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_recommendations_accountant_id_fkey"
            columns: ["accountant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recommendations_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recommendations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
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
          stripe_invoice_id: string | null
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
          stripe_invoice_id?: string | null
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
          stripe_invoice_id?: string | null
          stripe_session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategic_advisor_facts: {
        Row: {
          confidence: number | null
          conversation_id: string
          created_at: string | null
          fact_category: string
          fact_key: string
          fact_unit: string | null
          fact_value: string
          id: string
          metadata: Json | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          validated_at: string | null
        }
        Insert: {
          confidence?: number | null
          conversation_id: string
          created_at?: string | null
          fact_category: string
          fact_key: string
          fact_unit?: string | null
          fact_value: string
          id?: string
          metadata?: Json | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          validated_at?: string | null
        }
        Update: {
          confidence?: number | null
          conversation_id?: string
          created_at?: string | null
          fact_category?: string
          fact_key?: string
          fact_unit?: string | null
          fact_value?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_advisor_facts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_advisor_validations: {
        Row: {
          conflicts: Json | null
          conversation_id: string
          created_at: string | null
          id: string
          missing_fields: Json | null
          strategist_model: string | null
          strategist_response: string | null
          strategist_tokens_used: number | null
          total_cost_cents: number
          user_id: string
          user_message: string
          validation_status: string
          validator_model: string | null
          validator_response: Json
          validator_tokens_used: number | null
        }
        Insert: {
          conflicts?: Json | null
          conversation_id: string
          created_at?: string | null
          id?: string
          missing_fields?: Json | null
          strategist_model?: string | null
          strategist_response?: string | null
          strategist_tokens_used?: number | null
          total_cost_cents?: number
          user_id: string
          user_message: string
          validation_status: string
          validator_model?: string | null
          validator_response: Json
          validator_tokens_used?: number | null
        }
        Update: {
          conflicts?: Json | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          missing_fields?: Json | null
          strategist_model?: string | null
          strategist_response?: string | null
          strategist_tokens_used?: number | null
          total_cost_cents?: number
          user_id?: string
          user_message?: string
          validation_status?: string
          validator_model?: string | null
          validator_response?: Json
          validator_tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_advisor_validations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      strategic_documents: {
        Row: {
          conversation_id: string
          cost_cents: number | null
          created_at: string
          error_message: string | null
          extracted_facts: Json | null
          extracted_text: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          processed_at: string | null
          processing_status: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          cost_cents?: number | null
          created_at?: string
          error_message?: string | null
          extracted_facts?: Json | null
          extracted_text?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          processed_at?: string | null
          processing_status?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          cost_cents?: number | null
          created_at?: string
          error_message?: string | null
          extracted_facts?: Json | null
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          processed_at?: string | null
          processing_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      strategic_facts: {
        Row: {
          conflicts: Json | null
          conversation_id: string
          created_at: string
          extracted_facts: Json
          id: string
          missing_critical_fields: Json | null
          ready_for_strategy: boolean
          reason_not_ready: string | null
          updated_at: string
          user_id: string
          validation_notes: string | null
          validation_status: string
        }
        Insert: {
          conflicts?: Json | null
          conversation_id: string
          created_at?: string
          extracted_facts?: Json
          id?: string
          missing_critical_fields?: Json | null
          ready_for_strategy?: boolean
          reason_not_ready?: string | null
          updated_at?: string
          user_id: string
          validation_notes?: string | null
          validation_status: string
        }
        Update: {
          conflicts?: Json | null
          conversation_id?: string
          created_at?: string
          extracted_facts?: Json
          id?: string
          missing_critical_fields?: Json | null
          ready_for_strategy?: boolean
          reason_not_ready?: string | null
          updated_at?: string
          user_id?: string
          validation_notes?: string | null
          validation_status?: string
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
      strategic_reasoning_steps: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_index: number | null
          methodology_used: string | null
          step_content: string
          step_type: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_index?: number | null
          methodology_used?: string | null
          step_content: string
          step_type: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_index?: number | null
          methodology_used?: string | null
          step_content?: string
          step_type?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount_paid_cents: number
          created_at: string | null
          currency: string | null
          id: string
          invoice_generated: boolean | null
          metadata: Json | null
          payment_date: string | null
          period_end: string
          period_start: string
          smartbill_invoice_id: string | null
          status: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string
          subscription_type: string
          user_id: string
        }
        Insert: {
          amount_paid_cents: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_generated?: boolean | null
          metadata?: Json | null
          payment_date?: string | null
          period_end: string
          period_start: string
          smartbill_invoice_id?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id: string
          subscription_type: string
          user_id: string
        }
        Update: {
          amount_paid_cents?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_generated?: boolean | null
          metadata?: Json | null
          payment_date?: string | null
          period_end?: string
          period_start?: string
          smartbill_invoice_id?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string
          subscription_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_smartbill_invoice_id_fkey"
            columns: ["smartbill_invoice_id"]
            isOneToOne: false
            referencedRelation: "smartbill_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_emotional_context: {
        Row: {
          created_at: string | null
          detected_mood: string | null
          id: string
          main_topic: string | null
          mode_flow: string | null
          mood_score: number | null
          next_step_suggested: string | null
          session_date: string
          topic_summary: string | null
          unresolved_issue: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          detected_mood?: string | null
          id?: string
          main_topic?: string | null
          mode_flow?: string | null
          mood_score?: number | null
          next_step_suggested?: string | null
          session_date?: string
          topic_summary?: string | null
          unresolved_issue?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          detected_mood?: string | null
          id?: string
          main_topic?: string | null
          mode_flow?: string | null
          mood_score?: number | null
          next_step_suggested?: string | null
          session_date?: string
          topic_summary?: string | null
          unresolved_issue?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_journey: {
        Row: {
          created_at: string | null
          emotional_state: string | null
          first_interaction_at: string | null
          goal_confidence: number | null
          id: string
          knowledge_gaps: Json | null
          last_interaction_at: string | null
          primary_goal: string | null
          total_interactions: number | null
          uncertainty_level: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emotional_state?: string | null
          first_interaction_at?: string | null
          goal_confidence?: number | null
          id?: string
          knowledge_gaps?: Json | null
          last_interaction_at?: string | null
          primary_goal?: string | null
          total_interactions?: number | null
          uncertainty_level?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          emotional_state?: string | null
          first_interaction_at?: string | null
          goal_confidence?: number | null
          id?: string
          knowledge_gaps?: Json | null
          last_interaction_at?: string | null
          primary_goal?: string | null
          total_interactions?: number | null
          uncertainty_level?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_personal_profile: {
        Row: {
          created_at: string | null
          detected_gender: string | null
          id: string
          last_interaction_at: string | null
          personal_notes: Json | null
          preferred_name: string | null
          relationship_level: number | null
          total_conversations: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          detected_gender?: string | null
          id?: string
          last_interaction_at?: string | null
          personal_notes?: Json | null
          preferred_name?: string | null
          relationship_level?: number | null
          total_conversations?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          detected_gender?: string | null
          id?: string
          last_interaction_at?: string | null
          personal_notes?: Json | null
          preferred_name?: string | null
          relationship_level?: number | null
          total_conversations?: number | null
          updated_at?: string | null
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
      user_strategic_documents: {
        Row: {
          ai_summary: string | null
          conversation_id: string | null
          extracted_text: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          metadata: Json | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          conversation_id?: string | null
          extracted_text?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          conversation_id?: string | null
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          uploaded_at?: string | null
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
      workflow_team_members: {
        Row: {
          accountant_id: string
          created_at: string
          id: string
          is_active: boolean
          member_email: string
          member_name: string
          member_role: string
          updated_at: string
        }
        Insert: {
          accountant_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_email: string
          member_name: string
          member_role: string
          updated_at?: string
        }
        Update: {
          accountant_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_email?: string
          member_name?: string
          member_role?: string
          updated_at?: string
        }
        Relationships: []
      }
      yana_conversations: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yana_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      yana_messages: {
        Row: {
          artifacts: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          artifacts?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          artifacts?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "yana_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "yana_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      yana_uploaded_documents: {
        Row: {
          analysis_id: string | null
          conversation_id: string
          created_at: string
          document_type: string
          file_name: string
          file_path: string | null
          id: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          conversation_id: string
          created_at?: string
          document_type: string
          file_name: string
          file_path?: string | null
          id?: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          conversation_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yana_uploaded_documents_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yana_uploaded_documents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "yana_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_accountant_profiles: {
        Row: {
          created_at: string | null
          firm_name: string | null
          id: string | null
          location: string | null
          rating: number | null
          response_time_hours: number | null
          reviews_count: number | null
          specializations: string[] | null
          total_clients: number | null
          verified: boolean | null
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          firm_name?: string | null
          id?: string | null
          location?: string | null
          rating?: number | null
          response_time_hours?: number | null
          reviews_count?: number | null
          specializations?: string[] | null
          total_clients?: number | null
          verified?: boolean | null
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          firm_name?: string | null
          id?: string | null
          location?: string | null
          rating?: number | null
          response_time_hours?: number | null
          reviews_count?: number | null
          specializations?: string[] | null
          total_clients?: number | null
          verified?: boolean | null
          years_experience?: number | null
        }
        Relationships: []
      }
      public_subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string | null
          name: string | null
          plan_type: Database["public"]["Enums"]["subscription_type"] | null
          price_monthly_eur: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string | null
          name?: string | null
          plan_type?: Database["public"]["Enums"]["subscription_type"] | null
          price_monthly_eur?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string | null
          name?: string | null
          plan_type?: Database["public"]["Enums"]["subscription_type"] | null
          price_monthly_eur?: number | null
        }
        Relationships: []
      }
      strategic_facts_summary: {
        Row: {
          avg_confidence: number | null
          conflicted_count: number | null
          conversation_id: string | null
          fact_category: string | null
          last_updated: string | null
          outdated_count: number | null
          total_facts: number | null
          user_id: string | null
          validated_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_advisor_facts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      check_user_access: {
        Args: { p_user_id: string }
        Returns: {
          access_type: string
          credits_remaining: number
          has_access: boolean
          message: string
          subscription_status: string
        }[]
      }
      cleanup_expired_cache: { Args: never; Returns: number }
      cleanup_inactive_sessions: { Args: never; Returns: undefined }
      cleanup_old_data: { Args: never; Returns: undefined }
      deactivate_expired_subscriptions: { Args: never; Returns: undefined }
      extract_question_pattern: {
        Args: { question_text: string }
        Returns: {
          category: string
          pattern: string
        }[]
      }
      find_similar_conversations: {
        Args: {
          p_company_id: string
          p_limit?: number
          p_question_keywords: string[]
        }
        Returns: {
          answer: string
          context: Json
          created_at: string
          id: string
          question: string
          similarity_score: number
          was_helpful: boolean
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
      link_orphan_analyses_to_companies: {
        Args: { p_user_id: string }
        Returns: {
          analysis_id: string
          company_name: string
          linked_company_id: string
          matched_by: string
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

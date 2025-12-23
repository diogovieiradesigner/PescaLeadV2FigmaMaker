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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_calendar_assignments: {
        Row: {
          ai_agent_id: string
          calendar_id: string
          can_read: boolean | null
          can_write: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          ai_agent_id: string
          calendar_id: string
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          ai_agent_id?: string
          calendar_id?: string
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_calendar_assignments_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_calendar_assignments_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_calendar_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "agent_calendar_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_attendants: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          message_to_attendant: string | null
          message_to_customer: string | null
          priority: number | null
          trigger_conditions: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_to_attendant?: string | null
          message_to_customer?: string | null
          priority?: number | null
          trigger_conditions?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_to_attendant?: string | null
          message_to_customer?: string | null
          priority?: number | null
          trigger_conditions?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_attendants_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_custom_tools: {
        Row: {
          agent_id: string
          created_at: string | null
          custom_config: Json | null
          custom_tool_id: string
          id: string
          is_enabled: boolean | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          custom_config?: Json | null
          custom_tool_id: string
          id?: string
          is_enabled?: boolean | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          custom_config?: Json | null
          custom_tool_id?: string
          id?: string
          is_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_custom_tools_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_custom_tools_custom_tool_id_fkey"
            columns: ["custom_tool_id"]
            isOneToOne: false
            referencedRelation: "ai_custom_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_inboxes: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          inbox_id: string
          is_active: boolean | null
          priority: number | null
          working_hours: Json | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          inbox_id: string
          is_active?: boolean | null
          priority?: number | null
          working_hours?: Json | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          inbox_id?: string
          is_active?: boolean | null
          priority?: number | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_inboxes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_inboxes_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_system_tools: {
        Row: {
          agent_id: string
          created_at: string | null
          custom_config: Json | null
          id: string
          is_enabled: boolean | null
          system_tool_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          custom_config?: Json | null
          id?: string
          is_enabled?: boolean | null
          system_tool_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          custom_config?: Json | null
          id?: string
          is_enabled?: boolean | null
          system_tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_system_tools_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_system_tools_system_tool_id_fkey"
            columns: ["system_tool_id"]
            isOneToOne: false
            referencedRelation: "ai_system_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          api_key_encrypted: string | null
          avg_response_time_ms: number | null
          behavior_config: Json | null
          created_at: string | null
          crm_auto_config: Json | null
          crm_auto_update: boolean | null
          crm_update_prompt: string | null
          daily_message_limit: number | null
          default_attendant_type: string | null
          follow_up_mode: string | null
          id: string
          is_active: boolean | null
          model: string | null
          monthly_token_limit: number | null
          name: string
          orchestrator_enabled: boolean | null
          provider_id: string | null
          rag_enabled: boolean | null
          satisfaction_score: number | null
          specialist_agents: Json | null
          system_prompt: string | null
          total_conversations: number | null
          total_cost_usd: number | null
          total_messages: number | null
          total_tokens_used: number | null
          transcription_model: string | null
          transcription_provider_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          avg_response_time_ms?: number | null
          behavior_config?: Json | null
          created_at?: string | null
          crm_auto_config?: Json | null
          crm_auto_update?: boolean | null
          crm_update_prompt?: string | null
          daily_message_limit?: number | null
          default_attendant_type?: string | null
          follow_up_mode?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          monthly_token_limit?: number | null
          name?: string
          orchestrator_enabled?: boolean | null
          provider_id?: string | null
          rag_enabled?: boolean | null
          satisfaction_score?: number | null
          specialist_agents?: Json | null
          system_prompt?: string | null
          total_conversations?: number | null
          total_cost_usd?: number | null
          total_messages?: number | null
          total_tokens_used?: number | null
          transcription_model?: string | null
          transcription_provider_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          avg_response_time_ms?: number | null
          behavior_config?: Json | null
          created_at?: string | null
          crm_auto_config?: Json | null
          crm_auto_update?: boolean | null
          crm_update_prompt?: string | null
          daily_message_limit?: number | null
          default_attendant_type?: string | null
          follow_up_mode?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          monthly_token_limit?: number | null
          name?: string
          orchestrator_enabled?: boolean | null
          provider_id?: string | null
          rag_enabled?: boolean | null
          satisfaction_score?: number | null
          specialist_agents?: Json | null
          system_prompt?: string | null
          total_conversations?: number | null
          total_cost_usd?: number | null
          total_messages?: number | null
          total_tokens_used?: number | null
          transcription_model?: string | null
          transcription_provider_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_transcription_provider_id_fkey"
            columns: ["transcription_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "ai_agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_sessions: {
        Row: {
          agent_id: string
          context_summary: string | null
          conversation_id: string
          cost_usd: number | null
          end_reason: string | null
          ended_at: string | null
          id: string
          last_activity_at: string | null
          messages_processed: number | null
          sentiment_score: number | null
          sentiment_trend: string | null
          started_at: string | null
          status: string
          tokens_used: number | null
          transferred_to: string | null
        }
        Insert: {
          agent_id: string
          context_summary?: string | null
          conversation_id: string
          cost_usd?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          last_activity_at?: string | null
          messages_processed?: number | null
          sentiment_score?: number | null
          sentiment_trend?: string | null
          started_at?: string | null
          status?: string
          tokens_used?: number | null
          transferred_to?: string | null
        }
        Update: {
          agent_id?: string
          context_summary?: string | null
          conversation_id?: string
          cost_usd?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          last_activity_at?: string | null
          messages_processed?: number | null
          sentiment_score?: number | null
          sentiment_trend?: string | null
          started_at?: string | null
          status?: string
          tokens_used?: number | null
          transferred_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversation_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_custom_tools: {
        Row: {
          avg_execution_time_ms: number | null
          cooldown_seconds: number | null
          created_at: string | null
          description: string
          display_name: string
          execution_type: string
          id: string
          integration_config: Json | null
          is_active: boolean | null
          max_calls_per_conversation: number | null
          name: string
          parameters_schema: Json
          requires_confirmation: boolean | null
          successful_executions: number | null
          total_executions: number | null
          updated_at: string | null
          webhook_headers: Json | null
          webhook_method: string | null
          webhook_url: string | null
          workspace_id: string
        }
        Insert: {
          avg_execution_time_ms?: number | null
          cooldown_seconds?: number | null
          created_at?: string | null
          description: string
          display_name: string
          execution_type?: string
          id?: string
          integration_config?: Json | null
          is_active?: boolean | null
          max_calls_per_conversation?: number | null
          name: string
          parameters_schema?: Json
          requires_confirmation?: boolean | null
          successful_executions?: number | null
          total_executions?: number | null
          updated_at?: string | null
          webhook_headers?: Json | null
          webhook_method?: string | null
          webhook_url?: string | null
          workspace_id: string
        }
        Update: {
          avg_execution_time_ms?: number | null
          cooldown_seconds?: number | null
          created_at?: string | null
          description?: string
          display_name?: string
          execution_type?: string
          id?: string
          integration_config?: Json | null
          is_active?: boolean | null
          max_calls_per_conversation?: number | null
          name?: string
          parameters_schema?: Json
          requires_confirmation?: boolean | null
          successful_executions?: number | null
          total_executions?: number | null
          updated_at?: string | null
          webhook_headers?: Json | null
          webhook_method?: string | null
          webhook_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_custom_tools_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "ai_custom_tools_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_debouncer_queue: {
        Row: {
          agent_id: string
          conversation_id: string
          created_at: string | null
          first_message_at: string
          id: string
          last_error: string | null
          message_count: number | null
          message_ids: string[] | null
          process_after: string
          processed_at: string | null
          retry_count: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          conversation_id: string
          created_at?: string | null
          first_message_at?: string
          id?: string
          last_error?: string | null
          message_count?: number | null
          message_ids?: string[] | null
          process_after: string
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          conversation_id?: string
          created_at?: string | null
          first_message_at?: string
          id?: string
          last_error?: string | null
          message_count?: number | null
          message_ids?: string[] | null
          process_after?: string
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_debouncer_queue_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_debouncer_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_execution_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          session_id: string | null
          started_at: string | null
          status: string
          step_name: string
          step_number: number | null
          tokens_in: number | null
          tokens_out: number | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          step_name: string
          step_number?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          step_name?: string
          step_number?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_conversation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_execution_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "ai_execution_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_follow_up_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model: string
          name: string
          prompt_template: string
          system_prompt: string
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string
          name?: string
          prompt_template?: string
          system_prompt?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string
          name?: string
          prompt_template?: string
          system_prompt?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_guardrail_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model: string
          system_prompt: string
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string
          system_prompt: string
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string
          system_prompt?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_message_splitter_config: {
        Row: {
          created_at: string
          created_by: string | null
          delay_between_messages: number
          id: string
          is_active: boolean
          max_tokens: number
          min_chars_to_split: number
          model: string
          system_prompt: string
          temperature: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delay_between_messages?: number
          id?: string
          is_active?: boolean
          max_tokens?: number
          min_chars_to_split?: number
          model?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delay_between_messages?: number
          id?: string
          is_active?: boolean
          max_tokens?: number
          min_chars_to_split?: number
          model?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_neighborhood_config: {
        Row: {
          cache_ttl_days: number | null
          created_at: string | null
          fallback_models: string[] | null
          id: string
          is_active: boolean | null
          max_ai_rounds: number | null
          max_retries: number | null
          max_tokens: number | null
          max_total_pages: number | null
          model: string | null
          system_prompt: string
          temperature: number | null
          timeout_seconds: number | null
          updated_at: string | null
          user_prompt_additional: string
          user_prompt_city: string
          user_prompt_state: string
        }
        Insert: {
          cache_ttl_days?: number | null
          created_at?: string | null
          fallback_models?: string[] | null
          id?: string
          is_active?: boolean | null
          max_ai_rounds?: number | null
          max_retries?: number | null
          max_tokens?: number | null
          max_total_pages?: number | null
          model?: string | null
          system_prompt: string
          temperature?: number | null
          timeout_seconds?: number | null
          updated_at?: string | null
          user_prompt_additional: string
          user_prompt_city: string
          user_prompt_state: string
        }
        Update: {
          cache_ttl_days?: number | null
          created_at?: string | null
          fallback_models?: string[] | null
          id?: string
          is_active?: boolean | null
          max_ai_rounds?: number | null
          max_retries?: number | null
          max_tokens?: number | null
          max_total_pages?: number | null
          model?: string | null
          system_prompt?: string
          temperature?: number | null
          timeout_seconds?: number | null
          updated_at?: string | null
          user_prompt_additional?: string
          user_prompt_city?: string
          user_prompt_state?: string
        }
        Relationships: []
      }
      ai_orchestrator_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model: string
          system_prompt: string
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string
          system_prompt: string
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string
          system_prompt?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_pipeline_logs: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          completed_at: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string
          created_at: string | null
          debouncer_id: string | null
          error_message: string | null
          error_step: string | null
          id: string
          message_id: string | null
          provider_message_id: string | null
          response_message_ids: string[] | null
          response_sent: boolean | null
          response_text: string | null
          session_id: string | null
          started_at: string | null
          status: string
          status_message: string | null
          steps_completed: number | null
          total_cost_estimate: number | null
          total_duration_ms: number | null
          total_tokens_used: number | null
          workspace_id: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          completed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id: string
          created_at?: string | null
          debouncer_id?: string | null
          error_message?: string | null
          error_step?: string | null
          id?: string
          message_id?: string | null
          provider_message_id?: string | null
          response_message_ids?: string[] | null
          response_sent?: boolean | null
          response_text?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          status_message?: string | null
          steps_completed?: number | null
          total_cost_estimate?: number | null
          total_duration_ms?: number | null
          total_tokens_used?: number | null
          workspace_id?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          completed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string
          created_at?: string | null
          debouncer_id?: string | null
          error_message?: string | null
          error_step?: string | null
          id?: string
          message_id?: string | null
          provider_message_id?: string | null
          response_message_ids?: string[] | null
          response_sent?: boolean | null
          response_text?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          status_message?: string | null
          steps_completed?: number | null
          total_cost_estimate?: number | null
          total_duration_ms?: number | null
          total_tokens_used?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_pipeline_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pipeline_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pipeline_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pipeline_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "ai_pipeline_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_pipeline_steps: {
        Row: {
          completed_at: string | null
          config: Json | null
          cost_estimate: number | null
          created_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          input_data: Json | null
          input_summary: string | null
          output_data: Json | null
          output_summary: string | null
          pipeline_log_id: string
          started_at: string | null
          status: string
          status_message: string | null
          step_icon: string | null
          step_key: string
          step_name: string
          step_number: number
          tokens_input: number | null
          tokens_output: number | null
          tokens_total: number | null
        }
        Insert: {
          completed_at?: string | null
          config?: Json | null
          cost_estimate?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          input_summary?: string | null
          output_data?: Json | null
          output_summary?: string | null
          pipeline_log_id: string
          started_at?: string | null
          status?: string
          status_message?: string | null
          step_icon?: string | null
          step_key: string
          step_name: string
          step_number: number
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
        }
        Update: {
          completed_at?: string | null
          config?: Json | null
          cost_estimate?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          input_summary?: string | null
          output_data?: Json | null
          output_summary?: string | null
          pipeline_log_id?: string
          started_at?: string | null
          status?: string
          status_message?: string | null
          step_icon?: string | null
          step_key?: string
          step_name?: string
          step_number?: number
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_pipeline_steps_pipeline_log_id_fkey"
            columns: ["pipeline_log_id"]
            isOneToOne: false
            referencedRelation: "ai_pipeline_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pipeline_steps_pipeline_log_id_fkey"
            columns: ["pipeline_log_id"]
            isOneToOne: false
            referencedRelation: "ai_pipeline_logs_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          available_models: Json | null
          base_url: string
          capabilities: Json | null
          created_at: string | null
          default_model: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          available_models?: Json | null
          base_url: string
          capabilities?: Json | null
          created_at?: string | null
          default_model: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          available_models?: Json | null
          base_url?: string
          capabilities?: Json | null
          created_at?: string | null
          default_model?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_public_chat_conversations: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          link_id: string
          message_count: number | null
          session_id: string
          visitor_identifier: string | null
          visitor_name: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          link_id: string
          message_count?: number | null
          session_id: string
          visitor_identifier?: string | null
          visitor_name?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          link_id?: string
          message_count?: number | null
          session_id?: string
          visitor_identifier?: string | null
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_public_chat_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_public_chat_conversations_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "ai_public_chat_links"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_public_chat_links: {
        Row: {
          access_code: string
          agent_id: string
          chat_subtitle: string | null
          chat_title: string | null
          created_at: string | null
          created_by: string | null
          current_conversations: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          max_conversations: number | null
          name: string | null
          public_slug: string
          reset_count: number | null
          total_messages: number | null
          updated_at: string | null
          welcome_message: string | null
          widget_avatar_icon_url: string | null
          widget_button_icon_url: string | null
          widget_config: Json | null
          workspace_id: string
        }
        Insert: {
          access_code: string
          agent_id: string
          chat_subtitle?: string | null
          chat_title?: string | null
          created_at?: string | null
          created_by?: string | null
          current_conversations?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_conversations?: number | null
          name?: string | null
          public_slug: string
          reset_count?: number | null
          total_messages?: number | null
          updated_at?: string | null
          welcome_message?: string | null
          widget_avatar_icon_url?: string | null
          widget_button_icon_url?: string | null
          widget_config?: Json | null
          workspace_id: string
        }
        Update: {
          access_code?: string
          agent_id?: string
          chat_subtitle?: string | null
          chat_title?: string | null
          created_at?: string | null
          created_by?: string | null
          current_conversations?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_conversations?: number | null
          name?: string | null
          public_slug?: string
          reset_count?: number | null
          total_messages?: number | null
          updated_at?: string | null
          welcome_message?: string | null
          widget_avatar_icon_url?: string | null
          widget_button_icon_url?: string | null
          widget_config?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_public_chat_links_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_public_chat_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_public_chat_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "ai_public_chat_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rag_collections: {
        Row: {
          agent_id: string
          created_at: string | null
          description: string | null
          external_store_id: string | null
          id: string
          is_active: boolean | null
          name: string
          total_documents: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          description?: string | null
          external_store_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          total_documents?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          description?: string | null
          external_store_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          total_documents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rag_collections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rag_documents: {
        Row: {
          agent_id: string | null
          collection_id: string
          created_at: string | null
          external_file_id: string | null
          file_type: string | null
          id: string
          metadata: Json | null
          processed_at: string | null
          processing_status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          collection_id: string
          created_at?: string | null
          external_file_id?: string | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          processing_status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          collection_id?: string
          created_at?: string | null
          external_file_id?: string | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          processing_status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rag_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rag_documents_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "ai_rag_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_specialist_agents: {
        Row: {
          created_at: string | null
          description: string
          extra_prompt: string
          function_key: string
          id: string
          is_active: boolean | null
          name: string
          parent_agent_id: string
          priority: number | null
          type: Database["public"]["Enums"]["specialist_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          extra_prompt: string
          function_key: string
          id?: string
          is_active?: boolean | null
          name: string
          parent_agent_id: string
          priority?: number | null
          type?: Database["public"]["Enums"]["specialist_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          extra_prompt?: string
          function_key?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parent_agent_id?: string
          priority?: number | null
          type?: Database["public"]["Enums"]["specialist_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_specialist_agents_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_system_tools: {
        Row: {
          category: string
          created_at: string | null
          description: string
          display_name: string
          execution_config: Json | null
          execution_type: string
          id: string
          is_active: boolean | null
          name: string
          parameters_schema: Json
          requires_confirmation: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description: string
          display_name: string
          execution_config?: Json | null
          execution_type?: string
          id?: string
          is_active?: boolean | null
          name: string
          parameters_schema: Json
          requires_confirmation?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          display_name?: string
          execution_config?: Json | null
          execution_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parameters_schema?: Json
          requires_confirmation?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_tool_execution_logs: {
        Row: {
          agent_id: string
          completed_at: string | null
          conversation_id: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_parameters: Json
          output_result: Json | null
          retry_count: number | null
          session_id: string | null
          started_at: string | null
          status: string
          tool_id: string | null
          tool_name: string
          tool_type: string
          triggered_by: string | null
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_parameters: Json
          output_result?: Json | null
          retry_count?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          tool_id?: string | null
          tool_name: string
          tool_type: string
          triggered_by?: string | null
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_parameters?: Json
          output_result?: Json | null
          retry_count?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          tool_id?: string | null
          tool_name?: string
          tool_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_execution_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_execution_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_execution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_transcription_config: {
        Row: {
          audio_enabled: boolean | null
          audio_language: string | null
          audio_model: string
          audio_provider: string
          created_at: string | null
          created_by: string | null
          debouncer_max_wait_seconds: number | null
          debouncer_wait_for_transcription: boolean | null
          id: string
          image_enabled: boolean | null
          image_max_tokens: number | null
          image_model: string
          image_prompt: string
          image_provider: string
          image_temperature: number | null
          is_active: boolean | null
          max_retries: number | null
          retry_delay_seconds: number | null
          timeout_seconds: number | null
          updated_at: string | null
          updated_by: string | null
          video_enabled: boolean | null
          video_model: string | null
          video_prompt: string | null
          video_provider: string | null
        }
        Insert: {
          audio_enabled?: boolean | null
          audio_language?: string | null
          audio_model?: string
          audio_provider?: string
          created_at?: string | null
          created_by?: string | null
          debouncer_max_wait_seconds?: number | null
          debouncer_wait_for_transcription?: boolean | null
          id?: string
          image_enabled?: boolean | null
          image_max_tokens?: number | null
          image_model?: string
          image_prompt?: string
          image_provider?: string
          image_temperature?: number | null
          is_active?: boolean | null
          max_retries?: number | null
          retry_delay_seconds?: number | null
          timeout_seconds?: number | null
          updated_at?: string | null
          updated_by?: string | null
          video_enabled?: boolean | null
          video_model?: string | null
          video_prompt?: string | null
          video_provider?: string | null
        }
        Update: {
          audio_enabled?: boolean | null
          audio_language?: string | null
          audio_model?: string
          audio_provider?: string
          created_at?: string | null
          created_by?: string | null
          debouncer_max_wait_seconds?: number | null
          debouncer_wait_for_transcription?: boolean | null
          id?: string
          image_enabled?: boolean | null
          image_max_tokens?: number | null
          image_model?: string
          image_prompt?: string
          image_provider?: string
          image_temperature?: number | null
          is_active?: boolean | null
          max_retries?: number | null
          retry_delay_seconds?: number | null
          timeout_seconds?: number | null
          updated_at?: string | null
          updated_by?: string | null
          video_enabled?: boolean | null
          video_model?: string | null
          video_prompt?: string | null
          video_provider?: string | null
        }
        Relationships: []
      }
      ai_working_hours_log: {
        Row: {
          agent_id: string | null
          blocked_at: string | null
          conversation_id: string | null
          day_of_week: number | null
          id: string
          local_time: string | null
          reason: string | null
          timezone: string | null
          working_hours_mode: string
        }
        Insert: {
          agent_id?: string | null
          blocked_at?: string | null
          conversation_id?: string | null
          day_of_week?: number | null
          id?: string
          local_time?: string | null
          reason?: string | null
          timezone?: string | null
          working_hours_mode: string
        }
        Update: {
          agent_id?: string | null
          blocked_at?: string | null
          conversation_id?: string | null
          day_of_week?: number | null
          id?: string
          local_time?: string | null
          reason?: string | null
          timezone?: string | null
          working_hours_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_working_hours_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_working_hours_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_daily_summary: {
        Row: {
          avg_response_time_seconds: number | null
          campaigns_stats: Json | null
          conversations_ai: number | null
          conversations_human: number | null
          conversations_resolved: number | null
          conversations_total: number | null
          created_at: string | null
          date: string
          engagement_heatmap: Json | null
          followups_created: number | null
          followups_sent: number | null
          followups_with_response: number | null
          id: string
          leads_by_channel: Json | null
          leads_by_funnel_column: Json | null
          leads_by_source: Json | null
          leads_total: number | null
          messages_by_ai: number | null
          messages_by_human: number | null
          messages_received: number | null
          messages_sent: number | null
          messages_total: number | null
          response_count: number | null
          response_heatmap: Json | null
          total_response_time_seconds: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          avg_response_time_seconds?: number | null
          campaigns_stats?: Json | null
          conversations_ai?: number | null
          conversations_human?: number | null
          conversations_resolved?: number | null
          conversations_total?: number | null
          created_at?: string | null
          date: string
          engagement_heatmap?: Json | null
          followups_created?: number | null
          followups_sent?: number | null
          followups_with_response?: number | null
          id?: string
          leads_by_channel?: Json | null
          leads_by_funnel_column?: Json | null
          leads_by_source?: Json | null
          leads_total?: number | null
          messages_by_ai?: number | null
          messages_by_human?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          messages_total?: number | null
          response_count?: number | null
          response_heatmap?: Json | null
          total_response_time_seconds?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          avg_response_time_seconds?: number | null
          campaigns_stats?: Json | null
          conversations_ai?: number | null
          conversations_human?: number | null
          conversations_resolved?: number | null
          conversations_total?: number | null
          created_at?: string | null
          date?: string
          engagement_heatmap?: Json | null
          followups_created?: number | null
          followups_sent?: number | null
          followups_with_response?: number | null
          id?: string
          leads_by_channel?: Json | null
          leads_by_funnel_column?: Json | null
          leads_by_source?: Json | null
          leads_total?: number | null
          messages_by_ai?: number | null
          messages_by_human?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          messages_total?: number | null
          response_count?: number | null
          response_heatmap?: Json | null
          total_response_time_seconds?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_summary_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "analytics_daily_summary_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_funnel_snapshot: {
        Row: {
          avg_time_per_column: Json | null
          columns_data: Json
          conversion_rates: Json | null
          created_at: string | null
          date: string
          funnel_id: string
          id: string
          workspace_id: string
        }
        Insert: {
          avg_time_per_column?: Json | null
          columns_data?: Json
          conversion_rates?: Json | null
          created_at?: string | null
          date: string
          funnel_id: string
          id?: string
          workspace_id: string
        }
        Update: {
          avg_time_per_column?: Json | null
          columns_data?: Json
          conversion_rates?: Json | null
          created_at?: string | null
          date?: string
          funnel_id?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_funnel_snapshot_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_funnel_snapshot_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "analytics_funnel_snapshot_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_period_cache: {
        Row: {
          comparison_data: Json | null
          created_at: string | null
          expires_at: string
          funnel_filter: string | null
          id: string
          period_key: string
          summary_data: Json
          workspace_id: string
        }
        Insert: {
          comparison_data?: Json | null
          created_at?: string | null
          expires_at: string
          funnel_filter?: string | null
          id?: string
          period_key: string
          summary_data: Json
          workspace_id: string
        }
        Update: {
          comparison_data?: Json | null
          created_at?: string | null
          expires_at?: string
          funnel_filter?: string | null
          id?: string
          period_key?: string
          summary_data?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_period_cache_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "analytics_period_cache_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_rankings: {
        Row: {
          created_at: string | null
          date: string
          id: string
          ranking_type: string
          rankings: Json
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          ranking_type: string
          rankings?: Json
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          ranking_type?: string
          rankings?: Json
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_rankings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "analytics_rankings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action_type: string
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          sequence: number
          user_id: string | null
          user_name: string | null
          workspace_id: string
        }
        Insert: {
          action_type: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          sequence?: number
          user_id?: string | null
          user_name?: string | null
          workspace_id: string
        }
        Update: {
          action_type?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          sequence?: number
          user_id?: string | null
          user_name?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          attendees: Json | null
          calendar_id: string
          conversation_id: string | null
          created_at: string | null
          description: string | null
          end_time: string
          event_status: string | null
          id: string
          is_meeting: boolean | null
          is_synced: boolean | null
          last_modified_on_provider: string | null
          lead_id: string | null
          location: string | null
          organizer_email: string | null
          provider_event_id: string
          recurrence_rule: string | null
          show_as: string | null
          start_time: string
          sync_error: string | null
          synced_at: string | null
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          attendees?: Json | null
          calendar_id: string
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event_status?: string | null
          id?: string
          is_meeting?: boolean | null
          is_synced?: boolean | null
          last_modified_on_provider?: string | null
          lead_id?: string | null
          location?: string | null
          organizer_email?: string | null
          provider_event_id: string
          recurrence_rule?: string | null
          show_as?: string | null
          start_time: string
          sync_error?: string | null
          synced_at?: string | null
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          attendees?: Json | null
          calendar_id?: string
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_status?: string | null
          id?: string
          is_meeting?: boolean | null
          is_synced?: boolean | null
          last_modified_on_provider?: string | null
          lead_id?: string | null
          location?: string | null
          organizer_email?: string | null
          provider_event_id?: string
          recurrence_rule?: string | null
          show_as?: string | null
          start_time?: string
          sync_error?: string | null
          synced_at?: string | null
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_providers: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          provider_config: Json
          provider_type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          provider_config?: Json
          provider_type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          provider_config?: Json
          provider_type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_providers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "calendar_providers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_settings: {
        Row: {
          allow_overlapping: boolean | null
          availability: Json
          booking_page_logo: string | null
          booking_page_theme: string | null
          buffer_between_events: number | null
          created_at: string | null
          default_durations: Json
          id: string
          internal_calendar_id: string | null
          is_active: boolean | null
          max_booking_days_ahead: number | null
          min_booking_notice_hours: number | null
          timezone: string | null
          updated_at: string | null
          whatsapp_confirmation_enabled: boolean | null
          whatsapp_reminder_enabled: boolean | null
          whatsapp_reminder_hours_before: number | null
          workspace_id: string
        }
        Insert: {
          allow_overlapping?: boolean | null
          availability?: Json
          booking_page_logo?: string | null
          booking_page_theme?: string | null
          buffer_between_events?: number | null
          created_at?: string | null
          default_durations?: Json
          id?: string
          internal_calendar_id?: string | null
          is_active?: boolean | null
          max_booking_days_ahead?: number | null
          min_booking_notice_hours?: number | null
          timezone?: string | null
          updated_at?: string | null
          whatsapp_confirmation_enabled?: boolean | null
          whatsapp_reminder_enabled?: boolean | null
          whatsapp_reminder_hours_before?: number | null
          workspace_id: string
        }
        Update: {
          allow_overlapping?: boolean | null
          availability?: Json
          booking_page_logo?: string | null
          booking_page_theme?: string | null
          buffer_between_events?: number | null
          created_at?: string | null
          default_durations?: Json
          id?: string
          internal_calendar_id?: string | null
          is_active?: boolean | null
          max_booking_days_ahead?: number | null
          min_booking_notice_hours?: number | null
          timezone?: string | null
          updated_at?: string | null
          whatsapp_confirmation_enabled?: boolean | null
          whatsapp_reminder_enabled?: boolean | null
          whatsapp_reminder_hours_before?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_settings_internal_calendar_id_fkey"
            columns: ["internal_calendar_id"]
            isOneToOne: false
            referencedRelation: "internal_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "calendar_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_conflicts: {
        Row: {
          calendar_event_id: string
          conflict_type: string
          created_at: string | null
          id: string
          local_state: Json | null
          provider_state: Json | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          calendar_event_id: string
          conflict_type: string
          created_at?: string | null
          id?: string
          local_state?: Json | null
          provider_state?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          calendar_event_id?: string
          conflict_type?: string
          created_at?: string | null
          id?: string
          local_state?: Json | null
          provider_state?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_conflicts_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_conflicts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "calendar_sync_conflicts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_queue: {
        Row: {
          action_type: string
          attempt_count: number | null
          calendar_event_id: string | null
          calendar_id: string
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          payload: Json
          started_at: string | null
          status: string | null
          sync_type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          action_type: string
          attempt_count?: number | null
          calendar_event_id?: string | null
          calendar_id: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          payload?: Json
          started_at?: string | null
          status?: string | null
          sync_type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          action_type?: string
          attempt_count?: number | null
          calendar_event_id?: string | null
          calendar_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          payload?: Json
          started_at?: string | null
          status?: string | null
          sync_type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_queue_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_queue_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "calendar_sync_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          ai_metadata: Json | null
          calendar_type: string
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          is_writable: boolean | null
          last_synced_at: string | null
          name: string
          provider_account_id: string
          provider_calendar_id: string
          sync_token: string | null
          timezone: string | null
          updated_at: string | null
          watch_channel_id: string | null
          watch_expiration: string | null
          watch_resource_id: string | null
          workspace_id: string
        }
        Insert: {
          ai_metadata?: Json | null
          calendar_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_writable?: boolean | null
          last_synced_at?: string | null
          name: string
          provider_account_id: string
          provider_calendar_id: string
          sync_token?: string | null
          timezone?: string | null
          updated_at?: string | null
          watch_channel_id?: string | null
          watch_expiration?: string | null
          watch_resource_id?: string | null
          workspace_id: string
        }
        Update: {
          ai_metadata?: Json | null
          calendar_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_writable?: boolean | null
          last_synced_at?: string | null
          name?: string
          provider_account_id?: string
          provider_calendar_id?: string
          sync_token?: string | null
          timezone?: string | null
          updated_at?: string | null
          watch_channel_id?: string | null
          watch_expiration?: string | null
          watch_resource_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_provider_account_id_fkey"
            columns: ["provider_account_id"]
            isOneToOne: false
            referencedRelation: "provider_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "calendars_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_audit_log: {
        Row: {
          action: string
          config_id: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          config_id?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          config_id?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_audit_log_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "campaign_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_audit_log_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_status"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_configs: {
        Row: {
          ai_instructions: string
          created_at: string | null
          created_by: string | null
          daily_limit: number
          end_time: string
          frequency: string
          id: string
          inbox_id: string
          is_active: boolean | null
          max_split_parts: number | null
          min_interval_seconds: number
          source_column_id: string
          source_funnel_id: string
          split_messages: boolean | null
          start_time: string
          target_column_id: string
          timezone: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          ai_instructions?: string
          created_at?: string | null
          created_by?: string | null
          daily_limit?: number
          end_time?: string
          frequency?: string
          id?: string
          inbox_id: string
          is_active?: boolean | null
          max_split_parts?: number | null
          min_interval_seconds?: number
          source_column_id: string
          source_funnel_id: string
          split_messages?: boolean | null
          start_time?: string
          target_column_id: string
          timezone?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          ai_instructions?: string
          created_at?: string | null
          created_by?: string | null
          daily_limit?: number
          end_time?: string
          frequency?: string
          id?: string
          inbox_id?: string
          is_active?: boolean | null
          max_split_parts?: number | null
          min_interval_seconds?: number
          source_column_id?: string
          source_funnel_id?: string
          split_messages?: boolean | null
          start_time?: string
          target_column_id?: string
          timezone?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_configs_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_configs_source_column_id_fkey"
            columns: ["source_column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_configs_source_funnel_id_fkey"
            columns: ["source_funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_configs_target_column_id_fkey"
            columns: ["target_column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "campaign_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          lead_id: string | null
          level: string
          message: string
          message_id: string | null
          run_id: string
          step_name: string
          step_number: number
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string | null
          level?: string
          message: string
          message_id?: string | null
          run_id: string
          step_name: string
          step_number?: number
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string | null
          level?: string
          message?: string
          message_id?: string | null
          run_id?: string
          step_name?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "campaign_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "campaign_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_history"
            referencedColumns: ["run_id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          ai_generation_time_ms: number | null
          ai_model: string | null
          ai_tokens_used: number | null
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          generated_message: string | null
          id: string
          last_error: string | null
          lead_context: Json | null
          lead_id: string
          phone_field_name: string | null
          phone_normalized: string | null
          phone_number: string | null
          phone_source: string | null
          provider_message_id: string | null
          provider_response: Json | null
          queued_at: string | null
          replied_at: string | null
          retry_count: number | null
          run_id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          ai_generation_time_ms?: number | null
          ai_model?: string | null
          ai_tokens_used?: number | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          generated_message?: string | null
          id?: string
          last_error?: string | null
          lead_context?: Json | null
          lead_id: string
          phone_field_name?: string | null
          phone_normalized?: string | null
          phone_number?: string | null
          phone_source?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          queued_at?: string | null
          replied_at?: string | null
          retry_count?: number | null
          run_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          ai_generation_time_ms?: number | null
          ai_model?: string | null
          ai_tokens_used?: number | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          generated_message?: string | null
          id?: string
          last_error?: string | null
          lead_context?: Json | null
          lead_id?: string
          phone_field_name?: string | null
          phone_normalized?: string | null
          phone_number?: string | null
          phone_source?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          queued_at?: string | null
          replied_at?: string | null
          retry_count?: number | null
          run_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "campaign_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_history"
            referencedColumns: ["run_id"]
          },
        ]
      }
      campaign_runs: {
        Row: {
          completed_at: string | null
          config_id: string
          error_message: string | null
          id: string
          leads_failed: number | null
          leads_processed: number | null
          leads_skipped: number | null
          leads_success: number | null
          leads_total: number | null
          name: string | null
          run_date: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          config_id: string
          error_message?: string | null
          id?: string
          leads_failed?: number | null
          leads_processed?: number | null
          leads_skipped?: number | null
          leads_success?: number | null
          leads_total?: number | null
          name?: string | null
          run_date?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          config_id?: string
          error_message?: string | null
          id?: string
          leads_failed?: number | null
          leads_processed?: number | null
          leads_skipped?: number | null
          leads_success?: number | null
          leads_total?: number | null
          name?: string | null
          run_date?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_runs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "campaign_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_runs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_status"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_whatsapp_reports: {
        Row: {
          created_at: string | null
          delivery_rate: number | null
          id: string
          read_rate: number | null
          reply_rate: number | null
          report_date: string
          total_delivered: number | null
          total_failed: number | null
          total_read: number | null
          total_replied: number | null
          total_sent: number | null
          total_tokens: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_rate?: number | null
          id?: string
          read_rate?: number | null
          reply_rate?: number | null
          report_date?: string
          total_delivered?: number | null
          total_failed?: number | null
          total_read?: number | null
          total_replied?: number | null
          total_sent?: number | null
          total_tokens?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          delivery_rate?: number | null
          id?: string
          read_rate?: number | null
          reply_rate?: number | null
          report_date?: string
          total_delivered?: number | null
          total_failed?: number | null
          total_read?: number | null
          total_replied?: number | null
          total_sent?: number | null
          total_tokens?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_whatsapp_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "campaign_whatsapp_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cnpj_extraction_staging: {
        Row: {
          capital_social: number | null
          cnae: string | null
          cnae_descricao: string | null
          cnpj: string
          column_id: string | null
          created_at: string | null
          data_abertura: string | null
          email: string | null
          error_message: string | null
          funnel_id: string | null
          id: string
          lead_id: string | null
          mei: boolean | null
          migrated_at: string | null
          municipio: string | null
          nome_fantasia: string | null
          porte: string | null
          raw_data: Json | null
          razao_social: string | null
          run_id: string
          simples: boolean | null
          situacao: string | null
          status: string | null
          telefone: string | null
          tipo: string | null
          uf: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          capital_social?: number | null
          cnae?: string | null
          cnae_descricao?: string | null
          cnpj: string
          column_id?: string | null
          created_at?: string | null
          data_abertura?: string | null
          email?: string | null
          error_message?: string | null
          funnel_id?: string | null
          id?: string
          lead_id?: string | null
          mei?: boolean | null
          migrated_at?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          raw_data?: Json | null
          razao_social?: string | null
          run_id: string
          simples?: boolean | null
          situacao?: string | null
          status?: string | null
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          capital_social?: number | null
          cnae?: string | null
          cnae_descricao?: string | null
          cnpj?: string
          column_id?: string | null
          created_at?: string | null
          data_abertura?: string | null
          email?: string | null
          error_message?: string | null
          funnel_id?: string | null
          id?: string
          lead_id?: string | null
          mei?: boolean | null
          migrated_at?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          raw_data?: Json | null
          razao_social?: string | null
          run_id?: string
          simples?: boolean | null
          situacao?: string | null
          status?: string | null
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cnpj_extraction_staging_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_recent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnpj_extraction_staging_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cnpj_search_progress: {
        Row: {
          created_at: string | null
          filters: Json
          filters_hash: string
          id: string
          last_offset: number | null
          last_run_at: string | null
          total_extracted: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          filters: Json
          filters_hash: string
          id?: string
          last_offset?: number | null
          last_run_at?: string | null
          total_extracted?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          filters_hash?: string
          id?: string
          last_offset?: number | null
          last_run_at?: string | null
          total_extracted?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cnpj_search_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "cnpj_search_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          attendant_type: string | null
          avatar_url: string | null
          campaign_run_id: string | null
          channel: string | null
          contact_name: string
          contact_phone: string
          created_at: string | null
          id: string
          inbox_id: string | null
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          status: string | null
          tags: string[] | null
          total_messages: number | null
          unread_count: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          attendant_type?: string | null
          avatar_url?: string | null
          campaign_run_id?: string | null
          channel?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string | null
          id?: string
          inbox_id?: string | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          status?: string | null
          tags?: string[] | null
          total_messages?: number | null
          unread_count?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          attendant_type?: string | null
          avatar_url?: string | null
          campaign_run_id?: string | null
          channel?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string | null
          id?: string
          inbox_id?: string | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          status?: string | null
          tags?: string[] | null
          total_messages?: number | null
          unread_count?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_campaign_run_id_fkey"
            columns: ["campaign_run_id"]
            isOneToOne: false
            referencedRelation: "campaign_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_campaign_run_id_fkey"
            columns: ["campaign_run_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string | null
          field_type: string
          id: string
          is_required: boolean | null
          name: string
          options: Json | null
          position: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          field_type: string
          id?: string
          is_required?: boolean | null
          name: string
          options?: Json | null
          position?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          name?: string
          options?: Json | null
          position?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "custom_fields_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string | null
          edge_function_name: string | null
          error_context: string | null
          error_message: string
          error_state: string | null
          error_type: string | null
          function_name: string
          http_status: number | null
          id: string
          input_params: Json | null
          metadata: Json | null
          request_id: string | null
          severity: string | null
          stack_trace: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          edge_function_name?: string | null
          error_context?: string | null
          error_message: string
          error_state?: string | null
          error_type?: string | null
          function_name: string
          http_status?: number | null
          id?: string
          input_params?: Json | null
          metadata?: Json | null
          request_id?: string | null
          severity?: string | null
          stack_trace?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          edge_function_name?: string | null
          error_context?: string | null
          error_message?: string
          error_state?: string | null
          error_type?: string | null
          function_name?: string
          http_status?: number | null
          id?: string
          input_params?: Json | null
          metadata?: Json | null
          request_id?: string | null
          severity?: string | null
          stack_trace?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "error_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string
          id: string
          inbox_id: string | null
          message_template: string | null
          remind_at: string | null
          remind_before_minutes: number
          retry_count: number | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id: string
          id?: string
          inbox_id?: string | null
          message_template?: string | null
          remind_at?: string | null
          remind_before_minutes?: number
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string
          id?: string
          inbox_id?: string | null
          message_template?: string | null
          remind_at?: string | null
          remind_before_minutes?: number
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "internal_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reminders_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reminders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "event_reminders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          phase: string | null
          run_id: string
          source: string | null
          step_name: string
          step_number: number
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          level: string
          message: string
          phase?: string | null
          run_id: string
          source?: string | null
          step_name: string
          step_number: number
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
          phase?: string | null
          run_id?: string
          source?: string | null
          step_name?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "extraction_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_recent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_categories: {
        Row: {
          ai_instructions: string
          availability: string
          created_at: string | null
          id: string
          is_published: boolean | null
          name: string
          priority: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          ai_instructions: string
          availability: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          priority?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          ai_instructions?: string
          availability?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          priority?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "follow_up_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_history: {
        Row: {
          category_id: string
          conversation_id: string
          delivered_at: string | null
          error_message: string | null
          id: string
          job_id: string
          message_id: string | null
          message_sent: string
          model_id: string
          read_at: string | null
          sent_at: string | null
          sequence_number: number
          status: string
        }
        Insert: {
          category_id: string
          conversation_id: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          message_id?: string | null
          message_sent: string
          model_id: string
          read_at?: string | null
          sent_at?: string | null
          sequence_number: number
          status?: string
        }
        Update: {
          category_id?: string
          conversation_id?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          message_id?: string | null
          message_sent?: string
          model_id?: string
          read_at?: string | null
          sent_at?: string | null
          sequence_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_history_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "follow_up_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "follow_up_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "follow_up_jobs_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "follow_up_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "follow_up_models_with_seconds"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_jobs: {
        Row: {
          ai_decision_log: Json | null
          cancel_reason: string | null
          category_id: string | null
          completed_at: string | null
          conversation_id: string
          created_at: string | null
          current_model_index: number | null
          id: string
          last_checked_message_id: string | null
          next_execution_at: string | null
          status: string
          trigger_message_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          ai_decision_log?: Json | null
          cancel_reason?: string | null
          category_id?: string | null
          completed_at?: string | null
          conversation_id: string
          created_at?: string | null
          current_model_index?: number | null
          id?: string
          last_checked_message_id?: string | null
          next_execution_at?: string | null
          status?: string
          trigger_message_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          ai_decision_log?: Json | null
          cancel_reason?: string | null
          category_id?: string | null
          completed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          current_model_index?: number | null
          id?: string
          last_checked_message_id?: string | null
          next_execution_at?: string | null
          status?: string
          trigger_message_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "follow_up_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_jobs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_jobs_last_checked_message_id_fkey"
            columns: ["last_checked_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_jobs_trigger_message_id_fkey"
            columns: ["trigger_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "follow_up_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_models: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          message: string
          name: string
          sequence_order: number | null
          time_unit: string
          updated_at: string | null
          wait_time: number
          workspace_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          name: string
          sequence_order?: number | null
          time_unit: string
          updated_at?: string | null
          wait_time: number
          workspace_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          name?: string
          sequence_order?: number | null
          time_unit?: string
          updated_at?: string | null
          wait_time?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_models_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "follow_up_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "follow_up_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_columns: {
        Row: {
          color: string | null
          created_at: string | null
          funnel_id: string
          id: string
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          funnel_id: string
          id?: string
          position: number
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          funnel_id?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_columns_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_templates: {
        Row: {
          columns: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          position: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          columns?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          position?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          columns?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          position?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          position: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "funnels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string | null
          current_value: number
          end_month: number
          end_year: number
          frequency: string
          id: string
          start_month: number
          start_year: number
          target_value: number
          unit: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number
          end_month: number
          end_year: number
          frequency: string
          id?: string
          start_month: number
          start_year: number
          target_value: number
          unit?: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: number
          end_month?: number
          end_year?: number
          frequency?: string
          id?: string
          start_month?: number
          start_year?: number
          target_value?: number
          unit?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          access_token: string
          created_at: string | null
          google_email: string
          google_user_id: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          refresh_token: string
          sync_error: string | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          google_email: string
          google_user_id: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token: string
          sync_error?: string | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          google_email?: string
          google_user_id?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string
          sync_error?: string | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "google_calendar_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_sync: {
        Row: {
          connection_id: string
          created_at: string | null
          google_calendar_color: string | null
          google_calendar_id: string
          google_calendar_name: string
          id: string
          last_sync_at: string | null
          last_sync_token: string | null
          sync_direction: string | null
          sync_enabled: boolean | null
          sync_error: string | null
          updated_at: string | null
          user_id: string
          webhook_channel_id: string | null
          webhook_expiration: string | null
          webhook_resource_id: string | null
          workspace_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          google_calendar_color?: string | null
          google_calendar_id: string
          google_calendar_name: string
          id?: string
          last_sync_at?: string | null
          last_sync_token?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          sync_error?: string | null
          updated_at?: string | null
          user_id: string
          webhook_channel_id?: string | null
          webhook_expiration?: string | null
          webhook_resource_id?: string | null
          workspace_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          google_calendar_color?: string | null
          google_calendar_id?: string
          google_calendar_name?: string
          id?: string
          last_sync_at?: string | null
          last_sync_token?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          sync_error?: string | null
          updated_at?: string | null
          user_id?: string
          webhook_channel_id?: string | null
          webhook_expiration?: string | null
          webhook_resource_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_sync_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "google_calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_calendar_sync_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "google_calendar_sync_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sync_log: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          events_created: number | null
          events_deleted: number | null
          events_skipped: number | null
          events_updated: number | null
          google_calendar_sync_id: string | null
          id: string
          operation: string
          started_at: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_skipped?: number | null
          events_updated?: number | null
          google_calendar_sync_id?: string | null
          id?: string
          operation: string
          started_at?: string | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_skipped?: number | null
          events_updated?: number | null
          google_calendar_sync_id?: string | null
          id?: string
          operation?: string
          started_at?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_sync_log_google_calendar_sync_id_fkey"
            columns: ["google_calendar_sync_id"]
            isOneToOne: false
            referencedRelation: "google_calendar_sync"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_sync_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "google_sync_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sync_queue: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string | null
          error_message: string | null
          id: string
          priority: number | null
          started_at: string | null
          status: string
          sync_type: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          priority?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          priority?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_sync_queue_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "google_calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_instances: {
        Row: {
          created_at: string | null
          inbox_id: string
          instance_id: string
        }
        Insert: {
          created_at?: string | null
          inbox_id: string
          instance_id: string
        }
        Update: {
          created_at?: string | null
          inbox_id?: string
          instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_instances_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_instances_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      inboxes: {
        Row: {
          assigned_agents: string[] | null
          auto_assignment: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          settings: Json | null
          updated_at: string | null
          working_hours: Json | null
          workspace_id: string
        }
        Insert: {
          assigned_agents?: string[] | null
          auto_assignment?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          settings?: Json | null
          updated_at?: string | null
          working_hours?: Json | null
          workspace_id: string
        }
        Update: {
          assigned_agents?: string[] | null
          auto_assignment?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          settings?: Json | null
          updated_at?: string | null
          working_hours?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inboxes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "inboxes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_discovery_results: {
        Row: {
          created_at: string
          google_link: string
          google_snippet: string | null
          google_title: string | null
          id: string
          is_duplicate: boolean | null
          is_valid: boolean | null
          profile_url: string
          run_id: string
          search_position: number | null
          search_query: string | null
          sent_to_enrichment: boolean | null
          username: string
        }
        Insert: {
          created_at?: string
          google_link: string
          google_snippet?: string | null
          google_title?: string | null
          id?: string
          is_duplicate?: boolean | null
          is_valid?: boolean | null
          profile_url: string
          run_id: string
          search_position?: number | null
          search_query?: string | null
          sent_to_enrichment?: boolean | null
          username: string
        }
        Update: {
          created_at?: string
          google_link?: string
          google_snippet?: string | null
          google_title?: string | null
          id?: string
          is_duplicate?: boolean | null
          is_valid?: boolean | null
          profile_url?: string
          run_id?: string
          search_position?: number | null
          search_query?: string | null
          sent_to_enrichment?: boolean | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_discovery_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_recent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_discovery_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_enriched_profiles: {
        Row: {
          biography: string | null
          business_address: Json | null
          business_category: string | null
          business_email: string | null
          business_phone: string | null
          column_id: string | null
          created_at: string
          discovery_id: string | null
          email_from_bio: string | null
          external_url: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          funnel_id: string | null
          id: string
          instagram_id: string | null
          is_business_account: boolean | null
          is_private: boolean | null
          is_professional_account: boolean | null
          is_verified: boolean | null
          lead_id: string | null
          migrated_at: string | null
          migrated_to_leads: boolean | null
          next_retry_at: string | null
          phone_from_bio: string | null
          posts_count: number | null
          processing_status: string
          profile_pic_url: string | null
          raw_data: Json | null
          run_id: string
          skip_reason: string | null
          updated_at: string
          username: string
          website_category: string | null
          website_scraping_attempts: number | null
          website_scraping_completed_at: string | null
          website_scraping_data: Json | null
          website_scraping_enriched: boolean | null
          website_scraping_error: string | null
          website_scraping_started_at: string | null
          website_scraping_status: string | null
          whatsapp_from_bio: string | null
          workspace_id: string
        }
        Insert: {
          biography?: string | null
          business_address?: Json | null
          business_category?: string | null
          business_email?: string | null
          business_phone?: string | null
          column_id?: string | null
          created_at?: string
          discovery_id?: string | null
          email_from_bio?: string | null
          external_url?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          funnel_id?: string | null
          id?: string
          instagram_id?: string | null
          is_business_account?: boolean | null
          is_private?: boolean | null
          is_professional_account?: boolean | null
          is_verified?: boolean | null
          lead_id?: string | null
          migrated_at?: string | null
          migrated_to_leads?: boolean | null
          next_retry_at?: string | null
          phone_from_bio?: string | null
          posts_count?: number | null
          processing_status?: string
          profile_pic_url?: string | null
          raw_data?: Json | null
          run_id: string
          skip_reason?: string | null
          updated_at?: string
          username: string
          website_category?: string | null
          website_scraping_attempts?: number | null
          website_scraping_completed_at?: string | null
          website_scraping_data?: Json | null
          website_scraping_enriched?: boolean | null
          website_scraping_error?: string | null
          website_scraping_started_at?: string | null
          website_scraping_status?: string | null
          whatsapp_from_bio?: string | null
          workspace_id: string
        }
        Update: {
          biography?: string | null
          business_address?: Json | null
          business_category?: string | null
          business_email?: string | null
          business_phone?: string | null
          column_id?: string | null
          created_at?: string
          discovery_id?: string | null
          email_from_bio?: string | null
          external_url?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          funnel_id?: string | null
          id?: string
          instagram_id?: string | null
          is_business_account?: boolean | null
          is_private?: boolean | null
          is_professional_account?: boolean | null
          is_verified?: boolean | null
          lead_id?: string | null
          migrated_at?: string | null
          migrated_to_leads?: boolean | null
          next_retry_at?: string | null
          phone_from_bio?: string | null
          posts_count?: number | null
          processing_status?: string
          profile_pic_url?: string | null
          raw_data?: Json | null
          run_id?: string
          skip_reason?: string | null
          updated_at?: string
          username?: string
          website_category?: string | null
          website_scraping_attempts?: number | null
          website_scraping_completed_at?: string | null
          website_scraping_data?: Json | null
          website_scraping_enriched?: boolean | null
          website_scraping_error?: string | null
          website_scraping_started_at?: string | null
          website_scraping_status?: string | null
          whatsapp_from_bio?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_enriched_profiles_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_enriched_profiles_discovery_id_fkey"
            columns: ["discovery_id"]
            isOneToOne: false
            referencedRelation: "instagram_discovery_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_enriched_profiles_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_enriched_profiles_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_enriched_profiles_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_recent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_enriched_profiles_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_enriched_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "instagram_enriched_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_extraction_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          phase: string
          run_id: string
          step_name: string
          step_number: number
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          level: string
          message: string
          phase: string
          run_id: string
          step_name: string
          step_number: number
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
          phase?: string
          run_id?: string
          step_name?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "instagram_extraction_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_recent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_extraction_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_query_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          last_results_page: number | null
          last_used_at: string | null
          location: string | null
          niche: string
          query_hash: string
          query_text: string
          results_count: number | null
          total_pages_fetched: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_results_page?: number | null
          last_used_at?: string | null
          location?: string | null
          niche: string
          query_hash: string
          query_text: string
          results_count?: number | null
          total_pages_fetched?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_results_page?: number | null
          last_used_at?: string | null
          location?: string | null
          niche?: string
          query_hash?: string
          query_text?: string
          results_count?: number | null
          total_pages_fetched?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      instagram_search_progress: {
        Row: {
          created_at: string | null
          exhausted_queries: Json | null
          id: string
          is_fully_exhausted: boolean | null
          last_page_by_query: Json | null
          last_search_at: string | null
          location: string
          niche: string
          query_hash: string
          search_queries: Json | null
          total_pages_consumed: number | null
          total_results_found: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          exhausted_queries?: Json | null
          id?: string
          is_fully_exhausted?: boolean | null
          last_page_by_query?: Json | null
          last_search_at?: string | null
          location: string
          niche: string
          query_hash: string
          search_queries?: Json | null
          total_pages_consumed?: number | null
          total_results_found?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          exhausted_queries?: Json | null
          id?: string
          is_fully_exhausted?: boolean | null
          last_page_by_query?: Json | null
          last_search_at?: string | null
          location?: string
          niche?: string
          query_hash?: string
          search_queries?: Json | null
          total_pages_consumed?: number | null
          total_results_found?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_search_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "instagram_search_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          api_key: string | null
          created_at: string | null
          fallback_config: Json | null
          fallback_provider: string | null
          id: string
          instance_id: string | null
          instance_token: string | null
          last_connected_at: string | null
          name: string
          phone_number: string | null
          provider: string | null
          provider_config: Json | null
          provider_type: string | null
          qr_code: string | null
          settings: Json | null
          status: string | null
          updated_at: string | null
          webhook_url: string | null
          workspace_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          fallback_config?: Json | null
          fallback_provider?: string | null
          id?: string
          instance_id?: string | null
          instance_token?: string | null
          last_connected_at?: string | null
          name: string
          phone_number?: string | null
          provider?: string | null
          provider_config?: Json | null
          provider_type?: string | null
          qr_code?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
          workspace_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          fallback_config?: Json | null
          fallback_provider?: string | null
          id?: string
          instance_id?: string | null
          instance_token?: string | null
          last_connected_at?: string | null
          name?: string
          phone_number?: string | null
          provider?: string | null
          provider_config?: Json | null
          provider_type?: string | null
          qr_code?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_calendars: {
        Row: {
          ai_metadata: Json | null
          calendar_type: string
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string | null
          timezone: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          ai_metadata?: Json | null
          calendar_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          ai_metadata?: Json | null
          calendar_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_calendars_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_calendars_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "internal_calendars_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_events: {
        Row: {
          assigned_to: string | null
          attendees: Json | null
          cancelled_at: string | null
          cancelled_reason: string | null
          confirmed_at: string | null
          confirmed_via: string | null
          conversation_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          event_status: string | null
          event_type: string | null
          google_calendar_sync_id: string | null
          google_etag: string | null
          google_event_id: string | null
          google_synced_at: string | null
          id: string
          inbox_id: string | null
          internal_calendar_id: string
          is_meeting: boolean | null
          lead_id: string | null
          location: string | null
          needs_google_sync: boolean | null
          organizer_email: string | null
          recurrence_rule: string | null
          reminder_sent_at: string | null
          show_as: string | null
          source: string | null
          start_time: string
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          attendees?: Json | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          confirmed_at?: string | null
          confirmed_via?: string | null
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          event_status?: string | null
          event_type?: string | null
          google_calendar_sync_id?: string | null
          google_etag?: string | null
          google_event_id?: string | null
          google_synced_at?: string | null
          id?: string
          inbox_id?: string | null
          internal_calendar_id: string
          is_meeting?: boolean | null
          lead_id?: string | null
          location?: string | null
          needs_google_sync?: boolean | null
          organizer_email?: string | null
          recurrence_rule?: string | null
          reminder_sent_at?: string | null
          show_as?: string | null
          source?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          attendees?: Json | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          confirmed_at?: string | null
          confirmed_via?: string | null
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          event_status?: string | null
          event_type?: string | null
          google_calendar_sync_id?: string | null
          google_etag?: string | null
          google_event_id?: string | null
          google_synced_at?: string | null
          id?: string
          inbox_id?: string | null
          internal_calendar_id?: string
          is_meeting?: boolean | null
          lead_id?: string | null
          location?: string | null
          needs_google_sync?: boolean | null
          organizer_email?: string | null
          recurrence_rule?: string | null
          reminder_sent_at?: string | null
          show_as?: string | null
          source?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_events_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_google_calendar_sync_id_fkey"
            columns: ["google_calendar_sync_id"]
            isOneToOne: false
            referencedRelation: "google_calendar_sync"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_internal_calendar_id_fkey"
            columns: ["internal_calendar_id"]
            isOneToOne: false
            referencedRelation: "internal_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "internal_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_to_provider_mapping: {
        Row: {
          calendar_id: string
          created_at: string | null
          id: string
          internal_event_id: string
          last_synced_at: string | null
          provider_event_id: string
          sync_status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string | null
          id?: string
          internal_event_id: string
          last_synced_at?: string | null
          provider_event_id: string
          sync_status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string | null
          id?: string
          internal_event_id?: string
          last_synced_at?: string | null
          provider_event_id?: string
          sync_status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_to_provider_mapping_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_to_provider_mapping_internal_event_id_fkey"
            columns: ["internal_event_id"]
            isOneToOne: false
            referencedRelation: "internal_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_to_provider_mapping_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "internal_to_provider_mapping_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jwt_disable_log: {
        Row: {
          errors: Json | null
          executed_at: string | null
          id: string
          raw_result: Json | null
          total_errors: number | null
          total_functions: number | null
          total_skipped: number | null
          total_updated: number | null
          updated: string[] | null
        }
        Insert: {
          errors?: Json | null
          executed_at?: string | null
          id?: string
          raw_result?: Json | null
          total_errors?: number | null
          total_functions?: number | null
          total_skipped?: number | null
          total_updated?: number | null
          updated?: string[] | null
        }
        Update: {
          errors?: Json | null
          executed_at?: string | null
          id?: string
          raw_result?: Json | null
          total_errors?: number | null
          total_functions?: number | null
          total_skipped?: number | null
          total_updated?: number | null
          updated?: string[] | null
        }
        Relationships: []
      }
      kv_store_34fac51f: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      kv_store_e4f9d774: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lead_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lead_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lead_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_custom_values: {
        Row: {
          created_at: string | null
          custom_field_id: string
          id: string
          lead_id: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          custom_field_id: string
          id?: string
          lead_id: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          custom_field_id?: string
          id?: string
          lead_id?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_custom_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_custom_values_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_document_folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          lead_id: string
          name: string
          position: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          name: string
          position?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          name?: string
          position?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_document_folders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_document_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_document_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_document_templates: {
        Row: {
          content: Json
          content_text: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          content: Json
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          content?: Json
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_document_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_document_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_document_versions: {
        Row: {
          content: Json
          content_text: string | null
          created_at: string | null
          created_by: string | null
          document_id: string
          id: string
          version_number: number
        }
        Insert: {
          content: Json
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id: string
          id?: string
          version_number: number
        }
        Update: {
          content?: Json
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "lead_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documents: {
        Row: {
          content: Json | null
          content_text: string | null
          created_at: string | null
          created_by: string | null
          folder_id: string | null
          id: string
          is_pinned: boolean | null
          lead_id: string
          title: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          content?: Json | null
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          folder_id?: string | null
          id?: string
          is_pinned?: boolean | null
          lead_id: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          content?: Json | null
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          folder_id?: string | null
          id?: string
          is_pinned?: boolean | null
          lead_id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "lead_document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_extraction_runs: {
        Row: {
          ai_decisions: Json | null
          column_id: string | null
          completed_steps: number | null
          created_at: string | null
          created_quantity: number | null
          credits_consumed: number | null
          current_step: string | null
          discovery_completed_at: string | null
          discovery_profiles_found: number | null
          discovery_profiles_unique: number | null
          discovery_queries_completed: number | null
          discovery_queries_total: number | null
          discovery_status: string | null
          duplicates_skipped: number | null
          enrichment_completed_at: string | null
          enrichment_profiles_completed: number | null
          enrichment_profiles_failed: number | null
          enrichment_profiles_total: number | null
          enrichment_snapshot_id: string | null
          enrichment_status: string | null
          error_message: string | null
          execution_time_ms: number | null
          extraction_id: string
          filtered_out: number | null
          filters_applied: Json | null
          finished_at: string | null
          found_quantity: number | null
          funnel_id: string | null
          id: string
          location: string
          niche: string | null
          original_column_id: string | null
          original_funnel_id: string | null
          pages_consumed: number | null
          progress_data: Json | null
          retry_count: number | null
          run_name: string | null
          search_term: string
          source: string | null
          started_at: string | null
          status: string
          target_quantity: number
          total_steps: number | null
          triggered_by: string | null
          workspace_id: string
        }
        Insert: {
          ai_decisions?: Json | null
          column_id?: string | null
          completed_steps?: number | null
          created_at?: string | null
          created_quantity?: number | null
          credits_consumed?: number | null
          current_step?: string | null
          discovery_completed_at?: string | null
          discovery_profiles_found?: number | null
          discovery_profiles_unique?: number | null
          discovery_queries_completed?: number | null
          discovery_queries_total?: number | null
          discovery_status?: string | null
          duplicates_skipped?: number | null
          enrichment_completed_at?: string | null
          enrichment_profiles_completed?: number | null
          enrichment_profiles_failed?: number | null
          enrichment_profiles_total?: number | null
          enrichment_snapshot_id?: string | null
          enrichment_status?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          extraction_id: string
          filtered_out?: number | null
          filters_applied?: Json | null
          finished_at?: string | null
          found_quantity?: number | null
          funnel_id?: string | null
          id?: string
          location: string
          niche?: string | null
          original_column_id?: string | null
          original_funnel_id?: string | null
          pages_consumed?: number | null
          progress_data?: Json | null
          retry_count?: number | null
          run_name?: string | null
          search_term: string
          source?: string | null
          started_at?: string | null
          status?: string
          target_quantity: number
          total_steps?: number | null
          triggered_by?: string | null
          workspace_id: string
        }
        Update: {
          ai_decisions?: Json | null
          column_id?: string | null
          completed_steps?: number | null
          created_at?: string | null
          created_quantity?: number | null
          credits_consumed?: number | null
          current_step?: string | null
          discovery_completed_at?: string | null
          discovery_profiles_found?: number | null
          discovery_profiles_unique?: number | null
          discovery_queries_completed?: number | null
          discovery_queries_total?: number | null
          discovery_status?: string | null
          duplicates_skipped?: number | null
          enrichment_completed_at?: string | null
          enrichment_profiles_completed?: number | null
          enrichment_profiles_failed?: number | null
          enrichment_profiles_total?: number | null
          enrichment_snapshot_id?: string | null
          enrichment_status?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          extraction_id?: string
          filtered_out?: number | null
          filters_applied?: Json | null
          finished_at?: string | null
          found_quantity?: number | null
          funnel_id?: string | null
          id?: string
          location?: string
          niche?: string | null
          original_column_id?: string | null
          original_funnel_id?: string | null
          pages_consumed?: number | null
          progress_data?: Json | null
          retry_count?: number | null
          run_name?: string | null
          search_term?: string
          source?: string | null
          started_at?: string | null
          status?: string
          target_quantity?: number
          total_steps?: number | null
          triggered_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_extraction_runs_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "lead_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extraction_runs_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "lead_extractions_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extraction_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extraction_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_extraction_staging: {
        Row: {
          client_name: string
          cnpj_checked_at: string | null
          cnpj_data: Json | null
          cnpj_enriched: boolean | null
          cnpj_normalized: string | null
          cnpj_provider: string | null
          cnpj_source: string | null
          company: string | null
          contact_type: string | null
          created_at: string
          deduplication_hash: string
          domain: string | null
          domain_source: string | null
          emails: Json | null
          enrichment_data: Json | null
          extracted_data: Json
          extraction_run_id: string
          filter_passed: boolean
          filter_reason: string | null
          filter_results: Json | null
          formatted_address: string | null
          google_place_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          migrated_at: string | null
          migrated_lead_id: string | null
          phone_normalized: string | null
          phone_source: string | null
          phone_variants: Json | null
          phones: Json | null
          phones_validated_at: string | null
          primary_email: string | null
          primary_phone: string | null
          primary_website: string | null
          raw_google_data: Json | null
          raw_scraper_data: Json | null
          scraping_attempts: number | null
          scraping_completed_at: string | null
          scraping_data: Json | null
          scraping_enriched: boolean | null
          scraping_error: string | null
          scraping_started_at: string | null
          scraping_status: string | null
          should_migrate: boolean
          status_enrichment: string
          status_extraction: string
          updated_at: string
          websites: Json | null
          whatsapp_checked_at: string | null
          whatsapp_jid: string | null
          whatsapp_name: string | null
          whatsapp_valid: boolean | null
          whois_checked_at: string | null
          whois_data: Json | null
          whois_enriched: boolean | null
          whois_extracted_data: Json | null
          workspace_id: string
        }
        Insert: {
          client_name: string
          cnpj_checked_at?: string | null
          cnpj_data?: Json | null
          cnpj_enriched?: boolean | null
          cnpj_normalized?: string | null
          cnpj_provider?: string | null
          cnpj_source?: string | null
          company?: string | null
          contact_type?: string | null
          created_at?: string
          deduplication_hash: string
          domain?: string | null
          domain_source?: string | null
          emails?: Json | null
          enrichment_data?: Json | null
          extracted_data?: Json
          extraction_run_id: string
          filter_passed?: boolean
          filter_reason?: string | null
          filter_results?: Json | null
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          migrated_at?: string | null
          migrated_lead_id?: string | null
          phone_normalized?: string | null
          phone_source?: string | null
          phone_variants?: Json | null
          phones?: Json | null
          phones_validated_at?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          primary_website?: string | null
          raw_google_data?: Json | null
          raw_scraper_data?: Json | null
          scraping_attempts?: number | null
          scraping_completed_at?: string | null
          scraping_data?: Json | null
          scraping_enriched?: boolean | null
          scraping_error?: string | null
          scraping_started_at?: string | null
          scraping_status?: string | null
          should_migrate?: boolean
          status_enrichment?: string
          status_extraction?: string
          updated_at?: string
          websites?: Json | null
          whatsapp_checked_at?: string | null
          whatsapp_jid?: string | null
          whatsapp_name?: string | null
          whatsapp_valid?: boolean | null
          whois_checked_at?: string | null
          whois_data?: Json | null
          whois_enriched?: boolean | null
          whois_extracted_data?: Json | null
          workspace_id: string
        }
        Update: {
          client_name?: string
          cnpj_checked_at?: string | null
          cnpj_data?: Json | null
          cnpj_enriched?: boolean | null
          cnpj_normalized?: string | null
          cnpj_provider?: string | null
          cnpj_source?: string | null
          company?: string | null
          contact_type?: string | null
          created_at?: string
          deduplication_hash?: string
          domain?: string | null
          domain_source?: string | null
          emails?: Json | null
          enrichment_data?: Json | null
          extracted_data?: Json
          extraction_run_id?: string
          filter_passed?: boolean
          filter_reason?: string | null
          filter_results?: Json | null
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          migrated_at?: string | null
          migrated_lead_id?: string | null
          phone_normalized?: string | null
          phone_source?: string | null
          phone_variants?: Json | null
          phones?: Json | null
          phones_validated_at?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          primary_website?: string | null
          raw_google_data?: Json | null
          raw_scraper_data?: Json | null
          scraping_attempts?: number | null
          scraping_completed_at?: string | null
          scraping_data?: Json | null
          scraping_enriched?: boolean | null
          scraping_error?: string | null
          scraping_started_at?: string | null
          scraping_status?: string | null
          should_migrate?: boolean
          status_enrichment?: string
          status_extraction?: string
          updated_at?: string
          websites?: Json | null
          whatsapp_checked_at?: string | null
          whatsapp_jid?: string | null
          whatsapp_name?: string | null
          whatsapp_valid?: boolean | null
          whois_checked_at?: string | null
          whois_data?: Json | null
          whois_enriched?: boolean | null
          whois_extracted_data?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_extraction_staging_extraction_run_id_fkey"
            columns: ["extraction_run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_recent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extraction_staging_extraction_run_id_fkey"
            columns: ["extraction_run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extraction_staging_migrated_lead_id_fkey"
            columns: ["migrated_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_extractions: {
        Row: {
          column_id: string
          created_at: string | null
          daily_lead_target: number | null
          expand_state_search: boolean | null
          extraction_mode: string
          extraction_name: string
          extraction_type: string | null
          filters_json: Json | null
          funnel_id: string
          id: string
          is_active: boolean | null
          last_scheduled_time: string | null
          location: string
          min_rating: number | null
          min_reviews: number | null
          niche: string | null
          prompt: string | null
          require_email: boolean | null
          require_phone: boolean | null
          require_website: boolean | null
          schedule_time: string | null
          search_term: string
          search_terms_history: Json | null
          source: string | null
          target_quantity: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          column_id: string
          created_at?: string | null
          daily_lead_target?: number | null
          expand_state_search?: boolean | null
          extraction_mode?: string
          extraction_name: string
          extraction_type?: string | null
          filters_json?: Json | null
          funnel_id: string
          id?: string
          is_active?: boolean | null
          last_scheduled_time?: string | null
          location: string
          min_rating?: number | null
          min_reviews?: number | null
          niche?: string | null
          prompt?: string | null
          require_email?: boolean | null
          require_phone?: boolean | null
          require_website?: boolean | null
          schedule_time?: string | null
          search_term: string
          search_terms_history?: Json | null
          source?: string | null
          target_quantity?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          column_id?: string
          created_at?: string | null
          daily_lead_target?: number | null
          expand_state_search?: boolean | null
          extraction_mode?: string
          extraction_name?: string
          extraction_type?: string | null
          filters_json?: Json | null
          funnel_id?: string
          id?: string
          is_active?: boolean | null
          last_scheduled_time?: string | null
          location?: string
          min_rating?: number | null
          min_reviews?: number | null
          niche?: string | null
          prompt?: string | null
          require_email?: boolean | null
          require_phone?: boolean | null
          require_website?: boolean | null
          schedule_time?: string | null
          search_term?: string
          search_terms_history?: Json | null
          source?: string | null
          target_quantity?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_extractions_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extractions_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extractions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extractions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_files: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          lead_id: string
          updated_at: string | null
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          lead_id: string
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          lead_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_files_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          assignee_avatar: string | null
          assignee_name: string | null
          attachments_count: number | null
          avatar_url: string | null
          calls_count: number | null
          client_name: string
          cnpj: string | null
          column_id: string | null
          comments_count: number | null
          company: string | null
          contact_date: string | null
          created_at: string | null
          created_by: string | null
          deal_value: number | null
          deduplication_hash: string | null
          due_date: string | null
          emails_count: number | null
          expected_close_date: string | null
          funnel_id: string
          id: string
          is_important: boolean | null
          last_activity_at: string | null
          lead_extraction_id: string | null
          lead_extraction_run_id: string | null
          notes: string | null
          phone: string | null
          position: number | null
          priority: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          updated_by: string | null
          whatsapp_checked_at: string | null
          whatsapp_jid: string | null
          whatsapp_name: string | null
          whatsapp_valid: boolean | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          assignee_avatar?: string | null
          assignee_name?: string | null
          attachments_count?: number | null
          avatar_url?: string | null
          calls_count?: number | null
          client_name: string
          cnpj?: string | null
          column_id?: string | null
          comments_count?: number | null
          company?: string | null
          contact_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_value?: number | null
          deduplication_hash?: string | null
          due_date?: string | null
          emails_count?: number | null
          expected_close_date?: string | null
          funnel_id: string
          id?: string
          is_important?: boolean | null
          last_activity_at?: string | null
          lead_extraction_id?: string | null
          lead_extraction_run_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: number | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_checked_at?: string | null
          whatsapp_jid?: string | null
          whatsapp_name?: string | null
          whatsapp_valid?: boolean | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          assignee_avatar?: string | null
          assignee_name?: string | null
          attachments_count?: number | null
          avatar_url?: string | null
          calls_count?: number | null
          client_name?: string
          cnpj?: string | null
          column_id?: string | null
          comments_count?: number | null
          company?: string | null
          contact_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_value?: number | null
          deduplication_hash?: string | null
          due_date?: string | null
          emails_count?: number | null
          expected_close_date?: string | null
          funnel_id?: string
          id?: string
          is_important?: boolean | null
          last_activity_at?: string | null
          lead_extraction_id?: string | null
          lead_extraction_run_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: number | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_checked_at?: string | null
          whatsapp_jid?: string | null
          whatsapp_name?: string | null
          whatsapp_valid?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lead_extraction_id_fkey"
            columns: ["lead_extraction_id"]
            isOneToOne: false
            referencedRelation: "lead_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lead_extraction_id_fkey"
            columns: ["lead_extraction_id"]
            isOneToOne: false
            referencedRelation: "lead_extractions_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lead_extraction_run_id_fkey"
            columns: ["lead_extraction_run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_recent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lead_extraction_run_id_fkey"
            columns: ["lead_extraction_run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          action: string | null
          created_at: string | null
          error_message: string | null
          id: string
          instance_id: string | null
          provider_used: string | null
          request_data: Json | null
          response_data: Json | null
          status: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          provider_used?: string | null
          request_data?: Json | null
          response_data?: Json | null
          status?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          provider_used?: string | null
          request_data?: Json | null
          response_data?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_duration: number | null
          content_type: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          is_read: boolean | null
          media_url: string | null
          message_type: string
          mime_type: string | null
          pipeline_id: string | null
          provider_message_id: string | null
          sent_by: string | null
          text_content: string | null
          transcribed_at: string | null
          transcription: string | null
          transcription_provider: string | null
          transcription_status: string | null
        }
        Insert: {
          audio_duration?: number | null
          content_type?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type: string
          mime_type?: string | null
          pipeline_id?: string | null
          provider_message_id?: string | null
          sent_by?: string | null
          text_content?: string | null
          transcribed_at?: string | null
          transcription?: string | null
          transcription_provider?: string | null
          transcription_status?: string | null
        }
        Update: {
          audio_duration?: number | null
          content_type?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string
          mime_type?: string | null
          pipeline_id?: string | null
          provider_message_id?: string | null
          sent_by?: string | null
          text_content?: string | null
          transcribed_at?: string | null
          transcription?: string | null
          transcription_provider?: string | null
          transcription_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "ai_pipeline_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "ai_pipeline_logs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhood_cache: {
        Row: {
          ai_model: string | null
          city: string | null
          country: string | null
          created_at: string | null
          expires_at: string | null
          has_more_neighborhoods: boolean | null
          id: string
          is_valid: boolean | null
          location_level: string | null
          locations: string[]
          search_term: string | null
          source: string | null
          state: string
        }
        Insert: {
          ai_model?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          expires_at?: string | null
          has_more_neighborhoods?: boolean | null
          id?: string
          is_valid?: boolean | null
          location_level?: string | null
          locations: string[]
          search_term?: string | null
          source?: string | null
          state: string
        }
        Update: {
          ai_model?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          expires_at?: string | null
          has_more_neighborhoods?: boolean | null
          id?: string
          is_valid?: boolean | null
          location_level?: string | null
          locations?: string[]
          search_term?: string | null
          source?: string | null
          state?: string
        }
        Relationships: []
      }
      neighborhood_search_history: {
        Row: {
          ai_round: number | null
          api_exhausted: boolean | null
          created_at: string | null
          id: string
          is_suspect: boolean | null
          last_page_searched: number | null
          location_formatted: string
          pages_with_zero_results: number | null
          search_term: string
          total_leads_found: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          ai_round?: number | null
          api_exhausted?: boolean | null
          created_at?: string | null
          id?: string
          is_suspect?: boolean | null
          last_page_searched?: number | null
          location_formatted: string
          pages_with_zero_results?: number | null
          search_term: string
          total_leads_found?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          ai_round?: number | null
          api_exhausted?: boolean | null
          created_at?: string | null
          id?: string
          is_suspect?: boolean | null
          last_page_searched?: number | null
          location_formatted?: string
          pages_with_zero_results?: number | null
          search_term?: string
          total_leads_found?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighborhood_search_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "neighborhood_search_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channels_failed: Json | null
          channels_requested: Json | null
          channels_sent: Json | null
          created_at: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string | null
          title: string
          type: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          body: string
          channels_failed?: Json | null
          channels_requested?: Json | null
          channels_sent?: Json | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          type: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          body?: string
          channels_failed?: Json | null
          channels_requested?: Json | null
          channels_sent?: Json | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_accounts: {
        Row: {
          access_token_encrypted: string | null
          calendar_provider_id: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          provider_account_id: string
          refresh_token_encrypted: string | null
          scopes_granted: Json | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          calendar_provider_id: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          provider_account_id: string
          refresh_token_encrypted?: string | null
          scopes_granted?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          calendar_provider_id?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          provider_account_id?: string
          refresh_token_encrypted?: string | null
          scopes_granted?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_accounts_calendar_provider_id_fkey"
            columns: ["calendar_provider_id"]
            isOneToOne: false
            referencedRelation: "calendar_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "provider_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_name: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          p256dh_key: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_name?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh_key: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_name?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh_key?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reminder_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          event_id: string
          event_location: string | null
          event_start_time: string
          event_title: string
          event_type: string
          id: string
          inbox_id: string
          last_error: string | null
          lead_company: string | null
          lead_id: string
          lead_name: string
          lead_phone: string
          max_attempts: number | null
          message_template: string | null
          processed_at: string | null
          queued_at: string | null
          reminder_id: string
          status: string | null
          workspace_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          event_id: string
          event_location?: string | null
          event_start_time: string
          event_title: string
          event_type: string
          id?: string
          inbox_id: string
          last_error?: string | null
          lead_company?: string | null
          lead_id: string
          lead_name: string
          lead_phone: string
          max_attempts?: number | null
          message_template?: string | null
          processed_at?: string | null
          queued_at?: string | null
          reminder_id: string
          status?: string | null
          workspace_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          event_id?: string
          event_location?: string | null
          event_start_time?: string
          event_title?: string
          event_type?: string
          id?: string
          inbox_id?: string
          last_error?: string | null
          lead_company?: string | null
          lead_id?: string
          lead_name?: string
          lead_phone?: string
          max_attempts?: number | null
          message_template?: string | null
          processed_at?: string | null
          queued_at?: string | null
          reminder_id?: string
          status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_queue_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "event_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "reminder_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          message_template: string
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          message_template: string
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          message_template?: string
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "reminder_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          permissions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          permissions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          daily_summary_enabled: boolean | null
          daily_summary_time: string | null
          email_enabled: boolean | null
          id: string
          lead_created_email: boolean | null
          lead_created_push: boolean | null
          lead_created_whatsapp: boolean | null
          mention_email: boolean | null
          mention_push: boolean | null
          mention_whatsapp: boolean | null
          new_message_email: boolean | null
          new_message_push: boolean | null
          new_message_whatsapp: boolean | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          transfer_email: boolean | null
          transfer_push: boolean | null
          transfer_whatsapp: boolean | null
          updated_at: string | null
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          daily_summary_enabled?: boolean | null
          daily_summary_time?: string | null
          email_enabled?: boolean | null
          id?: string
          lead_created_email?: boolean | null
          lead_created_push?: boolean | null
          lead_created_whatsapp?: boolean | null
          mention_email?: boolean | null
          mention_push?: boolean | null
          mention_whatsapp?: boolean | null
          new_message_email?: boolean | null
          new_message_push?: boolean | null
          new_message_whatsapp?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          transfer_email?: boolean | null
          transfer_push?: boolean | null
          transfer_whatsapp?: boolean | null
          updated_at?: string | null
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          daily_summary_enabled?: boolean | null
          daily_summary_time?: string | null
          email_enabled?: boolean | null
          id?: string
          lead_created_email?: boolean | null
          lead_created_push?: boolean | null
          lead_created_whatsapp?: boolean | null
          mention_email?: boolean | null
          mention_push?: boolean | null
          mention_whatsapp?: boolean | null
          new_message_email?: boolean | null
          new_message_push?: boolean | null
          new_message_whatsapp?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          transfer_email?: boolean | null
          transfer_push?: boolean | null
          transfer_whatsapp?: boolean | null
          updated_at?: string | null
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          last_workspace_id: string | null
          name: string
          phone: string | null
          phone_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          last_workspace_id?: string | null
          name: string
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_workspace_id?: string | null
          name?: string
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_last_workspace"
            columns: ["last_workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "fk_users_last_workspace"
            columns: ["last_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      watchdog_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          reason: string
          run_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          reason: string
          run_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          reason?: string
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchdog_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_recent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchdog_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_queue: {
        Row: {
          created_at: string
          error_details: Json | null
          error_message: string | null
          event_type: string
          id: string
          instance_name: string
          max_retries: number
          message_id: string | null
          next_retry_at: string | null
          payload: Json
          priority: number
          processed_at: string | null
          remote_jid: string | null
          retry_count: number
          status: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          event_type: string
          id?: string
          instance_name: string
          max_retries?: number
          message_id?: string | null
          next_retry_at?: string | null
          payload: Json
          priority?: number
          processed_at?: string | null
          remote_jid?: string | null
          retry_count?: number
          status?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          event_type?: string
          id?: string
          instance_name?: string
          max_retries?: number
          message_id?: string | null
          next_retry_at?: string | null
          payload?: Json
          priority?: number
          processed_at?: string | null
          remote_jid?: string | null
          retry_count?: number
          status?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      whatsapp_validation_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          max_attempts: number | null
          phone_number: string
          phone_with_country: string
          request_id: number | null
          staging_id: string
          status: string | null
          workspace_id: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          phone_number: string
          phone_with_country: string
          request_id?: number | null
          staging_id: string
          status?: string | null
          workspace_id: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          phone_number?: string
          phone_with_country?: string
          request_id?: number | null
          staging_id?: string
          status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_validation_queue_staging_id_fkey"
            columns: ["staging_id"]
            isOneToOne: false
            referencedRelation: "lead_extraction_staging"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_validation_queue_staging_id_fkey"
            columns: ["staging_id"]
            isOneToOne: false
            referencedRelation: "v_scraping_failed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_validation_queue_staging_id_fkey"
            columns: ["staging_id"]
            isOneToOne: false
            referencedRelation: "v_scraping_in_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_validation_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "whatsapp_validation_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          invited_by: string
          role: string
          updated_at: string | null
          used: boolean | null
          used_at: string | null
          used_by: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          invited_by: string
          role: string
          updated_at?: string | null
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          invited_by?: string
          role?: string
          updated_at?: string | null
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invites_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          invited_by: string | null
          joined_at: string | null
          permissions: Json | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_membership_lookup: {
        Row: {
          user_id: string
          workspace_id: string
        }
        Insert: {
          user_id: string
          workspace_id: string
        }
        Update: {
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_membership_lookup_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "workspace_membership_lookup_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_pipeline_logs_view: {
        Row: {
          agent_name: string | null
          completed_at: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          error_message: string | null
          id: string | null
          response_sent: boolean | null
          started_at: string | null
          status: string | null
          status_message: string | null
          steps: Json | null
          steps_completed: number | null
          total_duration_ms: number | null
          total_tokens_used: number | null
        }
        Insert: {
          agent_name?: string | null
          completed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          error_message?: string | null
          id?: string | null
          response_sent?: boolean | null
          started_at?: string | null
          status?: string | null
          status_message?: string | null
          steps?: never
          steps_completed?: number | null
          total_duration_ms?: number | null
          total_tokens_used?: number | null
        }
        Update: {
          agent_name?: string | null
          completed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          error_message?: string | null
          id?: string | null
          response_sent?: boolean | null
          started_at?: string | null
          status?: string | null
          status_message?: string | null
          steps?: never
          steps_completed?: number | null
          total_duration_ms?: number | null
          total_tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_pipeline_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      decrypted_secrets: {
        Row: {
          created_at: string | null
          decrypted_secret: string | null
          description: string | null
          id: string | null
          key_id: string | null
          name: string | null
          nonce: string | null
          secret: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      follow_up_jobs_active: {
        Row: {
          ai_decision_log: Json | null
          cancel_reason: string | null
          category_id: string | null
          category_name: string | null
          completed_at: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          conversation_status: string | null
          created_at: string | null
          current_model_index: number | null
          id: string | null
          last_checked_message_id: string | null
          messages_sent_count: number | null
          next_execution_at: string | null
          status: string | null
          trigger_message_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "follow_up_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_jobs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_jobs_last_checked_message_id_fkey"
            columns: ["last_checked_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_jobs_trigger_message_id_fkey"
            columns: ["trigger_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "follow_up_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_models_with_seconds: {
        Row: {
          category_availability: string | null
          category_id: string | null
          category_name: string | null
          category_published: boolean | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          message: string | null
          name: string | null
          sequence_order: number | null
          time_unit: string | null
          updated_at: string | null
          wait_seconds: number | null
          wait_time: number | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_models_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "follow_up_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_extraction_recent_runs: {
        Row: {
          ai_decisions: Json | null
          column_id: string | null
          created_at: string | null
          created_quantity: number | null
          credits_consumed: number | null
          duplicates_skipped: number | null
          error_message: string | null
          execution_time_ms: number | null
          extraction_id: string | null
          extraction_name: string | null
          filtered_out: number | null
          finished_at: string | null
          found_quantity: number | null
          funnel_id: string | null
          id: string | null
          location: string | null
          pages_consumed: number | null
          run_name: string | null
          search_term: string | null
          source: string | null
          started_at: string | null
          status: string | null
          target_quantity: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_extraction_runs_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "lead_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extraction_runs_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "lead_extractions_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extraction_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extraction_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_extractions_stats: {
        Row: {
          extraction_name: string | null
          failed_runs: number | null
          funnel_id: string | null
          id: string | null
          is_active: boolean | null
          last_run_at: string | null
          location: string | null
          search_term: string | null
          successful_runs: number | null
          target_quantity: number | null
          total_credits_consumed: number | null
          total_leads_created: number | null
          total_pages_consumed: number | null
          total_runs: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_extractions_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_extractions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extractions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_staging_data_sources: {
        Row: {
          avg_emails_per_lead: number | null
          avg_phones_per_lead: number | null
          avg_websites_per_lead: number | null
          cnpj_enriched_count: number | null
          cnpj_from_api: number | null
          cnpj_from_whois: number | null
          completeness_percentage: number | null
          emails_from_cnpj: number | null
          emails_from_serpdev: number | null
          emails_from_whois: number | null
          leads_complete: number | null
          leads_whatsapp_active: number | null
          leads_with_3plus_phones: number | null
          leads_with_email: number | null
          leads_with_main_website: number | null
          leads_with_multiple_emails: number | null
          leads_with_multiple_phones: number | null
          leads_with_multiple_websites: number | null
          leads_with_phone: number | null
          leads_with_social_media: number | null
          leads_with_verified_email: number | null
          leads_with_website: number | null
          leads_with_whatsapp: number | null
          phones_from_cnpj: number | null
          phones_from_serpdev: number | null
          phones_from_whois: number | null
          total_emails: number | null
          total_leads: number | null
          total_phones: number | null
          total_websites: number | null
          with_cnpj: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_campaign_history: {
        Row: {
          completed_at: string | null
          config_id: string | null
          error_message: string | null
          leads_failed: number | null
          leads_processed: number | null
          leads_skipped: number | null
          leads_success: number | null
          leads_total: number | null
          responses_count: number | null
          run_date: string | null
          run_id: string | null
          started_at: string | null
          status: string | null
          success_rate: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "campaign_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_runs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "campaign_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_runs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_status"
            referencedColumns: ["id"]
          },
        ]
      }
      v_campaign_status: {
        Row: {
          ai_instructions: string | null
          created_at: string | null
          daily_limit: number | null
          end_time: string | null
          frequency: string | null
          funnel_name: string | null
          id: string | null
          inbox_id: string | null
          inbox_name: string | null
          is_active: boolean | null
          min_interval_seconds: number | null
          source_column_id: string | null
          source_column_name: string | null
          source_funnel_id: string | null
          start_time: string | null
          target_column_id: string | null
          target_column_name: string | null
          today_leads_failed: number | null
          today_leads_success: number | null
          today_leads_total: number | null
          today_started_at: string | null
          today_status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_configs_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_configs_source_column_id_fkey"
            columns: ["source_column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_configs_source_funnel_id_fkey"
            columns: ["source_funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_configs_target_column_id_fkey"
            columns: ["target_column_id"]
            isOneToOne: false
            referencedRelation: "funnel_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "campaign_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_error_by_workspace: {
        Row: {
          affected_functions: number | null
          days_with_errors: number | null
          errors_by_type: Json | null
          last_error: string | null
          total_errors: number | null
          workspace_id: string | null
          workspace_name: string | null
        }
        Relationships: []
      }
      v_error_critical_unresolved: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_type: string | null
          function_name: string | null
          id: string | null
          metadata: Json | null
          severity: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          function_name?: string | null
          id?: string | null
          metadata?: Json | null
          severity?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          function_name?: string | null
          id?: string | null
          metadata?: Json | null
          severity?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "error_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_error_summary_24h: {
        Row: {
          affected_functions: number | null
          affected_users: number | null
          affected_workspaces: number | null
          error_count: number | null
          error_type: string | null
          last_occurrence: string | null
          severity: string | null
          unique_errors: string[] | null
        }
        Relationships: []
      }
      v_error_timeline_7d: {
        Row: {
          error_count: number | null
          error_type: string | null
          hour: string | null
          severity: string | null
        }
        Relationships: []
      }
      v_error_top_recurring: {
        Row: {
          affected_users: number | null
          error_message: string | null
          error_type: string | null
          first_seen: string | null
          function_name: string | null
          last_seen: string | null
          occurrence_count: number | null
          severities: string[] | null
        }
        Relationships: []
      }
      v_function_health_score: {
        Row: {
          critical_errors: number | null
          errors_24h: number | null
          errors_7d: number | null
          function_name: string | null
          health_score: number | null
          last_error: string | null
          status: string | null
        }
        Relationships: []
      }
      v_scraping_enrichment_stats: {
        Row: {
          avg_emails_per_lead: number | null
          avg_phones_per_lead: number | null
          leads_with_checkout: number | null
          leads_with_cnpj: number | null
          leads_with_emails: number | null
          leads_with_phones: number | null
          leads_with_pixels: number | null
          leads_with_social: number | null
          leads_with_whatsapp: number | null
          total_scraped: number | null
        }
        Relationships: []
      }
      v_scraping_failed: {
        Row: {
          duration_seconds: number | null
          id: string | null
          primary_website: string | null
          scraping_attempts: number | null
          scraping_completed_at: string | null
          scraping_error: string | null
          scraping_started_at: string | null
          workspace_id: string | null
        }
        Insert: {
          duration_seconds?: never
          id?: string | null
          primary_website?: string | null
          scraping_attempts?: number | null
          scraping_completed_at?: string | null
          scraping_error?: string | null
          scraping_started_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          duration_seconds?: never
          id?: string | null
          primary_website?: string | null
          scraping_attempts?: number | null
          scraping_completed_at?: string | null
          scraping_error?: string | null
          scraping_started_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_scraping_in_progress: {
        Row: {
          id: string | null
          primary_website: string | null
          scraping_attempts: number | null
          scraping_started_at: string | null
          scraping_status: string | null
          seconds_running: number | null
          workspace_id: string | null
        }
        Insert: {
          id?: string | null
          primary_website?: string | null
          scraping_attempts?: number | null
          scraping_started_at?: string | null
          scraping_status?: string | null
          seconds_running?: never
          workspace_id?: string | null
        }
        Update: {
          id?: string | null
          primary_website?: string | null
          scraping_attempts?: number | null
          scraping_started_at?: string | null
          scraping_status?: string | null
          seconds_running?: never
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_scraping_performance: {
        Row: {
          avg_duration_seconds: number | null
          count: number | null
          max_duration_seconds: number | null
          min_duration_seconds: number | null
          performance_rating: string | null
          scraping_status: string | null
        }
        Relationships: []
      }
      v_scraping_queue_size: {
        Row: {
          available_slots: number | null
          max_concurrent: number | null
          processing_count: number | null
          queued_count: number | null
          ready_to_queue: number | null
        }
        Relationships: []
      }
      v_scraping_status_by_workspace: {
        Row: {
          completed: number | null
          completion_percentage: number | null
          failed: number | null
          last_completed: string | null
          pending: number | null
          processing: number | null
          queued: number | null
          skipped: number | null
          total_leads: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_staging_data_sources: {
        Row: {
          avg_emails_per_lead: number | null
          avg_phones_per_lead: number | null
          avg_websites_per_lead: number | null
          cnpj_enriched_count: number | null
          cnpj_from_api: number | null
          cnpj_from_whois: number | null
          completeness_percentage: number | null
          emails_from_cnpj: number | null
          emails_from_serpdev: number | null
          emails_from_whois: number | null
          leads_complete: number | null
          leads_whatsapp_active: number | null
          leads_with_3plus_phones: number | null
          leads_with_email: number | null
          leads_with_main_website: number | null
          leads_with_multiple_emails: number | null
          leads_with_multiple_phones: number | null
          leads_with_multiple_websites: number | null
          leads_with_phone: number | null
          leads_with_social_media: number | null
          leads_with_verified_email: number | null
          leads_with_website: number | null
          leads_with_whatsapp: number | null
          phones_from_cnpj: number | null
          phones_from_serpdev: number | null
          phones_from_whois: number | null
          total_emails: number | null
          total_leads: number | null
          total_phones: number | null
          total_websites: number | null
          with_cnpj: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_error_by_workspace"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_extraction_staging_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_working_hours_blocks: {
        Row: {
          agente: string | null
          blocked_at: string | null
          contact_name: string | null
          contact_phone: string | null
          dia_semana: string | null
          id: string | null
          local_time: string | null
          modo_label: string | null
          motivo: string | null
          working_hours_mode: string | null
        }
        Relationships: []
      }
      webhook_queue_stats: {
        Row: {
          avg_retries: number | null
          count: number | null
          newest: string | null
          oldest: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_workspace_invite:
        | { Args: { p_invite_code: string }; Returns: Json }
        | { Args: { p_invite_code: string; p_user_id?: string }; Returns: Json }
      ai_add_to_debouncer: {
        Args: {
          p_agent_id: string
          p_conversation_id: string
          p_debounce_seconds?: number
          p_message_id: string
        }
        Returns: string
      }
      ai_debouncer_to_pgmq: { Args: never; Returns: number }
      ai_queue_transcription: {
        Args: {
          p_content_type: string
          p_media_url: string
          p_message_id: string
        }
        Returns: string
      }
      backfill_analytics_data: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_campaign_interval_seconds: {
        Args: {
          p_daily_limit: number
          p_end_time: string
          p_start_time: string
        }
        Returns: number
      }
      can_delete_funnel: {
        Args: { p_caller_id?: string; p_funnel_id: string }
        Returns: Json
      }
      cancel_campaign_run: { Args: { p_run_id: string }; Returns: Json }
      cancel_follow_up_job: {
        Args: { p_job_id: string; p_reason?: string }
        Returns: boolean
      }
      cancel_lead_migration: { Args: { p_run_id: string }; Returns: Json }
      check_agent_working_hours: {
        Args: { p_timezone?: string; p_working_hours_mode: string }
        Returns: Json
      }
      check_all_locations_exhausted: {
        Args: { p_search_term: string; p_workspace_id: string }
        Returns: boolean
      }
      check_all_runs_for_filter_compensation: { Args: never; Returns: number }
      check_and_compensate_after_migration: {
        Args: { p_run_id: string }
        Returns: Json
      }
      check_and_lock_campaign_instance: {
        Args: { p_config_id: string; p_inbox_id: string }
        Returns: Json
      }
      check_campaign_instance_status: {
        Args: { p_inbox_id: string }
        Returns: Json
      }
      check_guardrail: {
        Args: {
          p_agent_id?: string
          p_contact_phone?: string
          p_message_text: string
        }
        Returns: Json
      }
      check_lead_passes_filters: {
        Args: {
          p_emails: Json
          p_extracted_data: Json
          p_min_rating: number
          p_min_reviews: number
          p_phones: Json
          p_primary_email: string
          p_primary_phone: string
          p_primary_website: string
          p_require_email: boolean
          p_require_phone: boolean
          p_require_website: boolean
          p_websites: Json
        }
        Returns: {
          passes: boolean
          reason: string
        }[]
      }
      check_queue_status: {
        Args: { p_run_id: string }
        Returns: {
          msg_count: number
          queue_name: string
        }[]
      }
      check_transcription_enabled: {
        Args: { p_content_type: string; p_conversation_id: string }
        Returns: boolean
      }
      check_workspace_membership: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      cleanup_analytics_cache: { Args: never; Returns: number }
      cleanup_expired_instagram_query_cache: { Args: never; Returns: number }
      cleanup_failed_campaign_messages: {
        Args: never
        Returns: {
          deleted_count: number
          freed_leads_count: number
        }[]
      }
      cleanup_old_error_logs: {
        Args: { p_days_to_keep?: number }
        Returns: {
          deleted_count: number
          oldest_kept_date: string
        }[]
      }
      cleanup_old_instagram_search_progress: {
        Args: { p_days_old?: number }
        Returns: number
      }
      cleanup_old_reminder_queue: { Args: never; Returns: number }
      cleanup_old_scraping_fields: {
        Args: never
        Returns: {
          cleaned_count: number
          field_name: string
          lead_id: string
        }[]
      }
      cleanup_old_sync_logs: { Args: never; Returns: undefined }
      cleanup_old_webhooks: { Args: never; Returns: number }
      complete_campaign_message_atomic: {
        Args: {
          p_conversation_id?: string
          p_lead_id: string
          p_message_id: string
          p_provider_message_id?: string
          p_run_id: string
          p_success?: boolean
          p_target_column_id: string
        }
        Returns: Json
      }
      complete_tool_execution: {
        Args: {
          p_error_code?: string
          p_error_message?: string
          p_log_id: string
          p_output_result?: Json
          p_status: string
        }
        Returns: undefined
      }
      complete_webhook_queue_item: {
        Args: { p_queue_id: string; p_result?: Json; p_workspace_id?: string }
        Returns: boolean
      }
      consolidate_all_emails:
        | {
            Args: {
              emails_cnpj?: Json
              emails_serpdev?: Json
              emails_whois?: Json
            }
            Returns: Json
          }
        | {
            Args: {
              emails_cnpj: Json
              emails_scraping?: Json
              emails_serpdev: Json
              emails_whois: Json
            }
            Returns: Json
          }
      consolidate_all_phones:
        | {
            Args: {
              phone_legacy?: string
              phones_cnpj?: Json
              phones_serpdev?: Json
              phones_whois?: Json
            }
            Returns: Json
          }
        | {
            Args: {
              phone_legacy?: string
              phones_cnpj?: Json
              phones_scraping?: Json
              phones_serpdev?: Json
              phones_whois?: Json
            }
            Returns: Json
          }
      consolidate_all_websites:
        | {
            Args: {
              domain_legacy?: string
              websites_cnpj?: Json
              websites_serpdev?: Json
              websites_whois?: Json
            }
            Returns: Json
          }
        | {
            Args: {
              domain_legacy?: string
              websites_cnpj?: Json
              websites_scraping?: Json
              websites_serpdev?: Json
              websites_whois?: Json
            }
            Returns: Json
          }
      consolidate_and_validate_phones: {
        Args: { p_run_id?: string; p_workspace_id?: string }
        Returns: Json
      }
      consolidate_cnpj: {
        Args: { cnpj_api?: string; cnpj_whois?: string }
        Returns: {
          cnpj_normalized: string
          cnpj_source: string
        }[]
      }
      consolidate_domain: {
        Args: {
          website_cnpj?: string
          website_serpdev?: string
          website_whois?: string
        }
        Returns: {
          domain: string
          domain_source: string
        }[]
      }
      consolidate_phones: {
        Args: {
          phone_cnpj?: string
          phone_serpdev?: string
          phone_whois?: string
        }
        Returns: {
          phone_normalized: string
          phone_source: string
          phone_variants: string[]
        }[]
      }
      consume_enrichment_queue: { Args: never; Returns: undefined }
      count_leads_with_instagram: {
        Args: { p_column_id?: string; p_funnel_id: string }
        Returns: {
          leads_with_instagram: number
          percentage: number
          total_leads: number
        }[]
      }
      count_pipeline_logs: {
        Args: {
          p_agent_id?: string
          p_conversation_id?: string
          p_date_from?: string
          p_date_to?: string
          p_status?: string
          p_workspace_id?: string
        }
        Returns: number
      }
      count_unread_notifications: {
        Args: { p_user_id: string }
        Returns: number
      }
      create_custom_fields_from_staging: {
        Args: { p_field_mappings: Json; p_workspace_id: string }
        Returns: undefined
      }
      create_extraction_log_v2: {
        Args: {
          p_details?: Json
          p_level: string
          p_message: string
          p_phase?: string
          p_run_id: string
          p_source?: string
          p_step_name: string
          p_step_number: number
        }
        Returns: string
      }
      create_follow_up_job: {
        Args: { p_conversation_id: string; p_message_id?: string }
        Returns: string
      }
      create_goal_config: {
        Args: {
          p_current_value: number
          p_end_month: number
          p_end_year: number
          p_frequency?: string
          p_start_month: number
          p_start_year: number
          p_target_value: number
          p_unit?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      create_lead_from_conversation: {
        Args: { p_agent_id: string; p_conversation_id: string }
        Returns: string
      }
      create_notification: {
        Args: {
          p_body: string
          p_metadata?: Json
          p_reference_id?: string
          p_reference_type?: string
          p_title: string
          p_type: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: string
      }
      create_preview_conversation: {
        Args: {
          p_agent_id: string
          p_template_message?: string
          p_workspace_id?: string
        }
        Returns: Json
      }
      create_public_chat_link: {
        Args: {
          p_agent_id: string
          p_chat_subtitle?: string
          p_chat_title?: string
          p_expires_at?: string
          p_max_conversations?: number
          p_name?: string
          p_welcome_message?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      create_user_profile_manual: {
        Args: {
          p_email: string
          p_name: string
          p_phone?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_workspace_invite:
        | {
            Args: {
              p_expires_in_days?: number
              p_role?: string
              p_workspace_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_expires_in_days?: number
              p_role?: string
              p_user_id?: string
              p_workspace_id: string
            }
            Returns: Json
          }
      create_workspace_with_owner: {
        Args: { p_name: string; p_owner_id?: string; p_slug?: string }
        Returns: Json
      }
      debug_transcription_status: {
        Args: { p_conversation_id: string }
        Returns: {
          content_type: string
          created_at: string
          has_transcription: boolean
          message_id: string
          transcription_status: string
          wait_time: unknown
        }[]
      }
      decrement_collection_documents: {
        Args: { collection_id: string }
        Returns: undefined
      }
      delete_extraction_run: { Args: { p_run_id: string }; Returns: Json }
      delete_funnel_column_safe: {
        Args: { p_caller_id?: string; p_column_id: string }
        Returns: Json
      }
      delete_funnel_safe: {
        Args: { p_caller_id?: string; p_funnel_id: string }
        Returns: Json
      }
      delete_instagram_extraction: { Args: { p_run_id: string }; Returns: Json }
      delete_preview_conversation: {
        Args: { p_conversation_id: string }
        Returns: Json
      }
      delete_workspace_invite:
        | {
            Args: { p_caller_id?: string; p_invite_code: string }
            Returns: Json
          }
        | { Args: { p_caller_id?: string; p_invite_id: string }; Returns: Json }
      detect_phone_type: { Args: { phone_normalized: string }; Returns: string }
      disable_all_system_tools_for_agent: {
        Args: { p_agent_id: string }
        Returns: number
      }
      disable_jwt_all_functions: { Args: never; Returns: Json }
      disable_jwt_all_functions_with_log: { Args: never; Returns: Json }
      dispatch_whatsapp_validations: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      enable_all_system_tools_for_agent: {
        Args: { p_agent_id: string }
        Returns: number
      }
      enqueue_cnpj_enrichment: { Args: never; Returns: undefined }
      enqueue_enrichment_leads: { Args: never; Returns: undefined }
      enqueue_pending_reminders: { Args: never; Returns: number }
      enqueue_scraping: {
        Args: { p_staging_id: string; p_website_url: string }
        Returns: number
      }
      enqueue_scraping_leads: { Args: never; Returns: undefined }
      enqueue_whatsapp_validation: { Args: never; Returns: undefined }
      enqueue_whatsapp_validation_individual: {
        Args: { p_batch_size?: number; p_workspace_id?: string }
        Returns: Json
      }
      enqueue_whois_enrichment: { Args: never; Returns: undefined }
      ensure_cnpj_custom_fields: {
        Args: { p_workspace_id: string }
        Returns: {
          field_id: string
          field_name: string
        }[]
      }
      ensure_contact_type_custom_field: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      ensure_custom_field: {
        Args: { p_name: string; p_type?: string; p_workspace_id: string }
        Returns: string
      }
      ensure_whois_custom_fields: {
        Args: { p_workspace_id: string }
        Returns: {
          field_id: string
          field_name: string
        }[]
      }
      extract_cnpj_data_brasilapi: {
        Args: { cnpj_json: Json }
        Returns: {
          field_name: string
          field_value: string
        }[]
      }
      extract_cnpj_data_opencnpj: {
        Args: { cnpj_json: Json }
        Returns: {
          field_name: string
          field_value: string
        }[]
      }
      extract_cnpj_from_whois_smart: {
        Args: { p_workspace_id?: string }
        Returns: number
      }
      extract_domain: { Args: { url_or_text: string }; Returns: string }
      extract_whois_data: {
        Args: { whois_json: Json }
        Returns: {
          field_name: string
          field_value: string
        }[]
      }
      fail_webhook_queue_item: {
        Args: {
          p_error_details?: Json
          p_error_message: string
          p_queue_id: string
        }
        Returns: boolean
      }
      finalize_campaign_run_if_complete: {
        Args: { p_run_id: string }
        Returns: {
          finalized: boolean
          leads_processed: number
          leads_total: number
        }[]
      }
      finalize_stuck_enriching_extractions: {
        Args: never
        Returns: {
          finalized: boolean
          pending_count: number
          reason: string
          run_id: string
          total_staging: number
        }[]
      }
      finalize_stuck_extraction: { Args: { p_run_id: string }; Returns: Json }
      find_or_create_conversation: {
        Args: {
          p_avatar_url?: string
          p_channel?: string
          p_contact_name?: string
          p_contact_phone: string
          p_inbox_id: string
          p_lead_id?: string
          p_workspace_id: string
        }
        Returns: {
          contact_name: string
          contact_phone: string
          conversation_id: string
          is_new: boolean
          lead_id: string
        }[]
      }
      fix_all_capital_social_formatting: {
        Args: never
        Returns: {
          lead_id: string
          new_value: string
          old_value: string
          updated_count: number
        }[]
      }
      fix_enrichment_status_for_completion: {
        Args: { p_run_id: string }
        Returns: Json
      }
      fix_pending_enrichment_status: {
        Args: never
        Returns: {
          lead_id: string
          new_status: string
          old_status: string
          updated_count: number
        }[]
      }
      fix_runs_with_inconsistent_status: {
        Args: never
        Returns: {
          fixed: boolean
          fixed_at: string
          old_status: string
          reason: string
          run_id: string
          run_name: string
        }[]
      }
      fix_unconsolidated_scraping_emails: {
        Args: never
        Returns: {
          email_found: string
          fixed_count: number
          staging_id: string
        }[]
      }
      format_capital_social: { Args: { p_value: number }; Returns: string }
      format_log_message: {
        Args: { p_details?: Json; p_type: string }
        Returns: string
      }
      format_phone_br: { Args: { phone_normalized: string }; Returns: string }
      generate_access_code: { Args: { length?: number }; Returns: string }
      generate_extraction_run_name: {
        Args: { p_extraction_name: string; p_run_created_at: string }
        Returns: string
      }
      generate_phone_variants: {
        Args: { phone_normalized: string }
        Returns: string[]
      }
      generate_unique_slug: { Args: { base_name: string }; Returns: string }
      generate_workspace_slug: {
        Args: { workspace_name: string }
        Returns: string
      }
      get_active_agent_for_inbox: {
        Args: { p_inbox_id: string }
        Returns: string
      }
      get_agent_attendants: {
        Args: { p_agent_id: string }
        Returns: {
          current_conversations: number
          is_available: boolean
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_agent_tools: { Args: { p_agent_id: string }; Returns: Json }
      get_ai_vs_human_distribution: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_and_lock_campaign_messages: {
        Args: { p_batch_size?: number; p_one_hour_ago?: string }
        Returns: Json
      }
      get_attendants_ranking: {
        Args: {
          p_end_date: string
          p_limit?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_cache_locations: {
        Args: { p_city: string; p_search_term: string; p_state: string }
        Returns: {
          ai_model: string
          has_more: boolean
          locations: string[]
        }[]
      }
      get_calendar_month_data: {
        Args: {
          p_cycle_id?: string
          p_goal_type?: string
          p_month: number
          p_user_id?: string
          p_year: number
        }
        Returns: Json
      }
      get_calendar_settings: { Args: { p_workspace_id: string }; Returns: Json }
      get_campaign_analytics: {
        Args: { p_run_id?: string; p_workspace_id?: string }
        Returns: Json
      }
      get_campaign_eligible_leads: {
        Args: {
          p_inbox_id: string
          p_limit?: number
          p_source_column_id: string
          p_workspace_id: string
        }
        Returns: {
          client_name: string
          email: string
          lead_id: string
          phone_normalized: string
          phone_number: string
        }[]
      }
      get_campaign_logs: {
        Args: {
          p_after_id?: string
          p_level?: string
          p_limit?: number
          p_run_id: string
        }
        Returns: Json
      }
      get_campaign_runs_list: {
        Args: { p_limit?: number; p_offset?: number; p_workspace_id: string }
        Returns: Json
      }
      get_campaign_schedule: {
        Args: { p_run_id?: string; p_status?: string; p_workspace_id: string }
        Returns: {
          ai_model: string
          error_message: string
          generated_message: string
          lead_id: string
          lead_name: string
          message_id: string
          phone_number: string
          position_in_queue: number
          run_id: string
          scheduled_at: string
          sent_at: string
          status: string
          time_until_send: unknown
        }[]
      }
      get_campaign_schedule_summary: {
        Args: { p_run_id?: string; p_workspace_id: string }
        Returns: {
          failed_count: number
          last_lead_name: string
          last_sent_at: string
          next_lead_name: string
          next_phone: string
          next_scheduled_at: string
          pending_count: number
          run_id: string
          run_started_at: string
          run_status: string
          sent_count: number
          time_until_next: unknown
          total_messages: number
        }[]
      }
      get_campaigns_ranking: {
        Args: {
          p_end_date: string
          p_limit?: number
          p_order_by?: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_campaigns_stats_cards: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_campaigns_tab_complete: {
        Args: {
          p_end_date: string
          p_ranking_limit?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_campaigns_to_run: {
        Args: never
        Returns: {
          ai_instructions: string
          check_result: Json
          config_id: string
          daily_limit: number
          inbox_id: string
          min_interval_seconds: number
          source_column_id: string
          target_column_id: string
          workspace_id: string
        }[]
      }
      get_cnpj_extraction_status: { Args: { p_run_id: string }; Returns: Json }
      get_column_leads_migration_status: { Args: never; Returns: Json }
      get_conversation_messages: {
        Args: { p_conversation_id: string }
        Returns: Json[]
      }
      get_conversations_detailed_stats: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_conversations_summary: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_dashboard_summary: {
        Args: {
          p_end_date: string
          p_funnel_filter?: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_day_tasks: {
        Args: {
          p_cycle_id?: string
          p_date: string
          p_goal_type?: string
          p_user_id?: string
        }
        Returns: Json
      }
      get_engagement_heatmap: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_enrichment_status: { Args: { run_id: string }; Returns: Json }
      get_error_stats: {
        Args: never
        Returns: {
          avg_errors_per_day: number
          critical_errors: number
          errors_this_week: number
          errors_today: number
          most_affected_function: string
          most_common_error: string
          total_errors: number
        }[]
      }
      get_extraction_analytics: { Args: { run_id: string }; Returns: Json }
      get_extraction_counts_by_source: {
        Args: { p_workspace_id: string }
        Returns: {
          source: string
          total_extractions: number
          total_leads_extracted: number
          total_runs: number
        }[]
      }
      get_extraction_dashboard: {
        Args: { p_limit?: number; p_workspace_id?: string }
        Returns: Json
      }
      get_extraction_metrics_card: {
        Args: { p_run_id: string }
        Returns: {
          icone: string
          metrica: string
          ordem: number
          percentual: number
          valor: number
        }[]
      }
      get_extraction_progress: { Args: { p_run_id: string }; Returns: Json }
      get_extraction_statistics: {
        Args: { p_run_id?: string; p_workspace_id?: string }
        Returns: Json
      }
      get_followup_stats: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_funnel_analytics: {
        Args: {
          p_end_date: string
          p_funnel_id?: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_funnel_column_stats: {
        Args: { p_funnel_id: string }
        Returns: {
          column_id: string
          column_title: string
          lead_count: number
          total_value: number
        }[]
      }
      get_funnel_detailed: {
        Args: {
          p_end_date: string
          p_funnel_id?: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_funnel_stats: {
        Args: { p_funnel_id: string }
        Returns: {
          active_leads: number
          conversion_rate: number
          high_priority_count: number
          total_leads: number
          total_value: number
        }[]
      }
      get_ia_stats_cards: {
        Args: {
          p_end_date: string
          p_hourly_rate?: number
          p_minutes_per_ai_msg?: number
          p_minutes_per_followup?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_ia_success_rate: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_ia_tab_complete: {
        Args: {
          p_end_date: string
          p_hourly_rate?: number
          p_minutes_per_ai_msg?: number
          p_minutes_per_followup?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_ia_vs_human_messages: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_instagram_extraction_analytics: {
        Args: { run_id: string }
        Returns: Json
      }
      get_instagram_scraping_stats: {
        Args: { p_run_id: string }
        Returns: Json
      }
      get_instagram_search_queries: {
        Args: { p_query_hash: string; p_workspace_id: string }
        Returns: Json
      }
      get_last_page_for_search: {
        Args: {
          p_location: string
          p_search_term: string
          p_workspace_id: string
        }
        Returns: number
      }
      get_lead_alternative_phones: {
        Args: { p_exclude_phone?: string; p_lead_id: string }
        Returns: {
          field_name: string
          phone_normalized: string
          phone_number: string
          source: string
        }[]
      }
      get_lead_full_context: { Args: { p_lead_id: string }; Returns: Json }
      get_lead_migration_queue_status: {
        Args: never
        Returns: {
          newest_message: string
          oldest_message: string
          queue_name: string
          total_messages: number
        }[]
      }
      get_lead_phone: { Args: { p_lead_id: string }; Returns: string }
      get_leads_by_channel: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_leads_by_channel_distribution: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_leads_capture_evolution: {
        Args: { p_days?: number; p_workspace_id: string }
        Returns: Json
      }
      get_leads_capture_evolution_chart: {
        Args: { p_days?: number; p_workspace_id: string }
        Returns: Json
      }
      get_leads_detailed_stats: {
        Args: {
          p_end_date: string
          p_funnel_id?: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_leads_for_map: {
        Args: { p_limit?: number; p_workspace_id: string }
        Returns: Json
      }
      get_leads_map_data: {
        Args: { p_bounds?: Json; p_workspace_id: string; p_zoom_level?: number }
        Returns: Json
      }
      get_leads_stats_cards: {
        Args: {
          p_end_date: string
          p_funnel_id?: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_leads_summary: {
        Args: {
          p_end_date: string
          p_funnel_id?: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_leads_tab_complete: {
        Args: {
          p_end_date: string
          p_funnel_id?: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_leads_with_instagram: {
        Args: {
          p_column_id?: string
          p_funnel_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          client_name: string
          column_id: string
          column_title: string
          company: string
          created_at: string
          deal_value: number
          instagram_url: string
          instagram_username: string
          lead_id: string
          priority: string
          status: string
          tags: string[]
          updated_at: string
          whatsapp_jid: string
          whatsapp_valid: boolean
        }[]
      }
      get_location_search_history: {
        Args: { p_search_term: string; p_workspace_id: string }
        Returns: {
          ai_round: number
          exhausted: boolean
          last_page: number
          leads_found: number
          location_formatted: string
          suspect: boolean
        }[]
      }
      get_my_email: { Args: never; Returns: string }
      get_my_workspace_ids: { Args: never; Returns: string[] }
      get_next_follow_up_model: {
        Args: {
          p_category_id: string
          p_current_index?: number
          p_workspace_id?: string
        }
        Returns: {
          is_last: boolean
          message: string
          model_id: string
          model_name: string
          next_index: number
          wait_seconds: number
        }[]
      }
      get_next_page_for_instagram_query: {
        Args: { p_query: string; p_query_hash: string; p_workspace_id: string }
        Returns: number
      }
      get_next_page_for_location: {
        Args: {
          p_location_formatted: string
          p_search_term: string
          p_workspace_id: string
        }
        Returns: number
      }
      get_or_create_cnpj_search_progress: {
        Args: {
          p_filters: Json
          p_filters_hash: string
          p_workspace_id: string
        }
        Returns: {
          current_offset: number
          total_extracted_count: number
        }[]
      }
      get_or_create_conversation: {
        Args: {
          p_attendant_type?: string
          p_channel?: string
          p_contact_name?: string
          p_contact_phone: string
          p_inbox_id: string
          p_initial_message?: string
          p_lead_id?: string
          p_workspace_id: string
        }
        Returns: {
          attendant_type: string
          channel: string
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          inbox_id: string
          is_new: boolean
          last_message: string
          last_message_at: string
          lead_id: string
          status: string
          total_messages: number
          unread_count: number
          workspace_id: string
        }[]
      }
      get_or_create_custom_field: {
        Args: {
          p_field_type: string
          p_name: string
          p_position?: number
          p_workspace_id: string
        }
        Returns: string
      }
      get_or_create_instagram_query_cache: {
        Args: {
          p_location?: string
          p_niche: string
          p_query_hash: string
          p_query_text: string
        }
        Returns: {
          created_at: string | null
          expires_at: string | null
          id: string
          last_results_page: number | null
          last_used_at: string | null
          location: string | null
          niche: string
          query_hash: string
          query_text: string
          results_count: number | null
          total_pages_fetched: number | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "instagram_query_cache"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_instagram_search_progress: {
        Args: {
          p_location: string
          p_niche: string
          p_queries?: Json
          p_query_hash: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string | null
          exhausted_queries: Json | null
          id: string
          is_fully_exhausted: boolean | null
          last_page_by_query: Json | null
          last_search_at: string | null
          location: string
          niche: string
          query_hash: string
          search_queries: Json | null
          total_pages_consumed: number | null
          total_results_found: number | null
          updated_at: string | null
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "instagram_search_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_lead_conversation: {
        Args: {
          p_contact_name: string
          p_inbox_id: string
          p_lead_id: string
          p_phone_normalized: string
          p_workspace_id: string
        }
        Returns: string
      }
      get_pending_instagram_websites_locked: {
        Args: { p_limit: number }
        Returns: {
          external_url: string
          id: string
          run_id: string
          whatsapp_from_bio: string
          workspace_id: string
        }[]
      }
      get_pending_notifications: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          channels_requested: Json
          metadata: Json
          notification_id: string
          notification_type: string
          reference_id: string
          reference_type: string
          title: string
          user_email: string
          user_id: string
          user_name: string
          user_phone: string
          workspace_id: string
        }[]
      }
      get_pending_webhooks: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          error_details: Json | null
          error_message: string | null
          event_type: string
          id: string
          instance_name: string
          max_retries: number
          message_id: string | null
          next_retry_at: string | null
          payload: Json
          priority: number
          processed_at: string | null
          remote_jid: string | null
          retry_count: number
          status: string
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "webhook_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_pipeline_by_response_message: {
        Args: { p_message_id: string }
        Returns: {
          pipeline_id: string
          response_text: string
          status: string
          status_message: string
          steps_completed: number
          total_duration_ms: number
          total_tokens_used: number
        }[]
      }
      get_pipeline_detail: { Args: { p_pipeline_id: string }; Returns: Json }
      get_pipeline_logs: {
        Args: {
          p_agent_id?: string
          p_conversation_id?: string
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_workspace_id?: string
        }
        Returns: {
          agent_id: string
          agent_name: string
          completed_at: string
          contact_name: string
          contact_phone: string
          conversation_id: string
          error_message: string
          id: string
          response_sent: boolean
          started_at: string
          status: string
          status_message: string
          steps: Json
          steps_completed: number
          total_duration_ms: number
          total_tokens_used: number
          workspace_id: string
        }[]
      }
      get_pipeline_stats: {
        Args: {
          p_agent_id?: string
          p_date_from?: string
          p_date_to?: string
          p_workspace_id?: string
        }
        Returns: {
          avg_duration_ms: number
          avg_tokens_per_pipeline: number
          blocked_count: number
          error_count: number
          pipelines_by_day: Json
          pipelines_by_status: Json
          success_count: number
          success_rate: number
          total_pipelines: number
          total_tokens: number
        }[]
      }
      get_pipeline_with_steps: {
        Args: { p_pipeline_id: string }
        Returns: Json
      }
      get_preview_conversation_with_messages: {
        Args: { p_agent_id: string }
        Returns: Json
      }
      get_primary_email: { Args: { emails: Json }; Returns: string }
      get_primary_phone: { Args: { phones: Json }; Returns: string }
      get_primary_website: { Args: { websites: Json }; Returns: string }
      get_ready_debouncer_items: {
        Args: { p_limit?: number }
        Returns: {
          agent_id: string
          conversation_id: string
          id: string
          message_count: number
          message_ids: string[]
        }[]
      }
      get_ready_follow_up_jobs: {
        Args: { p_limit?: number }
        Returns: {
          category_id: string
          conversation_id: string
          current_model_index: number
          job_id: string
          trigger_message_id: string
          workspace_id: string
        }[]
      }
      get_response_heatmap: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_response_time_comparison: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_secret: { Args: { secret_name: string }; Returns: string }
      get_serpdev_api_key: { Args: { key_index: number }; Returns: string }
      get_service_role_key: { Args: never; Returns: string }
      get_service_role_key_from_vault: { Args: never; Returns: string }
      get_specialist_agents_for_orchestrator: {
        Args: { p_agent_id: string }
        Returns: string
      }
      get_stuck_extractions: {
        Args: { p_minutes_inactive?: number }
        Returns: {
          id: string
          last_activity_at: string
          location: string
          progress_data: Json
          search_term: string
          started_at: string
          workspace_id: string
        }[]
      }
      get_time_savings: {
        Args: {
          p_end_date: string
          p_hourly_rate?: number
          p_minutes_per_ai_msg?: number
          p_minutes_per_followup?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_top_rankings: {
        Args: {
          p_end_date: string
          p_limit?: number
          p_ranking_type?: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_top_sources_by_conversion: {
        Args: {
          p_end_date: string
          p_limit?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_top_sources_conversion: {
        Args: {
          p_end_date: string
          p_limit?: number
          p_start_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_transcription_wait_time: {
        Args: { p_message_ids: string[] }
        Returns: unknown
      }
      get_unread_notifications: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          metadata: Json
          reference_id: string
          reference_type: string
          status: string
          title: string
          type: string
        }[]
      }
      get_user_role:
        | {
            Args: { p_user_id: string; p_workspace_id: string }
            Returns: string
          }
        | { Args: { workspace_id: string }; Returns: string }
      get_user_workspace_ids: {
        Args: { check_user_id?: string }
        Returns: string[]
      }
      get_workspace_invites: {
        Args: { p_caller_id?: string; p_workspace_id: string }
        Returns: Json
      }
      get_workspace_members: { Args: { p_workspace_id: string }; Returns: Json }
      has_pending_transcriptions: {
        Args: { p_message_ids: string[] }
        Returns: boolean
      }
      has_write_permission:
        | {
            Args: { p_user_id: string; p_workspace_id: string }
            Returns: boolean
          }
        | { Args: { workspace_id: string }; Returns: boolean }
      heartbeat_extraction: { Args: { p_run_id: string }; Returns: undefined }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      increment_agent_metrics: {
        Args: {
          p_agent_id: string
          p_cost?: number
          p_messages?: number
          p_tokens?: number
        }
        Returns: undefined
      }
      increment_campaign_run_metrics: {
        Args: {
          p_failed?: number
          p_run_id: string
          p_skipped?: number
          p_success?: number
        }
        Returns: undefined
      }
      increment_collection_documents: {
        Args: { collection_id: string }
        Returns: undefined
      }
      increment_run_counters: {
        Args: {
          p_duplicates_skipped: number
          p_leads_created: number
          p_run_id: string
        }
        Returns: undefined
      }
      increment_run_metrics: {
        Args: {
          p_created?: number
          p_duplicates?: number
          p_filtered?: number
          p_found?: number
          p_pages?: number
          p_run_id: string
        }
        Returns: undefined
      }
      increment_segmented_searches_completed: {
        Args: { p_run_id: string }
        Returns: number
      }
      is_admin_or_owner:
        | {
            Args: { p_user_id: string; p_workspace_id: string }
            Returns: boolean
          }
        | { Args: { workspace_id: string }; Returns: boolean }
      is_br_domain: { Args: { domain: string }; Returns: boolean }
      is_brazilian_domain: { Args: { url: string }; Returns: boolean }
      is_business_hours: { Args: { p_timezone?: string }; Returns: boolean }
      is_owner:
        | {
            Args: { p_user_id: string; p_workspace_id: string }
            Returns: boolean
          }
        | { Args: { workspace_id: string }; Returns: boolean }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_valid_cnpj: { Args: { cnpj: string }; Returns: boolean }
      is_workspace_admin: {
        Args: { check_user_id?: string; check_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member:
        | {
            Args: { check_user_id?: string; check_workspace_id: string }
            Returns: boolean
          }
        | { Args: { workspace_id: string }; Returns: boolean }
      is_workspace_owner: {
        Args: { check_user_id?: string; check_workspace_id: string }
        Returns: boolean
      }
      list_preview_conversations: {
        Args: { p_agent_id: string; p_workspace_id?: string }
        Returns: Json
      }
      log_campaign_step: {
        Args: {
          p_details?: Json
          p_lead_id?: string
          p_level?: string
          p_message?: string
          p_message_id?: string
          p_run_id: string
          p_step_name: string
        }
        Returns: string
      }
      log_constraint_violation: {
        Args: {
          p_constraint_name: string
          p_error_message: string
          p_row_data?: Json
          p_table_name: string
        }
        Returns: string
      }
      log_edge_function_error: {
        Args: {
          p_edge_function_name: string
          p_error_message: string
          p_http_status?: number
          p_metadata?: Json
          p_request_id?: string
          p_stack_trace?: string
        }
        Returns: string
      }
      log_enrichment: {
        Args: {
          p_details?: Json
          p_level: string
          p_message: string
          p_run_id: string
          p_step_name: string
        }
        Returns: undefined
      }
      log_enrichment_simple: {
        Args: { p_details?: Json; p_message: string; p_run_id: string }
        Returns: undefined
      }
      log_error:
        | {
            Args: {
              p_error_context?: string
              p_error_message: string
              p_function_name: string
              p_input_params?: Json
            }
            Returns: undefined
          }
        | {
            Args: {
              p_error_context?: string
              p_error_message: string
              p_error_type?: string
              p_function_name: string
              p_input_params?: Json
              p_metadata?: Json
              p_severity?: string
              p_user_id?: string
              p_workspace_id?: string
            }
            Returns: string
          }
      log_guardrail: {
        Args: {
          p_blocked_reason?: string
          p_checks_performed?: Json
          p_confidence_score?: number
          p_duration_ms?: number
          p_pipeline_id: string
          p_status: string
          p_status_message: string
        }
        Returns: string
      }
      log_pipeline_complete: {
        Args: {
          p_error_message?: string
          p_error_step?: string
          p_pipeline_id: string
          p_provider_message_id?: string
          p_response_sent?: boolean
          p_response_text?: string
          p_status?: string
          p_status_message?: string
        }
        Returns: boolean
      }
      log_pipeline_start: {
        Args: {
          p_agent_id: string
          p_conversation_id: string
          p_debouncer_id: string
          p_message_ids?: string[]
        }
        Returns: string
      }
      log_pipeline_step: {
        Args: {
          p_config?: Json
          p_duration_ms?: number
          p_error_message?: string
          p_input_data?: Json
          p_input_summary?: string
          p_output_data?: Json
          p_output_summary?: string
          p_pipeline_id: string
          p_status?: string
          p_status_message?: string
          p_step_icon?: string
          p_step_key: string
          p_step_name: string
          p_tokens_input?: number
          p_tokens_output?: number
        }
        Returns: string
      }
      log_pipeline_step_update: {
        Args: {
          p_duration_ms?: number
          p_error_message?: string
          p_output_data?: Json
          p_output_summary?: string
          p_status?: string
          p_status_message?: string
          p_step_id: string
          p_tokens_input?: number
          p_tokens_output?: number
        }
        Returns: boolean
      }
      log_tool_execution:
        | {
            Args: {
              p_agent_id: string
              p_conversation_id: string
              p_input_parameters: Json
              p_session_id: string
              p_tool_id: string
              p_tool_name: string
              p_tool_type: string
              p_triggered_by?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_agent_id: string
              p_conversation_id: string
              p_input_parameters: Json
              p_session_id: string
              p_tool_id: string
              p_tool_name: string
              p_tool_type: string
              p_triggered_by?: string
            }
            Returns: string
          }
      log_transcription: {
        Args: {
          p_content_type: string
          p_conversation_id: string
          p_duration_ms?: number
          p_error_message?: string
          p_message_id: string
          p_model?: string
          p_provider?: string
          p_status: string
          p_status_message: string
          p_transcription_preview?: string
        }
        Returns: string
      }
      log_transcription_status_step:
        | {
            Args: { p_conversation_id: string; p_pipeline_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_conversation_id: string
              p_message_ids?: string[]
              p_pipeline_id: string
            }
            Returns: Json
          }
      log_trigger_error: {
        Args: {
          p_error_message: string
          p_row_data?: Json
          p_table_name: string
          p_trigger_name: string
        }
        Returns: string
      }
      mark_error_resolved: {
        Args: { p_error_id: string; p_resolution_notes?: string }
        Returns: boolean
      }
      mark_location_as_suspect: {
        Args: {
          p_location_formatted: string
          p_search_term: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      mark_notifications_read: {
        Args: { p_notification_ids?: string[]; p_user_id: string }
        Returns: number
      }
      mark_old_campaign_messages_as_skipped: {
        Args: { p_one_hour_ago: string }
        Returns: number
      }
      merge_progress_data: {
        Args: { p_new_data: Json; p_run_id: string }
        Returns: undefined
      }
      migrate_leads_with_custom_values: { Args: never; Returns: number }
      migrate_staging_to_leads: {
        Args: never
        Returns: {
          migrated: number
        }[]
      }
      move_leads_to_kanban: {
        Args: { p_column_id: string; p_funnel_id: string; p_run_ids: string[] }
        Returns: {
          mensagem: string
          total_movidos: number
        }[]
      }
      move_leads_to_kanban_v2: {
        Args: { p_column_id: string; p_funnel_id: string; p_run_ids: string[] }
        Returns: number
      }
      next_business_hour: { Args: { p_timezone?: string }; Returns: string }
      normalize_brazil_phone: { Args: { phone_raw: string }; Returns: string }
      normalize_cnpj: { Args: { cnpj_input: string }; Returns: string }
      normalize_phone: { Args: { phone_input: string }; Returns: string }
      normalize_phone_brazil: { Args: { p_phone: string }; Returns: string }
      normalize_phone_number: { Args: { phone: string }; Returns: string }
      normalize_scraping_data: {
        Args: { p_scraping_data: Json }
        Returns: Json
      }
      normalize_scraping_phones: { Args: never; Returns: undefined }
      notify_mention: {
        Args: {
          p_author_name: string
          p_content: string
          p_mentioned_user_id: string
          p_reference_id?: string
          p_reference_type?: string
          p_workspace_id: string
        }
        Returns: string
      }
      pause_campaign_run: {
        Args: { p_reason?: string; p_run_id: string }
        Returns: Json
      }
      pause_campaigns_for_disconnected_instance: {
        Args: { p_instance_id: string }
        Returns: Json
      }
      pgmq_archive: {
        Args: { p_msg_id: number; p_queue_name: string }
        Returns: boolean
      }
      pgmq_delete: {
        Args: { msg_id: number; queue_name: string }
        Returns: boolean
      }
      pgmq_delete_msg: {
        Args: { msg_id: number; queue_name: string }
        Returns: boolean
      }
      pgmq_read: {
        Args: { qty?: number; queue_name: string; vt_seconds?: number }
        Returns: {
          enqueued_at: string
          headers: Json
          message: Json
          msg_id: number
          read_ct: number
          vt: string
        }[]
      }
      pgmq_read_batch: {
        Args: { qty?: number; queue_name: string; visibility_timeout?: number }
        Returns: {
          enqueued_at: string
          headers: Json
          message: Json
          msg_id: number
          read_ct: number
          vt: string
        }[]
      }
      pgmq_read_compat: {
        Args: { qty?: number; queue_name: string; vt_seconds?: number }
        Returns: {
          enqueued_at: string
          headers: Json
          message: Json
          msg_id: number
          read_ct: number
          vt: string
        }[]
      }
      pgmq_send: {
        Args: { delay_seconds?: number; message: Json; queue_name: string }
        Returns: number
      }
      prepare_phone_validation: { Args: { p_run_id?: string }; Returns: Json }
      process_all_phones_complete: {
        Args: {
          p_batch_size?: number
          p_run_id?: string
          p_workspace_id?: string
        }
        Returns: Json
      }
      process_cnpj_queue: { Args: never; Returns: Json }
      process_column_leads_migration_batch: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      process_enrichment_with_logs: {
        Args: { p_run_id: string; p_type?: string }
        Returns: Json
      }
      process_google_maps_queue: { Args: never; Returns: undefined }
      process_instagram_scraping_result: {
        Args: { p_profile_id: string; p_scraping_data: Json; p_status: string }
        Returns: Json
      }
      process_lead_migration_batch: {
        Args: { p_batch_size?: number }
        Returns: {
          error_message: string
          leads_moved: number
          leads_remaining: number
          message_id: number
          run_id: string
          run_name: string
          success: boolean
        }[]
      }
      process_pending_extraction_runs: { Args: never; Returns: Json }
      process_pending_instagram_migrations: { Args: never; Returns: undefined }
      process_pending_whatsapp_responses: { Args: never; Returns: Json }
      process_pending_whatsapp_validations: { Args: never; Returns: Json }
      process_scheduled_extractions: { Args: never; Returns: Json }
      process_scraping_queue: { Args: never; Returns: Json }
      process_scraping_result: {
        Args: { p_scraping_data: Json; p_staging_id: string; p_status: string }
        Returns: Json
      }
      process_webhook_queue_item: {
        Args: { p_queue_id: string }
        Returns: Json
      }
      process_whatsapp_enrichment: {
        Args: { p_batch_size?: number; p_workspace_id?: string }
        Returns: Json
      }
      process_whatsapp_queue: { Args: never; Returns: Json }
      process_whatsapp_responses: { Args: never; Returns: Json }
      process_whatsapp_validation_responses: { Args: never; Returns: Json }
      process_whois_queue: { Args: never; Returns: Json }
      processar_run_existente: { Args: { p_run_id: string }; Returns: Json }
      queue_column_leads_migration: {
        Args: {
          p_batch_size?: number
          p_filter_has_email?: boolean
          p_filter_has_whatsapp?: boolean
          p_filter_search_query?: string
          p_source_column_id: string
          p_target_column_id: string
          p_target_funnel_id: string
        }
        Returns: Json
      }
      queue_lead_migration: {
        Args: {
          p_batch_size?: number
          p_column_id: string
          p_funnel_id: string
          p_run_id: string
        }
        Returns: Json
      }
      re_enqueue_next_page: {
        Args: {
          p_location_formatted: string
          p_run_id: string
          p_search_term: string
          p_workspace_id: string
        }
        Returns: Json
      }
      recalculate_daily_analytics: { Args: { p_date?: string }; Returns: Json }
      reconcile_analytics_data: {
        Args: { p_date?: string; p_workspace_id?: string }
        Returns: Json
      }
      refresh_staging_metrics: { Args: never; Returns: undefined }
      remove_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: Json
      }
      remove_workspace_member_v2: {
        Args: {
          p_caller_id?: string
          p_target_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      reorder_leads_in_column: {
        Args: {
          p_lead_id: string
          p_new_column_id: string
          p_new_position: number
        }
        Returns: undefined
      }
      repair_stuck_transcriptions: {
        Args: { p_max_to_repair?: number; p_stuck_threshold_minutes?: number }
        Returns: {
          details: Json
          message_ids: string[]
          repaired_count: number
        }[]
      }
      reset_instagram_search_progress: {
        Args: { p_query_hash: string; p_workspace_id: string }
        Returns: boolean
      }
      reset_preview_conversation: {
        Args: { p_agent_id: string }
        Returns: Json
      }
      resume_campaign_run: { Args: { p_run_id: string }; Returns: Json }
      run_whatsapp_validation_cycle: { Args: never; Returns: Json }
      save_cache_locations: {
        Args: {
          p_ai_model: string
          p_city: string
          p_has_more: boolean
          p_location_level: string
          p_locations: string[]
          p_search_term: string
          p_state: string
          p_ttl_days?: number
        }
        Returns: string
      }
      save_incoming_message: {
        Args: {
          p_audio_duration?: number
          p_contact_name: string
          p_contact_phone: string
          p_content_type: string
          p_file_name?: string
          p_file_size?: number
          p_from_me?: boolean
          p_inbox_id: string
          p_lead_id?: string
          p_media_url?: string
          p_message_timestamp?: number
          p_provider_message_id?: string
          p_text_content: string
          p_workspace_id: string
        }
        Returns: Json
      }
      send_watchdog_message: {
        Args: { p_message: Json; p_queue_name: string }
        Returns: number
      }
      send_whatsapp_check_request: {
        Args: { p_batch_size?: number; p_workspace_id: string }
        Returns: Json
      }
      set_custom_field_value: {
        Args: {
          p_field_name: string
          p_field_type?: string
          p_lead_id: string
          p_value: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      should_ai_handle_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      should_campaign_run: { Args: { p_config_id: string }; Returns: Json }
      sync_all_google_calendars: { Args: never; Returns: undefined }
      sync_all_migrated_leads_custom_fields: {
        Args: { p_workspace_id?: string }
        Returns: {
          synced_count: number
          total_leads: number
        }[]
      }
      sync_run_metrics_with_kanban: {
        Args: { p_run_id?: string }
        Returns: {
          new_created: number
          old_created: number
          run_id: string
          updated: boolean
        }[]
      }
      sync_scraping_data_to_leads: {
        Args: {
          p_cnpj?: Json
          p_emails?: Json
          p_phones?: Json
          p_run_id: string
          p_username: string
        }
        Returns: number
      }
      sync_staging_to_lead_custom_fields:
        | { Args: { p_staging_id: string }; Returns: number }
        | {
            Args: {
              p_lead_id: string
              p_staging_id: string
              p_workspace_id: string
            }
            Returns: undefined
          }
      sync_whatsapp_staging_to_leads: { Args: never; Returns: Json }
      test_pgmq_read_debug: { Args: never; Returns: Json }
      test_pgmq_read_debug2: { Args: never; Returns: Json }
      test_scheduled_extraction: {
        Args: { p_extraction_id: string }
        Returns: Json
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      toggle_agent_system_tool: {
        Args: { p_agent_id: string; p_enabled: boolean; p_tool_id: string }
        Returns: boolean
      }
      toggle_follow_up_job_pause: {
        Args: { p_job_id: string }
        Returns: string
      }
      transfer_conversation_to_human: {
        Args: {
          p_attendant_user_id?: string
          p_context_summary?: string
          p_conversation_id: string
          p_message_to_attendant?: string
          p_message_to_customer?: string
          p_reason?: string
        }
        Returns: Json
      }
      trigger_process_google_maps_queue: { Args: never; Returns: undefined }
      trigger_process_queue: { Args: never; Returns: undefined }
      trigger_scheduled_extractions: { Args: never; Returns: number }
      unaccent: { Args: { "": string }; Returns: string }
      update_cnpj_search_progress: {
        Args: {
          p_filters_hash: string
          p_items_count: number
          p_workspace_id: string
        }
        Returns: undefined
      }
      update_follow_up_job_after_send: {
        Args: {
          p_is_completed?: boolean
          p_job_id: string
          p_message_id: string
          p_next_model_index: number
          p_next_wait_seconds?: number
        }
        Returns: undefined
      }
      update_goal_config:
        | {
            Args: {
              p_current_value: number
              p_end_month: number
              p_end_year: number
              p_frequency: string
              p_goal_id: string
              p_start_month: number
              p_start_year: number
              p_target_value: number
              p_unit: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_current_value: number
              p_end_month: number
              p_end_year: number
              p_frequency: string
              p_goal_id: string
              p_start_month: number
              p_start_year: number
              p_target_value: number
              p_unit: string
              p_workspace_id: string
            }
            Returns: Json
          }
      update_goal_milestone: {
        Args: {
          p_actual_value?: number
          p_milestone_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      update_instagram_search_progress: {
        Args: {
          p_is_exhausted?: boolean
          p_page: number
          p_query: string
          p_query_hash: string
          p_results_count: number
          p_total_queries?: number
          p_workspace_id: string
        }
        Returns: undefined
      }
      update_member_role: {
        Args: {
          p_caller_id?: string
          p_new_role: string
          p_target_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      update_notification_status: {
        Args: {
          p_channels_failed?: Json
          p_channels_sent?: Json
          p_notification_id: string
          p_status: string
        }
        Returns: boolean
      }
      update_progress_data_field: {
        Args: { p_field_name: string; p_field_value: string; p_run_id: string }
        Returns: undefined
      }
      update_user_phone: { Args: { p_phone: string }; Returns: Json }
      upsert_location_search_progress: {
        Args: {
          p_api_exhausted?: boolean
          p_leads_found: number
          p_location_formatted: string
          p_page: number
          p_pages_with_zero?: number
          p_search_term: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_follow_up_execution: {
        Args: { p_job_id: string }
        Returns: Json
      }
      validate_public_chat_access: {
        Args: { p_access_code: string; p_slug: string }
        Returns: Json
      }
    }
    Enums: {
      specialist_type: "inbound" | "outbound" | "custom"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      specialist_type: ["inbound", "outbound", "custom"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

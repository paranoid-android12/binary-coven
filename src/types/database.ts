// Database type definitions for Supabase
// Auto-generated types based on the database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_settings: {
        Row: {
          id: string
          password_hash: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          password_hash: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          password_hash?: string
          created_at?: string
          updated_at?: string
        }
      }
      session_codes: {
        Row: {
          id: string
          code: string
          validity_start: string
          validity_end: string
          is_active: boolean
          max_students: number | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          code: string
          validity_start?: string
          validity_end: string
          is_active?: boolean
          max_students?: number | null
          created_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          code?: string
          validity_start?: string
          validity_end?: string
          is_active?: boolean
          max_students?: number | null
          created_at?: string
          created_by?: string
        }
      }
      student_profiles: {
        Row: {
          id: string
          username: string
          password_hash: string
          session_code_id: string
          display_name: string | null
          created_at: string
          last_login: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          username: string
          password_hash: string
          session_code_id: string
          display_name?: string | null
          created_at?: string
          last_login?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          username?: string
          password_hash?: string
          session_code_id?: string
          display_name?: string | null
          created_at?: string
          last_login?: string | null
          is_active?: boolean
        }
      }
      game_saves: {
        Row: {
          id: string
          student_profile_id: string
          game_state: Json
          save_name: string
          last_saved: string
          save_version: number
        }
        Insert: {
          id?: string
          student_profile_id: string
          game_state: Json
          save_name?: string
          last_saved?: string
          save_version?: number
        }
        Update: {
          id?: string
          student_profile_id?: string
          game_state?: Json
          save_name?: string
          last_saved?: string
          save_version?: number
        }
      }
      quest_progress: {
        Row: {
          id: string
          student_profile_id: string
          quest_id: string
          quest_title: string | null
          state: string
          current_phase_index: number
          started_at: string | null
          completed_at: string | null
          time_spent_seconds: number
          attempts: number
          score: number | null
          phase_progress: Json
        }
        Insert: {
          id?: string
          student_profile_id: string
          quest_id: string
          quest_title?: string | null
          state: string
          current_phase_index?: number
          started_at?: string | null
          completed_at?: string | null
          time_spent_seconds?: number
          attempts?: number
          score?: number | null
          phase_progress?: Json
        }
        Update: {
          id?: string
          student_profile_id?: string
          quest_id?: string
          quest_title?: string | null
          state?: string
          current_phase_index?: number
          started_at?: string | null
          completed_at?: string | null
          time_spent_seconds?: number
          attempts?: number
          score?: number | null
          phase_progress?: Json
        }
      }
      objective_progress: {
        Row: {
          id: string
          student_profile_id: string
          quest_id: string
          phase_id: string
          objective_index: number
          objective_description: string | null
          completed_at: string | null
          attempts: number
          time_spent_seconds: number
          hints_used: number
        }
        Insert: {
          id?: string
          student_profile_id: string
          quest_id: string
          phase_id: string
          objective_index: number
          objective_description?: string | null
          completed_at?: string | null
          attempts?: number
          time_spent_seconds?: number
          hints_used?: number
        }
        Update: {
          id?: string
          student_profile_id?: string
          quest_id?: string
          phase_id?: string
          objective_index?: number
          objective_description?: string | null
          completed_at?: string | null
          attempts?: number
          time_spent_seconds?: number
          hints_used?: number
        }
      }
      code_executions: {
        Row: {
          id: string
          student_profile_id: string
          quest_id: string | null
          phase_id: string | null
          code_window_id: string | null
          code_content: string
          execution_result: Json | null
          executed_at: string
          entity_id: string | null
          execution_duration_ms: number | null
        }
        Insert: {
          id?: string
          student_profile_id: string
          quest_id?: string | null
          phase_id?: string | null
          code_window_id?: string | null
          code_content: string
          execution_result?: Json | null
          executed_at?: string
          entity_id?: string | null
          execution_duration_ms?: number | null
        }
        Update: {
          id?: string
          student_profile_id?: string
          quest_id?: string | null
          phase_id?: string | null
          code_window_id?: string | null
          code_content?: string
          execution_result?: Json | null
          executed_at?: string
          entity_id?: string | null
          execution_duration_ms?: number | null
        }
      }
      learning_events: {
        Row: {
          id: string
          student_profile_id: string
          event_type: string
          event_data: Json | null
          quest_id: string | null
          phase_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_profile_id: string
          event_type: string
          event_data?: Json | null
          quest_id?: string | null
          phase_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_profile_id?: string
          event_type?: string
          event_data?: Json | null
          quest_id?: string | null
          phase_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      session_code_stats: {
        Row: {
          id: string
          code: string
          validity_start: string
          validity_end: string
          is_active: boolean
          created_at: string
          student_count: number
          active_students_24h: number
          status: string
        }
      }
      student_progress_summary: {
        Row: {
          student_profile_id: string
          username: string
          display_name: string | null
          session_code_id: string
          session_code: string
          joined_at: string
          last_login: string | null
          quests_completed: number
          quests_active: number
          total_time_spent_seconds: number
          total_code_executions: number
          last_save_time: string | null
        }
      }
    }
    Functions: {
      is_session_code_valid: {
        Args: { code_to_check: string }
        Returns: boolean
      }
      get_session_student_count: {
        Args: { code_id: string }
        Returns: number
      }
    }
    Enums: {}
  }
}

// Helper types for easier usage
export type SessionCode = Database['public']['Tables']['session_codes']['Row']
export type StudentProfile = Database['public']['Tables']['student_profiles']['Row']
export type GameSave = Database['public']['Tables']['game_saves']['Row']
export type QuestProgress = Database['public']['Tables']['quest_progress']['Row']
export type ObjectiveProgress = Database['public']['Tables']['objective_progress']['Row']
export type CodeExecution = Database['public']['Tables']['code_executions']['Row']
export type LearningEvent = Database['public']['Tables']['learning_events']['Row']
export type SessionCodeStats = Database['public']['Views']['session_code_stats']['Row']
export type StudentProgressSummary = Database['public']['Views']['student_progress_summary']['Row']

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
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
          trial_started_at: string | null
          trial_ends_at: string | null
          trial_usage_count: number
          trial_usage_limit: number
          current_plan_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
          trial_started_at?: string | null
          trial_ends_at?: string | null
          trial_usage_count?: number
          trial_usage_limit?: number
          current_plan_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
          trial_started_at?: string | null
          trial_ends_at?: string | null
          trial_usage_count?: number
          trial_usage_limit?: number
          current_plan_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          user_id: string
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          amount: number
          currency: string
          status: 'pending' | 'succeeded' | 'failed' | 'refunded'
          payment_type: 'one_time' | 'subscription'
          report_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          amount: number
          currency?: string
          status: 'pending' | 'succeeded' | 'failed' | 'refunded'
          payment_type: 'one_time' | 'subscription'
          report_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          amount?: number
          currency?: string
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded'
          payment_type?: 'one_time' | 'subscription'
          report_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_logs: {
        Row: {
          id: string
          event_type: string
          stripe_event_id: string | null
          payload: Json | null
          processed_at: string
          error: string | null
        }
        Insert: {
          id?: string
          event_type: string
          stripe_event_id?: string | null
          payload?: Json | null
          processed_at?: string
          error?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          stripe_event_id?: string | null
          payload?: Json | null
          processed_at?: string
          error?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          stripe_price_id: string
          plan_id: string | null
          status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid' | 'paused'
          usage_count: number
          usage_limit: number
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          stripe_price_id: string
          plan_id?: string | null
          status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid' | 'paused'
          usage_count?: number
          usage_limit: number
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          stripe_customer_id?: string
          stripe_price_id?: string
          plan_id?: string | null
          status?: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid' | 'paused'
          usage_count?: number
          usage_limit?: number
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          }
        ]
      }
      plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price_monthly: number
          currency: string
          usage_limit: number
          trial_days: number
          features: Json
          is_active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          price_monthly: number
          currency?: string
          usage_limit: number
          trial_days?: number
          features?: Json
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_monthly?: number
          currency?: string
          usage_limit?: number
          trial_days?: number
          features?: Json
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
        Relationships: []
      }
      usage_records: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          report_id: string | null
          billing_period_start: string
          billing_period_end: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          report_id?: string | null
          billing_period_start: string
          billing_period_end: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          report_id?: string | null
          billing_period_start?: string
          billing_period_end?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          }
        ]
      }
      auction_calendar: {
        Row: {
          auction_date: string
          auction_house: string
          created_at: string
          id: string
          open_lot: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          auction_date: string
          auction_house: string
          created_at?: string
          id?: string
          open_lot: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          auction_date?: string
          auction_house?: string
          created_at?: string
          id?: string
          open_lot?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          extracted_at: string | null
          extracted_text: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          report_id: string
          size_bytes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_at?: string | null
          extracted_text?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          report_id: string
          size_bytes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_at?: string | null
          extracted_text?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          report_id?: string
          size_bytes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          report_id: string
          section_key: string
          sources: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          report_id: string
          section_key: string
          sources?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          report_id?: string
          section_key?: string
          sources?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_sections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          analysis_result: Json | null
          created_at: string
          documents_count: number | null
          id: string
          on_watchlist: boolean
          property_address: string
          property_url: string | null
          property_value: number | null
          scraped_data: Json | null
          status: string
          updated_at: string
          user_id: string | null
          payment_status: 'unpaid' | 'paid' | 'refunded'
          payment_id: string | null
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          documents_count?: number | null
          id?: string
          on_watchlist?: boolean
          property_address: string
          property_url?: string | null
          property_value?: number | null
          scraped_data?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
          payment_status?: 'unpaid' | 'paid' | 'refunded'
          payment_id?: string | null
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          documents_count?: number | null
          id?: string
          on_watchlist?: boolean
          property_address?: string
          property_url?: string | null
          property_value?: number | null
          scraped_data?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
          payment_status?: 'unpaid' | 'paid' | 'refunded'
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_access: {
        Args: {
          p_user_id: string
        }
        Returns: {
          has_access: boolean
          is_trial: boolean
          plan_id: string
          usage_count: number
          usage_limit: number
          usage_remaining: number
          period_ends_at: string | null
        }[]
      }
      consume_trial_usage: {
        Args: {
          p_user_id: string
          p_report_id: string
        }
        Returns: boolean
      }
      consume_usage: {
        Args: {
          p_user_id: string
          p_report_id: string
        }
        Returns: boolean
      }
      reset_subscription_usage: {
        Args: {
          p_stripe_subscription_id: string
          p_period_start: string
          p_period_end: string
        }
        Returns: undefined
      }
      initialize_user_trial: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

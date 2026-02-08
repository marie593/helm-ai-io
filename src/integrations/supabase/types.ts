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
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          project_id: string
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          ai_suggested: boolean | null
          created_at: string
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_suggested?: boolean | null
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_suggested?: boolean | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invitations: {
        Row: {
          created_at: string
          customer_id: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_invitations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_size: string | null
          contact_email: string | null
          created_at: string
          goals: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          notes: string | null
          teams_involved: string[] | null
          updated_at: string
        }
        Insert: {
          company_size?: string | null
          contact_email?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          teams_involved?: string[] | null
          updated_at?: string
        }
        Update: {
          company_size?: string | null
          contact_email?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          teams_involved?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      feedback_items: {
        Row: {
          ai_extracted_actions: Json | null
          ai_sentiment: string | null
          ai_summary: string | null
          ai_themes: string[] | null
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          linked_task_id: string | null
          original_content: string | null
          priority: Database["public"]["Enums"]["feedback_priority"]
          project_id: string
          source: Database["public"]["Enums"]["feedback_source"]
          status: Database["public"]["Enums"]["feedback_status"]
          submitted_at: string | null
          submitted_by: string | null
          title: string
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at: string
          votes: number | null
        }
        Insert: {
          ai_extracted_actions?: Json | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          ai_themes?: string[] | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          linked_task_id?: string | null
          original_content?: string | null
          priority?: Database["public"]["Enums"]["feedback_priority"]
          project_id: string
          source?: Database["public"]["Enums"]["feedback_source"]
          status?: Database["public"]["Enums"]["feedback_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          votes?: number | null
        }
        Update: {
          ai_extracted_actions?: Json | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          ai_themes?: string[] | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          linked_task_id?: string | null
          original_content?: string | null
          priority?: Database["public"]["Enums"]["feedback_priority"]
          project_id?: string
          source?: Database["public"]["Enums"]["feedback_source"]
          status?: Database["public"]["Enums"]["feedback_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_items_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          project_id: string
          status: Database["public"]["Enums"]["milestone_status"]
          target_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          project_id: string
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          project_id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_insights: {
        Row: {
          created_at: string
          description: string | null
          feedback_count: number | null
          first_reported_at: string | null
          id: string
          last_reported_at: string | null
          priority: Database["public"]["Enums"]["feedback_priority"] | null
          projects_affected: string[] | null
          status: Database["public"]["Enums"]["feedback_status"] | null
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feedback_count?: number | null
          first_reported_at?: string | null
          id?: string
          last_reported_at?: string | null
          priority?: Database["public"]["Enums"]["feedback_priority"] | null
          projects_affected?: string[] | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          theme: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feedback_count?: number | null
          first_reported_at?: string | null
          id?: string
          last_reported_at?: string | null
          priority?: Database["public"]["Enums"]["feedback_priority"] | null
          projects_affected?: string[] | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          health_score: number | null
          id: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["project_status"]
          target_end_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          health_score?: number | null
          id?: string
          name: string
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          health_score?: number | null
          id?: string
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          feedback_item_id: string | null
          id: string
          message: string
          priority: Database["public"]["Enums"]["feedback_priority"] | null
          project_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          feedback_item_id?: string | null
          id?: string
          message: string
          priority?: Database["public"]["Enums"]["feedback_priority"] | null
          project_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          feedback_item_id?: string | null
          id?: string
          message?: string
          priority?: Database["public"]["Enums"]["feedback_priority"] | null
          project_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_feedback_item_id_fkey"
            columns: ["feedback_item_id"]
            isOneToOne: false
            referencedRelation: "feedback_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_feature_request: boolean | null
          milestone_id: string | null
          priority: string | null
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          votes: number | null
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_feature_request?: boolean | null
          milestone_id?: string | null
          priority?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          votes?: number | null
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_feature_request?: boolean | null
          milestone_id?: string | null
          priority?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean | null
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_customer_roles: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_customer_roles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vendor_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["vendor_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["vendor_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["vendor_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_project_customer_id: {
        Args: { _project_id: string }
        Returns: string
      }
      has_customer_access: {
        Args: { _customer_id: string; _user_id: string }
        Returns: boolean
      }
      is_vendor_admin: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      customer_role: "customer_contact"
      feedback_priority: "low" | "medium" | "high" | "urgent"
      feedback_source: "email" | "chat" | "call" | "ticket" | "manual"
      feedback_status:
        | "new"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "wont_fix"
      feedback_type:
        | "bug"
        | "feature_request"
        | "feedback"
        | "question"
        | "complaint"
      milestone_status: "pending" | "in_progress" | "completed" | "delayed"
      project_status:
        | "planning"
        | "in_progress"
        | "at_risk"
        | "completed"
        | "on_hold"
      task_status: "todo" | "in_progress" | "blocked" | "completed"
      vendor_role: "admin" | "team_member"
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
      customer_role: ["customer_contact"],
      feedback_priority: ["low", "medium", "high", "urgent"],
      feedback_source: ["email", "chat", "call", "ticket", "manual"],
      feedback_status: [
        "new",
        "acknowledged",
        "in_progress",
        "resolved",
        "wont_fix",
      ],
      feedback_type: [
        "bug",
        "feature_request",
        "feedback",
        "question",
        "complaint",
      ],
      milestone_status: ["pending", "in_progress", "completed", "delayed"],
      project_status: [
        "planning",
        "in_progress",
        "at_risk",
        "completed",
        "on_hold",
      ],
      task_status: ["todo", "in_progress", "blocked", "completed"],
      vendor_role: ["admin", "team_member"],
    },
  },
} as const

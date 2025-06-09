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
      bucket_list: {
        Row: {
          badge_id: string | null
          city: string
          created_at: string | null
          id: string
          source: string | null
          task: string
        }
        Insert: {
          badge_id?: string | null
          city: string
          created_at?: string | null
          id?: string
          source?: string | null
          task: string
        }
        Update: {
          badge_id?: string | null
          city?: string
          created_at?: string | null
          id?: string
          source?: string | null
          task?: string
        }
        Relationships: []
      }
      bucket_list_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          title: string
          trip_id: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          title: string
          trip_id: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          title?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_list_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucket_list_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      checklist_items: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          is_completed: boolean | null
          is_default: boolean | null
          trip_id: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id?: string
          is_completed?: boolean | null
          is_default?: boolean | null
          trip_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          is_completed?: boolean | null
          is_default?: boolean | null
          trip_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      destination_bucket_items: {
        Row: {
          category: string
          city: string
          country: string
          created_at: string | null
          description: string
          destination: string
          difficulty_level: string
          estimated_cost: string
          id: string
          reddit_url: string | null
          score: number | null
          source: string
          title: string
        }
        Insert: {
          category?: string
          city: string
          country: string
          created_at?: string | null
          description: string
          destination: string
          difficulty_level?: string
          estimated_cost?: string
          id?: string
          reddit_url?: string | null
          score?: number | null
          source?: string
          title: string
        }
        Update: {
          category?: string
          city?: string
          country?: string
          created_at?: string | null
          description?: string
          destination?: string
          difficulty_level?: string
          estimated_cost?: string
          id?: string
          reddit_url?: string | null
          score?: number | null
          source?: string
          title?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          body: string
          city: string
          country: string
          created_at: string | null
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          city: string
          country: string
          created_at?: string | null
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tips: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string | null
          service: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token?: string | null
          service: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string | null
          service?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trip_participants: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_participants_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      trips: {
        Row: {
          created_at: string | null
          destination: string
          end_date: string
          id: string
          max_participants: number | null
          start_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          destination: string
          end_date: string
          id?: string
          max_participants?: number | null
          start_date: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          destination?: string
          end_date?: string
          id?: string
          max_participants?: number | null
          start_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_bucket_items: {
        Row: {
          bucket_list_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          bucket_list_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          bucket_list_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bucket_items_bucket_list_id_fkey"
            columns: ["bucket_list_id"]
            isOneToOne: false
            referencedRelation: "bucket_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bucket_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_bucket_progress: {
        Row: {
          bucket_item_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          rating: number | null
          trip_id: string | null
          user_id: string
        }
        Insert: {
          bucket_item_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          trip_id?: string | null
          user_id: string
        }
        Update: {
          bucket_item_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bucket_progress_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bucket_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_trip: {
        Args: {
          p_trip_id: string
          p_user_id: string
        }
        Returns: {
          success: boolean
          message: string
          error: string
        }[]
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
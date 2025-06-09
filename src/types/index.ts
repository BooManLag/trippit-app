export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  userId: string | null;
}

export interface Tip {
  id: string;
  category: 'Safety' | 'Budget' | 'Language' | 'Culture' | 'Food' | 'Transport';
  content: string;
  location?: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  location?: string;
  choices: Choice[];
}

export interface Choice {
  id: string;
  text: string;
  outcome: string;
  tipId?: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  is_completed: boolean;
  is_default?: boolean;
  trip_id?: string;
  user_id?: string;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  emoji: string;
  items: ChecklistItem[];
}

export interface BucketListItem {
  id: string;
  description: string;
  location?: string;
  completed: boolean;
}

export interface User {
  id: string;
  name: string;
  trips: Trip[];
  checklist: ChecklistItem[];
  bucketList: BucketListItem[];
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
      };
      trips: {
        Row: {
          id: string;
          user_id: string | null;
          destination: string;
          start_date: string;
          end_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          destination: string;
          start_date: string;
          end_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          destination?: string;
          start_date?: string;
          end_date?: string;
          created_at?: string;
        };
      };
      checklist_items: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          description: string;
          is_completed: boolean;
          is_default: boolean;
          created_at: string;
          trip_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          description: string;
          is_completed?: boolean;
          is_default?: boolean;
          created_at?: string;
          trip_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          description?: string;
          is_completed?: boolean;
          is_default?: boolean;
          created_at?: string;
          trip_id?: string | null;
        };
      };
      trip_participants: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          joined_at: string;
          role: 'owner' | 'participant';
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          joined_at?: string;
          role?: 'owner' | 'participant';
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string;
          joined_at?: string;
          role?: 'owner' | 'participant';
        };
      };
    };
  };
}
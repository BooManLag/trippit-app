export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  userId: string;
}

export interface Tip {
  id: string;
  category: 'Safety' | 'Budget' | 'Language' | 'Culture' | 'Food' | 'Transport';
  content: string;
  location?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
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
  badgeId?: string;
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
  badges: Badge[];
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
          user_id: string;
          destination: string;
          start_date: string;
          end_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          destination: string;
          start_date: string;
          end_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          destination?: string;
          start_date?: string;
          end_date?: string;
          created_at?: string;
        };
      };
    };
  };
}
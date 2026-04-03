export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          theme: 'dark' | 'light';
          whoop_access_token: string | null;
          whoop_refresh_token: string | null;
          whoop_user_id: string | null;
          push_subscription: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      invite_links: {
        Row: {
          id: string;
          code: string;
          created_by: string;
          used_by: string | null;
          used_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['invite_links']['Row']>;
        Update: Partial<Database['public']['Tables']['invite_links']['Row']>;
      };
      performance_goals: {
        Row: {
          id: string;
          user_id: string;
          pushup_weekly_goal: number;
          plank_weekly_goal: number;
          run_weekly_goal: number;
          pushup_peak_goal: number;
          plank_peak_goal: number;
          run_peak_goal: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['performance_goals']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['performance_goals']['Row']>;
      };
      workout_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_at: string;
          pushup_reps: number;
          plank_seconds: number;
          run_distance: number;
          run_duration: number;
          whoop_workout_id: string | null;
          whoop_strain: number | null;
          whoop_activity_type: string | null;
          whoop_duration_seconds: number | null;
          photo_url: string | null;
          notes: string | null;
          is_draft: boolean;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['workout_logs']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['workout_logs']['Row']>;
      };
      sharing_connections: {
        Row: {
          id: string;
          requester_id: string;
          recipient_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          is_mutual: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['sharing_connections']['Row']> & {
          requester_id: string;
          recipient_id: string;
        };
        Update: Partial<Database['public']['Tables']['sharing_connections']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json;
          read: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notifications']['Row']> & {
          user_id: string;
          type: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
      whoop_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          payload: Json;
          processed: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['whoop_events']['Row']> & {
          event_type: string;
          payload: Json;
        };
        Update: Partial<Database['public']['Tables']['whoop_events']['Row']>;
      };
    };
    Functions: {
      get_weekly_volume: {
        Args: { p_user_id: string; p_week_start?: string };
        Returns: {
          total_pushups: number;
          total_plank_seconds: number;
          total_run_distance: number;
        }[];
      };
      get_leaderboard: {
        Args: {
          p_user_id: string;
          p_date_from: string;
          p_date_to: string;
          p_metric?: string;
          p_mode?: string;
        };
        Returns: {
          user_id: string;
          full_name: string;
          avatar_url: string;
          pushup_value: number;
          plank_value: number;
          run_value: number;
          total_score: number;
        }[];
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];
export type PerformanceGoals = Database['public']['Tables']['performance_goals']['Row'];
export type SharingConnection = Database['public']['Tables']['sharing_connections']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type InviteLink = Database['public']['Tables']['invite_links']['Row'];

export type LeaderboardEntry = Database['public']['Functions']['get_leaderboard']['Returns'][0];
export type WeeklyVolume = Database['public']['Functions']['get_weekly_volume']['Returns'][0];

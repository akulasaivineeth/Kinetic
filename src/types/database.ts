export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------- Row types (what you read) ----------

export interface Profile {
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
  unit_preference: 'metric' | 'imperial';
  created_at: string;
  updated_at: string;
}

export interface InviteLink {
  id: string;
  code: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface PerformanceGoals {
  id: string;
  user_id: string;
  pushup_weekly_goal: number;
  plank_weekly_goal: number;
  run_weekly_goal: number;
  squat_weekly_goal: number;
  pushup_peak_goal: number;
  plank_peak_goal: number;
  run_peak_goal: number;
  squat_peak_goal: number;
  created_at: string;
  updated_at: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  logged_at: string;
  pushup_reps: number;
  plank_seconds: number;
  run_distance: number;
  run_duration: number;
  squat_reps: number;
  pushup_score: number;
  squat_score: number;
  plank_score: number;
  run_score: number;
  whoop_workout_id: string | null;
  whoop_strain: number | null;
  whoop_activity_type: string | null;
  whoop_duration_seconds: number | null;
  photo_url: string | null;
  notes: string | null;
  is_draft: boolean;
  submitted_at: string | null;
  session_score: number;
  created_at: string;
  updated_at: string;
}

export interface SharingConnection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_mutual: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Json;
  read: boolean;
  created_at: string;
}

export interface WhoopEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  payload: Json;
  processed: boolean;
  created_at: string;
}

export interface UserMilestoneUnlock {
  id: string;
  user_id: string;
  milestone_key: string;
  label: string;
  emoji: string;
  earned_at: string;
}

// ---------- Function return types ----------

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string;
  pushup_value: number;
  plank_value: number;
  run_value: number;
  squat_value: number;
  total_score: number;
  streak: number;
}

export interface WeeklyVolume {
  total_pushups: number;
  total_plank_seconds: number;
  total_run_distance: number;
  total_squats: number;
}

// ---------- Database type for Supabase client ----------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      invite_links: {
        Row: InviteLink;
        Insert: Partial<InviteLink>;
        Update: Partial<InviteLink>;
        Relationships: [];
      };
      performance_goals: {
        Row: PerformanceGoals;
        Insert: Partial<PerformanceGoals> & { user_id: string };
        Update: Partial<PerformanceGoals>;
        Relationships: [];
      };
      workout_logs: {
        Row: WorkoutLog;
        Insert: Partial<WorkoutLog> & { user_id: string };
        Update: Partial<WorkoutLog>;
        Relationships: [];
      };
      sharing_connections: {
        Row: SharingConnection;
        Insert: Partial<SharingConnection> & { requester_id: string; recipient_id: string };
        Update: Partial<SharingConnection>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { user_id: string; type: string; title: string };
        Update: Partial<Notification>;
        Relationships: [];
      };
      whoop_events: {
        Row: WhoopEvent;
        Insert: Partial<WhoopEvent> & { event_type: string; payload: Json };
        Update: Partial<WhoopEvent>;
        Relationships: [];
      };
      user_milestone_unlocks: {
        Row: UserMilestoneUnlock;
        Insert: Partial<UserMilestoneUnlock> & { user_id: string; milestone_key: string; label: string; emoji: string };
        Update: Partial<UserMilestoneUnlock>;
        Relationships: [];
      };
    };
    Relationships: {
      [_ in never]: never;
    };
    Functions: {
      get_weekly_volume: {
        Args: { p_user_id: string; p_week_start?: string };
        Returns: WeeklyVolume[];
      };
      get_leaderboard: {
        Args: {
          p_user_id: string;
          p_date_from: string;
          p_date_to: string;
          p_metric?: string;
          p_mode?: string;
        };
        Returns: LeaderboardEntry[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

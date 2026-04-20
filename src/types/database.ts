export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------- Activity system ----------

export interface ActivityType {
  id: number;
  slug: string;
  name: string;
  unit: string;
  emoji: string;
  base_rate: number;
  acceleration: number;
  value_column: string | null;
  is_core: boolean;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type_id: number;
  value: number;
  score: number;
  logged_at: string;
  submitted_at: string | null;
  created_at: string;
}

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

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface TeamActivity {
  id: number;
  slug: string;
  name: string;
  unit: string;
  emoji: string;
}

export interface UserTeam {
  team_id: string;
  team_name: string;
  invite_code: string;
  avatar_url: string | null;
  member_count: number;
  user_role: string;
  activity_slugs: string[];
  team_score: number;
}

export interface TeamDetails {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  avatar_url: string | null;
  created_at: string;
  members: TeamMember[];
  activities: TeamActivity[];
}

export interface MessageReaction {
  emoji: string;
  user_id: string;
  full_name: string;
}

export interface TeamMessage {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
  reply_to: string | null;
  reply_content: string | null;
  reply_user_name: string | null;
  reactions: MessageReaction[];
  image_url: string | null;
}

export interface TeamMilestone {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  milestone_key: string;
  label: string;
  emoji: string;
  earned_at: string;
}

export interface ActivityBreakdownEntry {
  value: number;
  score: number;
}

export interface TeamLeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string;
  activity_breakdown: Record<string, ActivityBreakdownEntry>;
  total_score: number;
  streak: number;
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
      };
      invite_links: {
        Row: InviteLink;
        Insert: Partial<InviteLink>;
        Update: Partial<InviteLink>;
      };
      performance_goals: {
        Row: PerformanceGoals;
        Insert: Partial<PerformanceGoals> & { user_id: string };
        Update: Partial<PerformanceGoals>;
      };
      workout_logs: {
        Row: WorkoutLog;
        Insert: Partial<WorkoutLog> & { user_id: string };
        Update: Partial<WorkoutLog>;
      };
      sharing_connections: {
        Row: SharingConnection;
        Insert: Partial<SharingConnection> & { requester_id: string; recipient_id: string };
        Update: Partial<SharingConnection>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { user_id: string; type: string; title: string };
        Update: Partial<Notification>;
      };
      whoop_events: {
        Row: WhoopEvent;
        Insert: Partial<WhoopEvent> & { event_type: string; payload: Json };
        Update: Partial<WhoopEvent>;
      };
      user_milestone_unlocks: {
        Row: UserMilestoneUnlock;
        Insert: Partial<UserMilestoneUnlock> & { user_id: string; milestone_key: string; label: string; emoji: string };
        Update: Partial<UserMilestoneUnlock>;
      };
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
  };
}

// Type definitions for the application
export type VendorRole = 'admin' | 'team_member';
export type ProjectStatus = 'planning' | 'in_progress' | 'at_risk' | 'completed' | 'on_hold';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  customer_id: string;
  name: string;
  description: string | null;
  start_date: string;
  target_end_date: string;
  status: ProjectStatus;
  health_score: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer?: Customer;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  target_date: string;
  status: MilestoneStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  is_feature_request: boolean;
  votes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee?: Profile;
  milestone?: Milestone;
}

export interface ActivityFeed {
  id: string;
  project_id: string;
  user_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  user?: Profile;
}

export interface CalendarEvent {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  ai_suggested: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserVendorRole {
  id: string;
  user_id: string;
  role: VendorRole;
  created_at: string;
}

export interface UserCustomerRole {
  id: string;
  user_id: string;
  customer_id: string;
  created_at: string;
}

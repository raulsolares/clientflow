// Database types matching the Supabase schema
export type MemberRole = 'admin' | 'manager' | 'member' | 'viewer'
export type ClientStatus = 'active' | 'inactive'
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type ProjectPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type FileCategory = 'invoice' | 'report' | 'contract' | 'other'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type NotificationType = 'task_assigned' | 'comment_mention' | 'status_change' | 'file_uploaded'

export interface Profile {
  id: string
  company_id: string
  email: string
  full_name: string
  role: MemberRole
  is_client: boolean
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface Client {
  id: string
  company_id: string
  profile_id: string | null
  name: string
  company: string
  email: string
  phone: string | null
  logo_url: string | null
  status: ClientStatus
  notes: string | null
  created_at: string
}

export interface Project {
  id: string
  company_id: string
  client_id: string
  client?: Client
  name: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  start_date: string | null
  deadline: string | null
  color: string | null
  created_at: string
  members?: Profile[]
}

export interface Task {
  id: string
  company_id: string
  project_id: string
  project?: Project
  assigned_to: string | null
  assignee?: Profile
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  start_date: string | null
  estimated_hours: number | null
  visible_to_client: boolean
  created_at: string
  comments_count?: number
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  author?: Profile
  content: string
  created_at: string
}

export interface ProjectFile {
  id: string
  company_id: string
  project_id: string
  project?: Project
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
  category: FileCategory
  visible_to_client: boolean
  uploaded_by: string | null
  uploader?: Profile
  created_at: string
}

export interface ActivityLog {
  id: string
  company_id: string
  project_id: string | null
  entity_type: string
  entity_id: string
  action: string
  actor_id: string
  actor?: Profile
  metadata: any
  created_at: string
}

export interface DashboardSummary {
  total_projects: number
  active_projects: number
  total_tasks: number
  pending_tasks: number
  overdue_tasks: number
  team_members: number
  recent_activity: ActivityLog[]
}

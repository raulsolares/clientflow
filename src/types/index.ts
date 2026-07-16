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
export type EventType = 'meeting' | 'call' | 'deadline' | 'reminder' | 'other'
export type ActionTypeV2 = 'call' | 'email' | 'meeting' | 'note' | 'task_completed' | 'other'

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
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  logo_url: string | null
  status: ClientStatus
  notes: string | null
  created_at: string
  projects_count?: number
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
  end_date: string | null
  color: string | null
  template_id: string | null
  template?: ProjectTemplate
  created_at: string
  members?: Profile[]
}

export interface Task {
  id: string
  company_id: string
  project_id: string | null
  project?: Project
  client_id: string | null
  client?: Client
  parent_id: string | null
  parent?: Task
  subtasks?: Task[]
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
  sort_order: number
  recurrence_rule: RecurrenceRule | null
  completed_at: string | null
  created_at: string
  comments_count?: number
}

export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  by_days?: string[]       // ['mo','we','fr'] for weekly
  by_month_day?: number    // 15 for monthly
  next_due: string | null  // ISO date
  end_date?: string | null // ISO date
  count?: number           // max occurrences
  done?: number            // occurrences completed
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

export interface CalendarEvent {
  id: string
  company_id: string
  client_id: string | null
  client?: Client
  project_id: string | null
  project?: Project
  task_id: string | null
  task?: Task
  title: string
  description: string | null
  event_type: EventType
  start_date: string
  end_date: string | null
  all_day: boolean
  color: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ClientNote {
  id: string
  company_id: string
  client_id: string
  author_id: string | null
  author?: Profile
  content: string
  pinned: boolean
  created_at: string
  updated_at: string
}

export interface ClientAction {
  id: string
  company_id: string
  client_id: string
  action_type: ActionTypeV2
  title: string
  description: string | null
  outcome: string | null
  scheduled_date: string | null
  completed_at: string | null
  assigned_to: string | null
  assignee?: Profile
  created_by: string | null
  creator?: Profile
  linked_task_id: string | null
  linked_task?: Task
  created_at: string
  updated_at: string
}

export interface ProjectTemplate {
  id: string
  company_id: string
  name: string
  description: string | null
  category: string | null
  color: string | null
  created_by: string | null
  tasks?: ProjectTemplateTask[]
  created_at: string
  updated_at: string
}

export interface ProjectTemplateTask {
  id: string
  template_id: string
  title: string
  description: string | null
  priority: TaskPriority
  estimated_hours: number | null
  sort_order: number
  section: string | null
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

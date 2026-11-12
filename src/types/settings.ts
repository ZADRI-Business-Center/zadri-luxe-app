export interface AppSettings {
  id: boolean;
  watch_after_days: number;
  clearance_after_days: number;
  timezone: string;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface AuditEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE';
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: string[] | null;
  changed_by: string | null;
  changed_by_name?: string;
  changed_by_email?: string;
  changed_at: string;
}

export interface AuditFilterOptions {
  table_name?: string | 'all';
  changed_by?: string | 'all';
  record_id?: string;
  search?: string;
  period?: 'today' | '7days' | 'month' | 'all';
}

export interface CategoryItem {
  id: string;
  name: string;
  items_count?: number;
  created_at?: string;
}

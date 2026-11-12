import { supabase } from './supabase';
import { ensureOnline } from './imageUpload';
import type {
  AppSettings,
  AuditEntry,
  AuditFilterOptions,
  CategoryItem,
} from '../types/settings';

/**
 * Récupère les paramètres globaux de l'application (§9.8)
 */
export async function getAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Impossible de charger les paramètres.');
  }

  if (!data) {
    return {
      id: true,
      watch_after_days: 30,
      clearance_after_days: 60,
      timezone: 'UTC',
    };
  }

  return {
    id: data.id,
    watch_after_days: Number(data.watch_after_days || 30),
    clearance_after_days: Number(data.clearance_after_days || 60),
    timezone: data.timezone || 'UTC',
    updated_at: data.updated_at,
    updated_by: data.updated_by,
  };
}

/**
 * Met à jour les paramètres de l'application (seuils d'ancienneté & fuseau horaire)
 */
export async function updateAppSettings(
  payload: Pick<AppSettings, 'watch_after_days' | 'clearance_after_days' | 'timezone'>
): Promise<void> {
  await ensureOnline();

  if (payload.watch_after_days <= 0) {
    throw new Error('Le seuil « À surveiller » doit être supérieur à 0 jour.');
  }
  if (payload.clearance_after_days <= payload.watch_after_days) {
    throw new Error('Le seuil « À déstocker » doit être strictement supérieur au seuil « À surveiller ».');
  }

  const { error } = await supabase
    .from('app_settings')
    .update({
      watch_after_days: Math.round(payload.watch_after_days),
      clearance_after_days: Math.round(payload.clearance_after_days),
      timezone: payload.timezone.trim() || 'UTC',
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);

  if (error) {
    throw new Error(error.message || 'Impossible d’enregistrer les paramètres.');
  }
}

/**
 * Récupère les catégories d'articles avec le nombre d'articles associés
 */
export async function getCategoriesWithCount(): Promise<CategoryItem[]> {
  const [categoriesRes, itemsRes] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('items').select('category_id').is('archived_at', null),
  ]);

  if (categoriesRes.error) {
    throw new Error(categoriesRes.error.message || 'Impossible de charger les catégories.');
  }

  const countsMap = new Map<string, number>();
  (itemsRes.data || []).forEach((row: any) => {
    if (row.category_id) {
      countsMap.set(row.category_id, (countsMap.get(row.category_id) || 0) + 1);
    }
  });

  return (categoriesRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    items_count: countsMap.get(c.id) || 0,
    created_at: c.created_at,
  }));
}

/**
 * Ajout d'une catégorie
 */
export async function addCategory(name: string): Promise<CategoryItem> {
  await ensureOnline();
  const clean = name.trim();
  if (!clean) throw new Error('Le nom de la catégorie est obligatoire.');

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: clean })
    .select('*')
    .single();

  if (error || !data) {
    if (error?.code === '23505') throw new Error('Cette catégorie existe déjà.');
    throw new Error(error?.message || 'Impossible de créer la catégorie.');
  }

  return { id: data.id, name: data.name, items_count: 0 };
}

/**
 * Renommage d'une catégorie existante
 */
export async function renameCategory(categoryId: string, newName: string): Promise<void> {
  await ensureOnline();
  const clean = newName.trim();
  if (!clean) throw new Error('Le nom de la catégorie ne peut pas être vide.');

  const { error } = await supabase
    .from('categories')
    .update({ name: clean })
    .eq('id', categoryId);

  if (error) {
    if (error.code === '23505') throw new Error('Ce nom de catégorie existe déjà.');
    throw new Error(error.message || 'Impossible de renommer la catégorie.');
  }
}

/**
 * Récupère le journal d'audit inviolable (§9.7)
 */
export async function getAuditLog(filters?: AuditFilterOptions): Promise<AuditEntry[]> {
  const [auditRes, profilesRes] = await Promise.all([
    (() => {
      let q = supabase
        .from('audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(100);

      if (filters?.table_name && filters.table_name !== 'all') {
        q = q.eq('table_name', filters.table_name);
      }
      if (filters?.changed_by && filters.changed_by !== 'all') {
        q = q.eq('changed_by', filters.changed_by);
      }
      if (filters?.record_id) {
        q = q.eq('record_id', filters.record_id);
      }
      if (filters?.period && filters.period !== 'all') {
        const now = new Date();
        let startDate: Date;
        if (filters.period === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (filters.period === '7days') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        q = q.gte('changed_at', startDate.toISOString());
      }
      return q;
    })(),
    supabase.from('profiles').select('id, full_name, role'),
  ]);

  if (auditRes.error) {
    throw new Error(auditRes.error.message || 'Impossible de charger le journal d’audit.');
  }

  const profilesMap = new Map<string, { full_name: string; role: string }>();
  (profilesRes.data || []).forEach((p: any) => {
    profilesMap.set(p.id, { full_name: p.full_name, role: p.role });
  });

  let entries: AuditEntry[] = (auditRes.data || []).map((row: any) => {
    const profile = row.changed_by ? profilesMap.get(row.changed_by) : null;
    return {
      id: Number(row.id),
      table_name: row.table_name,
      record_id: row.record_id,
      action: row.action,
      old_data: row.old_data,
      new_data: row.new_data,
      changed_fields: row.changed_fields,
      changed_by: row.changed_by,
      changed_by_name: profile?.full_name || 'Système / Inconnu',
      changed_at: row.changed_at,
    };
  });

  // Filtre recherche textuelle local si renseigné
  if (filters?.search && filters.search.trim()) {
    const s = filters.search.trim().toLowerCase();
    entries = entries.filter((e) => {
      const matchTable = e.table_name.toLowerCase().includes(s);
      const matchUser = e.changed_by_name?.toLowerCase().includes(s);
      const matchId = e.record_id.toLowerCase().includes(s);
      const matchData = JSON.stringify(e.new_data || {}).toLowerCase().includes(s);
      return matchTable || matchUser || matchId || matchData;
    });
  }

  return entries;
}

/**
 * Récupère la liste des profils utilisateurs
 */
export async function getProfilesList(): Promise<Array<{ id: string; full_name: string; role: string }>> {
  const { data, error } = await supabase.from('profiles').select('id, full_name, role').order('full_name');
  if (error) return [];
  return (data || []) as Array<{ id: string; full_name: string; role: string }>;
}

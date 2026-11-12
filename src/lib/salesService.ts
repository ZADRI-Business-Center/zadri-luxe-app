import { supabase } from './supabase';
import { ensureOnline } from './imageUpload';
import type {
  CreateSalePayload,
  Sale,
  SaleChannel,
  SellableItem,
  SellableVariant,
  UpdateSalePayload,
} from '../types/sales';

const LAST_CHANNEL_KEY = 'zadri_last_sale_channel';

export function getLastUsedChannel(): SaleChannel {
  try {
    const saved = localStorage.getItem(LAST_CHANNEL_KEY);
    if (saved && ['facebook', 'whatsapp', 'direct', 'other'].includes(saved)) {
      return saved as SaleChannel;
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'direct';
}

export function saveLastUsedChannel(channel: SaleChannel | null): void {
  if (!channel) return;
  try {
    localStorage.setItem(LAST_CHANNEL_KEY, channel);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Récupère les articles et variantes ayant du stock disponible pour la vente rapide.
 */
export async function getSellableItems(): Promise<SellableItem[]> {
  const { data, error } = await supabase
    .from('v_variant_stock')
    .select('*')
    .order('item_name')
    .order('variant_label');

  if (error) {
    throw new Error(error.message || 'Impossible de charger le stock des articles.');
  }

  const itemsMap = new Map<string, SellableItem>();

  (data || []).forEach((row: any) => {
    const stock = Number(row.stock || 0);
    const effectivePrice = Number(row.effective_price || 0);

    const variant: SellableVariant = {
      variant_id: row.variant_id,
      item_id: row.item_id,
      item_name: row.item_name,
      item_code: row.item_code,
      variant_label: row.variant_label,
      photo_url: row.photo_url,
      stock,
      effective_price: effectivePrice,
      order_reference: row.order_reference,
      order_status: 'received',
    };

    const existing = itemsMap.get(row.item_id);
    if (existing) {
      existing.variants.push(variant);
      existing.total_stock += stock;
    } else {
      itemsMap.set(row.item_id, {
        item_id: row.item_id,
        item_name: row.item_name,
        item_code: row.item_code,
        category_name: null,
        photo_url: row.photo_url,
        list_price: effectivePrice,
        order_reference: row.order_reference,
        total_stock: stock,
        variants: [variant],
      });
    }
  });

  // Tri : articles en stock en premier
  return Array.from(itemsMap.values()).sort((a, b) => {
    if (a.total_stock > 0 && b.total_stock <= 0) return -1;
    if (a.total_stock <= 0 && b.total_stock > 0) return 1;
    return a.item_name.localeCompare(b.item_name, 'fr');
  });
}

/**
 * Enregistrement rapide d'une vente (< 10 secondes).
 * Appelle la fonction RPC create_sale qui effectue le verrouillage atomique du stock.
 */
export async function createSale(payload: CreateSalePayload): Promise<string> {
  await ensureOnline();

  if (payload.quantity <= 0) {
    throw new Error('La quantité vendue doit être d’au moins 1 pièce.');
  }
  if (payload.sold_total <= 0) {
    throw new Error('Le montant encaissé doit être strictement supérieur à 0 F CFA.');
  }

  const { data, error } = await supabase.rpc('create_sale', {
    p_id: payload.id || null,
    p_variant_id: payload.variant_id,
    p_quantity: payload.quantity,
    p_sold_total: Math.round(payload.sold_total),
    p_channel: payload.channel || null,
    p_sold_at: payload.sold_at || new Date().toISOString(),
    p_note: payload.note?.trim() || null,
  });

  if (error) {
    throw new Error(error.message || 'Impossible d’enregistrer la vente.');
  }

  if (payload.channel) {
    saveLastUsedChannel(payload.channel);
  }

  return (data as string) || '';
}

/**
 * Annulation d'une vente avec motif obligatoire et restitution immédiate du stock.
 */
export async function cancelSale(saleId: string, reason: string): Promise<void> {
  await ensureOnline();
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new Error('Le motif d’annulation est obligatoire.');
  }

  const { error } = await supabase.rpc('cancel_sale', {
    p_id: saleId,
    p_reason: cleanReason,
  });

  if (error) {
    throw new Error(error.message || 'Impossible d’annuler la vente.');
  }
}

/**
 * Correction d'une vente existante (traçabilité assurée par trigger d'audit).
 */
export async function updateSale(payload: UpdateSalePayload): Promise<void> {
  await ensureOnline();

  if (payload.quantity <= 0) {
    throw new Error('La quantité doit être strictement positive.');
  }
  if (payload.sold_total <= 0) {
    throw new Error('Le montant encaissé doit être strictement positif.');
  }

  const { error } = await supabase
    .from('sales')
    .update({
      quantity: payload.quantity,
      sold_total: Math.round(payload.sold_total),
      channel: payload.channel || null,
      sold_at: payload.sold_at,
      note: payload.note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.sale_id);

  if (error) {
    throw new Error(error.message || 'Impossible de modifier la vente.');
  }
}

export interface SalesFilterOptions {
  period?: 'today' | '7days' | 'month' | 'all';
  channel?: SaleChannel | 'all';
  status?: 'all' | 'active' | 'cancelled';
  search?: string;
}

/**
 * Récupère le journal des ventes avec détails joints (article, variante, commande).
 */
export async function getSalesList(filters?: SalesFilterOptions): Promise<Sale[]> {
  const queryStr = `
    id,
    variant_id,
    quantity,
    list_price_unit,
    sold_total,
    channel,
    sold_at,
    note,
    status,
    cancelled_at,
    cancelled_by,
    cancel_reason,
    created_by,
    created_at,
    updated_at,
    variants (
      id,
      label,
      photo_url,
      items (
        id,
        code,
        name,
        photo_url,
        orders (reference)
      )
    )
  `;

  let query = supabase
    .from('sales')
    .select(queryStr)
    .order('sold_at', { ascending: false });

  // Filtre statut
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  // Filtre canal
  if (filters?.channel && filters.channel !== 'all') {
    query = query.eq('channel', filters.channel);
  }

  // Filtre période
  if (filters?.period && filters.period !== 'all') {
    const now = new Date();
    let startDate: Date;

    if (filters.period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (filters.period === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filters.period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else {
      startDate = new Date(0);
    }
    query = query.gte('sold_at', startDate.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Impossible de charger le journal des ventes.');
  }

  const rawSales = (data || []) as any[];

  let sales: Sale[] = rawSales.map((row) => {
    const variant = row.variants;
    const item = variant?.items;
    const order = item?.orders;

    const listPriceUnit = Number(row.list_price_unit || 0);
    const quantity = Number(row.quantity || 1);
    const soldTotal = Number(row.sold_total || 0);
    const discount = (listPriceUnit * quantity) - soldTotal;

    return {
      id: row.id,
      variant_id: row.variant_id,
      quantity,
      list_price_unit: listPriceUnit,
      sold_total: soldTotal,
      channel: row.channel as SaleChannel | null,
      sold_at: row.sold_at,
      note: row.note,
      status: row.status,
      cancelled_at: row.cancelled_at,
      cancelled_by: row.cancelled_by,
      cancel_reason: row.cancel_reason,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      item_id: item?.id,
      item_name: item?.name || 'Article inconnu',
      item_code: item?.code,
      photo_url: variant?.photo_url || item?.photo_url || null,
      variant_label: variant?.label || 'Unique',
      order_reference: order?.reference || '',
      discount,
    };
  });

  // Filtre recherche textuelle local si renseigné
  if (filters?.search && filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    sales = sales.filter((s) =>
      s.item_name?.toLowerCase().includes(term) ||
      s.item_code?.toLowerCase().includes(term) ||
      s.variant_label?.toLowerCase().includes(term) ||
      s.order_reference?.toLowerCase().includes(term) ||
      s.note?.toLowerCase().includes(term)
    );
  }

  return sales;
}

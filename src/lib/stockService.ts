import { supabase } from './supabase';
import { ensureOnline } from './imageUpload';
import type {
  ChangePricePayload,
  CreateLossPayload,
  DormantVariant,
  LossReason,
  LossRecord,
} from '../types/stock';

/**
 * Récupère la liste des variantes en stock (> 0) triées par ancienneté décroissante
 * avec calculs des valeurs immobilisées et date de dernière vente.
 */
export async function getDormantStock(): Promise<DormantVariant[]> {
  const [stockResult, salesResult] = await Promise.all([
    supabase
      .from('v_dormant_stock')
      .select('*')
      .order('days_in_stock', { ascending: false })
      .order('received_date', { ascending: true }),
    supabase
      .from('sales')
      .select('variant_id, sold_at')
      .eq('status', 'active')
      .order('sold_at', { ascending: false }),
  ]);

  if (stockResult.error) {
    throw new Error(stockResult.error.message || 'Impossible de charger le stock d’invendus.');
  }

  // Mapper la date de dernière vente par variante
  const lastSalesMap = new Map<string, string>();
  (salesResult.data || []).forEach((row: any) => {
    if (!lastSalesMap.has(row.variant_id)) {
      lastSalesMap.set(row.variant_id, row.sold_at);
    }
  });

  return (stockResult.data || []).map((row: any) => ({
    variant_id: row.variant_id,
    item_id: row.item_id,
    order_id: row.order_id,
    order_reference: row.order_reference,
    item_code: row.item_code,
    item_name: row.item_name,
    variant_label: row.variant_label,
    photo_url: row.photo_url,
    photo_public_id: row.photo_public_id,
    received_date: row.received_date,
    days_in_stock: Number(row.days_in_stock || 0),
    dormant_status: row.dormant_status,
    stock: Number(row.stock || 0),
    effective_price: Number(row.effective_price || 0),
    effective_unit_cost: Number(row.effective_unit_cost || 0),
    cost_is_estimated: Boolean(row.cost_is_estimated),
    stock_value_at_cost: Number(row.stock_value_at_cost || 0),
    stock_value_at_price: Number(row.stock_value_at_price || 0),
    last_sold_at: lastSalesMap.get(row.variant_id) || null,
  }));
}

/**
 * Applique une modification ou baisse de prix (décote) tracée dans price_changes.
 */
export async function applyPriceChange(payload: ChangePricePayload): Promise<void> {
  await ensureOnline();

  if (payload.new_price < 0) {
    throw new Error('Le nouveau prix doit être un entier positif ou nul.');
  }

  const { error } = await supabase.rpc('change_price', {
    p_item_id: payload.item_id,
    p_variant_id: payload.variant_id || null,
    p_new_price: Math.round(payload.new_price),
    p_note: payload.note?.trim() || null,
  });

  if (error) {
    throw new Error(error.message || 'Impossible de modifier le prix.');
  }
}

/**
 * Enregistre une sortie en perte (abîmé après réception, offert, perdu/volé, autre).
 */
export async function createLoss(payload: CreateLossPayload): Promise<string> {
  await ensureOnline();

  if (payload.quantity <= 0) {
    throw new Error('La quantité sortie en perte doit être d’au moins 1 pièce.');
  }

  const { data, error } = await supabase.rpc('create_loss', {
    p_id: null,
    p_variant_id: payload.variant_id,
    p_quantity: payload.quantity,
    p_reason: payload.reason,
    p_occurred_on: payload.occurred_on || new Date().toISOString().slice(0, 10),
    p_note: payload.note?.trim() || null,
  });

  if (error) {
    throw new Error(error.message || 'Impossible d’enregistrer la sortie en perte.');
  }

  return (data as string) || '';
}

/**
 * Annule une sortie en perte avec motif obligatoire et restitution immédiate du stock.
 */
export async function cancelLoss(lossId: string, reason: string): Promise<void> {
  await ensureOnline();

  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new Error('Le motif d’annulation de la perte est obligatoire.');
  }

  const { error } = await supabase.rpc('cancel_loss', {
    p_id: lossId,
    p_reason: cleanReason,
  });

  if (error) {
    throw new Error(error.message || 'Impossible d’annuler la perte.');
  }
}

/**
 * Récupère le journal des pertes et sorties de stock.
 */
export async function getLossesList(): Promise<LossRecord[]> {
  const queryStr = `
    id,
    variant_id,
    quantity,
    reason,
    occurred_on,
    note,
    status,
    cancelled_at,
    cancelled_by,
    cancel_reason,
    created_by,
    created_at,
    variants (
      id,
      label,
      photo_url,
      items (
        id,
        code,
        name,
        photo_url,
        unit_cost,
        orders (reference)
      )
    )
  `;

  const { data, error } = await supabase
    .from('losses')
    .select(queryStr)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Impossible de charger le journal des pertes.');
  }

  return (data || []).map((row: any) => {
    const variant = row.variants;
    const item = variant?.items;
    const order = item?.orders;
    const unitCost = Number(item?.unit_cost || 0);
    const quantity = Number(row.quantity || 1);

    return {
      id: row.id,
      variant_id: row.variant_id,
      quantity,
      reason: row.reason as LossReason,
      occurred_on: row.occurred_on,
      note: row.note,
      status: row.status,
      cancelled_at: row.cancelled_at,
      cancelled_by: row.cancelled_by,
      cancel_reason: row.cancel_reason,
      created_by: row.created_by,
      created_at: row.created_at,
      item_id: item?.id,
      item_name: item?.name || 'Article inconnu',
      item_code: item?.code,
      variant_label: variant?.label || 'Unique',
      photo_url: variant?.photo_url || item?.photo_url || null,
      order_reference: order?.reference || '',
      effective_unit_cost: unitCost,
      lost_value: unitCost * quantity,
    };
  });
}

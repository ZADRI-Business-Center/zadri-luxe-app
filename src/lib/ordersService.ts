import { supabase } from './supabase';
import type {
  Order,
  OrderSummary,
  OrderItem,
  OrderOrigin,
  OrderStatus,
} from '../types/orders';
import {
  extractOrigin,
  injectOriginInNotes,
} from '../types/orders';

export interface CreateOrderPayload {
  reference?: string;
  order_date: string;
  supplier: string;
  origin: OrderOrigin | string;
  description?: string;
  purchase_amount: number;
  forwarder_fee: number;
  weight_kg?: number | null;
  status: OrderStatus;
  received_date?: string | null;
  notes?: string;
}

export interface UpdateOrderPayload {
  reference?: string;
  order_date?: string;
  supplier?: string;
  origin?: OrderOrigin | string;
  description?: string;
  purchase_amount?: number;
  forwarder_fee?: number;
  weight_kg?: number | null;
  status?: OrderStatus;
  received_date?: string | null;
  notes?: string;
}

/**
 * Récupère la liste de toutes les commandes avec leurs synthèses financières
 */
export async function getOrdersSummary(): Promise<OrderSummary[]> {
  // 1. Vue financière
  const { data: summaryData, error: summaryErr } = await supabase
    .from('v_order_summary')
    .select('*')
    .order('order_date', { ascending: false });

  if (summaryErr) {
    console.error('Erreur v_order_summary:', summaryErr);
    throw new Error(summaryErr.message || 'Impossible de charger la synthèse des commandes.');
  }

  // 2. Récupération des colonnes complémentaires de la table orders (notes, description, etc.)
  const { data: ordersData, error: ordersErr } = await supabase
    .from('orders')
    .select('id, origin, notes, description, purchase_amount, forwarder_fee')
    .is('archived_at', null);

  if (ordersErr) {
    console.warn('Avertissement orders metadata:', ordersErr);
  }

  const orderMetaMap = new Map<string, { origin?: string; notes?: string | null; description?: string | null; purchase_amount?: number; forwarder_fee?: number }>();
  if (ordersData) {
    ordersData.forEach((o) => {
      orderMetaMap.set(o.id, {
        origin: o.origin,
        notes: o.notes,
        description: o.description,
        purchase_amount: o.purchase_amount,
        forwarder_fee: o.forwarder_fee,
      });
    });
  }

  return (summaryData || []).map((row) => {
    const meta = orderMetaMap.get(row.order_id);
    const origin = extractOrigin({
      origin: meta?.origin,
      notes: meta?.notes,
      description: meta?.description,
      reference: row.reference,
    });

    return {
      order_id: row.order_id,
      reference: row.reference,
      order_date: row.order_date,
      supplier: row.supplier,
      status: row.status as OrderStatus,
      received_date: row.received_date,
      weight_kg: row.weight_kg,
      total_cost: Number(row.total_cost || 0),
      collected_total: Number(row.collected_total || 0),
      balance: Number(row.balance || 0),
      remaining_to_recover: Number(row.remaining_to_recover || 0),
      recovery_rate: Number(row.recovery_rate || 0),
      expected_profit: Number(row.expected_profit || 0),
      realized_margin: Number(row.realized_margin || 0),
      sell_through_rate: Number(row.sell_through_rate || 0),
      vendable_units: Number(row.vendable_units || 0),
      sold_units: Number(row.sold_units || 0),
      stock_units: Number(row.stock_units || 0),
      lost_units: Number(row.lost_units || 0),
      lost_value: Number(row.lost_value || 0),
      stock_value_at_price: Number(row.stock_value_at_price || 0),
      stock_value_at_cost: Number(row.stock_value_at_cost || 0),
      total_discounts: Number(row.total_discounts || 0),
      sales_count: Number(row.sales_count || 0),
      is_recovered: Boolean(row.is_recovered),
      origin,
      notes: meta?.notes,
      description: meta?.description,
      purchase_amount: meta?.purchase_amount,
      forwarder_fee: meta?.forwarder_fee,
    };
  });
}

/**
 * Récupère le détail complet d'une commande par son identifiant
 */
export async function getOrderDetail(orderId: string): Promise<{
  summary: OrderSummary;
  order: Order;
  items: OrderItem[];
}> {
  // 1. Récupération de l'enregistrement brut
  const { data: orderData, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderErr || !orderData) {
    throw new Error(orderErr?.message || 'Commande introuvable.');
  }

  // 2. Récupération de la synthèse financière correspondante
  const { data: summaryData, error: summaryErr } = await supabase
    .from('v_order_summary')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (summaryErr) {
    console.warn('Erreur v_order_summary single:', summaryErr);
  }

  const origin = extractOrigin({
    origin: orderData.origin,
    notes: orderData.notes,
    description: orderData.description,
    reference: orderData.reference,
  });

  const summary: OrderSummary = {
    order_id: orderData.id,
    reference: orderData.reference,
    order_date: orderData.order_date,
    supplier: orderData.supplier,
    status: orderData.status as OrderStatus,
    received_date: orderData.received_date,
    weight_kg: orderData.weight_kg,
    total_cost: Number(summaryData?.total_cost ?? orderData.total_cost ?? 0),
    collected_total: Number(summaryData?.collected_total || 0),
    balance: Number(summaryData?.balance ?? -(orderData.total_cost || 0)),
    remaining_to_recover: Number(summaryData?.remaining_to_recover ?? (orderData.total_cost || 0)),
    recovery_rate: Number(summaryData?.recovery_rate || 0),
    expected_profit: Number(summaryData?.expected_profit || 0),
    realized_margin: Number(summaryData?.realized_margin || 0),
    sell_through_rate: Number(summaryData?.sell_through_rate || 0),
    vendable_units: Number(summaryData?.vendable_units || 0),
    sold_units: Number(summaryData?.sold_units || 0),
    stock_units: Number(summaryData?.stock_units || 0),
    lost_units: Number(summaryData?.lost_units || 0),
    lost_value: Number(summaryData?.lost_value || 0),
    stock_value_at_price: Number(summaryData?.stock_value_at_price || 0),
    stock_value_at_cost: Number(summaryData?.stock_value_at_cost || 0),
    total_discounts: Number(summaryData?.total_discounts || 0),
    sales_count: Number(summaryData?.sales_count || 0),
    is_recovered: Boolean(summaryData?.is_recovered),
    origin,
    notes: orderData.notes,
    description: orderData.description,
    purchase_amount: orderData.purchase_amount,
    forwarder_fee: orderData.forwarder_fee,
  };

  // 3. Récupération des articles rattachés avec leur stock via v_variant_stock
  const { data: itemsData } = await supabase
    .from('items')
    .select('*, categories(name)')
    .eq('order_id', orderId)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  const { data: variantsStock } = await supabase
    .from('v_variant_stock')
    .select('*')
    .eq('order_id', orderId);

  const items: OrderItem[] = (itemsData || []).map((item) => {
    const vStocks = (variantsStock || []).filter((v) => v.item_id === item.id);
    const total_stock = vStocks.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    const total_sold = vStocks.reduce((sum, v) => sum + Number(v.sold_units || 0), 0);
    const total_vendable = vStocks.reduce((sum, v) => sum + Number(v.vendable || 0), 0);

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      category_name: item.categories?.name || null,
      photo_url: item.photo_url,
      list_price: Number(item.list_price || 0),
      unit_cost: item.unit_cost !== null ? Number(item.unit_cost) : null,
      received_date: item.received_date,
      total_stock,
      total_sold,
      total_vendable,
      variants_count: vStocks.length,
    };
  });

  return {
    summary,
    order: {
      ...orderData,
      origin,
    },
    items,
  };
}

/**
 * Crée une nouvelle commande avec gestion propre de la provenance et référence
 */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const notesWithOrigin = injectOriginInNotes(payload.notes, payload.origin);

  // Payload prêt pour Supabase
  const insertBody: Record<string, any> = {
    order_date: payload.order_date,
    supplier: payload.supplier.trim(),
    description: payload.description ? payload.description.trim() : null,
    purchase_amount: payload.purchase_amount,
    forwarder_fee: payload.forwarder_fee || 0,
    weight_kg: payload.weight_kg ? Number(payload.weight_kg) : null,
    status: payload.status,
    received_date: payload.status === 'received' ? (payload.received_date || payload.order_date) : null,
    notes: notesWithOrigin,
  };

  // Si une référence explicite a été saisie
  if (payload.reference && payload.reference.trim()) {
    insertBody.reference = payload.reference.trim().toUpperCase();
  }

  // Tentative avec colonne origin si elle existe, sinon sans
  let { data, error } = await supabase
    .from('orders')
    .insert({
      ...insertBody,
      origin: payload.origin,
    })
    .select()
    .single();

  // Si échec parce que la colonne origin n'est pas encore créée en base, fallback immédiat sans la colonne
  if (error && error.message?.includes("'origin'")) {
    const res = await supabase
      .from('orders')
      .insert(insertBody)
      .select()
      .single();
    data = res.data;
    error = res.error;
  }

  if (error || !data) {
    console.error('Erreur createOrder:', error);
    throw new Error(error?.message || 'Erreur lors de la création de la commande.');
  }

  return {
    ...data,
    origin: payload.origin,
  };
}

/**
 * Met à jour une commande existante
 */
export async function updateOrder(id: string, payload: UpdateOrderPayload): Promise<Order> {
  const updateBody: Record<string, any> = {};

  if (payload.supplier !== undefined) updateBody.supplier = payload.supplier.trim();
  if (payload.order_date !== undefined) updateBody.order_date = payload.order_date;
  if (payload.description !== undefined) updateBody.description = payload.description?.trim() || null;
  if (payload.purchase_amount !== undefined) updateBody.purchase_amount = payload.purchase_amount;
  if (payload.forwarder_fee !== undefined) updateBody.forwarder_fee = payload.forwarder_fee;
  if (payload.weight_kg !== undefined) updateBody.weight_kg = payload.weight_kg ? Number(payload.weight_kg) : null;
  if (payload.status !== undefined) {
    updateBody.status = payload.status;
    if (payload.status === 'received') {
      updateBody.received_date = payload.received_date || new Date().toISOString().split('T')[0];
    } else {
      updateBody.received_date = null;
    }
  } else if (payload.received_date !== undefined) {
    updateBody.received_date = payload.received_date;
  }

  if (payload.reference && payload.reference.trim()) {
    updateBody.reference = payload.reference.trim().toUpperCase();
  }

  if (payload.origin !== undefined || payload.notes !== undefined) {
    const originToUse = payload.origin || 'Chine';
    updateBody.notes = injectOriginInNotes(payload.notes, originToUse);
  }

  let { data, error } = await supabase
    .from('orders')
    .update({
      ...updateBody,
      ...(payload.origin ? { origin: payload.origin } : {}),
    })
    .eq('id', id)
    .select()
    .single();

  if (error && error.message?.includes("'origin'")) {
    const res = await supabase
      .from('orders')
      .update(updateBody)
      .eq('id', id)
      .select()
      .single();
    data = res.data;
    error = res.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'Erreur lors de la mise à jour de la commande.');
  }

  return {
    ...data,
    origin: payload.origin || extractOrigin(data),
  };
}

/**
 * Marque rapidement une commande comme reçue avec la date choisie
 */
export async function markOrderAsReceived(id: string, receivedDate?: string): Promise<void> {
  const dateStr = receivedDate || new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'received',
      received_date: dateStr,
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Impossible de marquer la commande comme reçue.');
  }
}

/**
 * Archive une commande (suppression logique sans perte de données)
 */
export async function archiveOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Impossible d\'archiver la commande.');
  }
}

/**
 * Suggère un préfixe et numéro de référence selon l'origine
 */
export async function suggestNextReference(origin: OrderOrigin | string): Promise<string> {
  const prefix =
    origin === 'Local' ? 'LOC-' :
    origin === 'Dubaï' ? 'DXB-' :
    origin === 'Turquie' ? 'TR-' :
    origin === 'Chine' ? 'CH-' : 'CMD-';

  // Recherche des références existantes avec ce préfixe
  const { data } = await supabase
    .from('orders')
    .select('reference')
    .ilike('reference', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) {
    return `${prefix}001`;
  }

  let maxNum = 0;
  data.forEach((row) => {
    const numPart = row.reference.replace(prefix, '');
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  const padded = nextNum < 1000 ? String(nextNum).padStart(3, '0') : String(nextNum);
  return `${prefix}${padded}`;
}

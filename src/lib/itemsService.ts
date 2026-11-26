import { supabase } from './supabase';
import { ensureOnline } from './imageUpload';
import { extractOrigin } from '../types/orders';
import type {
  Category,
  CreateItemPayload,
  DormantStatus,
  ItemCatalogEntry,
  ItemDetail,
  ItemVariant,
  PriceChange,
  ReceivedOrderOption,
  UpdateItemPayload,
  VariantPayload,
} from '../types/items';

interface CatalogRow {
  item_id: string;
  item_code: string;
  order_id: string;
  order_reference: string;
  supplier: string;
  category_id: string | null;
  category_name: string | null;
  item_name: string;
  description: string | null;
  photo_url: string | null;
  photo_public_id: string | null;
  list_price: number | string;
  initial_price: number | string;
  unit_cost: number | string | null;
  unit_margin: number | string | null;
  received_date: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  variants_count: number | string;
  vendable_units: number | string;
  sold_units: number | string;
  stock_units: number | string;
  dormant_status: DormantStatus;
}

function toCatalogEntry(row: CatalogRow): ItemCatalogEntry {
  return {
    ...row,
    list_price: Number(row.list_price),
    initial_price: Number(row.initial_price),
    unit_cost: row.unit_cost === null ? null : Number(row.unit_cost),
    unit_margin: row.unit_margin === null ? null : Number(row.unit_margin),
    variants_count: Number(row.variants_count),
    vendable_units: Number(row.vendable_units),
    sold_units: Number(row.sold_units),
    stock_units: Number(row.stock_units),
  };
}

function normalizeVariants(variants: VariantPayload[]): VariantPayload[] {
  if (variants.length === 0) {
    return [{ label: 'Unique', quantity_received: 0, quantity_damaged: 0 }];
  }

  return variants.map((variant) => ({
    ...variant,
    label: variant.label.trim() || 'Unique',
    quantity_ordered: variant.quantity_ordered ?? null,
    price_override: variant.price_override ?? null,
    photo_url: variant.photo_url || null,
    photo_public_id: variant.photo_public_id || null,
  }));
}

export async function getItemCatalog(includeArchived = false): Promise<ItemCatalogEntry[]> {
  try {
    let query = supabase
      .from('v_item_catalog')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) {
      // Si la vue v_item_catalog n'existe pas encore en base, basculer sur le fallback
      if (error.message.includes('v_item_catalog') || error.code === 'PGRST204' || error.message.includes('schema cache')) {
        return await fetchCatalogFallback(includeArchived);
      }
      throw new Error(error.message || 'Impossible de charger les articles.');
    }
    return ((data || []) as CatalogRow[]).map(toCatalogEntry);
  } catch (err: any) {
    if (err?.message?.includes('v_item_catalog') || err?.message?.includes('schema cache')) {
      return await fetchCatalogFallback(includeArchived);
    }
    throw err;
  }
}

async function fetchCatalogFallback(includeArchived = false): Promise<ItemCatalogEntry[]> {
  let query = supabase
    .from('items')
    .select(`
      id,
      code,
      order_id,
      orders (reference, supplier, archived_at),
      category_id,
      categories (name),
      name,
      description,
      photo_url,
      photo_public_id,
      list_price,
      initial_price,
      unit_cost,
      received_date,
      archived_at,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  if (!includeArchived) query = query.is('archived_at', null);

  const { data: rawItems, error } = await query;
  if (error) throw new Error(error.message || 'Impossible de charger les articles.');

  const { data: variantsData } = await supabase
    .from('v_variant_stock')
    .select('item_id, vendable, sold_units, stock, dormant_status');

  const totalsMap = new Map<string, { count: number; vendable: number; sold: number; stock: number; dormant: DormantStatus }>();
  (variantsData || []).forEach((vs: any) => {
    const prev = totalsMap.get(vs.item_id) || { count: 0, vendable: 0, sold: 0, stock: 0, dormant: 'out_of_stock' as DormantStatus };
    prev.count += 1;
    prev.vendable += Number(vs.vendable || 0);
    prev.sold += Number(vs.sold_units || 0);
    prev.stock += Number(vs.stock || 0);
    const vStat = (vs.dormant_status || 'normal') as string;
    if (vStat === 'clearance' || prev.dormant === 'clearance') {
      prev.dormant = 'clearance';
    } else if (vStat === 'watch' || prev.dormant === 'watch') {
      prev.dormant = 'watch';
    } else if (vStat === 'normal' && prev.dormant === 'out_of_stock') {
      prev.dormant = 'normal';
    }
    totalsMap.set(vs.item_id, prev);
  });

  return (rawItems || [])
    .filter((it: any) => !it.orders?.archived_at)
    .map((it: any) => {
      const totals = totalsMap.get(it.id) || { count: 0, vendable: 0, sold: 0, stock: 0, dormant: 'out_of_stock' as DormantStatus };
      const listPrice = Number(it.list_price);
      const unitCost = it.unit_cost === null || it.unit_cost === undefined ? null : Number(it.unit_cost);
      return {
        item_id: it.id,
        item_code: it.code,
        order_id: it.order_id,
        order_reference: it.orders?.reference || '',
        supplier: it.orders?.supplier || '',
        category_id: it.category_id,
        category_name: it.categories?.name || null,
        item_name: it.name,
        description: it.description,
        photo_url: it.photo_url,
        photo_public_id: it.photo_public_id,
        list_price: listPrice,
        initial_price: Number(it.initial_price),
        unit_cost: unitCost,
        unit_margin: unitCost !== null ? listPrice - unitCost : null,
        received_date: it.received_date,
        archived_at: it.archived_at,
        created_at: it.created_at,
        updated_at: it.updated_at,
        variants_count: totals.count,
        vendable_units: totals.vendable,
        sold_units: totals.sold,
        stock_units: totals.stock,
        dormant_status: totals.stock > 0 ? totals.dormant : 'out_of_stock',
      };
    });
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  if (error) throw new Error(error.message || 'Impossible de charger les catégories.');
  return (data || []) as Category[];
}

export async function createCategory(name: string): Promise<Category> {
  await ensureOnline();
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Le nom de la catégorie est obligatoire.');

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: cleanName })
    .select('id, name')
    .single();

  if (error || !data) {
    if (error?.code === '23505') throw new Error('Cette catégorie existe déjà.');
    throw new Error(error?.message || 'Impossible de créer la catégorie.');
  }
  return data as Category;
}

export async function getReceivedOrders(): Promise<ReceivedOrderOption[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, reference, supplier, origin, notes, description, received_date')
    .eq('status', 'received')
    .is('archived_at', null)
    .order('received_date', { ascending: false });

  if (error) throw new Error(error.message || 'Impossible de charger les commandes reçues.');

  return (data || []).map((order) => ({
    id: order.id,
    reference: order.reference,
    supplier: order.supplier,
    origin: extractOrigin(order),
    received_date: order.received_date,
  }));
}

export async function createItem(payload: CreateItemPayload): Promise<string> {
  await ensureOnline();
  const { data, error } = await supabase.rpc('create_item_with_variants', {
    p_order_id: payload.order_id,
    p_name: payload.name.trim(),
    p_list_price: payload.list_price,
    p_unit_cost: payload.unit_cost ?? null,
    p_category_id: payload.category_id || null,
    p_description: payload.description?.trim() || null,
    p_photo_url: payload.photo_url || null,
    p_photo_public_id: payload.photo_public_id || null,
    p_variants: normalizeVariants(payload.variants),
  });

  if (error) throw new Error(error.message || 'Impossible de créer l’article.');
  const result = data as { item_id?: string } | null;
  if (!result?.item_id) throw new Error('La création de l’article n’a retourné aucun identifiant.');
  return result.item_id;
}

export async function updateItem(payload: UpdateItemPayload): Promise<void> {
  await ensureOnline();

  // 1. Essai via la fonction RPC atomique si elle est installée
  const { error: rpcError } = await supabase.rpc('update_item_with_variants', {
    p_item_id: payload.item_id,
    p_name: payload.name.trim(),
    p_list_price: payload.list_price,
    p_unit_cost: payload.unit_cost ?? null,
    p_category_id: payload.category_id || null,
    p_description: payload.description?.trim() || null,
    p_photo_url: payload.photo_url || null,
    p_photo_public_id: payload.photo_public_id || null,
    p_variants: normalizeVariants(payload.variants),
  });

  // Si la fonction RPC a fonctionné, terminé
  if (!rpcError) return;

  // 2. Si la fonction RPC n'existe pas en base ("Could not find the function..."),
  // fallback direct et robuste sur les tables items et variants :
  const isFunctionMissing =
    rpcError.message?.includes('Could not find the function') ||
    rpcError.message?.includes('schema cache') ||
    rpcError.code === '42883';

  if (!isFunctionMissing) {
    throw new Error(rpcError.message || 'Impossible de modifier l’article.');
  }

  console.warn('RPC update_item_with_variants absente, exécution de la mise à jour directe...');

  // Mise à jour de la table items
  const { error: itemUpdateErr } = await supabase
    .from('items')
    .update({
      name: payload.name.trim(),
      category_id: payload.category_id || null,
      description: payload.description?.trim() || null,
      photo_url: payload.photo_url || null,
      photo_public_id: payload.photo_public_id || null,
      list_price: payload.list_price,
      unit_cost: payload.unit_cost ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.item_id);

  if (itemUpdateErr) {
    throw new Error(itemUpdateErr.message || 'Impossible de mettre à jour la fiche article.');
  }

  // Mise à jour ou insertion des variantes
  if (payload.variants && payload.variants.length > 0) {
    for (const v of payload.variants) {
      if (v.id) {
        // Variante existante : mise à jour
        const { error: vErr } = await supabase
          .from('variants')
          .update({
            label: v.label.trim() || 'Unique',
            photo_url: v.photo_url || null,
            photo_public_id: v.photo_public_id || null,
            price_override: v.price_override ?? null,
            quantity_ordered: v.quantity_ordered ?? null,
            quantity_received: v.quantity_received ?? 0,
            quantity_damaged: v.quantity_damaged ?? 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', v.id)
          .eq('item_id', payload.item_id);

        if (vErr) console.warn('Avertissement mise à jour variante:', vErr);
      } else {
        // Nouvelle variante ajoutée
        const { error: vInsertErr } = await supabase
          .from('variants')
          .insert({
            item_id: payload.item_id,
            label: v.label.trim() || 'Unique',
            photo_url: v.photo_url || null,
            photo_public_id: v.photo_public_id || null,
            price_override: v.price_override ?? null,
            quantity_ordered: v.quantity_ordered ?? null,
            quantity_received: v.quantity_received ?? 0,
            quantity_damaged: v.quantity_damaged ?? 0,
          });

        if (vInsertErr) console.warn('Avertissement création variante:', vInsertErr);
      }
    }
  }
}

export async function archiveItem(itemId: string): Promise<void> {
  await ensureOnline();
  const { error } = await supabase.rpc('archive_item', { p_item_id: itemId });
  if (error) {
    const { error: updateError } = await supabase
      .from('items')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', itemId);
    if (updateError) throw new Error(updateError.message || 'Impossible d’archiver l’article.');
  }
}

export async function getItemDetail(itemId: string): Promise<ItemDetail> {
  const [catalogResult, variantsResult, priceResult] = await Promise.all([
    supabase.from('v_item_catalog').select('*').eq('item_id', itemId).maybeSingle(),
    supabase.from('v_variant_stock').select('*').eq('item_id', itemId).order('variant_label'),
    supabase.from('price_changes')
      .select('id, variant_id, old_price, new_price, change_type, changed_at, note')
      .eq('item_id', itemId)
      .order('changed_at', { ascending: false }),
  ]);

  if (variantsResult.error) throw new Error(variantsResult.error.message);
  if (priceResult.error) throw new Error(priceResult.error.message);

  let catalogEntry: ItemCatalogEntry;

  if (catalogResult.error || !catalogResult.data) {
    // Fallback direct sur la table items si la vue v_item_catalog n'existe pas encore
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select(`
        id,
        code,
        order_id,
        orders (reference, supplier),
        category_id,
        categories (name),
        name,
        description,
        photo_url,
        photo_public_id,
        list_price,
        initial_price,
        unit_cost,
        received_date,
        archived_at,
        created_at,
        updated_at
      `)
      .eq('id', itemId)
      .maybeSingle();

    if (itemError) throw new Error(itemError.message);
    if (!itemData) throw new Error('Article introuvable.');

    const vsRows = variantsResult.data || [];
    const vendable = vsRows.reduce((acc: number, r: any) => acc + Number(r.vendable || 0), 0);
    const sold = vsRows.reduce((acc: number, r: any) => acc + Number(r.sold_units || 0), 0);
    const stock = vsRows.reduce((acc: number, r: any) => acc + Number(r.stock || 0), 0);

    let worstStatus: DormantStatus = 'out_of_stock';
    if (stock > 0) {
      if (vsRows.some((r: any) => r.dormant_status === 'clearance')) worstStatus = 'clearance';
      else if (vsRows.some((r: any) => r.dormant_status === 'watch')) worstStatus = 'watch';
      else worstStatus = 'normal';
    }

    const anyItem = itemData as any;
    const listPrice = Number(anyItem.list_price);
    const unitCost = anyItem.unit_cost === null || anyItem.unit_cost === undefined ? null : Number(anyItem.unit_cost);

    catalogEntry = {
      item_id: anyItem.id,
      item_code: anyItem.code,
      order_id: anyItem.order_id,
      order_reference: anyItem.orders?.reference || '',
      supplier: anyItem.orders?.supplier || '',
      category_id: anyItem.category_id,
      category_name: anyItem.categories?.name || null,
      item_name: anyItem.name,
      description: anyItem.description,
      photo_url: anyItem.photo_url,
      photo_public_id: anyItem.photo_public_id,
      list_price: listPrice,
      initial_price: Number(anyItem.initial_price),
      unit_cost: unitCost,
      unit_margin: unitCost !== null ? listPrice - unitCost : null,
      received_date: anyItem.received_date,
      archived_at: anyItem.archived_at,
      created_at: anyItem.created_at,
      updated_at: anyItem.updated_at,
      variants_count: vsRows.length,
      vendable_units: vendable,
      sold_units: sold,
      stock_units: stock,
      dormant_status: worstStatus,
    };
  } else {
    catalogEntry = toCatalogEntry(catalogResult.data as CatalogRow);
  }

  const variants: ItemVariant[] = (variantsResult.data || []).map((row) => ({
    id: row.variant_id,
    item_id: row.item_id,
    label: row.variant_label,
    photo_url: row.photo_url,
    photo_public_id: row.photo_public_id,
    price_override: null,
    quantity_ordered: row.quantity_ordered,
    quantity_received: Number(row.quantity_received),
    quantity_damaged: Number(row.quantity_damaged),
    vendable: Number(row.vendable),
    sold_units: Number(row.sold_units),
    lost_units: Number(row.lost_units),
    stock: Number(row.stock),
    effective_price: Number(row.effective_price),
    effective_unit_cost: Number(row.effective_unit_cost),
    cost_is_estimated: Boolean(row.cost_is_estimated),
    days_in_stock: Number(row.days_in_stock),
    dormant_status: row.dormant_status as DormantStatus,
  }));

  if (variants.length > 0) {
    const { data: rawVariants, error: rawError } = await supabase
      .from('variants')
      .select('id, price_override')
      .eq('item_id', itemId)
      .is('archived_at', null);
    if (rawError) throw new Error(rawError.message);
    const overrides = new Map((rawVariants || []).map((row) => [row.id, row.price_override]));
    variants.forEach((variant) => {
      const override = overrides.get(variant.id);
      variant.price_override = override === null || override === undefined ? null : Number(override);
    });
  }

  const priceChanges: PriceChange[] = (priceResult.data || []).map((row) => ({
    id: row.id,
    variant_id: row.variant_id,
    old_price: row.old_price === null ? null : Number(row.old_price),
    new_price: Number(row.new_price),
    change_type: row.change_type,
    changed_at: row.changed_at,
    note: row.note,
  }));

  return {
    item: catalogEntry,
    variants,
    priceChanges,
  };
}

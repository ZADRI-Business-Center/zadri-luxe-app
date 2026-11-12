export type DormantStatus = 'normal' | 'watch' | 'clearance' | 'out_of_stock';

export interface Category {
  id: string;
  name: string;
}

export interface ReceivedOrderOption {
  id: string;
  reference: string;
  supplier: string;
  origin: string;
  received_date: string;
}

export interface ItemCatalogEntry {
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
  list_price: number;
  initial_price: number;
  unit_cost: number | null;
  unit_margin: number | null;
  received_date: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  variants_count: number;
  vendable_units: number;
  sold_units: number;
  stock_units: number;
  dormant_status: DormantStatus;
}

export interface ItemVariant {
  id: string;
  item_id: string;
  label: string;
  photo_url: string | null;
  photo_public_id: string | null;
  price_override: number | null;
  quantity_ordered: number | null;
  quantity_received: number;
  quantity_damaged: number;
  vendable: number;
  sold_units: number;
  lost_units: number;
  stock: number;
  effective_price: number;
  effective_unit_cost: number;
  cost_is_estimated: boolean;
  days_in_stock: number;
  dormant_status: DormantStatus;
}

export interface PriceChange {
  id: string;
  variant_id: string | null;
  old_price: number | null;
  new_price: number;
  change_type: 'initial' | 'markdown' | 'increase';
  changed_at: string;
  note: string | null;
}

export interface ItemDetail {
  item: ItemCatalogEntry;
  variants: ItemVariant[];
  priceChanges: PriceChange[];
}

export interface VariantPayload {
  id?: string;
  label: string;
  photo_url?: string | null;
  photo_public_id?: string | null;
  price_override?: number | null;
  quantity_ordered?: number | null;
  quantity_received: number;
  quantity_damaged: number;
}

export interface CreateItemPayload {
  order_id: string;
  name: string;
  list_price: number;
  unit_cost?: number | null;
  category_id?: string | null;
  description?: string | null;
  photo_url?: string | null;
  photo_public_id?: string | null;
  variants: VariantPayload[];
}

export interface UpdateItemPayload extends Omit<CreateItemPayload, 'order_id'> {
  item_id: string;
}

export const DORMANT_STATUS_CONFIG: Record<DormantStatus, { label: string; color: 'primary' | 'accent' | 'danger' | 'muted' }> = {
  normal: { label: 'Normal', color: 'primary' },
  watch: { label: 'À surveiller', color: 'accent' },
  clearance: { label: 'À déstocker', color: 'danger' },
  out_of_stock: { label: 'Épuisé', color: 'muted' },
};

export type SaleChannel = 'facebook' | 'whatsapp' | 'direct' | 'other';
export type SaleStatus = 'active' | 'cancelled';

export interface Sale {
  id: string;
  variant_id: string;
  quantity: number;
  list_price_unit: number;
  sold_total: number;
  channel: SaleChannel | null;
  sold_at: string;
  note: string | null;
  status: SaleStatus;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at?: string;

  // Données associées (jointure)
  item_id?: string;
  item_name?: string;
  item_code?: string;
  photo_url?: string | null;
  variant_label?: string;
  order_reference?: string;
  discount?: number;
  margin?: number;
  effective_unit_cost?: number;
  cost_is_estimated?: boolean;
}

export interface CreateSalePayload {
  id?: string;
  variant_id: string;
  quantity: number;
  sold_total: number;
  channel?: SaleChannel | null;
  sold_at?: string;
  note?: string | null;
}

export interface UpdateSalePayload {
  sale_id: string;
  quantity: number;
  sold_total: number;
  channel?: SaleChannel | null;
  sold_at: string;
  note?: string | null;
}

export interface SellableVariant {
  variant_id: string;
  item_id: string;
  item_name: string;
  item_code: string;
  category_name?: string | null;
  variant_label: string;
  photo_url: string | null;
  stock: number;
  effective_price: number;
  order_reference: string;
  order_status: string;
}

export interface SellableItem {
  item_id: string;
  item_name: string;
  item_code: string;
  category_name?: string | null;
  photo_url: string | null;
  list_price: number;
  order_reference: string;
  total_stock: number;
  variants: SellableVariant[];
}

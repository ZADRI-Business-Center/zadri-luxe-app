import type { DormantStatus } from './items';

export type LossReason = 'damaged' | 'unsellable' | 'gift' | 'lost' | 'other';
export type LossStatus = 'active' | 'cancelled';

export const LOSS_REASONS_LABELS: Record<LossReason, { label: string; icon: string; desc: string }> = {
  damaged: { label: 'Abîmé', icon: '💥', desc: 'Cassé ou détérioré après réception' },
  unsellable: { label: 'Invendable', icon: '🚫', desc: 'Défaut majeur, impropre à la vente' },
  gift: { label: 'Offert / Cadeau', icon: '🎁', desc: 'Don client, partenariat ou influenceur' },
  lost: { label: 'Perdu / Volé', icon: '🕵️', desc: 'Manquant lors de l’inventaire' },
  other: { label: 'Autre', icon: '📦', desc: 'Autre motif particulier' },
};

export interface DormantVariant {
  variant_id: string;
  item_id: string;
  order_id: string;
  order_reference: string;
  item_code: string;
  item_name: string;
  variant_label: string;
  photo_url: string | null;
  photo_public_id: string | null;
  received_date: string;
  days_in_stock: number;
  dormant_status: DormantStatus;
  stock: number;
  effective_price: number;
  effective_unit_cost: number;
  cost_is_estimated: boolean;
  stock_value_at_cost: number;
  stock_value_at_price: number;
  last_sold_at: string | null;
}

export interface ChangePricePayload {
  item_id: string;
  variant_id?: string | null;
  new_price: number;
  note?: string;
}

export interface CreateLossPayload {
  variant_id: string;
  quantity: number;
  reason: LossReason;
  occurred_on?: string;
  note?: string;
}

export interface LossRecord {
  id: string;
  variant_id: string;
  quantity: number;
  reason: LossReason;
  occurred_on: string;
  note: string | null;
  status: LossStatus;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: string;

  // Données associées
  item_id?: string;
  item_name?: string;
  item_code?: string;
  variant_label?: string;
  photo_url?: string | null;
  order_reference?: string;
  effective_unit_cost?: number;
  lost_value?: number;
}

export type OrderOrigin = 'Chine' | 'Local' | 'Dubaï' | 'Turquie' | 'Autre';

export type OrderStatus = 'ordered' | 'shipping' | 'received'; // 'shipping' conservé pour compatibilité DB

export interface Order {
  id: string;
  reference: string;
  order_date: string;
  supplier: string;
  description: string | null;
  status: OrderStatus;
  purchase_amount: number;
  forwarder_fee: number;
  weight_kg: number | null;
  received_date: string | null;
  total_cost: number;
  notes: string | null;
  origin?: string;
  archived_at: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderSummary {
  order_id: string;
  reference: string;
  order_date: string;
  supplier: string;
  status: OrderStatus;
  received_date: string | null;
  weight_kg: number | null;
  total_cost: number;
  collected_total: number;
  balance: number;
  remaining_to_recover: number;
  recovery_rate: number;
  expected_profit: number;
  realized_margin: number;
  sell_through_rate: number;
  vendable_units: number;
  sold_units: number;
  stock_units: number;
  lost_units: number;
  lost_value: number;
  stock_value_at_price: number;
  stock_value_at_cost: number;
  total_discounts: number;
  sales_count: number;
  is_recovered: boolean;
  // Provenance déduite
  origin: OrderOrigin | string;
  notes?: string | null;
  description?: string | null;
  purchase_amount?: number;
  forwarder_fee?: number;
}

export interface OrderItem {
  id: string;
  code: string;
  name: string;
  category_name?: string | null;
  photo_url?: string | null;
  list_price: number;
  unit_cost: number | null;
  received_date: string;
  total_stock: number;
  total_sold: number;
  total_vendable: number;
  variants_count: number;
}

export const ORIGIN_CONFIG: Record<OrderOrigin, { label: string; icon: string; defaultPrefix: string; transportLabel: string }> = {
  Chine: {
    label: 'Chine',
    icon: '🇨🇳',
    defaultPrefix: 'CH-',
    transportLabel: 'Frais de transitaire (FCFA)',
  },
  Local: {
    label: 'Local',
    icon: '🇨🇮',
    defaultPrefix: 'LOC-',
    transportLabel: 'Frais de livraison / transport (FCFA)',
  },
  'Dubaï': {
    label: 'Dubaï',
    icon: '🇦🇪',
    defaultPrefix: 'DXB-',
    transportLabel: 'Frais de transport / transitaire (FCFA)',
  },
  Turquie: {
    label: 'Turquie',
    icon: '🇹🇷',
    defaultPrefix: 'TR-',
    transportLabel: 'Frais de transport / transitaire (FCFA)',
  },
  Autre: {
    label: 'Autre',
    icon: '🌐',
    defaultPrefix: 'CMD-',
    transportLabel: 'Frais de transport / acheminement (FCFA)',
  },
};

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  ordered: {
    label: 'Commandée',
    color: 'var(--color-info, #2563eb)',
    bg: 'rgba(37, 99, 235, 0.12)',
  },
  shipping: {
    label: 'En transit',
    color: 'var(--color-warning, #d97706)',
    bg: 'rgba(217, 119, 6, 0.12)',
  },
  received: {
    label: 'Reçue',
    color: 'var(--color-success, #16a34a)',
    bg: 'rgba(22, 163, 74, 0.12)',
  },
};

/**
 * Formatage des montants en FCFA entiers avec espaces : "1 250 000 F"
 */
export function formatFCFA(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 F';
  const rounded = Math.round(amount);
  return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`;
}

/**
 * Formatage des dates au format français jj/mm/aaaa
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Extraction robuste de l'origine depuis la commande
 */
export function extractOrigin(order: { origin?: string; notes?: string | null; description?: string | null; reference?: string }): OrderOrigin | string {
  if (order.origin && order.origin.trim()) {
    return order.origin.trim() as OrderOrigin;
  }
  // Recherche de tag [Origine: ...] dans notes ou description
  const combined = `${order.notes || ''} ${order.description || ''}`;
  const match = combined.match(/\[Origine:\s*([^\]]+)\]/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  // Déduction depuis le préfixe
  const ref = order.reference || '';
  if (ref.startsWith('LOC-')) return 'Local';
  if (ref.startsWith('DXB-') || ref.startsWith('DB-')) return 'Dubaï';
  if (ref.startsWith('TR-')) return 'Turquie';
  if (ref.startsWith('CH-')) return 'Chine';
  return 'Chine'; // Défaut
}

/**
 * Encode l'origine dans les notes si la colonne native n'est pas encore présente
 */
export function injectOriginInNotes(notes: string | null | undefined, origin: string): string {
  const cleanNotes = (notes || '').replace(/\[Origine:\s*[^\]]+\]/gi, '').trim();
  const tag = `[Origine: ${origin}]`;
  return cleanNotes ? `${tag} ${cleanNotes}` : tag;
}

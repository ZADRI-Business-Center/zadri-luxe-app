export type PeriodFilter = 'today' | '7days' | 'month' | 'prev_month' | 'custom';

export interface DashboardSummary {
  collected_total: number;
  realized_margin: number;
  has_estimated_margin: boolean;
  sales_count: number;
  sold_units: number;
  discounts_total: number;
  lost_units: number;
  lost_value: number;
}

export interface ChartDataPoint {
  label: string;
  dateKey: string;
  collected_total: number;
  realized_margin: number;
}

export interface OrderRecoveryProgress {
  order_id: string;
  reference: string;
  supplier: string;
  received_date: string | null;
  total_cost: number;
  collected_total: number;
  balance: number;
  remaining_to_recover: number;
  recovery_rate: number;
  expected_profit: number;
  is_recovered: boolean;
}

export interface TopSellingItem {
  item_id: string;
  item_code: string;
  item_name: string;
  photo_url: string | null;
  order_reference: string;
  sold_units: number;
  vendable_units: number;
  stock_units: number;
  sales_revenue: number;
  known_margin: number | null;
  has_known_cost: boolean;
  sell_through_rate: number;
  avg_days_to_sell: number | null;
}

export interface StockOverview {
  total_units: number;
  value_at_cost: number;
  value_at_price: number;
  normal_count: number;
  watch_count: number;
  clearance_count: number;
}

export interface AttentionPoint {
  id: string;
  type: 'order_without_items' | 'item_without_cost' | 'clearance_stock';
  title: string;
  description: string;
  actionUrl: string;
  actionLabel: string;
  severity: 'warning' | 'info' | 'danger';
}

export interface DashboardData {
  summary: DashboardSummary;
  orders: OrderRecoveryProgress[];
  chart: ChartDataPoint[];
  topItems: TopSellingItem[];
  stock: StockOverview;
  attentionPoints: AttentionPoint[];
}

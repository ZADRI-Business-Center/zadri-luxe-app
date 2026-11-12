import { supabase } from './supabase';
import type {
  AttentionPoint,
  ChartDataPoint,
  DashboardData,
  DashboardSummary,
  OrderRecoveryProgress,
  PeriodFilter,
  StockOverview,
  TopSellingItem,
} from '../types/dashboard';

export function getPeriodDates(
  period: PeriodFilter,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } {
  const now = new Date();
  const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

  if (period === 'today') {
    const todayStr = formatYMD(now);
    return { startDate: todayStr, endDate: todayStr, label: "Aujourd'hui" };
  }

  if (period === '7days') {
    const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    return { startDate: formatYMD(start), endDate: formatYMD(now), label: '7 derniers jours' };
  }

  if (period === 'prev_month') {
    const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startDate: formatYMD(firstDayPrev),
      endDate: formatYMD(lastDayPrev),
      label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(firstDayPrev),
    };
  }

  if (period === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd, label: `${customStart} au ${customEnd}` };
  }

  // 'month' (par défaut)
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: formatYMD(firstDay),
    endDate: formatYMD(now),
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(firstDay),
  };
}

/**
 * Récupère l'ensemble des données du tableau de bord selon §9.6
 */
export async function getDashboardData(
  period: PeriodFilter = 'month',
  customStart?: string,
  customEnd?: string,
  chartMode: 'day' | 'month' = 'day'
): Promise<DashboardData> {
  const { startDate, endDate } = getPeriodDates(period, customStart, customEnd);

  // 1. Appel stats_by_day pour la période
  const periodStatsPromise = supabase.rpc('stats_by_day', {
    p_from: startDate,
    p_to: endDate,
  });

  // 2. Commandes (v_order_summary)
  const ordersPromise = supabase
    .from('v_order_summary')
    .select('*')
    .order('order_date', { ascending: false });

  // 3. Meilleures ventes (v_item_summary)
  const itemsPromise = supabase
    .from('v_item_summary')
    .select('*')
    .order('sold_units', { ascending: false })
    .limit(6);

  // 4. Stock & invendus (v_dormant_stock)
  const stockPromise = supabase
    .from('v_dormant_stock')
    .select('*');

  // 5. Graphique (derniers 30 jours ou 12 mois)
  const now = new Date();
  let chartPromise;
  if (chartMode === 'month') {
    const start12m = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);
    chartPromise = supabase.rpc('stats_by_month', {
      p_from: start12m,
      p_to: now.toISOString().slice(0, 10),
    });
  } else {
    const start30d = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    chartPromise = supabase.rpc('stats_by_day', {
      p_from: start30d,
      p_to: now.toISOString().slice(0, 10),
    });
  }

  // 6. Points d'attention : commandes sans articles et articles sans coût
  const ordersWithoutItemsPromise = supabase
    .from('orders')
    .select('id, reference, supplier, items(id)')
    .eq('status', 'received')
    .is('archived_at', null);

  const itemsWithoutCostPromise = supabase
    .from('items')
    .select('id, code, name')
    .is('unit_cost', null)
    .is('archived_at', null);

  const [
    periodStatsRes,
    ordersRes,
    itemsRes,
    stockRes,
    chartRes,
    ordersCheckRes,
    itemsCostCheckRes,
  ] = await Promise.all([
    periodStatsPromise,
    ordersPromise,
    itemsPromise,
    stockPromise,
    chartPromise,
    ordersWithoutItemsPromise,
    itemsWithoutCostPromise,
  ]);

  // Traitement Synthèse Période
  let collected = 0;
  let margin = 0;
  let salesCount = 0;
  let soldUnits = 0;
  let discounts = 0;
  let lostUnits = 0;
  let lostValue = 0;

  (periodStatsRes.data || []).forEach((row: any) => {
    collected += Number(row.collected_total || 0);
    margin += Number(row.realized_margin || 0);
    salesCount += Number(row.sales_count || 0);
    soldUnits += Number(row.sold_units || 0);
    discounts += Number(row.discounts_total || 0);
    lostUnits += Number(row.lost_units || 0);
    lostValue += Number(row.lost_value || 0);
  });

  const summary: DashboardSummary = {
    collected_total: collected,
    realized_margin: margin,
    has_estimated_margin: false, // calculé si des articles vendus ont un coût estimé
    sales_count: salesCount,
    sold_units: soldUnits,
    discounts_total: discounts,
    lost_units: lostUnits,
    lost_value: lostValue,
  };

  // Traitement Commandes
  const orders: OrderRecoveryProgress[] = (ordersRes.data || []).map((row: any) => ({
    order_id: row.order_id,
    reference: row.reference,
    supplier: row.supplier,
    received_date: row.received_date,
    total_cost: Number(row.total_cost || 0),
    collected_total: Number(row.collected_total || 0),
    balance: Number(row.balance || 0),
    remaining_to_recover: Number(row.remaining_to_recover || 0),
    recovery_rate: Number(row.recovery_rate || 0),
    expected_profit: Number(row.expected_profit || 0),
    is_recovered: Boolean(row.is_recovered),
  }));

  // Traitement Graphique
  let chartPoints: ChartDataPoint[] = [];
  if (chartMode === 'month') {
    chartPoints = (chartRes.data || []).map((row: any) => {
      const d = new Date(row.month_start);
      const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d);
      return {
        label,
        dateKey: row.month_start,
        collected_total: Number(row.collected_total || 0),
        realized_margin: Number(row.realized_margin || 0),
      };
    });
  } else {
    chartPoints = (chartRes.data || []).map((row: any) => {
      const d = new Date(row.stat_date);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      return {
        label,
        dateKey: row.stat_date,
        collected_total: Number(row.collected_total || 0),
        realized_margin: Number(row.realized_margin || 0),
      };
    });
  }

  // Traitement Top Ventes
  const topItems: TopSellingItem[] = (itemsRes.data || []).map((row: any) => ({
    item_id: row.item_id,
    item_code: row.item_code,
    item_name: row.item_name,
    photo_url: row.photo_url,
    order_reference: row.order_reference,
    sold_units: Number(row.sold_units || 0),
    vendable_units: Number(row.vendable_units || 0),
    stock_units: Number(row.stock_units || 0),
    sales_revenue: Number(row.sales_revenue || 0),
    known_margin: row.known_margin !== null ? Number(row.known_margin) : null,
    has_known_cost: Boolean(row.has_known_cost),
    sell_through_rate: Number(row.sell_through_rate || 0),
    avg_days_to_sell: row.avg_days_to_sell !== null ? Number(row.avg_days_to_sell) : null,
  }));

  // Traitement Stock
  const stockRows = stockRes.data || [];
  let totalStockUnits = 0;
  let stockCost = 0;
  let stockPrice = 0;
  let normalCount = 0;
  let watchCount = 0;
  let clearanceCount = 0;

  stockRows.forEach((r: any) => {
    const qty = Number(r.stock || 0);
    totalStockUnits += qty;
    stockCost += Number(r.stock_value_at_cost || 0);
    stockPrice += Number(r.stock_value_at_price || 0);
    if (r.dormant_status === 'clearance') clearanceCount += 1;
    else if (r.dormant_status === 'watch') watchCount += 1;
    else normalCount += 1;
  });

  const stock: StockOverview = {
    total_units: totalStockUnits,
    value_at_cost: stockCost,
    value_at_price: stockPrice,
    normal_count: normalCount,
    watch_count: watchCount,
    clearance_count: clearanceCount,
  };

  // Traitement Points d'Attention (§9.6 Point 6)
  const attentionPoints: AttentionPoint[] = [];

  // 1. Commandes reçues sans aucun article
  (ordersCheckRes.data || []).forEach((ord: any) => {
    if (!ord.items || ord.items.length === 0) {
      attentionPoints.push({
        id: `ord_${ord.id}`,
        type: 'order_without_items',
        title: `Commande ${ord.reference} sans articles`,
        description: `Cette commande est marquée reçue mais ne contient encore aucun article saisi.`,
        actionUrl: `/articles/nouveau`,
        actionLabel: 'Saisir les articles',
        severity: 'warning',
      });
    }
  });

  // 2. Invendus urgents à déstocker
  if (clearanceCount > 0) {
    attentionPoints.push({
      id: 'clearance_alert',
      type: 'clearance_stock',
      title: `${clearanceCount} variante(s) à déstocker d'urgence`,
      description: `Ces articles ont dépassé le seuil de rotation critique et immobilisent votre trésorerie.`,
      actionUrl: '/invendus',
      actionLabel: 'Voir les invendus',
      severity: 'danger',
    });
  }

  // 3. Articles sans coût unitaire (information)
  const itemsWithoutCost = itemsCostCheckRes.data || [];
  if (itemsWithoutCost.length > 0) {
    attentionPoints.push({
      id: 'cost_info',
      type: 'item_without_cost',
      title: `${itemsWithoutCost.length} article(s) sans coût unitaire`,
      description: `Le coût et la marge sont estimés au prorata des unités de la commande.`,
      actionUrl: '/articles',
      actionLabel: 'Voir les articles',
      severity: 'info',
    });
  }

  return {
    summary,
    orders,
    chart: chartPoints,
    topItems,
    stock,
    attentionPoints,
  };
}

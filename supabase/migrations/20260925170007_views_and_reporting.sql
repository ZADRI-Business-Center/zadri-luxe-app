-- =============================================================================
-- Migration 008 – Vues de calcul et fonctions de synthèse
-- Projet    : ZADRI Luxe App
-- Références : §7.4, §8 (Règles R1 à R20), §14
-- =============================================================================

-- =============================================================================
-- 1. Vue v_variant_stock
-- Réf : §7.4, R1, R2, R8, R11, R17, R18
-- Calcule le stock par variante, le coût effectif (avec répartition sur vendable),
-- l'ancienneté dans le fuseau configuré et le statut d'invendu.
-- =============================================================================
CREATE OR REPLACE VIEW v_variant_stock
WITH (security_invoker = true)
AS
WITH settings AS (
  SELECT
    watch_after_days,
    clearance_after_days,
    timezone
  FROM app_settings
  LIMIT 1
),
order_cost_calc AS (
  -- R11 : Répartition du coût restant de la commande sur les unités vendables sans coût
  SELECT
    i.order_id,
    o.total_cost,
    coalesce(sum(CASE WHEN i.unit_cost IS NOT NULL THEN i.unit_cost * (v.quantity_received - v.quantity_damaged) ELSE 0 END), 0) AS known_cost,
    coalesce(sum(CASE WHEN i.unit_cost IS NULL THEN (v.quantity_received - v.quantity_damaged) ELSE 0 END), 0) AS uncosted_vendable
  FROM items i
  JOIN variants v ON v.item_id = i.id
  JOIN orders o ON o.id = i.order_id
  WHERE i.archived_at IS NULL AND v.archived_at IS NULL AND o.archived_at IS NULL
  GROUP BY i.order_id, o.total_cost
),
sales_agg AS (
  -- Ventes actives uniquement
  SELECT
    variant_id,
    coalesce(sum(quantity), 0) AS sold_units
  FROM sales
  WHERE status = 'active'
  GROUP BY variant_id
),
losses_agg AS (
  -- Pertes actives uniquement
  SELECT
    variant_id,
    coalesce(sum(quantity), 0) AS lost_units
  FROM losses
  WHERE status = 'active'
  GROUP BY variant_id
)
SELECT
  v.id AS variant_id,
  i.id AS item_id,
  o.id AS order_id,
  o.reference AS order_reference,
  i.code AS item_code,
  i.name AS item_name,
  v.label AS variant_label,
  v.photo_url,
  v.photo_public_id,
  v.quantity_ordered,
  v.quantity_received,
  v.quantity_damaged,
  -- R1 : Vendable = quantité reçue - quantité abîmée
  (v.quantity_received - v.quantity_damaged) AS vendable,
  coalesce(sa.sold_units, 0)::bigint AS sold_units,
  coalesce(la.lost_units, 0)::bigint AS lost_units,
  -- R2 : Stock = vendable - ventes actives - pertes actives
  ((v.quantity_received - v.quantity_damaged) - coalesce(sa.sold_units, 0) - coalesce(la.lost_units, 0))::bigint AS stock,
  -- R8 : Prix effectif de la variante
  coalesce(v.price_override, i.list_price) AS effective_price,
  -- R11 : Coût de revient effectif (unitaire connu ou estimé par répartition)
  CASE
    WHEN i.unit_cost IS NOT NULL THEN i.unit_cost
    WHEN occ.uncosted_vendable > 0 THEN
      round(greatest(0, occ.total_cost - occ.known_cost)::numeric / occ.uncosted_vendable)::bigint
    ELSE 0
  END AS effective_unit_cost,
  -- Indicateur coût estimé
  (i.unit_cost IS NULL) AS cost_is_estimated,
  i.received_date,
  -- R17 : Ancienneté du stock en jours dans le fuseau configuré
  ((now() AT TIME ZONE st.timezone)::date - i.received_date) AS days_in_stock,
  -- R18 : Statut d'invendu
  CASE
    WHEN ((v.quantity_received - v.quantity_damaged) - coalesce(sa.sold_units, 0) - coalesce(la.lost_units, 0)) <= 0 THEN 'out_of_stock'
    WHEN ((now() AT TIME ZONE st.timezone)::date - i.received_date) >= st.clearance_after_days THEN 'clearance'
    WHEN ((now() AT TIME ZONE st.timezone)::date - i.received_date) >= st.watch_after_days THEN 'watch'
    ELSE 'normal'
  END AS dormant_status
FROM variants v
JOIN items i ON i.id = v.item_id
JOIN orders o ON o.id = i.order_id
CROSS JOIN settings st
LEFT JOIN order_cost_calc occ ON occ.order_id = o.id
LEFT JOIN sales_agg sa ON sa.variant_id = v.id
LEFT JOIN losses_agg la ON la.variant_id = v.id
WHERE v.archived_at IS NULL
  AND i.archived_at IS NULL
  AND o.archived_at IS NULL;

COMMENT ON VIEW v_variant_stock IS
  'Stock par variante, coût effectif (R11), ancienneté (R17) et statut d''invendu (R18). Security invoker.';

-- =============================================================================
-- 2. Vue v_sales_detail
-- Réf : §7.4, R10, R11, R12
-- Ventes actives avec remise, coût de revient effectif et marge.
-- =============================================================================
CREATE OR REPLACE VIEW v_sales_detail
WITH (security_invoker = true)
AS
SELECT
  s.id AS sale_id,
  s.variant_id,
  vs.item_id,
  vs.order_id,
  vs.order_reference,
  vs.item_code,
  vs.item_name,
  vs.variant_label,
  s.quantity,
  s.list_price_unit,
  s.sold_total,
  -- R10 : Remise = list_price_unit * quantity - sold_total
  ((s.list_price_unit * s.quantity) - s.sold_total) AS discount,
  -- R11 : Coût de revient unitaire effectif
  vs.effective_unit_cost,
  -- R12 : Marge = sold_total - (coût effectif * quantity)
  (s.sold_total - (vs.effective_unit_cost * s.quantity)) AS margin,
  vs.cost_is_estimated,
  s.channel,
  s.sold_at,
  s.note,
  s.created_by,
  s.created_at
FROM sales s
JOIN v_variant_stock vs ON vs.variant_id = s.variant_id
WHERE s.status = 'active';

COMMENT ON VIEW v_sales_detail IS
  'Détail des ventes actives avec remise (R10), coût effectif (R11) et marge (R12). Security invoker.';

-- =============================================================================
-- 3. Vue v_order_summary
-- Réf : §7.4, R3, R4, R5, R6, R7, R9, R13, R14, R15
-- Indicateurs financiers et de stock par commande.
-- Attention : Solde (R5) et prévu (R9) ne déduisent pas les pertes une 2nde fois.
-- Marge réalisée (R14) déduit les pertes (R13).
-- =============================================================================
CREATE OR REPLACE VIEW v_order_summary
WITH (security_invoker = true)
AS
WITH var_stats AS (
  SELECT
    vs.order_id,
    coalesce(sum(vs.vendable), 0)::bigint AS total_vendable,
    coalesce(sum(vs.sold_units), 0)::bigint AS total_sold_units,
    coalesce(sum(vs.lost_units), 0)::bigint AS total_lost_units,
    coalesce(sum(vs.stock), 0)::bigint AS total_stock,
    coalesce(sum(vs.stock * vs.effective_price), 0)::bigint AS stock_value_at_price,
    coalesce(sum(vs.stock * vs.effective_unit_cost), 0)::bigint AS stock_value_at_cost
  FROM v_variant_stock vs
  GROUP BY vs.order_id
),
sales_stats AS (
  SELECT
    sd.order_id,
    coalesce(sum(sd.sold_total), 0)::bigint AS total_collected,
    coalesce(sum(sd.discount), 0)::bigint AS total_discounts,
    coalesce(sum(sd.margin), 0)::bigint AS total_sales_margin,
    count(distinct sd.sale_id)::bigint AS total_sales_count
  FROM v_sales_detail sd
  GROUP BY sd.order_id
),
losses_stats AS (
  SELECT
    vs.order_id,
    coalesce(sum(l.quantity * vs.effective_unit_cost), 0)::bigint AS total_lost_value
  FROM losses l
  JOIN v_variant_stock vs ON vs.variant_id = l.variant_id
  WHERE l.status = 'active'
  GROUP BY vs.order_id
)
SELECT
  o.id AS order_id,
  o.reference,
  o.order_date,
  o.supplier,
  o.status,
  o.received_date,
  o.weight_kg,
  -- R3 : Coût total de la commande
  o.total_cost,
  -- R4 : Encaissé total
  coalesce(ss.total_collected, 0)::bigint AS collected_total,
  -- R5 : Solde de la commande (négatif tant que non récupérée)
  (coalesce(ss.total_collected, 0) - o.total_cost)::bigint AS balance,
  -- R6 : Reste à récupérer (seuil de rentabilité)
  greatest(0, o.total_cost - coalesce(ss.total_collected, 0))::bigint AS remaining_to_recover,
  -- R7 : Taux de récupération (en pourcentage, max 100 %)
  CASE
    WHEN o.total_cost > 0 THEN
      least(100.0, round((coalesce(ss.total_collected, 0)::numeric / o.total_cost) * 100, 2))
    ELSE 100.0
  END AS recovery_rate,
  -- R9 : Bénéfice prévu = encaissé + stock au prix - coût total (sans déduire pertes deux fois)
  (coalesce(ss.total_collected, 0) + coalesce(vs.stock_value_at_price, 0) - o.total_cost)::bigint AS expected_profit,
  -- R14 : Marge réalisée = marges des ventes - valeur des pertes
  (coalesce(ss.total_sales_margin, 0) - coalesce(ls.total_lost_value, 0))::bigint AS realized_margin,
  -- R15 : Taux d'écoulement = vendus / vendables
  CASE
    WHEN coalesce(vs.total_vendable, 0) > 0 THEN
      round((coalesce(vs.total_sold_units, 0)::numeric / vs.total_vendable) * 100, 2)
    ELSE 0.0
  END AS sell_through_rate,
  -- Quantités et valeurs de stock
  coalesce(vs.total_vendable, 0)::bigint AS vendable_units,
  coalesce(vs.total_sold_units, 0)::bigint AS sold_units,
  coalesce(vs.total_stock, 0)::bigint AS stock_units,
  -- R13 : Unités perdues et leur valeur
  coalesce(vs.total_lost_units, 0)::bigint AS lost_units,
  coalesce(ls.total_lost_value, 0)::bigint AS lost_value,
  -- Valeurs du stock
  coalesce(vs.stock_value_at_price, 0)::bigint AS stock_value_at_price,
  coalesce(vs.stock_value_at_cost, 0)::bigint AS stock_value_at_cost,
  -- Remises accordées
  coalesce(ss.total_discounts, 0)::bigint AS total_discounts,
  coalesce(ss.total_sales_count, 0)::bigint AS sales_count,
  -- Statut de récupération
  (coalesce(ss.total_collected, 0) >= o.total_cost) AS is_recovered
FROM orders o
LEFT JOIN var_stats vs ON vs.order_id = o.id
LEFT JOIN sales_stats ss ON ss.order_id = o.id
LEFT JOIN losses_stats ls ON ls.order_id = o.id
WHERE o.archived_at IS NULL;

COMMENT ON VIEW v_order_summary IS
  'Synthèse financière et d''écoulement par commande (R3 à R9, R13 à R15). Security invoker.';

-- =============================================================================
-- 4. Vue v_item_summary
-- Réf : §7.4, R15, R16, R20
-- Ventes, chiffre d'affaires, marge (si coût connu) et vitesse d'écoulement par article.
-- =============================================================================
CREATE OR REPLACE VIEW v_item_summary
WITH (security_invoker = true)
AS
WITH item_vars AS (
  SELECT
    vs.item_id,
    coalesce(sum(vs.vendable), 0)::bigint AS vendable_units,
    coalesce(sum(vs.stock), 0)::bigint AS stock_units
  FROM v_variant_stock vs
  GROUP BY vs.item_id
),
item_sales AS (
  SELECT
    sd.item_id,
    count(distinct sd.sale_id)::bigint AS sales_count,
    coalesce(sum(sd.quantity), 0)::bigint AS sold_units,
    coalesce(sum(sd.sold_total), 0)::bigint AS sales_revenue,
    -- R16 : Jours moyens d'écoulement = Σ (quantité * (date de vente - date de réception)) / Σ quantité
    CASE
      WHEN sum(sd.quantity) > 0 THEN
        round(sum(sd.quantity * (sd.sold_at::date - i.received_date))::numeric / sum(sd.quantity), 1)
      ELSE NULL
    END AS avg_days_to_sell
  FROM v_sales_detail sd
  JOIN items i ON i.id = sd.item_id
  GROUP BY sd.item_id, i.received_date
)
SELECT
  i.id AS item_id,
  i.order_id,
  o.reference AS order_reference,
  i.category_id,
  c.name AS category_name,
  i.code AS item_code,
  i.name AS item_name,
  i.photo_url,
  i.list_price,
  i.initial_price,
  i.unit_cost,
  i.received_date,
  coalesce(iv.vendable_units, 0)::bigint AS vendable_units,
  coalesce(isales.sold_units, 0)::bigint AS sold_units,
  coalesce(iv.stock_units, 0)::bigint AS stock_units,
  coalesce(isales.sales_count, 0)::bigint AS sales_count,
  coalesce(isales.sales_revenue, 0)::bigint AS sales_revenue,
  -- R20 : Marge d'un article = affichée UNIQUEMENT si unit_cost est renseigné
  CASE
    WHEN i.unit_cost IS NOT NULL THEN
      (coalesce(isales.sales_revenue, 0) - (i.unit_cost * coalesce(isales.sold_units, 0)))::bigint
    ELSE NULL
  END AS known_margin,
  (i.unit_cost IS NOT NULL) AS has_known_cost,
  -- R15 : Taux d'écoulement
  CASE
    WHEN coalesce(iv.vendable_units, 0) > 0 THEN
      round((coalesce(isales.sold_units, 0)::numeric / iv.vendable_units) * 100, 2)
    ELSE 0.0
  END AS sell_through_rate,
  -- R16 : Jours moyens d'écoulement
  isales.avg_days_to_sell
FROM items i
JOIN orders o ON o.id = i.order_id
LEFT JOIN categories c ON c.id = i.category_id
LEFT JOIN item_vars iv ON iv.item_id = i.id
LEFT JOIN item_sales isales ON isales.item_id = i.id
WHERE i.archived_at IS NULL
  AND o.archived_at IS NULL;

COMMENT ON VIEW v_item_summary IS
  'Synthèse par article : ventes, CA, marge connue (R20), vitesse d''écoulement (R15, R16). Security invoker.';

-- =============================================================================
-- 5. Vue v_dormant_stock
-- Réf : §7.4, R17, R18, R19
-- Variantes en stock (> 0) triées par ancienneté décroissante avec valeur immobilisée.
-- =============================================================================
CREATE OR REPLACE VIEW v_dormant_stock
WITH (security_invoker = true)
AS
SELECT
  vs.variant_id,
  vs.item_id,
  vs.order_id,
  vs.order_reference,
  vs.item_code,
  vs.item_name,
  vs.variant_label,
  vs.photo_url,
  vs.photo_public_id,
  vs.received_date,
  vs.days_in_stock,
  vs.dormant_status,
  vs.stock,
  vs.effective_price,
  vs.effective_unit_cost,
  vs.cost_is_estimated,
  -- R19 : Valeur immobilisée au coût et au prix
  (vs.stock * vs.effective_unit_cost)::bigint AS stock_value_at_cost,
  (vs.stock * vs.effective_price)::bigint AS stock_value_at_price
FROM v_variant_stock vs
WHERE vs.stock > 0
ORDER BY vs.days_in_stock DESC, vs.received_date ASC;

COMMENT ON VIEW v_dormant_stock IS
  'Stock dormant (> 0) trié par ancienneté avec statuts et valeurs immobilisées (R19). Security invoker.';

-- =============================================================================
-- 6. Fonctions stats_by_day et stats_by_month
-- Réf : §7.4, §9.6
-- Statistiques agrégées par jour et par mois dans le fuseau horaire configuré.
-- =============================================================================

CREATE OR REPLACE FUNCTION stats_by_day(
  p_from date,
  p_to   date
)
RETURNS TABLE (
  stat_date       date,
  collected_total bigint,
  realized_margin bigint,
  discounts_total bigint,
  lost_value      bigint,
  sales_count     bigint,
  sold_units      bigint,
  lost_units      bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tz text;
BEGIN
  SELECT timezone INTO v_tz FROM app_settings LIMIT 1;
  v_tz := coalesce(v_tz, 'UTC');

  RETURN QUERY
  WITH day_series AS (
    SELECT generate_series(p_from, p_to, '1 day'::interval)::date AS d
  ),
  daily_sales AS (
    SELECT
      (sd.sold_at AT TIME ZONE v_tz)::date AS sale_date,
      coalesce(sum(sd.sold_total), 0)::bigint AS collected,
      coalesce(sum(sd.margin), 0)::bigint AS margin,
      coalesce(sum(sd.discount), 0)::bigint AS discounts,
      count(distinct sd.sale_id)::bigint AS s_count,
      coalesce(sum(sd.quantity), 0)::bigint AS s_units
    FROM v_sales_detail sd
    WHERE (sd.sold_at AT TIME ZONE v_tz)::date >= p_from
      AND (sd.sold_at AT TIME ZONE v_tz)::date <= p_to
    GROUP BY (sd.sold_at AT TIME ZONE v_tz)::date
  ),
  daily_losses AS (
    SELECT
      l.occurred_on AS loss_date,
      coalesce(sum(l.quantity), 0)::bigint AS l_units,
      coalesce(sum(l.quantity * vs.effective_unit_cost), 0)::bigint AS l_value
    FROM losses l
    JOIN v_variant_stock vs ON vs.variant_id = l.variant_id
    WHERE l.status = 'active'
      AND l.occurred_on >= p_from
      AND l.occurred_on <= p_to
    GROUP BY l.occurred_on
  )
  SELECT
    ds.d AS stat_date,
    coalesce(dsales.collected, 0)::bigint AS collected_total,
    (coalesce(dsales.margin, 0) - coalesce(dlosses.l_value, 0))::bigint AS realized_margin,
    coalesce(dsales.discounts, 0)::bigint AS discounts_total,
    coalesce(dlosses.l_value, 0)::bigint AS lost_value,
    coalesce(dsales.s_count, 0)::bigint AS sales_count,
    coalesce(dsales.s_units, 0)::bigint AS sold_units,
    coalesce(dlosses.l_units, 0)::bigint AS lost_units
  FROM day_series ds
  LEFT JOIN daily_sales dsales ON dsales.sale_date = ds.d
  LEFT JOIN daily_losses dlosses ON dlosses.loss_date = ds.d
  ORDER BY ds.d ASC;
END;
$$;

COMMENT ON FUNCTION stats_by_day(date, date) IS
  'Statistiques quotidiennes dans le fuseau configuré (encaissé, marge, remises, pertes).';

CREATE OR REPLACE FUNCTION stats_by_month(
  p_from date,
  p_to   date
)
RETURNS TABLE (
  stat_month      text,
  month_start     date,
  collected_total bigint,
  realized_margin bigint,
  discounts_total bigint,
  lost_value      bigint,
  sales_count     bigint,
  sold_units      bigint,
  lost_units      bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tz text;
BEGIN
  SELECT timezone INTO v_tz FROM app_settings LIMIT 1;
  v_tz := coalesce(v_tz, 'UTC');

  RETURN QUERY
  WITH month_series AS (
    SELECT generate_series(
      date_trunc('month', p_from::timestamp),
      date_trunc('month', p_to::timestamp),
      '1 month'::interval
    )::date AS m_start
  ),
  monthly_sales AS (
    SELECT
      date_trunc('month', (sd.sold_at AT TIME ZONE v_tz))::date AS s_month,
      coalesce(sum(sd.sold_total), 0)::bigint AS collected,
      coalesce(sum(sd.margin), 0)::bigint AS margin,
      coalesce(sum(sd.discount), 0)::bigint AS discounts,
      count(distinct sd.sale_id)::bigint AS s_count,
      coalesce(sum(sd.quantity), 0)::bigint AS s_units
    FROM v_sales_detail sd
    WHERE (sd.sold_at AT TIME ZONE v_tz)::date >= p_from
      AND (sd.sold_at AT TIME ZONE v_tz)::date <= p_to
    GROUP BY date_trunc('month', (sd.sold_at AT TIME ZONE v_tz))::date
  ),
  monthly_losses AS (
    SELECT
      date_trunc('month', l.occurred_on::timestamp)::date AS l_month,
      coalesce(sum(l.quantity), 0)::bigint AS l_units,
      coalesce(sum(l.quantity * vs.effective_unit_cost), 0)::bigint AS l_value
    FROM losses l
    JOIN v_variant_stock vs ON vs.variant_id = l.variant_id
    WHERE l.status = 'active'
      AND l.occurred_on >= p_from
      AND l.occurred_on <= p_to
    GROUP BY date_trunc('month', l.occurred_on::timestamp)::date
  )
  SELECT
    to_char(ms.m_start, 'YYYY-MM') AS stat_month,
    ms.m_start AS month_start,
    coalesce(msales.collected, 0)::bigint AS collected_total,
    (coalesce(msales.margin, 0) - coalesce(mlosses.l_value, 0))::bigint AS realized_margin,
    coalesce(msales.discounts, 0)::bigint AS discounts_total,
    coalesce(mlosses.l_value, 0)::bigint AS lost_value,
    coalesce(msales.s_count, 0)::bigint AS sales_count,
    coalesce(msales.s_units, 0)::bigint AS sold_units,
    coalesce(mlosses.l_units, 0)::bigint AS lost_units
  FROM month_series ms
  LEFT JOIN monthly_sales msales ON msales.s_month = ms.m_start
  LEFT JOIN monthly_losses mlosses ON mlosses.l_month = ms.m_start
  ORDER BY ms.m_start ASC;
END;
$$;

COMMENT ON FUNCTION stats_by_month(date, date) IS
  'Statistiques mensuelles dans le fuseau configuré (encaissé, marge, remises, pertes).';

-- =============================================================================
-- Privilèges d'accès pour authenticated et service_role
-- =============================================================================
GRANT SELECT ON
  v_variant_stock,
  v_sales_detail,
  v_order_summary,
  v_item_summary,
  v_dormant_stock
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION stats_by_day(date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION stats_by_month(date, date) TO authenticated, service_role;

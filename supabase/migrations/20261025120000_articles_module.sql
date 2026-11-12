-- =============================================================================
-- Migration 010 – Module Articles et variantes (étape 6)
-- Projet    : ZADRI Luxe App
-- Référence : §9.3 du cahier des charges V1
-- =============================================================================

-- Vue dédiée au catalogue : tous les calculs de stock et de marge restent en base.
CREATE OR REPLACE VIEW v_item_catalog
WITH (security_invoker = true)
AS
WITH variant_totals AS (
  SELECT
    vs.item_id,
    count(*)::bigint AS variants_count,
    coalesce(sum(vs.vendable), 0)::bigint AS vendable_units,
    coalesce(sum(vs.sold_units), 0)::bigint AS sold_units,
    coalesce(sum(vs.stock), 0)::bigint AS stock_units,
    CASE max(
      CASE vs.dormant_status
        WHEN 'clearance' THEN 3
        WHEN 'watch' THEN 2
        WHEN 'normal' THEN 1
        ELSE 0
      END
    )
      WHEN 3 THEN 'clearance'
      WHEN 2 THEN 'watch'
      WHEN 1 THEN 'normal'
      ELSE 'out_of_stock'
    END AS dormant_status
  FROM v_variant_stock vs
  GROUP BY vs.item_id
)
SELECT
  i.id AS item_id,
  i.code AS item_code,
  i.order_id,
  o.reference AS order_reference,
  o.supplier,
  i.category_id,
  c.name AS category_name,
  i.name AS item_name,
  i.description,
  i.photo_url,
  i.photo_public_id,
  i.list_price,
  i.initial_price,
  i.unit_cost,
  CASE
    WHEN i.unit_cost IS NOT NULL THEN (i.list_price - i.unit_cost)::bigint
    ELSE NULL
  END AS unit_margin,
  i.received_date,
  i.archived_at,
  i.created_at,
  i.updated_at,
  coalesce(vt.variants_count, 0)::bigint AS variants_count,
  coalesce(vt.vendable_units, 0)::bigint AS vendable_units,
  coalesce(vt.sold_units, 0)::bigint AS sold_units,
  coalesce(vt.stock_units, 0)::bigint AS stock_units,
  coalesce(vt.dormant_status, 'out_of_stock') AS dormant_status
FROM items i
JOIN orders o ON o.id = i.order_id
LEFT JOIN categories c ON c.id = i.category_id
LEFT JOIN variant_totals vt ON vt.item_id = i.id
WHERE o.archived_at IS NULL;

COMMENT ON VIEW v_item_catalog IS
  'Catalogue des articles avec stock, ventes, marge unitaire connue et statut d''ancienneté calculés en base.';

GRANT SELECT ON v_item_catalog TO authenticated, service_role;

-- Mise à jour atomique d'un article et de ses variantes.
-- Les variantes existantes ne sont jamais supprimées par cette fonction.
CREATE OR REPLACE FUNCTION update_item_with_variants(
  p_item_id         uuid,
  p_name            text,
  p_list_price      bigint,
  p_unit_cost       bigint DEFAULT NULL,
  p_category_id     uuid   DEFAULT NULL,
  p_description     text   DEFAULT NULL,
  p_photo_url       text   DEFAULT NULL,
  p_photo_public_id text   DEFAULT NULL,
  p_variants        jsonb  DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_item            items%ROWTYPE;
  v_variant         variants%ROWTYPE;
  v_elem            jsonb;
  v_variant_id      uuid;
  v_label           text;
  v_quantity_ordered int;
  v_quantity_received int;
  v_quantity_damaged int;
  v_price_override  bigint;
  v_has_override    boolean;
  v_old_effective_price bigint;
  v_new_effective_price bigint;
  v_change_type     text;
  v_updated_ids     uuid[] := '{}';
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Le nom de l''article est obligatoire.';
  END IF;

  IF p_list_price IS NULL OR p_list_price < 0 THEN
    RAISE EXCEPTION 'Le prix fixé doit être un entier positif ou nul.';
  END IF;

  IF p_unit_cost IS NOT NULL AND p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Le coût unitaire ne peut pas être négatif.';
  END IF;

  IF p_variants IS NULL OR jsonb_typeof(p_variants) <> 'array' OR jsonb_array_length(p_variants) = 0 THEN
    RAISE EXCEPTION 'Au moins une variante est obligatoire.';
  END IF;

  SELECT * INTO v_item
  FROM items
  WHERE id = p_item_id AND archived_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article introuvable ou archivé.';
  END IF;

  -- Autorise les changements de prix uniquement pendant cette transaction.
  PERFORM set_config('app.allow_price_change', 'on', true);

  UPDATE items
  SET
    name = trim(p_name),
    category_id = p_category_id,
    description = nullif(trim(coalesce(p_description, '')), ''),
    photo_url = p_photo_url,
    photo_public_id = p_photo_public_id,
    list_price = p_list_price,
    unit_cost = p_unit_cost,
    updated_at = now()
  WHERE id = p_item_id;

  IF v_item.list_price IS DISTINCT FROM p_list_price THEN
    INSERT INTO price_changes (
      item_id, variant_id, old_price, new_price, change_type, note, changed_by
    ) VALUES (
      p_item_id,
      NULL,
      v_item.list_price,
      p_list_price,
      CASE WHEN p_list_price < v_item.list_price THEN 'markdown' ELSE 'increase' END,
      'Modification de la fiche article',
      auth.uid()
    );
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_variants)
  LOOP
    v_label := coalesce(nullif(trim(v_elem ->> 'label'), ''), 'Unique');
    v_quantity_received := coalesce((v_elem ->> 'quantity_received')::int, 0);
    v_quantity_damaged := coalesce((v_elem ->> 'quantity_damaged')::int, 0);
    v_quantity_ordered := nullif(v_elem ->> 'quantity_ordered', '')::int;
    v_has_override := v_elem ? 'price_override' AND (v_elem ->> 'price_override') IS NOT NULL;
    v_price_override := CASE WHEN v_has_override THEN (v_elem ->> 'price_override')::bigint ELSE NULL END;

    IF v_quantity_received < 0 OR v_quantity_damaged < 0 THEN
      RAISE EXCEPTION 'Les quantités de la variante "%" ne peuvent pas être négatives.', v_label;
    END IF;

    IF v_quantity_damaged > v_quantity_received THEN
      RAISE EXCEPTION 'La quantité abîmée ne peut pas dépasser la quantité reçue pour la variante "%".', v_label;
    END IF;

    IF v_quantity_ordered IS NOT NULL AND v_quantity_ordered < 0 THEN
      RAISE EXCEPTION 'La quantité commandée de la variante "%" ne peut pas être négative.', v_label;
    END IF;

    IF v_price_override IS NOT NULL AND v_price_override < 0 THEN
      RAISE EXCEPTION 'Le prix spécifique de la variante "%" ne peut pas être négatif.', v_label;
    END IF;

    v_variant_id := nullif(v_elem ->> 'id', '')::uuid;

    IF v_variant_id IS NULL THEN
      INSERT INTO variants (
        item_id,
        label,
        photo_url,
        photo_public_id,
        price_override,
        quantity_ordered,
        quantity_received,
        quantity_damaged,
        created_by
      ) VALUES (
        p_item_id,
        v_label,
        nullif(v_elem ->> 'photo_url', ''),
        nullif(v_elem ->> 'photo_public_id', ''),
        v_price_override,
        v_quantity_ordered,
        v_quantity_received,
        v_quantity_damaged,
        auth.uid()
      ) RETURNING id INTO v_variant_id;

      IF v_price_override IS NOT NULL THEN
        INSERT INTO price_changes (
          item_id, variant_id, old_price, new_price, change_type, note, changed_by
        ) VALUES (
          p_item_id, v_variant_id, NULL, v_price_override, 'initial',
          'Prix spécifique initial de la variante', auth.uid()
        );
      END IF;
    ELSE
      SELECT * INTO v_variant
      FROM variants
      WHERE id = v_variant_id
        AND item_id = p_item_id
        AND archived_at IS NULL
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Une variante à modifier est introuvable pour cet article.';
      END IF;

      v_old_effective_price := coalesce(v_variant.price_override, v_item.list_price);
      v_new_effective_price := coalesce(v_price_override, p_list_price);

      UPDATE variants
      SET
        label = v_label,
        photo_url = nullif(v_elem ->> 'photo_url', ''),
        photo_public_id = nullif(v_elem ->> 'photo_public_id', ''),
        price_override = v_price_override,
        quantity_ordered = v_quantity_ordered,
        quantity_received = v_quantity_received,
        quantity_damaged = v_quantity_damaged,
        updated_at = now()
      WHERE id = v_variant_id;

      IF v_variant.price_override IS DISTINCT FROM v_price_override
         AND v_old_effective_price IS DISTINCT FROM v_new_effective_price THEN
        v_change_type := CASE
          WHEN v_new_effective_price < v_old_effective_price THEN 'markdown'
          ELSE 'increase'
        END;

        INSERT INTO price_changes (
          item_id, variant_id, old_price, new_price, change_type, note, changed_by
        ) VALUES (
          p_item_id, v_variant_id, v_old_effective_price, v_new_effective_price,
          v_change_type, 'Modification de la fiche article', auth.uid()
        );
      END IF;
    END IF;

    v_updated_ids := array_append(v_updated_ids, v_variant_id);
  END LOOP;

  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'variant_ids', to_jsonb(v_updated_ids)
  );
END;
$$;

COMMENT ON FUNCTION update_item_with_variants(uuid, text, bigint, bigint, uuid, text, text, text, jsonb) IS
  'Met à jour un article et ses variantes dans une transaction, avec contrôles de stock et historique des prix.';

REVOKE EXECUTE ON FUNCTION update_item_with_variants(uuid, text, bigint, bigint, uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_item_with_variants(uuid, text, bigint, bigint, uuid, text, text, text, jsonb) TO authenticated;

-- Archivage logique d'un article. Les données et l'audit sont conservés.
CREATE OR REPLACE FUNCTION archive_item(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE items
  SET archived_at = now(), updated_at = now()
  WHERE id = p_item_id AND archived_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article introuvable ou déjà archivé.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION archive_item(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION archive_item(uuid) TO authenticated;

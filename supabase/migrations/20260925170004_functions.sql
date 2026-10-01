-- =============================================================================
-- Migration 005 – Fonctions RPC (opérations atomiques)
-- Projet    : ZADRI Luxe App
-- Référence : §7.3 du cahier des charges V1
-- =============================================================================

-- =============================================================================
-- 1. create_sale
-- Enregistre une vente de façon atomique avec verrouillage de la variante.
-- Vérifie que la commande est 'received', que le stock est suffisant,
-- fige le prix fixé unitaire dans list_price_unit, et insère la vente.
-- =============================================================================
CREATE OR REPLACE FUNCTION create_sale(
  p_id            uuid,
  p_variant_id    uuid,
  p_quantity      int,
  p_sold_total    bigint,
  p_channel       text        DEFAULT NULL,
  p_sold_at       timestamptz DEFAULT now(),
  p_note          text        DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_sale_id         uuid;
  v_order_status    text;
  v_item_list_price bigint;
  v_var_price_ovr   bigint;
  v_qty_received    int;
  v_qty_damaged     int;
  v_sold            bigint;
  v_lost            bigint;
  v_vendable        bigint;
  v_stock           bigint;
  v_unit_list_price bigint;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'La quantité vendue doit être strictement positive.';
  END IF;

  IF p_sold_total IS NULL OR p_sold_total <= 0 THEN
    RAISE EXCEPTION 'Le montant encaissé doit être strictement positif.';
  END IF;

  IF p_channel IS NOT NULL AND p_channel NOT IN ('facebook', 'whatsapp', 'direct', 'other') THEN
    RAISE EXCEPTION 'Canal de vente invalide : %.', p_channel;
  END IF;

  -- Verrouillage FOR UPDATE de la variante pour éviter toute vente concurrente du même stock
  SELECT
    o.status,
    i.list_price,
    v.price_override,
    v.quantity_received,
    v.quantity_damaged
  INTO
    v_order_status,
    v_item_list_price,
    v_var_price_ovr,
    v_qty_received,
    v_qty_damaged
  FROM variants v
  JOIN items i ON i.id = v.item_id
  JOIN orders o ON o.id = i.order_id
  WHERE v.id = p_variant_id
  FOR UPDATE OF v;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variante introuvable.';
  END IF;

  -- Règle : Vente refusée si la commande n'est pas reçue (§7.3 / Cas limite 2)
  IF v_order_status <> 'received' THEN
    RAISE EXCEPTION 'Vente impossible : la commande associée n''est pas encore reçue.';
  END IF;

  -- Calcul du stock disponible (R1 & R2)
  v_vendable := v_qty_received - v_qty_damaged;

  SELECT coalesce(sum(quantity), 0)
  INTO v_sold
  FROM sales
  WHERE variant_id = p_variant_id AND status = 'active';

  SELECT coalesce(sum(quantity), 0)
  INTO v_lost
  FROM losses
  WHERE variant_id = p_variant_id AND status = 'active';

  v_stock := v_vendable - v_sold - v_lost;

  IF v_stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuffisant : % pièce(s) disponible(s), % demandée(s).', v_stock, p_quantity;
  END IF;

  -- Prix effectif unitaire au moment de la vente (R8)
  v_unit_list_price := coalesce(v_var_price_ovr, v_item_list_price);
  v_sale_id := coalesce(p_id, gen_random_uuid());

  INSERT INTO sales (
    id,
    variant_id,
    quantity,
    list_price_unit,
    sold_total,
    channel,
    sold_at,
    note,
    status,
    created_by
  ) VALUES (
    v_sale_id,
    p_variant_id,
    p_quantity,
    v_unit_list_price,
    p_sold_total,
    p_channel,
    coalesce(p_sold_at, now()),
    p_note,
    'active',
    auth.uid()
  );

  RETURN v_sale_id;
END;
$$;

COMMENT ON FUNCTION create_sale(uuid, uuid, int, bigint, text, timestamptz, text) IS
  'Crée une vente de manière atomique avec verrouillage FOR UPDATE et contrôle strict du stock disponible.';

-- =============================================================================
-- 2. cancel_sale
-- Annule une vente avec motif obligatoire et non vide (§7.3 / Cas limite 4).
-- =============================================================================
CREATE OR REPLACE FUNCTION cancel_sale(
  p_id     uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_status text;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Le motif d''annulation est obligatoire.';
  END IF;

  SELECT status INTO v_status
  FROM sales
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vente introuvable.';
  END IF;

  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cette vente est déjà annulée.';
  END IF;

  UPDATE sales
  SET
    status        = 'cancelled',
    cancelled_at  = now(),
    cancelled_by  = auth.uid(),
    cancel_reason = trim(p_reason),
    updated_at    = now()
  WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION cancel_sale(uuid, text) IS
  'Annule une vente de manière irréversible avec motif obligatoire. Le stock est restitué automatiquement.';

-- =============================================================================
-- 3. create_loss
-- Sortie en perte d''articles (abîmé après réception, offert, perdu, etc.).
-- =============================================================================
CREATE OR REPLACE FUNCTION create_loss(
  p_id          uuid,
  p_variant_id  uuid,
  p_quantity    int,
  p_reason      text,
  p_occurred_on date DEFAULT CURRENT_DATE,
  p_note        text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_loss_id      uuid;
  v_qty_received int;
  v_qty_damaged  int;
  v_sold         bigint;
  v_lost         bigint;
  v_vendable     bigint;
  v_stock        bigint;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'La quantité sortie en perte doit être strictement positive.';
  END IF;

  IF p_reason IS NULL OR p_reason NOT IN ('damaged', 'unsellable', 'gift', 'lost', 'other') THEN
    RAISE EXCEPTION 'Motif de perte invalide : %.', p_reason;
  END IF;

  SELECT quantity_received, quantity_damaged
  INTO v_qty_received, v_qty_damaged
  FROM variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variante introuvable.';
  END IF;

  v_vendable := v_qty_received - v_qty_damaged;

  SELECT coalesce(sum(quantity), 0)
  INTO v_sold
  FROM sales
  WHERE variant_id = p_variant_id AND status = 'active';

  SELECT coalesce(sum(quantity), 0)
  INTO v_lost
  FROM losses
  WHERE variant_id = p_variant_id AND status = 'active';

  v_stock := v_vendable - v_sold - v_lost;

  IF v_stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuffisant pour enregistrer cette perte : % disponible(s), % demandée(s).',
      v_stock, p_quantity;
  END IF;

  v_loss_id := coalesce(p_id, gen_random_uuid());

  INSERT INTO losses (
    id,
    variant_id,
    quantity,
    reason,
    occurred_on,
    note,
    status,
    created_by
  ) VALUES (
    v_loss_id,
    p_variant_id,
    p_quantity,
    p_reason,
    coalesce(p_occurred_on, CURRENT_DATE),
    p_note,
    'active',
    auth.uid()
  );

  RETURN v_loss_id;
END;
$$;

COMMENT ON FUNCTION create_loss(uuid, uuid, int, text, date, text) IS
  'Enregistre une sortie en perte après vérification du stock disponible.';

-- =============================================================================
-- 4. cancel_loss
-- Annule une sortie en perte avec motif obligatoire.
-- =============================================================================
CREATE OR REPLACE FUNCTION cancel_loss(
  p_id     uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_status text;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Le motif d''annulation de la perte est obligatoire.';
  END IF;

  SELECT status INTO v_status
  FROM losses
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perte introuvable.';
  END IF;

  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cette sortie en perte est déjà annulée.';
  END IF;

  UPDATE losses
  SET
    status        = 'cancelled',
    cancelled_at  = now(),
    cancelled_by  = auth.uid(),
    cancel_reason = trim(p_reason),
    updated_at    = now()
  WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION cancel_loss(uuid, text) IS
  'Annule une sortie en perte avec motif obligatoire. Restitue le stock.';

-- =============================================================================
-- 5. change_price
-- Met à jour le prix d'un article ou d'une variante et consigne l'historique
-- dans price_changes (type = markdown si baisse, increase si hausse).
-- =============================================================================
CREATE OR REPLACE FUNCTION change_price(
  p_item_id    uuid,
  p_variant_id uuid    DEFAULT NULL,
  p_new_price  bigint  DEFAULT NULL,
  p_note       text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_old_price   bigint;
  v_change_type text;
BEGIN
  IF p_new_price IS NULL OR p_new_price < 0 THEN
    RAISE EXCEPTION 'Le nouveau prix doit être un entier positif ou nul.';
  END IF;

  -- Déverrouillage éphémère de la modification de prix pour la transaction courante (B7)
  PERFORM set_config('app.allow_price_change', 'on', true);

  IF p_variant_id IS NOT NULL THEN
    -- Cas d'une variante spécifique : vérification d'existence, appartenance et verrouillage (Point 1)
    SELECT coalesce(v.price_override, i.list_price)
    INTO v_old_price
    FROM variants v
    JOIN items i ON i.id = v.item_id
    WHERE v.id = p_variant_id AND v.item_id = p_item_id
    FOR UPDATE OF v;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variante introuvable pour cet article.';
    END IF;

    -- Contrôle du prix identique (Point mineur)
    IF p_new_price = v_old_price THEN
      RAISE EXCEPTION 'Le nouveau prix (%) est identique au prix actuel.', p_new_price;
    ELSIF p_new_price < v_old_price THEN
      v_change_type := 'markdown';
    ELSE
      v_change_type := 'increase';
    END IF;

    UPDATE variants
    SET price_override = p_new_price,
        updated_at     = now()
    WHERE id = p_variant_id;

    INSERT INTO price_changes (
      item_id,
      variant_id,
      old_price,
      new_price,
      change_type,
      note,
      changed_by
    ) VALUES (
      p_item_id,
      p_variant_id,
      v_old_price,
      p_new_price,
      v_change_type,
      p_note,
      auth.uid()
    );

  ELSE
    -- Cas de l'article global
    SELECT list_price
    INTO v_old_price
    FROM items
    WHERE id = p_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Article introuvable.';
    END IF;

    -- Contrôle du prix identique (Point mineur)
    IF p_new_price = v_old_price THEN
      RAISE EXCEPTION 'Le nouveau prix (%) est identique au prix actuel.', p_new_price;
    ELSIF p_new_price < v_old_price THEN
      v_change_type := 'markdown';
    ELSE
      v_change_type := 'increase';
    END IF;

    UPDATE items
    SET list_price = p_new_price,
        updated_at = now()
    WHERE id = p_item_id;

    INSERT INTO price_changes (
      item_id,
      variant_id,
      old_price,
      new_price,
      change_type,
      note,
      changed_by
    ) VALUES (
      p_item_id,
      NULL,
      v_old_price,
      p_new_price,
      v_change_type,
      p_note,
      auth.uid()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION change_price(uuid, uuid, bigint, text) IS
  'Modifie le prix d''un article ou d''une variante et consigne la modification dans price_changes.';

-- =============================================================================
-- 6. create_item_with_variants
-- Crée un article et ses variantes en une transaction atomique (§7.3).
-- Exige au moins une variante avec sa quantité reçue (Point 3).
-- Commande d'origine obligatoirement reçue (Point 2).
-- =============================================================================
CREATE OR REPLACE FUNCTION create_item_with_variants(
  p_order_id        uuid,
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
  v_item_id         uuid;
  v_item_code       text;
  v_order_status    text;
  v_received_date   date;
  v_var_elem        jsonb;
  v_var_id          uuid;
  v_var_label       text;
  v_var_rec         int;
  v_var_dam         int;
  v_var_ord         int;
  v_var_ovr         bigint;
  v_var_photo_url   text;
  v_var_photo_pid   text;
  v_created_var_ids uuid[] := '{}';
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

  -- Vérification de la commande d'origine et statut 'received' requis (Point 2)
  SELECT status, received_date
  INTO v_order_status, v_received_date
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande d''origine introuvable.';
  END IF;

  IF v_order_status <> 'received' OR v_received_date IS NULL THEN
    RAISE EXCEPTION 'Impossible de créer un article : la commande n''est pas encore reçue.';
  END IF;

  -- Au moins une variante avec sa quantité reçue est obligatoire (Point 3)
  IF p_variants IS NULL OR jsonb_array_length(p_variants) = 0 THEN
    RAISE EXCEPTION 'Au moins une variante avec sa quantité reçue est obligatoire.';
  END IF;

  -- Création de l'article (initial_price = list_price)
  v_item_id := gen_random_uuid();

  INSERT INTO items (
    id,
    order_id,
    category_id,
    name,
    description,
    photo_url,
    photo_public_id,
    list_price,
    initial_price,
    unit_cost,
    received_date,
    created_by
  ) VALUES (
    v_item_id,
    p_order_id,
    p_category_id,
    trim(p_name),
    p_description,
    p_photo_url,
    p_photo_public_id,
    p_list_price,
    p_list_price,
    p_unit_cost,
    v_received_date,
    auth.uid()
  )
  RETURNING code INTO v_item_code;

  -- Enregistrement du prix initial dans price_changes (§7.2)
  INSERT INTO price_changes (
    item_id,
    variant_id,
    old_price,
    new_price,
    change_type,
    note,
    changed_by
  ) VALUES (
    v_item_id,
    NULL,
    NULL,
    p_list_price,
    'initial',
    'Création de l''article',
    auth.uid()
  );

  -- Création des variantes fournies
  FOR v_var_elem IN SELECT * FROM jsonb_array_elements(p_variants)
  LOOP
    v_var_label     := coalesce(v_var_elem ->> 'label', 'Unique');
    v_var_rec       := coalesce((v_var_elem ->> 'quantity_received')::int, 0);
    v_var_dam       := coalesce((v_var_elem ->> 'quantity_damaged')::int, 0);
    v_var_ord       := (v_var_elem ->> 'quantity_ordered')::int;
    v_var_ovr       := (v_var_elem ->> 'price_override')::bigint;
    v_var_photo_url := v_var_elem ->> 'photo_url';
    v_var_photo_pid := v_var_elem ->> 'photo_public_id';

    IF v_var_rec < 0 THEN
      RAISE EXCEPTION 'La quantité reçue pour la variante "%" ne peut pas être négative.', v_var_label;
    END IF;

    IF v_var_dam < 0 THEN
      RAISE EXCEPTION 'La quantité abîmée pour la variante "%" ne peut pas être négative.', v_var_label;
    END IF;

    IF v_var_dam > v_var_rec THEN
      RAISE EXCEPTION 'La quantité abîmée (%) ne peut pas dépasser la quantité reçue (%) pour la variante "%".',
        v_var_dam, v_var_rec, v_var_label;
    END IF;

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
      v_item_id,
      v_var_label,
      v_var_photo_url,
      v_var_photo_pid,
      v_var_ovr,
      v_var_ord,
      v_var_rec,
      v_var_dam,
      auth.uid()
    )
    RETURNING id INTO v_var_id;

    v_created_var_ids := array_append(v_created_var_ids, v_var_id);

    IF v_var_ovr IS NOT NULL THEN
      INSERT INTO price_changes (
        item_id,
        variant_id,
        old_price,
        new_price,
        change_type,
        note,
        changed_by
      ) VALUES (
        v_item_id,
        v_var_id,
        NULL,
        v_var_ovr,
        'initial',
        'Prix spécifique initial de la variante',
        auth.uid()
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'item_id', v_item_id,
    'code', v_item_code,
    'variant_ids', to_jsonb(v_created_var_ids)
  );
END;
$$;

COMMENT ON FUNCTION create_item_with_variants(uuid, text, bigint, bigint, uuid, text, text, text, jsonb) IS
  'Crée un article et ses variantes en une seule transaction atomique. Contrat : exige au moins une variante avec sa quantité reçue.';

-- =============================================================================
-- Droits d'exécution des fonctions RPC (§5 / Point 5)
-- Les fonctions ne doivent être exécutables que par les utilisateurs authentifiés.
-- =============================================================================
REVOKE EXECUTE ON FUNCTION create_sale(uuid, uuid, int, bigint, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_sale(uuid, uuid, int, bigint, text, timestamptz, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION cancel_sale(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_sale(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION create_loss(uuid, uuid, int, text, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_loss(uuid, uuid, int, text, date, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION cancel_loss(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_loss(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION change_price(uuid, uuid, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_price(uuid, uuid, bigint, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION create_item_with_variants(uuid, text, bigint, bigint, uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_item_with_variants(uuid, text, bigint, bigint, uuid, text, text, text, jsonb) TO authenticated;

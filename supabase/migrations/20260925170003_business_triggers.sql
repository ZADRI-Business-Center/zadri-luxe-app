-- =============================================================================
-- Migration 004 – Triggers de contraintes métier
-- Projet    : ZADRI Luxe App
-- Références : §7.2, §7.3, §14 + Décisions B7 & B8
-- =============================================================================

-- =============================================================================
-- Choix technique B7 : Protection contre la modification directe des prix
-- =============================================================================
-- Choix retenu : Utilisation d'un trigger BEFORE UPDATE vérifiant une variable
-- de session transactionnelle (`app.allow_price_change = 'on'`).
-- Cette variable n'est activée de manière éphémère (`set_config(..., true)`)
-- que par la fonction RPC `change_price()` ou lors de la création initiale.
-- Tout UPDATE direct sur `items.list_price` ou `variants.price_override`
-- en dehors de cette fonction lève une exception claire en français.
-- =============================================================================

-- ─── 1. Immuabilité de items.initial_price & protection de items.list_price ──
CREATE OR REPLACE FUNCTION fn_items_before_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Immuabilité absolue du prix initial fixé à la création (§7.2)
  IF OLD.initial_price IS DISTINCT FROM NEW.initial_price THEN
    RAISE EXCEPTION 'Le prix initial d''un article est immuable.';
  END IF;

  -- Protection contre modification directe de list_price (B7)
  IF OLD.list_price IS DISTINCT FROM NEW.list_price THEN
    IF coalesce(current_setting('app.allow_price_change', true), 'off') <> 'on' THEN
      RAISE EXCEPTION 'Modification directe du prix interdite. Utilisez la fonction change_price().';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_items_before_update ON items;
CREATE TRIGGER trg_items_before_update
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION fn_items_before_update();

-- ─── 2. Protection price_override & non-régression du stock sur variants ───────
CREATE OR REPLACE FUNCTION fn_variants_before_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_sold bigint;
  v_lost bigint;
  v_new_vendable bigint;
BEGIN
  -- Protection contre modification directe de price_override (B7)
  IF OLD.price_override IS DISTINCT FROM NEW.price_override THEN
    IF coalesce(current_setting('app.allow_price_change', true), 'off') <> 'on' THEN
      RAISE EXCEPTION 'Modification directe du prix de variante interdite. Utilisez la fonction change_price().';
    END IF;
  END IF;

  -- Décision B8 : Empêcher toute baisse de stock rendant le solde disponible négatif
  -- Formule validée : quantity_received - quantity_damaged >= Σ(ventes actives) + Σ(pertes actives)
  IF (OLD.quantity_received IS DISTINCT FROM NEW.quantity_received)
     OR (OLD.quantity_damaged IS DISTINCT FROM NEW.quantity_damaged) THEN

    SELECT coalesce(sum(quantity), 0)
    INTO v_sold
    FROM sales
    WHERE variant_id = NEW.id AND status = 'active';

    SELECT coalesce(sum(quantity), 0)
    INTO v_lost
    FROM losses
    WHERE variant_id = NEW.id AND status = 'active';

    v_new_vendable := NEW.quantity_received - NEW.quantity_damaged;

    IF v_new_vendable < (v_sold + v_lost) THEN
      RAISE EXCEPTION 'Stock insuffisant : la quantité vendable (%) ne peut pas être inférieure aux unités déjà vendues (%) et perdues (%).',
        v_new_vendable, v_sold, v_lost;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_variants_before_update ON variants;
CREATE TRIGGER trg_variants_before_update
  BEFORE UPDATE ON variants
  FOR EACH ROW
  EXECUTE FUNCTION fn_variants_before_update();

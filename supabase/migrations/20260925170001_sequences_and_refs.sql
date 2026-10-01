-- =============================================================================
-- Migration 002 – Séquences et références automatiques
-- Projet    : ZADRI Luxe App
-- Référence : §7.2 (orders.reference, items.code) + Décisions B1 & B2
-- =============================================================================

-- Séquence pour les commandes : CH-001, CH-002, ..., CH-999, CH-1000...
CREATE SEQUENCE IF NOT EXISTS order_reference_seq START WITH 1 INCREMENT BY 1;

-- Séquence pour les articles : ART-0001, ART-0002, ..., ART-9999, ART-10000...
CREATE SEQUENCE IF NOT EXISTS item_code_seq START WITH 1 INCREMENT BY 1;

-- ─── Trigger automatique pour orders.reference ───────────────────────────────
CREATE OR REPLACE FUNCTION fn_generate_order_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_num bigint;
BEGIN
  IF NEW.reference IS NULL OR trim(NEW.reference) = '' THEN
    v_num := nextval('order_reference_seq');
    IF v_num < 1000 THEN
      NEW.reference := 'CH-' || lpad(v_num::text, 3, '0');
    ELSE
      NEW.reference := 'CH-' || v_num::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_reference ON orders;
CREATE TRIGGER trg_orders_reference
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_generate_order_reference();

COMMENT ON FUNCTION fn_generate_order_reference() IS
  'Génère automatiquement la référence CH-001 (LPAD adaptatif sans troncature).';

-- ─── Trigger automatique pour items.code ─────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_generate_item_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_num bigint;
BEGIN
  IF NEW.code IS NULL OR trim(NEW.code) = '' THEN
    v_num := nextval('item_code_seq');
    IF v_num < 10000 THEN
      NEW.code := 'ART-' || lpad(v_num::text, 4, '0');
    ELSE
      NEW.code := 'ART-' || v_num::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_items_code ON items;
CREATE TRIGGER trg_items_code
  BEFORE INSERT ON items
  FOR EACH ROW
  EXECUTE FUNCTION fn_generate_item_code();

COMMENT ON FUNCTION fn_generate_item_code() IS
  'Génère automatiquement le code article ART-0001 (LPAD adaptatif sans troncature).';

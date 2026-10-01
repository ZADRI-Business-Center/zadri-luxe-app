-- =============================================================================
-- Migration 003 – Trigger d'audit inviolable
-- Projet    : ZADRI Luxe App
-- Référence : §7.5 + Décision B5 & B6
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec_id uuid;
  v_old_json jsonb;
  v_new_json jsonb;
  v_changed_fields text[] := '{}';
  v_key text;
  v_old_val jsonb;
  v_new_val jsonb;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'app_settings' THEN
      v_rec_id := '00000000-0000-0000-0000-000000000001'::uuid;
    ELSE
      v_rec_id := NEW.id;
    END IF;

    v_new_json := to_jsonb(NEW);

    INSERT INTO audit_log (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      changed_fields,
      changed_by,
      changed_at
    ) VALUES (
      TG_TABLE_NAME,
      v_rec_id,
      'INSERT',
      NULL,
      v_new_json,
      NULL,
      v_user_id,
      now()
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'app_settings' THEN
      v_rec_id := '00000000-0000-0000-0000-000000000001'::uuid;
    ELSE
      v_rec_id := NEW.id;
    END IF;

    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);

    -- Identification des champs modifiés en excluant les colonnes techniques
    FOR v_key IN SELECT jsonb_object_keys(v_new_json)
    LOOP
      IF v_key NOT IN ('updated_at', 'created_at', 'created_by') THEN
        v_old_val := v_old_json -> v_key;
        v_new_val := v_new_json -> v_key;
        IF v_old_val IS DISTINCT FROM v_new_val THEN
          v_changed_fields := array_append(v_changed_fields, v_key);
        END IF;
      END IF;
    END LOOP;

    -- Si seuls des champs techniques ont changé, on ne génère pas de bruit dans l'audit
    IF cardinality(v_changed_fields) > 0 THEN
      INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_fields,
        changed_by,
        changed_at
      ) VALUES (
        TG_TABLE_NAME,
        v_rec_id,
        'UPDATE',
        v_old_json,
        v_new_json,
        v_changed_fields,
        v_user_id,
        now()
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION fn_audit_trigger() IS
  'Trigger générique d''audit (§7.5). Snapshot complet old/new en JSONB, exclusion des colonnes techniques de changed_fields (B5).';

-- Attachement du trigger aux 7 tables spécifiées au §7.5
DROP TRIGGER IF EXISTS trg_audit_orders ON orders;
CREATE TRIGGER trg_audit_orders
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_items ON items;
CREATE TRIGGER trg_audit_items
  AFTER INSERT OR UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_variants ON variants;
CREATE TRIGGER trg_audit_variants
  AFTER INSERT OR UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_sales ON sales;
CREATE TRIGGER trg_audit_sales
  AFTER INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_losses ON losses;
CREATE TRIGGER trg_audit_losses
  AFTER INSERT OR UPDATE ON losses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_categories ON categories;
CREATE TRIGGER trg_audit_categories
  AFTER INSERT OR UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_app_settings ON app_settings;
CREATE TRIGGER trg_audit_app_settings
  AFTER INSERT OR UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

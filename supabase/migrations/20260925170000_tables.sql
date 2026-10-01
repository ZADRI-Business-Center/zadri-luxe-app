-- =============================================================================
-- Migration 001 – Tables de base
-- Projet    : ZADRI Luxe App
-- Référence : §7.2 du cahier des charges V1
-- =============================================================================
-- Ordre de création respectant les dépendances FK :
--   profiles -> app_settings -> categories -> orders -> items -> variants
--   -> sales -> losses -> price_changes -> audit_log
-- =============================================================================

-- ─── Fonction utilitaire : horodatage automatique de updated_at ───────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_set_updated_at() IS
  'Trigger générique : positionne updated_at = now() avant chaque UPDATE.';

-- =============================================================================
-- profiles
-- Liste blanche des utilisateurs autorisés (miroir de auth.users).
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text        NOT NULL,
  role       text        NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  profiles      IS 'Liste blanche des utilisateurs autorisés. §5.';
COMMENT ON COLUMN profiles.role IS 'Rôle utilisateur. Valeur unique V1 : admin. Prépare la V3.';

-- =============================================================================
-- app_settings
-- Paramètres globaux – exactement une ligne garantie par la PK booléenne.
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id                   boolean     PRIMARY KEY DEFAULT true CHECK (id),
  watch_after_days     int         NOT NULL DEFAULT 30,
  clearance_after_days int         NOT NULL DEFAULT 60,
  timezone             text        NOT NULL DEFAULT 'UTC',
  updated_at           timestamptz,
  updated_by           uuid        REFERENCES auth.users(id),
  CONSTRAINT chk_clearance_gt_watch
    CHECK (clearance_after_days > watch_after_days)
);

COMMENT ON TABLE  app_settings                      IS 'Paramètres globaux. Contient exactement une ligne (PK = true). §7.2.';
COMMENT ON COLUMN app_settings.watch_after_days     IS 'Jours avant passage au statut « À surveiller » (R18).';
COMMENT ON COLUMN app_settings.clearance_after_days IS 'Jours avant passage au statut « À déstocker » (R18).';
COMMENT ON COLUMN app_settings.timezone             IS 'Fuseau IANA pour les regroupements jour/mois des statistiques. §7.1 / R17.';

INSERT INTO app_settings (id, watch_after_days, clearance_after_days, timezone)
VALUES (true, 30, 60, 'UTC')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- categories
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_ci ON categories (lower(name));

COMMENT ON TABLE  categories      IS 'Catégories d''articles. Nom unique insensible à la casse (B4).';
COMMENT ON COLUMN categories.name IS 'Nom affiché. Unicité garantie via index fonctionnel sur lower(name).';

-- =============================================================================
-- orders (commandes Chine)
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       text           UNIQUE NOT NULL,
  order_date      date           NOT NULL DEFAULT CURRENT_DATE,
  supplier        text           NOT NULL,
  description     text,
  status          text           NOT NULL DEFAULT 'ordered'
                  CHECK (status IN ('ordered', 'shipping', 'received')),
  purchase_amount bigint         NOT NULL CHECK (purchase_amount >= 0),
  forwarder_fee   bigint         NOT NULL DEFAULT 0 CHECK (forwarder_fee >= 0),
  weight_kg       numeric(10,2),
  received_date   date,
  total_cost      bigint         GENERATED ALWAYS AS (purchase_amount + forwarder_fee) STORED,
  notes           text,
  archived_at     timestamptz,
  created_by      uuid           DEFAULT auth.uid(),
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT chk_received_needs_date
    CHECK (status <> 'received' OR received_date IS NOT NULL)
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE  orders                IS 'Commandes passées en Chine. Unité financière de base. §7.2 / §9.2.';
COMMENT ON COLUMN orders.reference      IS 'Référence unique auto-générée (CH-001…).';
COMMENT ON COLUMN orders.total_cost     IS 'GENERATED STORED : purchase_amount + forwarder_fee. R3.';
COMMENT ON COLUMN orders.received_date  IS 'Obligatoire si status = received. Point de départ de l''ancienneté des articles. R17.';

-- =============================================================================
-- items (articles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        UNIQUE NOT NULL,
  order_id        uuid        NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  category_id     uuid        REFERENCES categories(id),
  name            text        NOT NULL,
  description     text,
  photo_url       text,
  photo_public_id text,
  list_price      bigint      NOT NULL CHECK (list_price >= 0),
  initial_price   bigint      NOT NULL CHECK (initial_price >= 0),
  unit_cost       bigint      CHECK (unit_cost >= 0),
  received_date   date        NOT NULL,
  archived_at     timestamptz,
  created_by      uuid        DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_order_id    ON items (order_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items (category_id);

DROP TRIGGER IF EXISTS trg_items_updated_at ON items;
CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE  items                IS 'Articles vendus, rattachés à une commande Chine. §7.2 / §9.3.';
COMMENT ON COLUMN items.list_price     IS 'Prix fixé actuel. R8.';
COMMENT ON COLUMN items.initial_price  IS 'Prix à la création, immuable.';
COMMENT ON COLUMN items.unit_cost      IS 'Coût unitaire facultatif. Si NULL -> estimé par répartition (R11).';
COMMENT ON COLUMN items.received_date  IS 'Date de réception copiée de la commande. Base pour R17.';

-- =============================================================================
-- variants (déclinaisons d'article)
-- =============================================================================
CREATE TABLE IF NOT EXISTS variants (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           uuid        NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  label             text        NOT NULL DEFAULT 'Unique',
  photo_url         text,
  photo_public_id   text,
  price_override    bigint      CHECK (price_override >= 0),
  quantity_ordered  int CHECK (quantity_ordered IS NULL OR quantity_ordered >= 0),
  quantity_received int         NOT NULL CHECK (quantity_received >= 0),
  quantity_damaged  int         NOT NULL DEFAULT 0 CHECK (quantity_damaged >= 0),
  archived_at       timestamptz,
  created_by        uuid        DEFAULT auth.uid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_damaged_lte_received
    CHECK (quantity_damaged <= quantity_received)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_variants_item_label_ci ON variants (item_id, lower(label));
CREATE INDEX IF NOT EXISTS idx_variants_item_id ON variants (item_id);

DROP TRIGGER IF EXISTS trg_variants_updated_at ON variants;
CREATE TRIGGER trg_variants_updated_at
  BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE  variants                  IS 'Déclinaisons d''articles. Stock calculé par variante. §6 / §7.2.';
COMMENT ON COLUMN variants.label            IS 'Libellé libre. Unicité par article insensible à la casse (B3).';
COMMENT ON COLUMN variants.price_override   IS 'Prix spécifique à la variante. Si NULL -> hérite de items.list_price.';
COMMENT ON COLUMN variants.quantity_damaged IS 'Quantité abîmée constatée à la réception.';

-- =============================================================================
-- sales (ventes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id       uuid        NOT NULL REFERENCES variants(id),
  quantity         int         NOT NULL CHECK (quantity > 0),
  list_price_unit  bigint      NOT NULL CHECK (list_price_unit >= 0),
  sold_total       bigint      NOT NULL CHECK (sold_total > 0),
  channel          text        CHECK (channel IN ('facebook', 'whatsapp', 'direct', 'other')),
  sold_at          timestamptz NOT NULL DEFAULT now(),
  note             text,
  status           text        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'cancelled')),
  cancelled_at     timestamptz,
  cancelled_by     uuid,
  cancel_reason    text,
  created_by       uuid        DEFAULT auth.uid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sale_cancel_fields
    CHECK (
      status <> 'cancelled'
      OR (
            cancelled_at   IS NOT NULL
        AND cancelled_by   IS NOT NULL
        AND cancel_reason  IS NOT NULL
        AND trim(cancel_reason) <> ''
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_sales_variant_id ON sales (variant_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at    ON sales (sold_at);
CREATE INDEX IF NOT EXISTS idx_sales_status     ON sales (status);

DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE  sales                 IS 'Ventes enregistrées. Jamais de DELETE ; annulation uniquement. §7.2 / §9.4.';
COMMENT ON COLUMN sales.list_price_unit IS 'Instantané du prix fixé unitaire au moment de la vente.';
COMMENT ON COLUMN sales.sold_total      IS 'Montant total encaissé en FCFA.';

-- =============================================================================
-- losses (sorties en perte)
-- =============================================================================
CREATE TABLE IF NOT EXISTS losses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id    uuid        NOT NULL REFERENCES variants(id),
  quantity      int         NOT NULL CHECK (quantity > 0),
  reason        text        NOT NULL
                CHECK (reason IN ('damaged', 'unsellable', 'gift', 'lost', 'other')),
  occurred_on   date        NOT NULL DEFAULT CURRENT_DATE,
  note          text,
  status        text        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'cancelled')),
  cancelled_at  timestamptz,
  cancelled_by  uuid,
  cancel_reason text,
  created_by    uuid        DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_loss_cancel_fields
    CHECK (
      status <> 'cancelled'
      OR (
            cancelled_at   IS NOT NULL
        AND cancelled_by   IS NOT NULL
        AND cancel_reason  IS NOT NULL
        AND trim(cancel_reason) <> ''
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_losses_variant_id ON losses (variant_id);
CREATE INDEX IF NOT EXISTS idx_losses_status     ON losses (status);

DROP TRIGGER IF EXISTS trg_losses_updated_at ON losses;
CREATE TRIGGER trg_losses_updated_at
  BEFORE UPDATE ON losses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE losses IS 'Sorties en perte post-réception. §7.2 / §9.5.';

-- =============================================================================
-- price_changes (décotes et historique des prix)
-- =============================================================================
CREATE TABLE IF NOT EXISTS price_changes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid        NOT NULL REFERENCES items(id),
  variant_id  uuid        REFERENCES variants(id),
  old_price   bigint,
  new_price   bigint      NOT NULL CHECK (new_price >= 0),
  change_type text        NOT NULL CHECK (change_type IN ('initial', 'markdown', 'increase')),
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid        DEFAULT auth.uid(),
  note        text
);

CREATE INDEX IF NOT EXISTS idx_price_changes_item_id    ON price_changes (item_id);
CREATE INDEX IF NOT EXISTS idx_price_changes_variant_id ON price_changes (variant_id);
CREATE INDEX IF NOT EXISTS idx_price_changes_changed_at ON price_changes (changed_at);

COMMENT ON TABLE price_changes IS 'Historique des changements de prix. §7.2.';

-- =============================================================================
-- audit_log (journal inviolable en ajout seul)
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name     text        NOT NULL,
  record_id      uuid        NOT NULL,
  action         text        NOT NULL CHECK (action IN ('INSERT', 'UPDATE')),
  old_data       jsonb,
  new_data       jsonb,
  changed_fields text[],
  changed_by     uuid,
  changed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at   ON audit_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by   ON audit_log (changed_by);

COMMENT ON TABLE audit_log IS 'Journal d''audit inviolable. INSERT seul. §7.5.';

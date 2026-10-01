-- =============================================================================
-- Migration 006 – Politiques de sécurité RLS et permissions
-- Projet    : ZADRI Luxe App
-- Références : §5, §7.6, §9.1 du cahier des charges V1
-- =============================================================================

-- =============================================================================
-- 1. Fonction utilitaire : Liste blanche via profiles
-- Définie en SECURITY DEFINER pour éviter toute récursion RLS lors de la
-- vérification d'existence de l'utilisateur dans la table profiles.
-- =============================================================================
CREATE OR REPLACE FUNCTION is_authorized_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());
$$;

COMMENT ON FUNCTION is_authorized_user() IS
  'Vérifie si auth.uid() est présent dans la table profiles (liste blanche). Exécuté en SECURITY DEFINER pour contourner la RLS sur profiles.';

REVOKE EXECUTE ON FUNCTION is_authorized_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_authorized_user() TO authenticated;

-- =============================================================================
-- 2. Activation et renforcement de RLS sur toutes les tables
-- ENABLE + FORCE ROW LEVEL SECURITY garantit que même le propriétaire de table
-- ou les rôles délégués respectent la RLS lors des accès applicatifs.
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings FORCE ROW LEVEL SECURITY;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE items FORCE ROW LEVEL SECURITY;

ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants FORCE ROW LEVEL SECURITY;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;

ALTER TABLE losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE losses FORCE ROW LEVEL SECURITY;

ALTER TABLE price_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_changes FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. Politiques RLS par table
-- =============================================================================

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Seul le SELECT est autorisé pour les utilisateurs autorisés.
-- Gestion manuelle (création/modification) depuis le dashboard Supabase en V1.
CREATE POLICY "profiles_select_authorized"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_authorized_user());

-- ─── app_settings ────────────────────────────────────────────────────────────
-- SELECT et UPDATE autorisés si l'utilisateur est dans la liste blanche.
-- Pas d'INSERT ni DELETE (ligne unique pré-initialisée).
CREATE POLICY "app_settings_select_authorized"
  ON app_settings FOR SELECT
  TO authenticated
  USING (is_authorized_user());

CREATE POLICY "app_settings_update_authorized"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (is_authorized_user())
  WITH CHECK (is_authorized_user());

-- ─── categories ──────────────────────────────────────────────────────────────
-- SELECT, INSERT, UPDATE autorisés. Pas de DELETE (§7.6).
CREATE POLICY "categories_select_authorized"
  ON categories FOR SELECT
  TO authenticated
  USING (is_authorized_user());

CREATE POLICY "categories_insert_authorized"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_user());

CREATE POLICY "categories_update_authorized"
  ON categories FOR UPDATE
  TO authenticated
  USING (is_authorized_user())
  WITH CHECK (is_authorized_user());

-- ─── orders ──────────────────────────────────────────────────────────────────
-- SELECT, INSERT, UPDATE autorisés. Pas de DELETE (§7.6 : archivage uniquement).
CREATE POLICY "orders_select_authorized"
  ON orders FOR SELECT
  TO authenticated
  USING (is_authorized_user());

CREATE POLICY "orders_insert_authorized"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_user());

CREATE POLICY "orders_update_authorized"
  ON orders FOR UPDATE
  TO authenticated
  USING (is_authorized_user())
  WITH CHECK (is_authorized_user());

-- ─── items ───────────────────────────────────────────────────────────────────
-- SELECT, INSERT, UPDATE autorisés. Pas de DELETE (§7.6 : archivage uniquement).
CREATE POLICY "items_select_authorized"
  ON items FOR SELECT
  TO authenticated
  USING (is_authorized_user());

CREATE POLICY "items_insert_authorized"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_user());

CREATE POLICY "items_update_authorized"
  ON items FOR UPDATE
  TO authenticated
  USING (is_authorized_user())
  WITH CHECK (is_authorized_user());

-- ─── variants ────────────────────────────────────────────────────────────────
-- SELECT, INSERT, UPDATE autorisés. Pas de DELETE.
CREATE POLICY "variants_select_authorized"
  ON variants FOR SELECT
  TO authenticated
  USING (is_authorized_user());

CREATE POLICY "variants_insert_authorized"
  ON variants FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_user());

CREATE POLICY "variants_update_authorized"
  ON variants FOR UPDATE
  TO authenticated
  USING (is_authorized_user())
  WITH CHECK (is_authorized_user());

-- ─── sales ───────────────────────────────────────────────────────────────────
-- SELECT, INSERT et UPDATE autorisés (pour cancel_sale et corrections tracées).
-- Pas de DELETE : les ventes ne sont jamais supprimées (§7.2, §7.6).
CREATE POLICY "sales_select_authorized"
  ON sales FOR SELECT
  TO authenticated
  USING (is_authorized_user());

CREATE POLICY "sales_insert_authorized"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_user());

CREATE POLICY "sales_update_authorized"
  ON sales FOR UPDATE
  TO authenticated
  USING (is_authorized_user())
  WITH CHECK (is_authorized_user());

-- ─── losses ──────────────────────────────────────────────────────────────────
-- SELECT, INSERT et UPDATE autorisés (pour cancel_loss). Pas de DELETE.
CREATE POLICY "losses_select_authorized"
  ON losses FOR SELECT
  TO authenticated
  USING (is_authorized_user());

CREATE POLICY "losses_insert_authorized"
  ON losses FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_user());

CREATE POLICY "losses_update_authorized"
  ON losses FOR UPDATE
  TO authenticated
  USING (is_authorized_user())
  WITH CHECK (is_authorized_user());

-- ─── price_changes ───────────────────────────────────────────────────────────
-- SELECT et INSERT autorisés (alimentée par change_price et create_item).
-- Jamais d'UPDATE ni de DELETE (§7.2 : immuable après écriture).
CREATE POLICY "price_changes_select_authorized"
  ON price_changes FOR SELECT
  TO authenticated
  USING (is_authorized_user());

CREATE POLICY "price_changes_insert_authorized"
  ON price_changes FOR INSERT
  TO authenticated
  WITH CHECK (is_authorized_user());

-- ─── audit_log ───────────────────────────────────────────────────────────────
-- SELECT uniquement.
-- Aucun INSERT/UPDATE/DELETE pour les rôles clients. Seul le trigger fn_audit_trigger
-- (SECURITY DEFINER) insère des traces dans la même transaction (§7.5, §7.6).
CREATE POLICY "audit_log_select_authorized"
  ON audit_log FOR SELECT
  TO authenticated
  USING (is_authorized_user());

-- =============================================================================
-- 4. Droits de table SQL (GRANT / REVOKE)
-- Complément indispensable des policies pour les rôles Supabase
-- =============================================================================

-- Révocation de tout accès préalable par défaut pour anon et public
REVOKE ALL ON profiles, app_settings, categories, orders, items, variants, sales, losses, price_changes, audit_log FROM anon, public;

-- Lecture accordée à authenticated sur toutes les tables
GRANT SELECT ON profiles, app_settings, categories, orders, items, variants, sales, losses, price_changes, audit_log TO authenticated;

-- Écriture accordée à authenticated sur les tables applicatives (sans DELETE)
GRANT INSERT, UPDATE ON categories, orders, items, variants, sales, losses TO authenticated;

-- INSERT seul sur price_changes (aucun UPDATE/DELETE accordé)
GRANT INSERT ON price_changes TO authenticated;

-- UPDATE sur app_settings (aucun INSERT/DELETE accordé)
GRANT UPDATE ON app_settings TO authenticated;

-- Droits d'usage sur les séquences pour authenticated
GRANT USAGE, SELECT ON SEQUENCE order_reference_seq, item_code_seq TO authenticated;

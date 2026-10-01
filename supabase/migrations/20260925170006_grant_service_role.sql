-- =============================================================================
-- Migration 007 – Rétablissement des privilèges pour service_role
-- Projet    : ZADRI Luxe App
-- Références : §5, §7.6 (Permissions administrateur / backend)
-- =============================================================================

-- =============================================================================
-- Explication technique :
-- Dans PostgreSQL, le rôle 'service_role' possède l'attribut BYPASSRLS, ce qui
-- lui permet d'ignorer les règles Row Level Security (policies).
-- Cependant, BYPASSRLS ne dispense pas des privilèges SQL de table (DCL).
-- Lors du `REVOKE ALL ... FROM public` dans la migration précédente,
-- 'service_role' a perdu l'accès hérité de 'public'.
-- Cette migration accorde explicitement les privilèges complets à 'service_role'.
-- =============================================================================

-- Droits complets sur toutes les tables pour service_role
GRANT ALL ON
  profiles,
  app_settings,
  categories,
  orders,
  items,
  variants,
  sales,
  losses,
  price_changes,
  audit_log
TO service_role;

-- Droits complets sur les séquences pour service_role
GRANT ALL ON SEQUENCE
  order_reference_seq,
  item_code_seq
TO service_role;

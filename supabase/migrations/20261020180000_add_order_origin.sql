-- =============================================================================
-- Migration 009 – Ajout de l'origine/provenance sur les commandes
-- Projet    : ZADRI Luxe App
-- Référence : Prise en compte multi-provenance (Chine, Local, Dubaï, Turquie...)
-- =============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'Chine';

COMMENT ON COLUMN orders.origin IS
  'Provenance de la commande : Chine, Local, Dubaï, Turquie, Autre...';

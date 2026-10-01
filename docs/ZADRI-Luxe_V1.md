# ZADRI Luxe App — Cahier des charges V1

| | |
|---|---|
| **Version** | 1.0 (brouillon à valider) |
| **Date** | 23/09/2026 |
| **Périmètre** | V1 : le socle (commandes, articles, ventes, stock, invendus, dashboard, historique) |
| **Documents liés** | `ZADRI-Luxe_V2-V3_feuille-de-route.md` |

---

## 0. Comment utiliser ce document avec une IA de développement

1. Donner **ce document en entier** en contexte au début de chaque session.
2. Travailler **par étapes** (voir §15). Ne jamais demander « construis toute l'app » d'un coup.
3. Toujours commencer par la **base de données** (migrations SQL, sécurité RLS, fonctions, vues) et la valider avec le **jeu de test du §14** avant d'écrire la moindre interface.
4. Règles à imposer à l'IA :
   - Ne pas ajouter de fonctionnalité hors du périmètre du §2.1.
   - Ne pas inventer de règle de calcul. Si une règle est ambiguë, **poser la question** et la noter au §17.
   - **Toute la logique métier vit dans la base** (contraintes, triggers, fonctions, vues). L'interface affiche, elle ne recalcule pas les bénéfices ni le stock.
   - Identifiants de code (tables, colonnes, variables) en **anglais** ; interface utilisateur en **français**.
   - Montants en **entiers** (FCFA, sans centimes).
5. Un prompt de démarrage prêt à l'emploi se trouve en **annexe A**.

---

## 1. Contexte et objectifs

### 1.1 Le business

ZADRI Luxe vend des articles de mode et d'accessoires (montres, bracelets, lunettes…). Le cycle est le suivant :

1. Commande d'articles en Chine, payée en amont.
2. Un **transitaire** récupère la marchandise et l'expédie, facturé **au poids**. Il gère tout le reste (dédouanement, etc.).
3. Réception de la marchandise : l'entreprise **calcule elle-même ses coûts** et **fixe les prix de vente**.
4. Publication des articles et vente (Facebook, WhatsApp, vente directe). La publicité Facebook est payante (elle entre en V2).

### 1.2 Objectif de la V1

Suivre, pour chaque commande de Chine, **l'argent investi, l'argent récupéré, le stock restant et le bénéfice**, avec une saisie minimale et des calculs entièrement automatiques.

### 1.3 Questions auxquelles l'app doit répondre

- Combien m'a coûté cette commande, combien ai-je déjà récupéré, combien reste-t-il à encaisser pour rentrer dans mes frais ?
- Quel bénéfice ai-je réalisé aujourd'hui, ce mois-ci, sur cette commande ?
- Quels articles et variantes se vendent le plus, et à quelle vitesse ?
- Combien reste-t-il en stock, quelle valeur est immobilisée, quels articles dorment ?
- Combien de remises ai-je accordées, combien de pertes ai-je subies ?
- Qui a modifié quoi, et quand ?

---

## 2. Périmètre

### 2.1 Inclus dans la V1

1. Authentification email + mot de passe (2 utilisateurs, droits identiques)
2. Commandes Chine (achat + transitaire, quantités commandée / reçue / abîmée)
3. Articles avec photo, catégorie, prix fixé, coût unitaire facultatif
4. Variantes (libellé libre) avec stock et photo propres, prix modifiable par variante
5. Ventes (prix réellement encaissé, remise calculée, canal facultatif, annulation avec motif)
6. Gestion du stock, des invendus (ancienneté, statuts), des décotes et des pertes
7. Tableau de bord (par commande, jour, mois)
8. Historique inviolable des actions
9. Paramètres (seuils d'invendus, catégories)
10. PWA utilisable sur téléphone
11. Sauvegarde automatique de la base (GitHub Actions)

### 2.2 Exclu de la V1

| Exclu | Prévu en |
|---|---|
| Publicité, autres dépenses, bénéfice net | V2 |
| Export de données pour ZADRI Business | V2 |
| Analyses comparatives, alertes avancées | V2 |
| Mode hors ligne complet | V2 (option) |
| Prélèvements des associés | V3 |
| Rôles / droits d'accès / employés / paie | V3 |
| Trésorerie (caisse, Mobile Money, banque) | V3 |
| Attribution des ventes aux campagnes | V3 |
| Prévisions de réapprovisionnement | V3 |
| Catalogue partageable | V3 |
| Retours et échanges structurés | Non planifié (en V1, un retour = **annulation de la vente** avec le motif « retour client ») |

---

## 3. Décisions déjà prises

| Sujet | Décision |
|---|---|
| Devises | **Aucune conversion.** Tout est saisi en FCFA. |
| Frais d'arrivée | **Aucun.** Seuls les frais du transitaire existent, saisis en FCFA. |
| Ventes à crédit / acomptes | **Non.** Toute vente est encaissée. |
| Répartition du transport | **Non gérée par l'app.** L'entreprise calcule ses coûts elle-même. |
| Calcul du bénéfice | **Par commande**, avec un **coût unitaire facultatif** par article. |
| Utilisateurs | 2 utilisateurs, mêmes droits, voient tout. |
| Corrections | On **annule ou corrige avec trace**, on ne supprime jamais. |
| Variantes | Un article a des variantes définies par un **libellé libre**. |
| Prix de vente | On garde le **prix fixé** et le **prix réellement encaissé**. |

---

## 4. Stack technique et contraintes

| Couche | Choix |
|---|---|
| Interface | **React + PWA** (suggestion : Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, react-hook-form + zod, Recharts, vite-plugin-pwa) |
| Base de données, authentification | **Supabase** (PostgreSQL), forfait gratuit |
| Photos | **Cloudinary**, forfait gratuit |
| Déploiement | **Vercel**, automatique depuis le dépôt Git |
| Sauvegardes | **GitHub Actions** vers un dépôt privé |

Les bibliothèques de la première ligne sont des suggestions, pas des obligations.

### 4.1 Contraintes de coût (budget : 0)

- Supabase gratuit : 500 Mo de base, 1 Go de stockage, 2 projets actifs (un pour le développement, un pour la production). Pas de sauvegardes automatiques (d'où le §13). Projet **mis en pause après 1 semaine d'inactivité** (d'où le « ping » du §13).
- Cloudinary gratuit : vérifier les quotas en vigueur avant de démarrer.
- **Vercel Hobby : à ma connaissance réservé à un usage non commercial.** L'application étant destinée à une entreprise, **lire leurs conditions avant la mise en production**. Solutions de repli gratuites avec le même dépôt Git : Cloudflare Pages ou Netlify. Le code n'en dépend pas.
- Aucun serveur applicatif : le front parle directement à Supabase. La sécurité repose donc sur **RLS** (§7.6).

### 4.2 Environnements

- `dev` : projet Supabase de développement + déploiement de prévisualisation Vercel.
- `prod` : projet Supabase de production + déploiement principal.
- Le schéma est versionné par **migrations SQL** (dossier `supabase/migrations`, Supabase CLI) : on ne modifie jamais la base de production à la main.

Variables d'environnement du front : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`. **La clé `service_role` ne doit jamais apparaître dans le front ni dans le dépôt.**

---

## 5. Utilisateurs, authentification, sécurité

- **2 utilisateurs**, créés **manuellement** dans le tableau de bord Supabase.
- **Inscription publique désactivée** (réglage Auth de Supabase). Sinon n'importe qui pourrait créer un compte et, avec la clé publique, lire les données.
- En plus, une table `profiles` sert de **liste blanche** : les règles RLS n'autorisent que les utilisateurs présents dans `profiles`.
- Connexion email + mot de passe, session persistante (l'utilisateur reste connecté sur son téléphone), déconnexion, **réinitialisation du mot de passe** par email.
- Recommandé : activer l'authentification à deux facteurs (TOTP) pour les deux comptes, incluse dans le forfait gratuit d'après leur page tarifaire.
- Les deux utilisateurs ont **les mêmes droits** et voient tout (coûts, marges, historique).
- Aucune donnée personnelle de clients n'est stockée en V1.

---

## 6. Glossaire

| Terme | Définition |
|---|---|
| **Commande** | Une commande passée en Chine, avec son transport. Unité financière de base. |
| **Article** | Un modèle vendu (ex. « Montre Z01 »), rattaché à **une** commande d'origine. |
| **Variante** | Une déclinaison d'un article (« Noir », « Or 42mm »). **Tout article a au moins une variante** (« Unique » par défaut). Le stock est toujours **par variante**. |
| **Prix fixé** | Prix de vente affiché de l'article (ou de la variante). |
| **Prix encaissé** | Montant réellement reçu lors d'une vente. |
| **Remise** | Prix fixé − prix encaissé. |
| **Vendable** | Quantité reçue − quantité abîmée. |
| **Perte** | Sortie de stock sans vente (abîmé en stock, invendable, offert, perdu). |
| **Décote** | Baisse du prix de vente d'un article dormant. |
| **Solde de commande** | Encaissé − coût total. Négatif tant que la commande n'est pas récupérée. |
| **Seuil de récupération** | Montant restant à encaisser pour rentrer dans ses frais. |
| **Marge réalisée** | Bénéfice analytique des ventes après coût de revient et pertes (§8). |

---

## 7. Modèle de données (PostgreSQL)

### 7.1 Conventions

- Clés primaires : `uuid` (`gen_random_uuid()`). Pour les **ventes**, l'identifiant peut être **généré côté client** afin de rendre les envois rejouables sans doublon (prépare le mode hors ligne de la V2).
- Montants : `bigint` en FCFA, contraintes `CHECK (>= 0)`.
- Horodatages : `timestamptz`. Colonnes communes : `created_at`, `updated_at`, `created_by` (`default auth.uid()`).
- Statuts : `text` avec `CHECK` (facile à faire évoluer).
- **Aucune suppression physique** depuis l'application : pas de politique `DELETE` sur les tables. On **archive** (`archived_at`) ou on **annule**.
- Regroupements par jour/mois : dans le **fuseau horaire** défini dans `app_settings`.

### 7.2 Tables

#### `profiles`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | référence `auth.users(id)`, `on delete cascade` |
| full_name | text not null | |
| role | text not null default `'admin'` | prépare la V3 (une seule valeur en V1) |
| created_at | timestamptz | |

#### `app_settings` (une seule ligne)
| Colonne | Type | Notes |
|---|---|---|
| id | boolean PK default true, `check (id)` | garantit une seule ligne |
| watch_after_days | int not null default 30 | passage au statut « À surveiller » |
| clearance_after_days | int not null default 60 | passage au statut « À déstocker » |
| timezone | text not null default `'UTC'` | nom IANA, à régler selon le pays (ex. zones FCFA à UTC+0 ou UTC+1) |
| updated_at, updated_by | | |

Contrainte : `clearance_after_days > watch_after_days`.

#### `categories`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text not null | unique insensible à la casse |
| created_at | timestamptz | |

#### `orders` (commandes Chine)
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text unique not null | généré : `CH-001`, `CH-002`… (séquence) |
| order_date | date not null default current_date | |
| supplier | text not null | |
| description | text | |
| status | text not null default `'ordered'` | `ordered` (Commandée), `shipping` (En transport), `received` (Reçue) |
| purchase_amount | bigint not null | montant payé en Chine, en FCFA |
| forwarder_fee | bigint not null default 0 | frais du transitaire, en FCFA |
| weight_kg | numeric(10,2) null | facultatif, informatif |
| received_date | date null | obligatoire si `status = 'received'` |
| **total_cost** | bigint **generated** | `purchase_amount + forwarder_fee` |
| notes | text | |
| archived_at | timestamptz null | |
| created_by, created_at, updated_at | | |

Contrainte : `status = 'received'` ⇒ `received_date is not null`.

#### `items` (articles)
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text unique not null | généré : `ART-0001`… |
| order_id | uuid not null | FK `orders`, `on delete restrict` |
| category_id | uuid null | FK `categories` |
| name | text not null | |
| description | text | |
| photo_url | text null | URL Cloudinary |
| photo_public_id | text null | identifiant Cloudinary |
| list_price | bigint not null | **prix fixé actuel** |
| initial_price | bigint not null | prix à la création, **immuable** |
| unit_cost | bigint null | **coût unitaire facultatif** |
| received_date | date not null | reprise de la commande (sert à l'ancienneté) |
| archived_at | timestamptz null | |
| created_by, created_at, updated_at | | |

#### `variants`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| item_id | uuid not null | FK `items` |
| label | text not null default `'Unique'` | libellé libre ; unique par article (insensible à la casse) |
| photo_url, photo_public_id | text null | photo propre à la variante |
| price_override | bigint null | prix spécifique à la variante (sinon prix de l'article) |
| quantity_ordered | int null | facultatif |
| quantity_received | int not null | `>= 0` |
| quantity_damaged | int not null default 0 | `>= 0` et `<= quantity_received` |
| archived_at | timestamptz null | |
| created_by, created_at, updated_at | | |

Les quantités **commandée / reçue / abîmée** sont portées par la variante. Les totaux par commande sont calculés dans une vue.

#### `sales`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | peut être fourni par le client |
| variant_id | uuid not null | FK `variants` |
| quantity | int not null | `> 0` |
| list_price_unit | bigint not null | **prix fixé unitaire au moment de la vente** (instantané, rempli par la base) |
| sold_total | bigint not null | **montant total réellement encaissé**, `> 0` |
| channel | text null | `facebook`, `whatsapp`, `direct`, `other` |
| sold_at | timestamptz not null default now() | modifiable (avec trace) |
| note | text | |
| status | text not null default `'active'` | `active` ou `cancelled` |
| cancelled_at, cancelled_by | | obligatoires si annulée |
| cancel_reason | text | **obligatoire et non vide** si annulée |
| created_by, created_at, updated_at | | |

Remise d'une vente = `list_price_unit × quantity − sold_total` (peut être négative : supplément).

#### `losses` (sorties en perte)
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| variant_id | uuid not null | FK `variants` |
| quantity | int not null | `> 0`, `<=` stock disponible |
| reason | text not null | `damaged` (Abîmé), `unsellable` (Invendable), `gift` (Offert), `lost` (Perdu / volé), `other` (Autre) |
| occurred_on | date not null default current_date | |
| note | text | |
| status, cancelled_at, cancelled_by, cancel_reason | | même mécanisme d'annulation que les ventes |
| created_by, created_at | | |

À ne pas confondre : `variants.quantity_damaged` = abîmé **constaté à la réception** ; `losses` = sortie **après** réception.

#### `price_changes` (décotes et historique des prix)
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| item_id | uuid not null | |
| variant_id | uuid null | renseigné si le changement concerne une variante |
| old_price | bigint null | |
| new_price | bigint not null | |
| change_type | text not null | `initial`, `markdown` (décote), `increase` (hausse) |
| changed_at | timestamptz default now() | |
| changed_by | uuid default auth.uid() | |
| note | text | |

Alimentée **automatiquement** (fonction `change_price`, §7.3). L'écart `initial_price → prix actuel` donne la décote cumulée.

#### `audit_log` (historique, en ajout seul)
| Colonne | Type | Notes |
|---|---|---|
| id | bigint identity PK | |
| table_name | text not null | |
| record_id | uuid not null | |
| action | text not null | `INSERT`, `UPDATE` |
| old_data | jsonb null | |
| new_data | jsonb null | |
| changed_fields | text[] | champs modifiés (pour l'affichage) |
| changed_by | uuid | `auth.uid()` |
| changed_at | timestamptz default now() | |

### 7.3 Fonctions (RPC) — opérations atomiques

Toutes en `SECURITY INVOKER` (les règles RLS s'appliquent), avec **messages d'erreur en français**, clairs pour l'utilisateur.

| Fonction | Rôle |
|---|---|
| `create_sale(id, variant_id, quantity, sold_total, channel, sold_at, note)` | **Verrouille** la ligne de la variante (`SELECT … FOR UPDATE`) pour éviter que 2 utilisateurs vendent la dernière pièce ensemble ; vérifie que la commande est **reçue** et que le **stock est suffisant** ; copie le **prix fixé effectif** dans `list_price_unit` ; insère la vente. |
| `cancel_sale(id, reason)` | Refuse si le motif est vide ; passe la vente à `cancelled`. Le stock est restitué automatiquement (les ventes annulées ne comptent plus). Irréversible : pour revendre, on crée une nouvelle vente. |
| `create_loss(...)` / `cancel_loss(id, reason)` | Sortie en perte (vérifie le stock) / annulation avec motif. |
| `change_price(item_id, variant_id, new_price, note)` | Met à jour le prix, écrit dans `price_changes` (`markdown` si baisse, `increase` si hausse). |
| `create_item_with_variants(...)` | Crée un article et ses variantes **en une seule transaction** (l'article est créé avec au moins une variante). |

Un trigger empêche aussi toute modification directe qui rendrait un **stock négatif** (ex. baisser `quantity_received` sous le déjà-vendu).

### 7.4 Vues (toutes en `security_invoker = true`, pour que la RLS s'applique)

| Vue | Contenu |
|---|---|
| `v_variant_stock` | reçu, abîmé, vendable, vendu (actif), perdu (actif), **stock**, prix effectif, coût de revient effectif, ancienneté, statut d'invendu |
| `v_sales_detail` | vente + article + variante + commande, remise, coût de revient effectif, marge, indicateur `cost_is_estimated` |
| `v_order_summary` | tous les indicateurs de la commande (§8) |
| `v_item_summary` | ventes, chiffre d'affaires, marge (si coût connu), taux et vitesse d'écoulement par article |
| `v_dormant_stock` | variantes en stock avec ancienneté, statut, valeur immobilisée |
| Fonctions `stats_by_day(from, to)` / `stats_by_month(from, to)` | encaissé, marge, remises, pertes, nombre de ventes et unités, par jour ou par mois dans le fuseau configuré |

### 7.5 Historique automatique (audit)

- Un **trigger générique** (`SECURITY DEFINER`, `search_path` fixé) est attaché à : `orders`, `items`, `variants`, `sales`, `losses`, `categories`, `app_settings`. Il enregistre **chaque insertion et chaque modification** avec ancienne valeur, nouvelle valeur, champs modifiés, auteur (`auth.uid()`) et date.
- Les utilisateurs n'ont **que le droit de lecture** sur `audit_log` : ni insertion, ni modification, ni suppression. Personne ne peut effacer une trace depuis l'application.
- L'historique est écrit **dans la même transaction** que l'action : si l'action échoue, aucune trace fantôme ; si elle réussit, la trace existe forcément.

### 7.6 Sécurité des données (RLS)

- RLS **activée sur toutes les tables**.
- Politique commune de lecture/écriture : l'utilisateur doit exister dans `profiles`.
- `sales`, `losses`, `price_changes` : `SELECT` et `INSERT` autorisés, `UPDATE` limité (correction ou annulation), **pas de `DELETE`**.
- `audit_log` : `SELECT` seulement.
- Les autres tables : pas de `DELETE`. Les erreurs de saisie se corrigent par modification, et les éléments créés par erreur s'**archivent** (l'archivage d'une commande est refusé s'il existe des ventes actives liées ; une commande archivée est exclue de toutes les statistiques).
- Vérifier avec le jeu de test que l'accès **sans connexion** ne renvoie rien.

---

## 8. Règles de gestion et de calcul

Toutes ces règles sont implémentées **dans la base** (vues et fonctions). Les ventes et pertes **annulées** sont exclues de tous les calculs.

| # | Règle | Formule |
|---|---|---|
| R1 | **Vendable** d'une variante | `quantity_received − quantity_damaged` |
| R2 | **Stock** d'une variante | `vendable − Σ ventes actives (quantité) − Σ pertes actives (quantité)` ; ne peut jamais être négatif |
| R3 | **Coût total** d'une commande | `purchase_amount + forwarder_fee` |
| R4 | **Encaissé** d'une commande | `Σ sold_total` des ventes actives de tous ses articles |
| R5 | **Solde** de la commande | `encaissé − coût total` (négatif tant que non récupérée) |
| R6 | **Reste à récupérer** (seuil) | `max(0, coût total − encaissé)` |
| R7 | **Taux de récupération** | `min(100 %, encaissé ÷ coût total)` |
| R8 | **Prix effectif** d'une variante | `coalesce(price_override, items.list_price)` |
| R9 | **Bénéfice prévu** de la commande | `encaissé + Σ (stock × prix effectif) − coût total` |
| R10 | **Remise** d'une vente | `list_price_unit × quantité − sold_total` |
| R11 | **Coût de revient effectif** (voir ci-dessous) | |
| R12 | **Marge d'une vente** | `sold_total − coût de revient effectif × quantité` |
| R13 | **Valeur d'une perte** | `quantité × coût de revient effectif` |
| R14 | **Marge réalisée** (jour, mois, commande, canal, article) | `Σ marges des ventes − Σ valeur des pertes` |
| R15 | **Taux d'écoulement** | `unités vendues ÷ unités vendables` |
| R16 | **Jours moyens d'écoulement** | `Σ (quantité × (date de vente − date de réception)) ÷ Σ quantité` |
| R17 | **Ancienneté du stock** | `date du jour (fuseau configuré) − items.received_date` |
| R18 | **Statut d'invendu** (si stock > 0) | `< watch_after_days` : Normal ; `≥ watch` et `< clearance` : À surveiller ; `≥ clearance_after_days` : À déstocker |
| R19 | **Valeur immobilisée** | `stock × coût de revient effectif` (et, en parallèle, `stock × prix effectif`) |
| R20 | **Marge d'un article** (affichée en tant que « bénéfice par article ») | uniquement si `unit_cost` est renseigné ; sinon « coût non renseigné » |

### R11 — Coût de revient effectif

- Si `items.unit_cost` est renseigné : c'est ce coût.
- Sinon, on répartit ce qui reste du coût de la commande sur les unités **sans coût** :

```
coût_connu       = Σ (unit_cost × vendable) pour les articles de la commande dont unit_cost est renseigné
unités_sans_coût = Σ vendable des articles sans unit_cost
coût_estimé      = max(0, coût_total_commande − coût_connu) ÷ unités_sans_coût   (arrondi à l'entier)
```

Ainsi, quand tout est vendu, la somme des coûts retombe sur le coût total de la commande. Les marges calculées avec `coût_estimé` sont marquées **« estimées »** (`cost_is_estimated = true`, affichées avec un « ~ » dans l'interface).

### Attention : pas de double comptage des pertes

Le **solde de commande** (R5) et le **bénéfice prévu** (R9) partent du **coût total complet** de la commande. Les pertes y sont donc **déjà prises en compte** : un article perdu n'a rien rapporté alors que son coût est dans le total. **On ne soustrait pas les pertes une seconde fois** dans ces deux indicateurs.

Les pertes se déduisent en revanche de la **marge réalisée** (R14), qui compte le coût des articles réellement vendus, sinon les articles perdus n'y apparaîtraient jamais. Les pertes s'affichent aussi séparément (nombre d'unités, valeur) comme information.

> **Correction par rapport au résumé initial** : la règle « bénéfice de commande = ventes − coût total − pertes » comptait les pertes deux fois. Elle est remplacée par R5 (solde), R9 (prévu) et R14 (marge réalisée).

### Deux notions à ne pas confondre (à expliquer dans l'interface)

- **Solde de commande** : « où en est mon argent sur cette commande ? » (trésorerie de la commande).
- **Marge réalisée** : « combien mes ventes m'ont-elles rapporté après coût ? ». Elle peut être positive pendant que le solde de la commande est encore négatif. Une petite infobulle l'explique.

---

## 9. Spécification fonctionnelle par module

Chaque module se termine par des **critères d'acceptation** vérifiables.

### 9.1 Accès et sécurité
- Écran de connexion, déconnexion, mot de passe oublié, session persistante.
- **Critères** : sans connexion, aucune donnée n'est lisible (test API direct) ; création de compte publique impossible ; un utilisateur absent de `profiles` ne voit rien.

### 9.2 Commandes Chine
- **Liste** : référence, date, fournisseur, statut, coût total, encaissé, % récupéré (barre de progression), reste à récupérer. Filtre par statut, recherche par référence/fournisseur.
- **Création / édition** : date, fournisseur, description, montant payé (FCFA), frais du transitaire (FCFA), poids (facultatif), statut, notes. Le **coût total s'affiche en direct** pendant la saisie.
- **Passage à « Reçue »** : demande la date de réception (aujourd'hui par défaut) ; elle sert de départ à l'ancienneté.
- **Détail** : indicateurs R3 à R9, taux d'écoulement, liste des articles (avec stock et vendu), valeur du stock restant, pertes, remises.
- **Critères** : le coût total est toujours `achat + transitaire` ; la référence `CH-###` est unique et automatique ; impossible de passer à « Reçue » sans date.

### 9.3 Articles et variantes
- **Création rapide** (écran optimisé mobile) : photo (appareil photo ou galerie), nom, catégorie, commande d'origine (obligatoire, sélection parmi les commandes), **prix fixé**, **coût unitaire (facultatif, même écran)**, puis variantes : pour chacune un libellé, une quantité reçue, une quantité abîmée (0 par défaut), une quantité commandée (facultative), une photo et un prix spécifique (facultatifs). Sans variante saisie, une variante « Unique » est créée automatiquement.
- **Catalogue** : grille de vignettes avec photo, nom, prix, stock total, badge de statut d'ancienneté. Recherche par nom, filtres par catégorie / commande / statut, article archivé masqué par défaut.
- **Fiche article** : photo, prix (actuel et initial), coût unitaire, marge unitaire si coût connu, variantes avec stock, ventes, historique des prix, actions (modifier, baisser le prix, sortir du stock, archiver).
- **Critères** : impossible de créer un article sans commande d'origine ; abîmé ≤ reçu ; impossible de réduire la quantité reçue en dessous de ce qui est déjà vendu ou sorti ; une variante peut avoir son prix propre, sinon elle suit le prix de l'article.

### 9.4 Ventes
- **Parcours de vente rapide (écran principal, moins de 10 secondes)** :
  1. Choisir l'article (recherche ou grille de photos) ;
  2. Choisir la variante (boutons avec le stock restant affiché) ;
  3. Quantité (1 par défaut) ;
  4. **Prix encaissé** : prérempli avec le prix fixé × quantité, modifiable ; l'écart s'affiche en direct (« remise de 2 000 F ») ;
  5. Canal (boutons Facebook / WhatsApp / Direct / Autre, dernier choix mémorisé, facultatif) ;
  6. Valider. La date est celle du moment, modifiable au besoin.
- **Liste des ventes** : filtre par période, article, canal, statut (actives / annulées). Une vente annulée reste visible, barrée, avec son motif.
- **Annulation** : bouton « Annuler la vente » → motif **obligatoire** → confirmation. Le stock est restitué.
- **Correction** : modification possible du prix encaissé, de la quantité, du canal, de la date et de la note, **toujours tracée** dans l'historique.
- **Critères** : vente refusée si stock insuffisant ou si la commande n'est pas « Reçue » ; le prix fixé au moment de la vente est conservé même si le prix de l'article change ensuite ; deux ventes simultanées de la dernière pièce : une seule réussit ; annulation sans motif refusée ; annulation restitue exactement la quantité au stock.

### 9.5 Stock, invendus, décotes et pertes
- **Écran « Invendus »** : variantes en stock triées par ancienneté, avec jours en stock, statut (Normal / À surveiller / À déstocker), quantité, valeur immobilisée (au coût et au prix), date de la dernière vente. Filtres par statut.
- **Baisser le prix** (décote) : nouveau prix + note ; l'écran montre l'ancien prix, le nouveau, le pourcentage de baisse et l'impact sur la marge unitaire si le coût est connu. L'ancien prix et la date sont conservés dans `price_changes`.
- **Sortir du stock (perte)** : quantité (≤ stock), motif (Abîmé, Invendable, Offert, Perdu / volé, Autre), note. Enregistrée dans `losses`, visible dans le détail de la commande, annulable avec motif.
- **Critères** : le statut change automatiquement quand les seuils des Paramètres changent ; une perte diminue le stock et apparaît dans la marge réalisée et dans les pertes de la commande, sans être soustraite une seconde fois du solde (§8).

### 9.6 Tableau de bord
Sélecteur de période : Aujourd'hui, 7 jours, Ce mois, Mois précédent, Personnalisé. Blocs :

1. **Synthèse de la période** : chiffre d'affaires (encaissé), marge réalisée (avec « ~ » si estimée), nombre de ventes et d'unités, remises accordées, pertes (unités et valeur).
2. **Commandes** : pour chacune, coût total, encaissé, **reste à récupérer**, bénéfice prévu, statut visuel (en cours de récupération / récupérée). Tri par date.
3. **Graphique** : encaissé et marge par jour (30 derniers jours) et par mois (12 derniers mois).
4. **Meilleures ventes** : articles et variantes les plus vendus (quantité, chiffre d'affaires), **jours moyens d'écoulement**, **taux d'écoulement** (ex. « 22 vendus sur 30 »), bénéfice par article pour ceux dont le coût unitaire est renseigné.
5. **Stock** : unités en stock, valeur au coût et au prix de vente, nombre d'invendus par statut avec lien vers l'écran « Invendus ».
6. **Points d'attention** : commandes reçues sans article, articles sans coût unitaire (information), invendus à déstocker.
- **Critères** : tous les chiffres du dashboard sont **identiques** à ceux calculés à la main sur le jeu de test du §14 ; les ventes annulées n'apparaissent dans aucun total.

### 9.7 Historique des actions
- Écran en lecture seule : liste chronologique inverse (qui, quand, quoi), avec filtres par utilisateur, table, période et recherche par enregistrement ; vue **avant / après** des champs modifiés.
- Accessible depuis chaque fiche (« Historique de cet élément »).
- **Critères** : chaque création ou modification de commande, article, variante, vente, perte, catégorie et paramètre produit une ligne ; aucune ligne ne peut être modifiée ou supprimée depuis l'application.

### 9.8 Paramètres
- Seuils d'invendus (`watch_after_days`, `clearance_after_days`), fuseau horaire, catégories (ajout, renommage), profil, changement de mot de passe.

---

## 10. Écrans et navigation

**Navigation mobile** : barre inférieure avec 5 entrées : **Accueil** (dashboard) · **Articles** · **Vendre** (bouton central, accès direct au parcours de vente) · **Commandes** · **Plus** (Invendus, Ventes, Historique, Paramètres).
**Ordinateur** : menu latéral avec les mêmes entrées.

| Écran | Rôle |
|---|---|
| Connexion | Email + mot de passe, mot de passe oublié |
| Accueil | Dashboard (§9.6) |
| Vendre | Parcours de vente rapide (§9.4) |
| Ventes | Liste filtrable, annulation, correction |
| Articles | Catalogue en vignettes, création rapide, fiche article et variantes |
| Commandes | Liste, création, détail avec indicateurs |
| Invendus | Stock dormant, décote, sortie en perte |
| Historique | Journal des actions |
| Paramètres | Seuils, catégories, profil |

---

## 11. PWA, mobile et connexion faible

- **Mobile d'abord** (largeur de référence 360 px), zones tactiles d'au moins 44 px, clavier numérique pour les montants, boutons de choix plutôt que listes déroulantes.
- **Installation sur l'écran d'accueil** : manifeste (nom, icônes, couleur), service worker qui met en cache **l'interface** (le shell), démarrage rapide.
- **Données** : **pas de mode hors ligne complet en V1**. Si la connexion est absente, l'app l'indique par une **bannière claire** et **bloque les écritures avec un message explicite** : aucune saisie ne doit être perdue ou faussement « enregistrée » en silence.
- **Retour visuel** systématique : chargement, succès, échec, avec possibilité de **réessayer**. Les ventes envoyées avec un identifiant client sont rejouables sans doublon.
- Listes **paginées** (20 à 50 lignes), index sur les clés étrangères, `sold_at`, `variant_id`. Images en **vignettes** (§12).
- Format d'affichage : montants `1 250 000 F` (séparateur d'espaces, jamais de décimales), dates `jj/mm/aaaa`, interface **entièrement en français**.
- Objectifs indicatifs : premier affichage sous 3 s en 4G, score PWA Lighthouse ≥ 90.

---

## 12. Photos (Cloudinary)

- **Compression côté navigateur avant l'envoi** : plus grand côté 1280 px, qualité ~0,8, avec la bibliothèque de votre choix. Une photo de téléphone pèse plusieurs Mo, ce qui est inutilement lourd sur une connexion faible.
- Envoi direct du navigateur vers Cloudinary avec un **preset non signé restreint** (dossier dédié, formats et taille maximale limités). Alternative plus sûre, possible avec une fonction Supabase Edge (500 000 appels/mois en gratuit) : signer chaque envoi. À choisir avant la mise en production.
- En base : `photo_url` (adresse sécurisée) et `photo_public_id`.
- Affichage via les **transformations d'URL Cloudinary** (ex. largeur 400, `q_auto`, `f_auto`) pour les vignettes.
- La suppression d'images côté Cloudinary exigerait une clé secrète : **hors V1** (les anciennes images restent orphelines, sans impact).

---

## 13. Sauvegarde et continuité

Le forfait gratuit de Supabase **n'inclut pas de sauvegardes automatiques** : elles sont **obligatoires en V1**.

### 13.1 Sauvegarde par GitHub Actions
- Un **dépôt privé dédié aux sauvegardes**, distinct du dépôt du code. Le workflow y vit, ce qui lui permet d'y pousser avec le jeton par défaut.
- Planification quotidienne (au minimum hebdomadaire) + déclenchement manuel.
- Étapes : exporter la base avec `pg_dump`, compresser, nommer avec la date, supprimer les plus anciennes (garder par exemple les 30 dernières), valider et pousser.
- **Secrets GitHub** : la chaîne de connexion à la base (`SUPABASE_DB_URL`) n'est jamais écrite dans le code. Utiliser l'URL du **pooler en mode session** indiquée dans le tableau de bord Supabase (les serveurs GitHub sont en IPv4 ; la connexion directe est en IPv6 sur le forfait gratuit, à vérifier).
- Installer un client `pg_dump` de **version égale ou supérieure** à celle du serveur (sinon l'export échoue).
- Optionnel mais recommandé : **chiffrer** le fichier avant de le pousser, avec une clé conservée hors de GitHub.
- L'export porte sur le schéma `public`. Les 2 comptes utilisateurs se recréent dans Supabase Auth en cas de restauration.
- **Le dépôt contient toutes vos données financières** : accès restreint, authentification à deux facteurs sur le compte GitHub.
- Bonus : cette requête planifiée sert aussi d'**anti-pause** (le projet reste actif tant que l'Action tourne).
- L'historique Git conserve les anciens fichiers même supprimés : prévoir de temps en temps de repartir sur un dépôt propre si sa taille augmente.

Exemple à adapter (fichier `.github/workflows/backup.yml` dans le dépôt de sauvegardes) :

```yaml
name: db-backup
on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:
permissions:
  contents: write
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Installer le client PostgreSQL (version >= serveur)
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client
      - name: Export
        env:
          DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          mkdir -p dumps
          pg_dump "$DB_URL" --schema=public --no-owner --no-privileges \
            | gzip > "dumps/backup-$(date -u +%F).sql.gz"
      - name: Ne garder que les 30 derniers
        run: ls -1t dumps/*.sql.gz | tail -n +31 | xargs -r rm --
      - name: Valider et pousser
        run: |
          git config user.name "backup-bot"
          git config user.email "backup-bot@users.noreply.github.com"
          git add dumps
          git commit -m "backup $(date -u +%F)" || exit 0
          git push
```

### 13.2 À faire absolument
- **Tester une restauration réelle** au moins une fois (dans le projet Supabase de développement), avant la mise en production. Une sauvegarde jamais restaurée n'est pas une sauvegarde.
- Vérifier régulièrement que l'Action s'exécute (les échecs déclenchent un email GitHub).
- Documenter la procédure de restauration dans le dépôt de sauvegardes (`RESTORE.md`).

---

## 14. Jeu de test de référence

À charger comme **données de test** (script de seed) dans le projet de développement. Les valeurs attendues servent à valider les vues SQL **avant** de construire l'interface.

**Commande CH-001** : achat 400 000 F + transitaire 82 000 F → **coût total 482 000 F**. Reçue.

| Article | Prix fixé | Coût unitaire | Variante | Reçu | Abîmé | Vendable |
|---|---|---|---|---|---|---|
| Montre Z01 | 30 000 | 18 000 | Noir | 12 | 1 | 11 |
| Montre Z01 | 30 000 | 18 000 | Or | 8 | 0 | 8 |
| Bracelet Z02 | 10 000 | *(non renseigné)* | Unique | 30 | 2 | 28 |

Coût estimé du bracelet : `(482 000 − 19 × 18 000) ÷ 28 = 140 000 ÷ 28 = 5 000 F`.

**Mouvements**

| # | Action | Détail |
|---|---|---|
| S1 | Vente | Montre Noir × 2, prix fixé 30 000, **encaissé 58 000** |
| S2 | Vente | Montre Or × 1, **encaissé 30 000** |
| S3 | Vente | Bracelet × 5, **encaissé 50 000** |
| S4 | Vente **annulée** | Bracelet × 1, encaissé 9 000, motif « retour client » |
| L1 | Perte | Bracelet × 1, motif « Abîmé » |

**Résultats attendus**

| Indicateur | Valeur attendue |
|---|---|
| Stock Montre Noir / Montre Or / Bracelet | **9 / 7 / 22** |
| Encaissé de la commande | **138 000 F** |
| Solde de la commande | **−344 000 F** |
| Reste à récupérer | **344 000 F** |
| Taux de récupération | ≈ **28,6 %** |
| Remises accordées (S4 exclue) | **2 000 F** |
| Marge S1 / S2 / S3 | 22 000 / 12 000 / 25 000 (S3 estimée) |
| Valeur de la perte L1 | 5 000 F |
| **Marge réalisée** | 59 000 − 5 000 = **54 000 F** |
| Valeur du stock au prix de vente | 16 × 30 000 + 22 × 10 000 = **700 000 F** |
| Valeur du stock au coût | 16 × 18 000 + 22 × 5 000 = **398 000 F** |
| **Bénéfice prévu** | 138 000 + 700 000 − 482 000 = **356 000 F** |
| Taux d'écoulement | 8 vendues sur 47 vendables ≈ **17 %** |
| Unités perdues (pas de double comptage) | 1, déjà incluses dans le solde |

**Cas limites à tester**

1. Vente avec quantité supérieure au stock → refusée.
2. Vente sur un article dont la commande n'est pas « Reçue » → refusée.
3. Deux ventes simultanées de la dernière pièce → une seule aboutit.
4. Annulation sans motif → refusée ; avec motif → le stock est restitué.
5. Baisse de prix : `price_changes` mémorise ancien prix, nouveau prix et date ; une vente antérieure garde son `list_price_unit`.
6. Ancienneté : avec les seuils 30 / 60, un stock reçu depuis 45 jours est « À surveiller », depuis 70 jours « À déstocker ».
7. Compléter le `unit_cost` du bracelet après coup : les marges et les valeurs de stock sont recalculées, et la modification est tracée.
8. Tentative de `DELETE` sur `sales`, `losses`, `audit_log` → refusée.
9. Appel API sans connexion → aucune donnée.
10. Modification de n'importe quelle donnée → une ligne dans `audit_log` avec auteur, ancienne et nouvelle valeur.

---

## 15. Plan de réalisation (étapes)

| Étape | Contenu | Validation |
|---|---|---|
| 0 | Dépôts (code + sauvegardes), projets Supabase dev/prod, projet React + PWA, déploiement Vercel de « Hello world » | Le site s'installe sur un téléphone |
| 1 | **Migrations SQL** : tables, contraintes, séquences de références, triggers, audit | Contraintes testées |
| 2 | **RLS** + inscription publique désactivée + profils | Cas limites 8 et 9 |
| 3 | **Fonctions RPC** et **vues** de calcul | Jeu de test §14 entièrement conforme |
| 4 | Connexion (interface) | §9.1 |
| 5 | Commandes | §9.2 |
| 6 | Articles, variantes, photos Cloudinary | §9.3 |
| 7 | Ventes (parcours rapide) | §9.4 |
| 8 | Invendus, décotes, pertes | §9.5 |
| 9 | Dashboard | §9.6, chiffres = jeu de test |
| 10 | Historique + Paramètres | §9.7 et §9.8 |
| 11 | Finitions PWA, retours visuels, performance | §11 |
| 12 | Sauvegardes GitHub Actions + **test de restauration** | §13 |
| 13 | **Recette réelle** : ressaisir une commande déjà terminée et comparer avec ce que vous avez vraiment gagné | Écart expliqué ou nul |

---

## 16. Critères de recette de la V1

- [ ] Les deux utilisateurs se connectent, personne d'autre ne voit rien.
- [ ] Une commande complète (achat, transport, articles, variantes, photos) se saisit sans calculette.
- [ ] Une vente se saisit en moins de 10 secondes depuis le téléphone.
- [ ] Le stock est toujours exact, y compris après annulation et perte.
- [ ] Le jeu de test §14 donne **exactement** les valeurs attendues.
- [ ] Le seuil de récupération et le bénéfice prévu de chaque commande sont corrects.
- [ ] Les invendus sont détectés selon les seuils, les décotes et les pertes sont tracées.
- [ ] Aucune donnée ne peut être supprimée ni modifiée sans laisser de trace.
- [ ] L'application s'installe et fonctionne sur Android et iPhone, sur connexion moyenne.
- [ ] Une sauvegarde automatique a été **restaurée avec succès**.
- [ ] Une vraie commande passée a été ressaisie et les chiffres ont été comparés à la réalité.

---

## 17. Points ouverts (à valider avant ou pendant le développement)

| # | Question | Proposition retenue par défaut |
|---|---|---|
| 1 | Le résumé initial parlait de « 3 seuils » pour 3 statuts. Or trois statuts n'exigent que **deux** seuils. | **2 seuils** : 30 jours (« À surveiller ») et 60 jours (« À déstocker »), réglables. |
| 2 | Peut-on vendre un article avant que la commande soit « Reçue » ? | **Non** (évite de vendre du stock qui n'existe pas encore). |
| 3 | La date d'une vente est-elle modifiable ? | **Oui**, tracée dans l'historique (utile quand une vente est saisie le lendemain). |
| 4 | Le prix encaissé se saisit-il par unité ou au total ? | Prérempli par unité × quantité, **stocké en total** (évite les erreurs d'arrondi). |
| 5 | Méthode du coût de revient estimé (R11) | Reste de la commande réparti sur les unités sans coût. À valider avec votre pratique. |
| 6 | Fuseau horaire des statistiques par jour | À régler dans les paramètres selon le pays. |
| 7 | Vercel Hobby et usage commercial | À vérifier avant la production ; sinon Cloudflare Pages ou Netlify. |
| 8 | Envoi des photos : preset non signé ou signature via fonction serveur ? | Non signé restreint au départ, signature avant la production. |
| 9 | Retours clients | Traités comme **annulation de vente** en V1. |

---

## 18. Préparer la V2 et la V3 dès la V1

Sans construire ces fonctions, la V1 doit laisser la place :

- `created_by` sur toutes les tables et `profiles.role` : rôles de la V3.
- Historique **générique** : les nouvelles tables (dépenses, pub, prélèvements) s'y branchent avec le même trigger.
- Dates de commande et de réception déjà stockées : délai d'approvisionnement calculable pour les prévisions de la V3.
- Identifiants de vente **générés côté client** : envoi rejouable pour un futur mode hors ligne.
- Colonne `channel` sur les ventes : comparaison entre canaux en V2.
- Calculs en **vues SQL** : les nouvelles vues (bénéfice net, export) s'ajoutent sans toucher aux existantes.

---

## Annexe A — Prompt de démarrage pour l'IA

> Tu es l'assistant de développement du projet **ZADRI Luxe App**. Je te fournis le cahier des charges V1 complet. Contraintes : React + PWA, Supabase (PostgreSQL), Cloudinary, Vercel, budget zéro.
>
> Règles : (1) tu suis le document à la lettre et tu ne rajoutes aucune fonctionnalité hors périmètre ; (2) toute la logique métier est dans la base (contraintes, triggers, fonctions, vues) ; (3) si une règle est ambiguë, tu me poses la question avant de coder ; (4) identifiants de code en anglais, interface en français, montants entiers en FCFA ; (5) tu travailles étape par étape selon le §15 et tu attends ma validation avant de passer à la suivante.
>
> **Étape 1 (commence par celle-ci)** : écris les migrations SQL Supabase pour les tables du §7.2, les contraintes, les séquences de références (`CH-###`, `ART-####`), les triggers d'audit du §7.5 et les fonctions du §7.3. N'écris aucune interface. Ensuite j'attends que tu me proposes les tests SQL du §14.

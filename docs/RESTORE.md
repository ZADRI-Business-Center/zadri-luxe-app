# Guide de Sauvegarde et Restauration Supabase — ZADRI Luxe

Ce guide détaille la mise en place de la **sauvegarde automatique quotidienne** (§13.1) et la **procédure de restauration réelle** (§13.2) du projet **ZADRI Luxe**.

> [!IMPORTANT]
> **Règle d'or (§13.2)** : *Une sauvegarde jamais restaurée n'est pas une sauvegarde.*  
> Il est obligatoire d'avoir testé au moins une fois la procédure de restauration sur une base de développement ou de test avant le lancement en production.

---

## 1. Configuration de la Sauvegarde Automatique (GitHub Actions)

Le workflow se trouve dans [`.github/workflows/backup.yml`](file:///.github/workflows/backup.yml).

### A. Récupérer l'URL de connexion PostgreSQL dans Supabase

1. Connectez-vous à votre [Dashboard Supabase](https://supabase.com/dashboard).
2. Ouvrez votre projet ZADRI Luxe.
3. Allez dans **Project Settings** (icône engrenage en bas à gauche) > **Database**.
4. Descendez à la section **Connection String**.
5. Sélectionnez l'onglet **URI** puis cochez **Use connection pooling** (mode **Session**, port `5432` ou `6543`).
   > [!NOTE]  
   > L'utilisation du *Connection Pooler* garantit la compatibilité IPv4 avec les serveurs d'exécution de GitHub Actions.
6. Copiez la chaîne au format :
   ```text
   postgresql://postgres.[PROJECT-REF]:[VOTRE-MOT-DE-PASSE]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
   *(Pensez à remplacer `[VOTRE-MOT-DE-PASSE]` par le mot de passe réel de la base que vous avez défini à la création).*

---

### B. Enregistrer le Secret dans GitHub

1. Allez sur votre dépôt GitHub (dépôt **privé** obligatoire car il contiendra vos données financières).
2. Rendez-vous dans **Settings** > **Secrets and variables** > **Actions**.
3. Cliquez sur **New repository secret**.
4. Nommez le secret : `SUPABASE_DB_URL`.
5. Collez l'URL de connexion complète récupérée à l'étape A.
6. Validez avec **Add secret**.

---

### C. Activer les Permissions d'Écriture de GitHub Actions

Pour permettre au robot GitHub Actions de committer le fichier de sauvegarde dans le dossier `dumps/` :

1. Toujours dans **Settings** du dépôt GitHub > **Actions** > **General**.
2. Descendez à la section **Workflow permissions**.
3. Cochez **Read and write permissions**.
4. Cochez **Allow GitHub Actions to create and approve pull requests**.
5. Cliquez sur **Save**.

---

### D. Tester le premier déclenchement manuel

1. Sur votre dépôt GitHub, cliquez sur l'onglet **Actions**.
2. Dans le menu de gauche, sélectionnez le workflow : **Sauvegarde Quotidienne Base de Données (Supabase)**.
3. Cliquez sur le bouton **Run workflow** (branche `main`) > **Run workflow**.
4. Au bout d'environ 30 à 45 secondes, l'exécution passe au vert.
5. Vérifiez qu'un nouveau fichier `dumps/backup-AAAA-MM-JJ_HHMMSS.sql.gz` a bien été ajouté au dépôt.

> [!TIP]
> **Anti-pause gratuite** : cette requête quotidienne planifiée à 02h00 UTC maintient votre instance Supabase active et empêche sa mise en pause automatique pour inactivité sur le plan gratuit.

---

## 2. Procédure de Restauration Réelle (§13.2)

En cas de sinistre, de corruption de données ou pour tester la conformité sur une base de développement, suivez cette procédure pas-à-pas.

### Prérequis
* Un terminal avec `bash` ou `PowerShell`.
* L'outil `gzip` / `gunzip` (ou 7-Zip).
* Le client `psql` (PostgreSQL 15, 16 ou supérieur).

---

### Étape 1 : Télécharger et décompresser l'archive

1. Récupérez le dernier dump dans le dossier `dumps/` :
   ```bash
   # Décompresser sans supprimer l'archive originale (-k)
   gunzip -k dumps/backup-2026-11-11_020000.sql.gz
   ```
   Vous obtenez le fichier texte SQL `backup-2026-11-11_020000.sql`.

---

### Étape 2 : Restaurer les données dans PostgreSQL / Supabase

Exécutez la restauration via `psql` vers la base cible (remplacez `$TARGET_DB_URL` par l'URL de la base cible de test) :

```bash
# Sous Linux / macOS / Git Bash
export TARGET_DB_URL="postgresql://postgres.[TEST_REF]:[TEST_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

psql "$TARGET_DB_URL" < dumps/backup-2026-11-11_020000.sql
```

Sous Windows PowerShell :
```powershell
$env:TARGET_DB_URL = "postgresql://postgres.[TEST_REF]:[TEST_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

cmd /c "psql `"$env:TARGET_DB_URL`" < dumps\backup-2026-11-11_020000.sql"
```

---

### Étape 3 : Synchronisation des utilisateurs Supabase Auth

Le dump sauvegarde l'intégralité du schéma applicatif `public` (tables, données, vues, triggers, fonctions).
Si la restauration est faite sur un **nouveau projet Supabase vierge** :

1. Dans le tableau de bord Supabase du nouveau projet : rendez-vous dans **Authentication** > **Users**.
2. Créez manuellement les deux comptes utilisateurs (les associés) avec leurs adresses email.
3. Récupérez les nouveaux UUIDs attribués par Supabase Auth.
4. Dans l'éditeur SQL de Supabase, mettez à jour la table `public.profiles` si nécessaire :
   ```sql
   -- Exemple de réassignation d'un profil
   UPDATE public.profiles
   SET id = 'NOUVEL-UUID-AUTH'
   WHERE email = 'associe1@zadri.com';
   ```

---

### Étape 4 : Checklist de Validation Post-Restauration

Exécutez cette requête de contrôle dans l'éditeur SQL de Supabase pour vous assurer de la complétude :

```sql
-- Vérification du nombre d'enregistrements restaurés
SELECT 'orders' AS table_name, count(*) AS count FROM public.orders
UNION ALL
SELECT 'items', count(*) FROM public.items
UNION ALL
SELECT 'variants', count(*) FROM public.variants
UNION ALL
SELECT 'sales', count(*) FROM public.sales
UNION ALL
SELECT 'losses', count(*) FROM public.losses
UNION ALL
SELECT 'categories', count(*) FROM public.categories
UNION ALL
SELECT 'audit_log', count(*) FROM public.audit_log
UNION ALL
SELECT 'app_settings', count(*) FROM public.app_settings;

-- Vérification de l'intégrité des vues métiers
SELECT * FROM public.v_variant_stock LIMIT 5;
SELECT * FROM public.v_order_summary LIMIT 5;
SELECT * FROM public.v_dormant_stock LIMIT 5;
```

Si les comptages correspondent aux données initiales et que les vues retournent les stocks sans erreur, **la restauration est 100 % valide** !

---

## 3. Scripts Utilitaires Locaux

Pour créer une sauvegarde ponctuelle manuelle depuis votre ordinateur (sans passer par GitHub) :

### Sous Windows (PowerShell) :
```powershell
# Définir l'URL de votre base
$DB_URL = "postgresql://postgres.xxx:motdepasse@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Lancer l'export compressé
$dateStr = Get-Date -Format "yyyy-MM-dd_HHmmss"
pg_dump $DB_URL --schema=public --no-owner --no-privileges --clean --if-exists | gzip > "dumps\manual-backup-$dateStr.sql.gz"
```


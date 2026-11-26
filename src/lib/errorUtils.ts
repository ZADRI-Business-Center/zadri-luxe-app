/**
 * Formate un message d'erreur technique (Supabase, Postgres, Réseau)
 * en un message clair et compréhensible par un utilisateur commerçant non-développeur.
 */
export function formatErrorMessage(
  error: unknown,
  fallbackMessage = 'Une opération n’a pas pu aboutir. Veuillez réessayer.'
): string {
  if (!error) return fallbackMessage;

  const raw =
    typeof error === 'string'
      ? error
      : (error as any)?.message ||
        (error as any)?.error_description ||
        (error as any)?.details ||
        '';

  const lower = raw.toLowerCase();

  // Erreurs de connexion et réseau
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('offline') ||
    lower.includes('abort') ||
    lower.includes('timeout')
  ) {
    return 'Connexion internet instable ou interrompue. Vérifiez votre accès réseau et réessayez.';
  }

  // Identifiants et authentification
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid grant') ||
    lower.includes('invalid_credentials')
  ) {
    return 'Adresse email ou mot de passe incorrect. Veuillez vérifier votre saisie.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Votre adresse email n’a pas encore été confirmée. Vérifiez votre boîte de réception.';
  }

  if (lower.includes('jwt') || lower.includes('session expired') || lower.includes('token is expired')) {
    return 'Votre session a expiré. Veuillez vous reconnecter pour continuer en toute sécurité.';
  }

  // Droits d'accès / RLS
  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('not authorized')
  ) {
    return 'Action non autorisée. Votre profil n’a pas les droits nécessaires pour effectuer cette modification.';
  }

  // Doublons / Contraintes d'unicité
  if (
    lower.includes('23505') ||
    lower.includes('duplicate key') ||
    lower.includes('unique constraint') ||
    lower.includes('already exists')
  ) {
    if (lower.includes('categories') || lower.includes('catégorie')) {
      return 'Une catégorie portant exactement ce nom existe déjà.';
    }
    if (lower.includes('reference') || lower.includes('orders_reference')) {
      return 'Ce numéro de commande est déjà attribué à une autre commande. Veuillez choisir une référence différente.';
    }
    if (lower.includes('code') || lower.includes('items_code')) {
      return 'Ce code article existe déjà dans votre inventaire.';
    }
    return 'Cet enregistrement existe déjà dans l’application.';
  }

  // Clés étrangères / Relations
  if (lower.includes('23503') || lower.includes('foreign key constraint')) {
    return 'Impossible d’effectuer cette action car des éléments dépendent encore de cette fiche.';
  }

  // Contraintes de vérification (CHECK)
  if (lower.includes('chk_received_needs_date')) {
    return 'La date de réception effective est requise lorsque la commande est marquée comme reçue.';
  }

  if (lower.includes('chk_positive_prices') || lower.includes('numeric_value_out_of_range')) {
    return 'Le prix et les quantités doivent être des nombres positifs valides.';
  }

  // Erreurs déjà rédigées en bon français compréhensible
  if (
    !lower.includes('select') &&
    !lower.includes('insert') &&
    !lower.includes('update') &&
    !lower.includes('delete') &&
    !lower.includes('table') &&
    !lower.includes('column') &&
    !lower.includes('schema') &&
    !lower.includes('database') &&
    !lower.includes('postgres') &&
    !lower.includes('rpc') &&
    !lower.includes('null value in column') &&
    raw.trim().length > 0 &&
    /[a-zA-Zà-ÿ]/.test(raw)
  ) {
    // Si le message d'origine ressemble déjà à du français utilisateur naturel
    if (
      raw.includes('obligatoire') ||
      raw.includes('impossible') ||
      raw.includes('veuillez') ||
      raw.includes('introuvable') ||
      raw.includes('erreur') ||
      raw.includes('invalide')
    ) {
      return raw;
    }
  }

  return fallbackMessage;
}


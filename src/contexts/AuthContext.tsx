import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  networkError: string | null;
  isUnauthorized: boolean;
  unauthorizedCountdown: number | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [unauthorizedCountdown, setUnauthorizedCountdown] = useState<number | null>(null);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearUnauthorizedTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const handleUnauthorizedUser = useCallback(async () => {
    clearUnauthorizedTimer(); // Annule tout intervalle existant avant d'en créer un nouveau
    setIsUnauthorized(true);
    let secondsLeft = 4;
    setUnauthorizedCountdown(secondsLeft);

    countdownTimerRef.current = setInterval(async () => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearUnauthorizedTimer();
        setUnauthorizedCountdown(null);
        setIsUnauthorized(false);
        await supabase.auth.signOut();
      } else {
        setUnauthorizedCountdown(secondsLeft);
      }
    }, 1000);
  }, []);

  const fetchProfile = useCallback(async (currentUser: User) => {
    setNetworkError(null);

    try {
      // Avec RLS, si l'utilisateur est authentifié mais absent de profiles,
      // la requête réussit (error = null) mais renvoie 0 ligne (data = []).
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', currentUser.id);

      if (error) {
        // Vraie erreur réseau ou serveur : on ne déconnecte pas, on trace et on stocke l'erreur
        console.error('Erreur technique lors de la récupération du profil :', error);
        setNetworkError('Impossible de joindre le serveur. Vérifiez votre connexion.');
        return;
      }

      if (!data || data.length === 0) {
        // Requête réussie sans erreur SQL mais 0 ligne trouvée -> Hors liste blanche
        console.warn('Utilisateur authentifié absent de la liste blanche profiles.');
        setProfile(null);
        handleUnauthorizedUser();
      } else {
        // Utilisateur autorisé
        setProfile(data[0] as UserProfile);
        setIsUnauthorized(false);
        clearUnauthorizedTimer();
      }
    } catch (err) {
      console.error('Exception réseau :', err);
      setNetworkError('Erreur de communication avec le serveur.');
    }
  }, [handleUnauthorizedUser]);

  useEffect(() => {
    // Initialisation de la session au démarrage
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        fetchProfile(initSession.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Écoute des changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user);
        } else {
          setProfile(null);
          setIsUnauthorized(false);
          clearUnauthorizedTimer();
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      clearUnauthorizedTimer();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    clearUnauthorizedTimer();
    setProfile(null);
    setUser(null);
    setSession(null);
    setIsUnauthorized(false);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        networkError,
        isUnauthorized,
        unauthorizedCountdown,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

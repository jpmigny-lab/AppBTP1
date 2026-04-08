import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { runFirstLoginMigration } from '@/lib/repositories/firstLoginMigration';
import { hydrateDevisListFromSupabase } from '@/store/devisStore';

/** ID utilisé pour l'utilisateur invité (accès dashboard sans connexion) */
export const GUEST_USER_ID = 'guest-demo';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Utilisateur fictif pour l'accès direct au dashboard sans connexion */
function createGuestUser(): User {
  return {
    id: GUEST_USER_ID,
    email: 'invite@demo.aos-renov.local',
    app_metadata: {},
    user_metadata: { full_name: 'Invité (démo)' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaurer le mode invité depuis la session si présent
    const guest = sessionStorage.getItem('auth:guest');
    if (guest === '1') {
      setUser(createGuestUser());
      setSession(null);
      setLoading(false);
      return;
    }

    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) sessionStorage.removeItem('auth:guest');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        void runFirstLoginMigration().then(() => hydrateDevisListFromSupabase());
      }
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) sessionStorage.removeItem('auth:guest');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (
        session?.user &&
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')
      ) {
        void runFirstLoginMigration().then(() => hydrateDevisListFromSupabase());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error && data.user) {
      // Créer le profil utilisateur
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: email,
          full_name: fullName,
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInAsGuest = () => {
    sessionStorage.setItem('auth:guest', '1');
    setUser(createGuestUser());
    setSession(null);
    setLoading(false);
  };

  const signOut = async () => {
    if (user?.id === GUEST_USER_ID) {
      sessionStorage.removeItem('auth:guest');
      setUser(null);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const isGuest = user?.id === GUEST_USER_ID;

  return (
    <AuthContext.Provider value={{ user, session, loading, isGuest, signUp, signIn, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


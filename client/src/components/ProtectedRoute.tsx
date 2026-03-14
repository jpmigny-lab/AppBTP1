import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/auth');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="relative z-10 flex items-center justify-center min-h-screen w-full">
        <div className="text-white drop-shadow-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-transparent">
        <div className="text-white drop-shadow-lg">Redirection vers la connexion...</div>
      </div>
    );
  }

  return <>{children}</>;
}


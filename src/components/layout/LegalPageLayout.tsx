import { ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AppLayout } from './AppLayout';

interface LegalPageLayoutProps {
  children: ReactNode;
}

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  // Loading state — brief flash avoided by keeping it minimal
  if (isLoggedIn === null) {
    return null;
  }

  if (isLoggedIn) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-primary hover:underline mb-4"
          >
            &larr; Voltar
          </button>
          {children}
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl hover:opacity-80 transition-opacity">
            <img src="/logo-login.png" alt="Organiza Odonto" className="h-8 w-8 object-contain" />
            Organiza Odonto
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-primary hover:underline"
          >
            &larr; Voltar
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
    </div>
  );
}

import React from 'react';
import { useLocation } from 'react-router-dom';
import { PageTransition } from '../transitions/PageTransition';
import { Profile } from '@/types';
import { LoadingModal } from '../ui/LoadingModal';

interface MainLayoutProps {
  children: React.ReactNode;
  profiles: Profile[];
  currentProfile: Profile | null;
  onSwitchProfile: (id: string) => void;
  onCreateProfile: (profile: Omit<Profile, 'id' | 'created_at'>) => void;
  onUpdateProfile: (id: string, updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => void;
  onDeleteProfile: (id: string) => void;
  profilesLoading?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children,
  profilesLoading = false
}) => {
  const location = useLocation();
  const isPrint = location.pathname === '/print';
  
  const getPageTitle = () => {
    if (isPrint) return 'Print View';
    return 'Order Summary';
  };
  
  return (
    <div className="screen:min-h-screen print:min-h-0 print:h-auto bg-neutral-50 print:bg-white">
      {profilesLoading && <LoadingModal isOpen={true} message="Loading profiles..." />}

      <header className="relative bg-white border-b border-neutral-200/70 py-5 sm:py-7 mb-8 print:hidden overflow-hidden">
        {/* Subtle brand halo — barely perceptible, only behind the header */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_center,_theme(colors.brand.100)_0%,_transparent_65%)] opacity-60"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <h1 className="text-center text-2xl sm:text-[2rem] font-semibold tracking-tight leading-tight">
              <span className="block sm:inline bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 animate-gradient bg-clip-text text-transparent">
                Fletcher Insulation
              </span>
              <span className="block sm:inline text-neutral-900 mt-1 sm:mt-0 sm:ml-2 font-medium">
                {getPageTitle()}
              </span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 print:p-0">
        <PageTransition location={location.pathname}>
          {children}
        </PageTransition>
      </main>
    </div>
  );
};
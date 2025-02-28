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
  profiles,
  currentProfile,
  onSwitchProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  profilesLoading = false
}) => {
  const location = useLocation();
  const isLiveLoading = location.pathname === '/live-loading';
  const isPrint = location.pathname === '/print';
  
  const getPageTitle = () => {
    if (isLiveLoading) return 'Live Loading';
    if (isPrint) return 'Print View';
    return 'Order Summary';
  };
  
  return (
    <div className="screen:min-h-screen print:min-h-0 print:h-auto bg-gray-100 print:bg-white">
      {profilesLoading && <LoadingModal isOpen={true} message="Loading profiles..." />}
      
      <header className={`bg-white border-b border-gray-200 py-4 sm:py-6 ${isLiveLoading ? '' : 'mb-6'} print:hidden`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <h1 className="text-center text-2xl sm:text-4xl font-bold tracking-tight">
              <span className="block sm:inline bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 animate-gradient bg-clip-text text-transparent">
                Fletcher Insulation
              </span>
              <span className={`block sm:inline text-black mt-1 sm:mt-0 sm:ml-2 ${isLiveLoading ? 'hidden' : ''}`}>
                {getPageTitle()}
              </span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
        <PageTransition location={location.pathname}>
          {/* Pass all profile props directly to the children */}
          {children}
        </PageTransition>
      </main>
    </div>
  );
};
import React from 'react';
import { useLocation } from 'react-router-dom';
import { PageTransition } from '../transitions/PageTransition';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
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
      <header className={`bg-white border-b border-gray-200 py-4 sm:py-6 ${isLiveLoading ? '' : 'mb-6'} print:hidden`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-center text-2xl sm:text-4xl font-bold tracking-tight">
            <span className="block sm:inline bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 animate-gradient bg-clip-text text-transparent">
              Fletcher Insulation
            </span>
            <span className={`block sm:inline text-black mt-1 sm:mt-0 sm:ml-2 ${isLiveLoading ? 'hidden' : ''}`}>
              {getPageTitle()}
            </span>
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
        <PageTransition location={location.pathname}>
          {children}
        </PageTransition>
      </main>
    </div>
  );
};
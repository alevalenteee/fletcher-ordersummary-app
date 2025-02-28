import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { PrintView } from './components/PrintView';
import { LiveLoadingPage } from './pages/LiveLoadingPage';
import { useOrders } from './hooks/useOrders';
import { useProductData } from './hooks/useProductData';
import { useProfiles } from './hooks/useProfiles';
import { useRouteState } from './hooks/useRouteState';
import { PageTransition } from './components/transitions/PageTransition';
import './styles/animations.css';

function MainApp() {
  const { restoreLastRoute } = useRouteState();
  const location = useLocation();
  const { 
    productData, 
    handleDataLoaded, 
    saveAsDefault 
  } = useProductData();
  
  // Get profiles
  const {
    profiles,
    currentProfile,
    loading: profilesLoading,
    error: profilesError,
    createProfile,
    updateProfile,
    deleteProfile,
    switchProfile
  } = useProfiles();

  // Pass current profile ID to useOrders
  const {
    orders,
    editingOrder,
    loading: ordersLoading,
    error: ordersError,
    handleOrderSubmit,
    handleEditOrder,
    handleDeleteOrder
  } = useOrders(currentProfile?.id);

  // Handle profile switching
  const handleSwitchProfile = async (profileId: string) => {
    // First switch the profile
    switchProfile(profileId);
    
    // Orders will be automatically updated due to the profileId dependency in useOrders
  };

  // Restore last route on mount
  React.useEffect(() => {
    restoreLastRoute();
  }, []);

  return (
    <MainLayout
      profiles={profiles}
      currentProfile={currentProfile}
      onSwitchProfile={handleSwitchProfile}
      onCreateProfile={createProfile}
      onUpdateProfile={updateProfile}
      onDeleteProfile={deleteProfile}
      profilesLoading={profilesLoading}
    >
      <PageTransition location={location.pathname}>
        <Routes location={location}>
          <Route
            path="/print"
            element={<PrintView orders={orders} productData={productData} />}
          />
          <Route
            path="/live-loading"
            element={<LiveLoadingPage productData={productData} />}
          />
          <Route
            path="/"
            element={
              <HomePage
                productData={productData}
                editingOrder={editingOrder}
                onDataLoaded={handleDataLoaded}
                onSaveDefault={saveAsDefault}
                onOrderSubmit={handleOrderSubmit}
                onEditOrder={handleEditOrder}
                onDeleteOrder={handleDeleteOrder}
                orders={orders}
                loading={ordersLoading || profilesLoading}
                error={ordersError || profilesError}
                profiles={profiles}
                currentProfile={currentProfile}
                onSwitchProfile={handleSwitchProfile}
                onCreateProfile={createProfile}
                onUpdateProfile={updateProfile}
                onDeleteProfile={deleteProfile}
              />
            }
          />
        </Routes>
      </PageTransition>
    </MainLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}
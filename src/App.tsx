import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { PrintView } from './components/PrintView';
import { useOrders } from './hooks/useOrders';
import { useProductData } from './hooks/useProductData';
import { useProfiles } from './hooks/useProfiles';
import { useDestinations } from './hooks/useDestinations';
import { useLocations } from './hooks/useLocations';
import { useOrderLocations } from './hooks/useOrderLocations';
import { useInventory } from './hooks/useInventory';
import { useRouteState } from './hooks/useRouteState';
import { PageTransition } from './components/transitions/PageTransition';
import { autoAssignLocations } from './utils/autoAssignLocations';
import { sortOrdersByTime } from './utils/time';
import type { AutoAssignStockWarning, Order } from '@/types';
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
    handleDeleteOrder,
    updateOrderProducts,
    updateOrderLocations,
  } = useOrders(currentProfile?.id);

  // Destinations (globally shared, not profile-scoped)
  const {
    destinations,
    createDestination,
    deleteDestination,
    updateDestinationColor
  } = useDestinations();

  // Locations catalogue (hardcoded-seeded, read-only)
  const { locations } = useLocations();

  const {
    inventory,
    uploadedAt: inventoryUploadedAt,
    loading: inventoryLoading,
    error: inventoryError,
    replaceInventory,
    clearInventory,
  } = useInventory();

  // Per-order location assignments — synced via the `orders.locations`
  // JSONB column so manual & auto-assigned picks travel across devices.
  const {
    getLocationsFor,
    setDraft: setOrderLocationsDraft,
    clearOrder: clearOrderLocations,
  } = useOrderLocations({ orders, updateOrderLocations });

  const ordersRef = React.useRef(orders);
  React.useLayoutEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const [stockWarnings, setStockWarnings] = React.useState<AutoAssignStockWarning[]>([]);
  const [stockWarningsDismissed, setStockWarningsDismissed] = React.useState(false);

  // Hide warnings whose order no longer exists. Keeping the source list in
  // state and filtering on render means single deletes, delete-all, and
  // profile switches all prune the warning panel automatically without each
  // delete path having to remember to call setStockWarnings.
  const visibleStockWarnings = React.useMemo(() => {
    if (stockWarningsDismissed) return [];
    if (stockWarnings.length === 0) return stockWarnings;
    const liveOrderIds = new Set(
      orders.map(o => o.id).filter((id): id is string => !!id)
    );
    return stockWarnings.filter(w => liveOrderIds.has(w.orderId));
  }, [orders, stockWarnings, stockWarningsDismissed]);

  // Accepts an optional explicit orders list. The PDF and single-order flows
  // call it with the freshly-inserted rows because React's commit (and the
  // layout effect that refreshes `ordersRef`) hasn't run yet by the time
  // those `await onOrderSubmit` chains finish — without this, auto-assign
  // would see a stale ref missing the new orders and skip them.
  const runAutoAssign = React.useCallback((ordersOverride?: Order[]) => {
    const orderList = ordersOverride ?? ordersRef.current;
    if (!inventory.length || !locations.length) {
      setStockWarnings([]);
      return;
    }
    const { assignments, warnings } = autoAssignLocations({
      orders: orderList,
      inventory,
      productData,
      locations,
    });
    setStockWarnings(warnings);
    setStockWarningsDismissed(false);
    const sorted = sortOrdersByTime(orderList.filter(o => o.id));
    for (const o of sorted) {
      const id = o.id as string;
      setOrderLocationsDraft(id, assignments[id] ?? {});
    }
  }, [inventory, locations, productData, setOrderLocationsDraft]);

  // Wrap delete so the order's location assignments disappear with it.
  const handleDeleteOrderWithLocations = async (index: number) => {
    const target = orders[index];
    await handleDeleteOrder(index);
    clearOrderLocations(target?.id);
  };

  const handleToggleMustGo = async (orderIndex: number, productIndex: number) => {
    const target = orders[orderIndex];
    if (!target?.id) return;
    const nextProducts = target.products.map((p, i) =>
      i === productIndex ? { ...p, mustGo: !p.mustGo } : p
    );
    await updateOrderProducts(orderIndex, nextProducts);
  };

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
            element={
              <PrintView
                orders={orders}
                productData={productData}
                locations={locations}
                getLocationsFor={getLocationsFor}
                destinations={destinations}
              />
            }
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
                onDeleteOrder={handleDeleteOrderWithLocations}
                orders={orders}
                loading={ordersLoading || profilesLoading}
                error={ordersError || profilesError}
                profiles={profiles}
                currentProfile={currentProfile}
                onSwitchProfile={handleSwitchProfile}
                onCreateProfile={createProfile}
                onUpdateProfile={updateProfile}
                onDeleteProfile={deleteProfile}
                destinations={destinations}
                onCreateDestination={createDestination}
                onDeleteDestination={deleteDestination}
                onUpdateDestinationColor={updateDestinationColor}
                locations={locations}
                getLocationsFor={getLocationsFor}
                onSubmitOrderLocations={setOrderLocationsDraft}
                onToggleMustGo={handleToggleMustGo}
                inventoryRowCount={inventory.length}
                inventoryUploadedAt={inventoryUploadedAt}
                inventoryLoading={inventoryLoading}
                inventoryError={inventoryError}
                onReplaceInventory={replaceInventory}
                onClearInventory={clearInventory}
                onRunAutoAssign={runAutoAssign}
                stockWarnings={visibleStockWarnings}
                onDismissStockWarnings={() => setStockWarningsDismissed(true)}
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
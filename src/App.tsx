import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { PrintView } from './components/PrintView';
import { LiveLoadingPage } from './pages/LiveLoadingPage';
import { useOrders } from './hooks/useOrders';
import { useProductData } from './hooks/useProductData';
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
  
  const {
    orders,
    editingOrder,
    handleOrderSubmit,
    handleEditOrder,
    handleDeleteOrder,
    handleSaveOrders
  } = useOrders();

  // Restore last route on mount
  React.useEffect(() => {
    restoreLastRoute();
  }, []);

  return (
    <MainLayout>
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
                onSaveOrders={handleSaveOrders}
                orders={orders}
              />
            }
          />
        </Routes>
      </PageTransition>
    </MainLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

export default App;
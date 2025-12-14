import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import theme from './theme/theme';
import { AuthProvider } from './contexts/AuthContext';
import { KeyboardProvider } from './contexts/KeyboardContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import KeyboardHelpModal from './components/shared/KeyboardHelpModal';
import Layout from './components/shared/Layout';

// Lazy Load Pages for Performance
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./components/auth/ForgotPasswordPage'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const ProductsPage = lazy(() => import('./components/products/ProductsPage'));
const SalesPage = lazy(() => import('./components/sales/SalesPage'));
const StockPage = lazy(() => import('./components/stock/StockPage'));
const SuppliersPage = lazy(() => import('./components/suppliers/SuppliersPage'));
const CustomersPage = lazy(() => import('./components/customers/CustomersPage'));
const ReportsPage = lazy(() => import('./components/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'));
const SalesHistoryPage = lazy(() => import('./components/sales/SalesHistoryPage'));
const PurchaseOrdersPage = lazy(() => import('./components/purchaseOrders/PurchaseOrdersPage'));
const MedicineReferencePage = lazy(() => import('./components/medicineReference/MedicineReferencePage'));
const GuidePage = lazy(() => import('./components/guide/GuidePage'));

import { useEffect } from 'react';
import { syncOfflineSales } from './utils/offlineStorage';

// Loading Fallback
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

export default function App() {
  useEffect(() => {
    // Check for offline sales on app start
    syncOfflineSales();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <KeyboardProvider>
          <Router>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* Protected Routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <ProductsPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <SalesPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales-history"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <SalesHistoryPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/stock"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <StockPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/suppliers"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <SuppliersPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/purchase-orders"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <PurchaseOrdersPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <CustomersPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <ReportsPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/medicine-reference"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <MedicineReferencePage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <SettingsPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/guide"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <GuidePage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
            <KeyboardHelpModal />
          </Router>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </KeyboardProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

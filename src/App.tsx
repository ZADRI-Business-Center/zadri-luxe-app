import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Home } from './pages/Home';
import { ChangePassword } from './pages/ChangePassword';
import { OrdersList } from './pages/orders/OrdersList';
import { OrderForm } from './pages/orders/OrderForm';
import { OrderDetail } from './pages/orders/OrderDetail';
import { ItemsList } from './pages/items/ItemsList';
import { ItemForm } from './pages/items/ItemForm';
import { ItemDetail } from './pages/items/ItemDetail';
import { FastSale } from './pages/sales/FastSale';
import { SalesList } from './pages/sales/SalesList';
import { DormantStockList } from './pages/stock/DormantStockList';
import { LossesList } from './pages/stock/LossesList';
import { MoreMenu } from './pages/MoreMenu';
import { AuditLogList } from './pages/history/AuditLogList';
import { SettingsPage } from './pages/settings/SettingsPage';
import { OfflineBanner } from './components/OfflineBanner';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineBanner />
        <Routes>
          {/* Routes publiques */}
          <Route path="/login"           element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />

          {/* Routes protégées : nécessitent d'être dans profiles */}
          <Route element={<ProtectedRoute />}>
            <Route path="/"                      element={<Home />} />
            <Route path="/change-password"       element={<ChangePassword />} />

            {/* Module Commandes (FR & EN) */}
            <Route path="/commandes"              element={<OrdersList />} />
            <Route path="/commandes/nouvelle"     element={<OrderForm />} />
            <Route path="/commandes/:id"          element={<OrderDetail />} />
            <Route path="/commandes/:id/modifier" element={<OrderForm />} />
            <Route path="/orders"                 element={<OrdersList />} />
            <Route path="/orders/new"             element={<OrderForm />} />
            <Route path="/orders/:id"             element={<OrderDetail />} />
            <Route path="/orders/:id/edit"        element={<OrderForm />} />

            {/* Module Articles (Étape 6) */}
            <Route path="/articles"                    element={<ItemsList />} />
            <Route path="/articles/nouveau"            element={<ItemForm />} />
            <Route path="/articles/:id"                element={<ItemDetail />} />
            <Route path="/articles/:id/modifier"       element={<ItemForm />} />

            {/* Module Ventes (Étape 7) */}
            <Route path="/vendre"                      element={<FastSale />} />
            <Route path="/ventes"                      element={<SalesList />} />
            <Route path="/sales"                       element={<SalesList />} />

            {/* Module Stock, Invendus & Pertes (Étape 8) */}
            <Route path="/invendus"                    element={<DormantStockList />} />
            <Route path="/pertes"                      element={<LossesList />} />
            <Route path="/plus"                        element={<MoreMenu />} />

            {/* Module Audit & Paramètres (Étape 10) */}
            <Route path="/historique"                  element={<AuditLogList />} />
            <Route path="/parametres"                  element={<SettingsPage />} />
            <Route path="/settings"                    element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

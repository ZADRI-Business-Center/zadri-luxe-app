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

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login"           element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />

          {/* Routes protégées : nécessitent d'être dans profiles */}
          <Route element={<ProtectedRoute />}>
            <Route path="/"                      element={<Home />} />
            <Route path="/change-password"       element={<ChangePassword />} />
            <Route path="/commandes"             element={<OrdersList />} />
            <Route path="/commandes/nouvelle"    element={<OrderForm />} />
            <Route path="/commandes/:id"         element={<OrderDetail />} />
            <Route path="/commandes/:id/modifier" element={<OrderForm />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

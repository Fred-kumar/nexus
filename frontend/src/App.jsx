import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAuthStore, useUIStore } from './context/store';
import { useSocket } from './hooks/useSocket';
import { initializePushNotifications } from './hooks/usePushNotifications';

const LoginPage        = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage     = React.lazy(() => import('./pages/RegisterPage'));
const ChatApp          = React.lazy(() => import('./pages/ChatApp'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage  = React.lazy(() => import('./pages/ResetPasswordPage'));
const LandingPage      = React.lazy(() => import('./pages/LandingPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false } },
});

function SocketInitializer() { useSocket(); return null; }

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/" replace />;
}

function App() {
  const { isAuthenticated } = useAuthStore();
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated) initializePushNotifications(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'OPEN_CHAT')
          window.dispatchEvent(new CustomEvent('open_chat', { detail: { chatId: event.data.chatId } }));
      });
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {isAuthenticated && <SocketInitializer />}
        <React.Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route path="/landing"  element={<LandingPage />} />
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            <Route path="/*" element={<ProtectedRoute><ChatApp /></ProtectedRoute>} />
          </Routes>
        </React.Suspense>
        <Toaster position="top-center" toastOptions={{
          duration: 3000,
          style: { background:'var(--bg-secondary)', color:'var(--text-primary)', border:'1px solid var(--border)', borderRadius:'12px' },
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function FullPageLoader() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a13', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:52 }}>🪢</div>
      <div style={{ color:'#7F77DD', fontSize:22, fontWeight:700, letterSpacing:1 }}>Knot</div>
      <div style={{ width:40, height:3, borderRadius:2, background:'#7F77DD', opacity:0.7 }} />
    </div>
  );
}

export default App;

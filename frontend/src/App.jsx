import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAuthStore } from './context/store';
import { useSocket } from './hooks/useSocket';
import { initializePushNotifications } from './hooks/usePushNotifications';

// Pages (lazy loaded)
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const ChatApp = React.lazy(() => import('./pages/ChatApp'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
  },
});

function SocketInitializer() {
  useSocket(); // Initialize socket connection
  return null;
}

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

  useEffect(() => {
    // Initialize push notifications when logged in
    if (isAuthenticated) {
      initializePushNotifications(true);
    }
    // Handle SW messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'OPEN_CHAT') {
          const url = new URL(window.location.href);
          url.searchParams.set('chat', event.data.chatId);
          window.history.pushState({}, '', url);
          window.dispatchEvent(new CustomEvent('open_chat', { detail: { chatId: event.data.chatId } }));
        }
      });
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {isAuthenticated && <SocketInitializer />}
        <React.Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            <Route path="/*" element={<ProtectedRoute><ChatApp /></ProtectedRoute>} />
          </Routes>
        </React.Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--toast-bg, #1e1e2e)',
              color: 'var(--toast-color, #fff)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function FullPageLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a13', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>🌐</div>
      <div style={{ color: '#7F77DD', fontSize: 18, fontWeight: 500 }}>Nexus</div>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: '#2a2a3e', overflow: 'hidden' }}>
        <div style={{ width: '60%', height: '100%', background: '#7F77DD', borderRadius: 2, animation: 'slide 1s ease infinite' }} />
      </div>
    </div>
  );
}

export default App;

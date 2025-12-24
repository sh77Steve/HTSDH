import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RanchProvider, useRanch } from './contexts/RanchContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { InvitationRedemptionPage } from './pages/InvitationRedemptionPage';
import { RanchSelector } from './pages/RanchSelector';
import { AnimalsPage } from './pages/AnimalsPage';
import { SearchPage } from './pages/SearchPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import LicenseManagementPage from './pages/LicenseManagementPage';
import { LicenseHelpPage } from './pages/LicenseHelpPage';
import { TermsModal } from './components/TermsModal';

function AppContent() {
  const { user, loading: authLoading, needsTermsAcceptance, checkTermsAcceptance } = useAuth();
  const { currentRanch, userRanches, loading: ranchLoading } = useRanch();
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handleNavigation = () => setCurrentRoute(window.location.pathname);
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        const url = new URL(link.href);
        const fullPath = url.pathname + url.search + url.hash;
        window.history.pushState({}, '', fullPath);
        setCurrentRoute(url.pathname);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (currentRoute === '/redeem-invitation') {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    return <InvitationRedemptionPage invitationCode={code || undefined} />;
  }

  if (authLoading || (user && ranchLoading)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (currentRoute === '/signup') {
      return <SignUpPage />;
    }
    return <LoginPage />;
  }

  if (needsTermsAcceptance) {
    return <TermsModal onAccept={checkTermsAcceptance} canClose={false} />;
  }

  if (!currentRanch || userRanches.length === 0) {
    return <RanchSelector />;
  }

  switch (currentRoute) {
    case '/search':
      return <SearchPage />;
    case '/reports':
      return <ReportsPage />;
    case '/settings':
      return <SettingsPage />;
    case '/license-management':
      return <LicenseManagementPage />;
    case '/license-help':
      return <LicenseHelpPage />;
    case '/dashboard':
    case '/':
    default:
      return <AnimalsPage />;
  }
}

function App() {
  return (
    <AuthProvider>
      <RanchProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </RanchProvider>
    </AuthProvider>
  );
}

export default App;

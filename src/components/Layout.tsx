import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRanch } from '../contexts/RanchContext';
import { LogOut, Home, Search, FileText, Settings, Menu, X, HelpCircle } from 'lucide-react';
import LicenseWarningBanner from './LicenseWarningBanner';
import { DemoModeWelcomeModal } from './DemoModeWelcomeModal';
import { BackupWarningModal } from './BackupWarningModal';

interface LayoutProps {
  children: ReactNode;
  currentPage: 'animals' | 'search' | 'reports' | 'settings' | 'ranch';
}

export function Layout({ children, currentPage }: LayoutProps) {
  const { signOut } = useAuth();
  const { currentRanch, userRanches, selectRanch, isDemoMode } = useRanch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRanchSelector, setShowRanchSelector] = useState(false);
  const [showDemoWelcome, setShowDemoWelcome] = useState(false);
  const [showBackupWarning, setShowBackupWarning] = useState(false);
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      const hasSeenDemoWelcome = sessionStorage.getItem('hasSeenDemoWelcome');
      if (!hasSeenDemoWelcome) {
        setShowDemoWelcome(true);
      }
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (currentRanch && !isDemoMode) {
      const hasSeenBackupWarning = sessionStorage.getItem(`backupWarning_${currentRanch.id}`);

      if (!hasSeenBackupWarning && currentRanch.last_backup_date) {
        const lastBackup = new Date(currentRanch.last_backup_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastBackup.getTime());
        const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        setDaysSinceBackup(daysSince);

        if (daysSince > 7) {
          setShowBackupWarning(true);
        }
      } else if (!hasSeenBackupWarning && !currentRanch.last_backup_date) {
        setDaysSinceBackup(null);
        setShowBackupWarning(true);
      }
    }
  }, [currentRanch, isDemoMode]);

  const handleCloseDemoWelcome = () => {
    setShowDemoWelcome(false);
    sessionStorage.setItem('hasSeenDemoWelcome', 'true');
  };

  const handleCloseBackupWarning = () => {
    setShowBackupWarning(false);
    if (currentRanch) {
      sessionStorage.setItem(`backupWarning_${currentRanch.id}`, 'true');
    }
  };

  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem('hasSeenDemoWelcome');
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigation = [
    { name: 'Animals', icon: Home, page: 'animals', href: '/dashboard' },
    { name: 'Search', icon: Search, page: 'search', href: '/search' },
    { name: 'Reports', icon: FileText, page: 'reports', href: '/reports' },
    { name: 'Ranch', icon: HelpCircle, page: 'ranch', href: '/license-help' },
    { name: 'Settings', icon: Settings, page: 'settings', href: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <div className="flex-shrink-0 flex items-center ml-2 lg:ml-0">
                <Home className="w-6 h-6 text-green-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">AmadorHerdInfo</span>
              </div>

              <div className="hidden lg:ml-10 lg:flex lg:space-x-8">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition ${
                      currentPage === item.page
                        ? 'border-green-600 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {currentRanch && (
                <button
                  onClick={() => setShowRanchSelector(!showRanchSelector)}
                  className="hidden sm:block text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                >
                  {currentRanch.name}
                </button>
              )}

              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-base font-medium transition ${
                    currentPage === item.page
                      ? 'bg-green-50 border-l-4 border-green-600 text-green-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </a>
              ))}

              {currentRanch && userRanches.length > 1 && (
                <button
                  onClick={() => {
                    setShowRanchSelector(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-t border-gray-200"
                >
                  <Home className="w-5 h-5 mr-3" />
                  <span>Switch Ranch: <strong>{currentRanch.name}</strong></span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {showRanchSelector && userRanches.length > 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Switch Ranch</h3>
            <div className="space-y-2">
              {userRanches.map((ur) => (
                <button
                  key={ur.ranch_id}
                  onClick={() => {
                    selectRanch(ur.ranch_id);
                    setShowRanchSelector(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    currentRanch?.id === ur.ranch_id
                      ? 'bg-green-50 border-2 border-green-600 text-green-900'
                      : 'border border-gray-200 hover:border-green-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{ur.ranch.name}</div>
                  {ur.ranch.location && (
                    <div className="text-sm text-gray-600">{ur.ranch.location}</div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRanchSelector(false)}
              className="mt-4 w-full py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <LicenseWarningBanner />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {showDemoWelcome && (
        <DemoModeWelcomeModal onClose={handleCloseDemoWelcome} />
      )}

      {showBackupWarning && currentRanch && (
        <BackupWarningModal
          lastBackupDate={currentRanch.last_backup_date}
          daysSinceBackup={daysSinceBackup}
          onClose={handleCloseBackupWarning}
        />
      )}
    </div>
  );
}

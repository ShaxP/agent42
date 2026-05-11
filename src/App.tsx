import { useEffect, useState } from 'react';
import { AppWindow } from './components/layout/AppWindow';
import { getAuthStatus, signInWithGitHubCopilot } from './lib/tauri';
import { Home } from './screens/Home';
import { SignIn } from './screens/SignIn';

export default function App() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'unauthenticated' | 'authenticated' | 'expired'>('checking');
  const [connecting, setConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [enteredApp, setEnteredApp] = useState(false);
  const [homeView, setHomeView] = useState<'home' | 'chat'>('home');

  useEffect(() => {
    void getAuthStatus().then((status) => {
      setAuthStatus(status === 'authenticated' ? 'authenticated' : 'unauthenticated');
    });
  }, []);

  const authenticated = authStatus === 'authenticated';

  const handleSignIn = async () => {
    setConnecting(true);
    setAuthError(null);
    try {
      const status = await signInWithGitHubCopilot();
      setAuthStatus(status === 'authenticated' ? 'authenticated' : 'unauthenticated');
      if (status !== 'authenticated') {
        setAuthError('Authentication did not complete. If needed, run `gh auth login --web` in a terminal.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAuthError(message || 'Authentication failed. Run `gh auth login --web` in a terminal and retry.');
      setAuthStatus('unauthenticated');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <AppWindow>
      {!enteredApp ? (
        <SignIn
          authenticated={authenticated}
          connecting={connecting}
          onSignIn={handleSignIn}
          authError={authError}
          onContinue={() => setEnteredApp(true)}
        />
      ) : (
        <Home view={homeView} onViewChange={setHomeView} />
      )}
    </AppWindow>
  );
}

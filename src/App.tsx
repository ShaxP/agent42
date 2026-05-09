import { useEffect, useState } from 'react';
import { AppWindow } from './components/layout/AppWindow';
import { getAuthStatus } from './lib/tauri';
import { Home } from './screens/Home';
import { SignIn } from './screens/SignIn';

export default function App() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'unauthenticated' | 'authenticated' | 'expired'>('checking');
  const [connecting, setConnecting] = useState(false);
  const [enteredApp, setEnteredApp] = useState(false);
  const [homeView, setHomeView] = useState<'home' | 'chat'>('home');

  useEffect(() => {
    void getAuthStatus().then((status) => {
      setAuthStatus(status === 'authenticated' ? 'authenticated' : 'unauthenticated');
    });
  }, []);

  const authenticated = authStatus === 'authenticated';

  const handleSignIn = () => {
    setConnecting(true);
    setTimeout(() => {
      setAuthStatus('authenticated');
      setConnecting(false);
    }, 600);
  };

  return (
    <AppWindow title="Agent 42">
      {!enteredApp ? (
        <SignIn
          authenticated={authenticated}
          connecting={connecting}
          onSignIn={handleSignIn}
          onContinue={() => setEnteredApp(true)}
        />
      ) : (
        <Home view={homeView} onViewChange={setHomeView} />
      )}
    </AppWindow>
  );
}

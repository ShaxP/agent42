import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { StatusIndicator } from '../components/ui/StatusIndicator';

interface SignInProps {
  authenticated: boolean;
  connecting: boolean;
  authError?: string | null;
  onSignIn: () => void;
  onContinue: () => void;
}

export function SignIn({ authenticated, connecting, authError, onSignIn, onContinue }: SignInProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bgBase px-4 py-10">
      <div className="w-full max-w-[520px] rounded-lg border border-borderDefault bg-bgSurface p-8">
        <Logo />
        <p className="mt-6 text-sm leading-relaxed text-textSecondary">
          Agent 42 uses GitHub Copilot as its AI engine. Sign in with your GitHub account to connect your Copilot
          subscription.
        </p>
        <div className="mt-7 space-y-3">
          <Button loading={connecting} onClick={onSignIn} className="w-full" aria-label="Sign in with GitHub Copilot">
            Sign in with GitHub Copilot
          </Button>
          {authenticated ? (
            <div className="flex items-center gap-2 text-xs text-success">
              <StatusIndicator state="done" />
              <span>Copilot connected</span>
            </div>
          ) : null}
          {authenticated ? (
            <Button variant="secondary" onClick={onContinue} className="w-full" aria-label="Continue to app">
              Continue
            </Button>
          ) : null}
          {!authenticated && authError ? <p className="text-xs text-red-300">{authError}</p> : null}
        </div>
      </div>
    </div>
  );
}

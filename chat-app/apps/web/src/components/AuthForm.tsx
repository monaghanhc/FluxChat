import { useMemo, useState } from 'react';
import { loginSchema, signupSchema } from '@chat/shared';

type AuthMode = 'login' | 'signup';

type AuthFormProps = {
  mode: AuthMode;
  loading: boolean;
  error?: string;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (payload: { email: string; password: string; displayName?: string }) => Promise<void>;
};

export const AuthForm = ({ mode, loading, error, onModeChange, onSubmit }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const title = useMemo(() => (mode === 'signup' ? 'Create your account' : 'Sign in'), [mode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const payload = {
      email,
      password,
      ...(mode === 'signup' ? { displayName } : {}),
    };

    const parsed = mode === 'signup' ? signupSchema.safeParse(payload) : loginSchema.safeParse(payload);

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    await onSubmit(parsed.data);
  };

  return (
    <div className="auth-shell">
      <form className="auth-form" onSubmit={handleSubmit} data-testid="auth-form">
        <h1>{title}</h1>

        <div className="auth-mode-toggle">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => onModeChange('login')}
            data-testid="mode-login"
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => onModeChange('signup')}
            data-testid="mode-signup"
          >
            Sign up
          </button>
        </div>

        <label>
          Email
          <input
            data-testid="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        {mode === 'signup' ? (
          <label>
            Display name
            <input
              data-testid="auth-display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
        ) : null}

        <label>
          Password
          <input
            data-testid="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
          />
        </label>

        {validationError ? <p className="error">{validationError}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <button data-testid="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

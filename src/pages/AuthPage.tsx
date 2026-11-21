import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

export const AuthPage: React.FC<{ initialMode?: 'login' | 'register' }> = ({
  initialMode = 'login',
}) => {
  const { googleSignIn, emailSignIn, emailRegister, sendResetEmail, storeSettings, showToast } =
    useStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await googleSignIn();
      showToast('Signed in with Google.');
      navigate('/account');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);
    try {
      if (mode === 'forgot') {
        await sendResetEmail(email);
        setInfoMsg('Password reset link sent to your email address.');
      } else if (mode === 'register') {
        if (fullName.trim().length < 2) {
          throw new Error('Please enter your full name.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await emailRegister(fullName, email, password);
        showToast('Account created! Verification email sent.');
        navigate('/account');
      } else {
        await emailSignIn(email, password);
        showToast('Welcome back to VELLOX.');
        navigate('/account');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#FAFAFA]">
      <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img
              src={storeSettings.logoUrl || '/assets/vellox-logo-crop.jpg'}
              alt="VELLOX"
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-md object-cover bg-[#111317]"
            />
            <span className="font-display text-xl font-extrabold tracking-[0.16em] text-[#111317]">
              VELLOX
            </span>
          </Link>
          <h1 className="mt-4 font-display text-2xl font-bold text-[#111317]">
            {mode === 'login'
              ? 'Customer Sign In'
              : mode === 'register'
              ? 'Create Your Account'
              : 'Reset Password'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Track orders, manage saved addresses, and sync your wishlist.
          </p>
        </div>

        {mode !== 'forgot' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors flex items-center justify-center gap-3 text-sm font-medium text-zinc-800 shadow-xs disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
              <div className="flex-1 h-px bg-zinc-200" />
              <span>or with email</span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-700">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-zinc-600 hover:text-[#111317] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
              {infoMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-200 text-center text-xs text-zinc-600">
          {mode === 'login' ? (
            <p>
              New to VELLOX?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('register');
                }}
                className="font-semibold text-[#111317] hover:underline"
              >
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('login');
                }}
                className="font-semibold text-[#111317] hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

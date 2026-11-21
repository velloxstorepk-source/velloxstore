import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { auth, googleAuthProvider } from '../../firebase';
import { useStore } from '../../context/StoreContext';

export const AdminLoginPage: React.FC = () => {
  const {
    authReady,
    user,
    isOwner,
    adminPinVerified,
    verifyAdminPin,
    bootstrapOwnerStore,
    logout,
    showToast,
  } = useStore();
  const navigate = useNavigate();

  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#111317] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (user && isOwner && adminPinVerified) {
    return <Navigate to="/admin" replace />;
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const pin = adminPassword.trim();
    if (!pin) {
      setErrorMsg('Please enter the Admin Password.');
      return;
    }

    setLoading(true);
    try {
      const ok = await verifyAdminPin(pin);
      if (!ok) {
        setErrorMsg('Incorrect Admin Password. Please try again.');
        setLoading(false);
        return;
      }

      if (user && isOwner) {
        try {
          await bootstrapOwnerStore(user);
        } catch {
          // AdminDashboard will retry if needed
        }
        showToast('Welcome to VELLOX Admin.');
        navigate('/admin');
      }
    } catch {
      setErrorMsg('Unable to verify Admin Password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOwnerConnect = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      let pinOk = adminPinVerified;
      if (!pinOk && adminPassword.trim()) {
        pinOk = await verifyAdminPin(adminPassword.trim());
        if (!pinOk) {
          setErrorMsg('Incorrect Admin Password.');
          setLoading(false);
          return;
        }
      }

      const res = await signInWithPopup(auth, googleAuthProvider);
      const email = (res.user.email || '').toLowerCase();

      if (email !== 'vellox.store.pk@gmail.com') {
        setErrorMsg(`Signed in as "${res.user.email}". Please sign in with Owner account vellox.store.pk@gmail.com.`);
        setLoading(false);
        return;
      }

      if (pinOk) {
        try {
          await bootstrapOwnerStore(res.user);
        } catch {
          // handled inside AdminDashboard if offline
        }
        showToast('Signed in to VELLOX Admin.');
        navigate('/admin');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111317] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-zinc-800">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img
              src="/assets/vellox-logo-crop.jpg"
              alt="VELLOX"
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-md object-cover bg-[#111317]"
            />
            <span className="font-display text-xl font-extrabold tracking-[0.16em] text-[#111317]">
              VELLOX
            </span>
          </Link>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-[#111317]" />
            <span>Store Owner Portal</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#111317]">
            Admin Login
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Add products, manage inventory, and view customer COD orders.
          </p>
        </div>

        {/* Logged in as non-owner customer */}
        {user && !isOwner && (
          <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
            <p className="font-semibold">
              Signed in as "{user.email}" which does not have Store Owner permissions.
            </p>
            <button
              type="button"
              onClick={() => logout()}
              className="px-3 py-1.5 bg-rose-700 text-white rounded-lg font-semibold"
            >
              Switch to Owner Account
            </button>
          </div>
        )}

        <form onSubmit={handlePinSubmit} className="space-y-4">
          {/* Step 1: Admin Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317] font-mono tracking-widest"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {adminPinVerified && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Admin password verified. Connect your Owner Google account below to open the dashboard.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {!adminPinVerified && (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Unlock Admin Panel'}
            </button>
          )}
        </form>

        <div className="mt-4 pt-4 border-t border-zinc-200 space-y-3">
          {user && isOwner ? (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 flex items-center justify-between gap-2">
              <span className="truncate">Owner: <strong>{user.email}</strong></span>
              <span className="text-emerald-700 font-semibold shrink-0">Connected</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleOwnerConnect}
              className="w-full py-2.5 px-4 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors flex items-center justify-center gap-3 text-sm font-medium text-zinc-800 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Sign in with Google (Owner)</span>
            </button>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-200 text-center">
          <Link to="/" className="text-xs text-zinc-500 hover:text-[#111317]">
            &larr; Return to VELLOX Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildApiUrl, parseJsonResponse } from '../../../utils/api';
import StoreNavbar from '../../../components/StoreNavbar';

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestCode = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch(buildApiUrl('/api/auth/password-reset/request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const payload = await parseJsonResponse(response);

      if (!response.ok) {
        setError(payload?.error || 'Unable to send verification code');
        return;
      }

      setStep('confirm');
      setMessage(payload?.message || 'Verification code sent to your email.');
    } catch (requestError) {
      setError(requestError?.message || 'Unable to connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (newPassword === '') {
      setError('New password is required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(buildApiUrl('/api/auth/password-reset/confirm'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          code,
          newPassword,
        }),
      });
      const payload = await parseJsonResponse(response);

      if (!response.ok) {
        setError(payload?.error || 'Unable to reset password');
        return;
      }

      setMessage(payload?.message || 'Password reset successful.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 800);
    } catch (resetError) {
      setError(resetError?.message || 'Unable to connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 font-['Outfit',sans-serif]">
      <StoreNavbar backTo="/login" backLabel="Back to Login" />

      <main className="min-h-[calc(100vh-96px)] flex items-center justify-center py-6 sm:py-12 px-3 sm:px-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/50">
            <h1 className="text-center text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Reset Password
            </h1>
            <p className="text-center text-slate-400 text-sm mt-2">
              Works for both customer and admin accounts.
            </p>

            {step === 'request' ? (
              <form className="mt-6 space-y-5" onSubmit={handleRequestCode}>
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                  >
                    Account Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/40 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-500/40 rounded-lg px-3 py-2">
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-3.5 px-4 text-sm font-semibold rounded-lg sm:rounded-xl text-slate-900 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={handleResetPassword}>
                <div>
                  <label
                    htmlFor="verify-code"
                    className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                  >
                    Verification Code
                  </label>
                  <input
                    id="verify-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="6-digit code"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                  >
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="Repeat new password"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/40 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-500/40 rounded-lg px-3 py-2">
                    {message}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('request');
                      setCode('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setError('');
                      setMessage('');
                    }}
                    className="w-1/3 py-3 px-3 text-sm font-semibold rounded-lg border border-slate-700/70 text-slate-200 hover:bg-slate-800/60 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-3 px-3 text-sm font-semibold rounded-lg text-slate-900 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Updating...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}

            <p className="text-center text-sm text-slate-400 mt-6">
              Remembered your password?{' '}
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ForgotPassword;

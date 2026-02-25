import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildApiUrl, parseJsonResponse } from '../../../utils/api';
import StoreNavbar from '../../../components/StoreNavbar';

function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    setIsSubmitting(true);

    try {
      const response = await fetch(buildApiUrl('/api/customers/post'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email,
          password,
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      });

      const payload = await parseJsonResponse(response);

      if (!response.ok) {
        setError(payload.error || 'Signup failed');
        return;
      }

      setSuccessMessage('Account created successfully. Please sign in.');
      navigate('/login');
    } catch (submitError) {
      setError(submitError.message || 'Unable to connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 font-['Outfit',sans-serif]">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-1/3 h-1/3 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <StoreNavbar backTo="/" backLabel="Back to Store" />

      <main className="relative min-h-[calc(100vh-96px)] flex items-center justify-center py-6 sm:py-12 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4 sm:space-y-8 relative mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-4 sm:mb-8 animate-fadeIn">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center border border-slate-700/50 shadow-xl">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-md sm:rounded-lg rotate-45 shadow-lg shadow-emerald-500/50"></div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/50 animate-slideUp relative">
          <Link
            to="/"
            aria-label="Exit to homepage"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-2xl border border-white/25 shadow-[0_8px_24px_rgba(15,23,42,0.45)] hover:bg-white/20 transition-all duration-200 active:scale-95 flex items-center justify-center"
          >
            <span className="sr-only">Exit</span>
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </Link>
          <div>
            <h2 className="mt-2 sm:mt-6 text-center text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Create your account
            </h2>
          </div>

          <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 sm:space-y-5">
              <div>
                <label
                  htmlFor="first-name"
                  className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                >
                  First Name
                </label>
                <input
                  id="first-name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="appearance-none relative block w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 transition-all duration-200"
                  placeholder="John"
                />
              </div>

              <div>
                <label
                  htmlFor="last-name"
                  className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                >
                  Last Name
                </label>
                <input
                  id="last-name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="appearance-none relative block w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 transition-all duration-200"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label
                  htmlFor="email-address"
                  className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                >
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 sm:px-4 py-3 sm:py-3.5 pr-12 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 transition-all duration-200"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors touch-manipulation"
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                >
                  Phone (Optional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="appearance-none relative block w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 transition-all duration-200"
                  placeholder="+855-12-345-678"
                />
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider mb-2"
                >
                  Address (Optional)
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="appearance-none relative block w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 placeholder-slate-500 text-white text-sm sm:text-base rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 transition-all duration-200 resize-none"
                  placeholder="Street, City, Country"
                />

                <div className="text-right text-sm mt-2">
                  <Link
                    to="/login"
                    className="font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    Already have an account? Sign in
                  </Link>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {successMessage && (
              <p className="text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-500/40 rounded-lg px-3 py-2">
                {successMessage}
              </p>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center items-center gap-2 py-3 sm:py-3.5 px-4 border border-transparent text-sm font-semibold rounded-lg sm:rounded-xl text-slate-900 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 touch-manipulation active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing up...' : 'Sign up'}
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.6s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
}

export default Signup;


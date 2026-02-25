import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../utils/auth';
import { apiFetch } from '../utils/api';

function getFallbackProfileFromStorage() {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) {
      return {
        name: 'Unknown User',
        role: 'Guest',
      };
    }

    const parsed = JSON.parse(raw);
    const fallbackName =
      parsed?.user?.first_name && parsed?.user?.last_name
        ? `${parsed.user.first_name} ${parsed.user.last_name}`
        : parsed?.customer?.first_name && parsed?.customer?.last_name
          ? `${parsed.customer.first_name} ${parsed.customer.last_name}`
          : parsed?.email || 'Unknown User';
    const fallbackRole =
      typeof parsed?.role === 'string' && parsed.role.trim() !== ''
        ? `${parsed.role.charAt(0).toUpperCase()}${parsed.role.slice(1)}`
        : 'Guest';

    return {
      name: fallbackName,
      role: fallbackRole,
    };
  } catch {
    return {
      name: 'Unknown User',
      role: 'Guest',
    };
  }
}

function StoreNavbar() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: 'Unknown User',
    role: 'Guest',
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiFetch('/api/auth/profile', { method: 'GET' });

        if (response.status === 401) {
          clearAuthSession();
          setProfile({
            name: 'Unknown User',
            role: 'Guest',
          });
          return;
        }

        if (!response.ok) {
          setProfile(getFallbackProfileFromStorage());
          return;
        }

        const data = await response.json();
        setProfile({
          name: data?.user?.name || 'Unknown User',
          role: data?.user?.role || 'Guest',
        });
      } catch {
        setProfile(getFallbackProfileFromStorage());
      }
    };

    fetchProfile();
  }, []);

  const profileInitial = useMemo(() => {
    if (!profile.name || profile.name === 'Unknown User') {
      return '?';
    }

    return profile.name.trim().charAt(0).toUpperCase();
  }, [profile.name]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/logout', {
        method: 'POST',
      });
    } catch {
      // No-op: local logout still proceeds.
    } finally {
      clearAuthSession();
      setIsProfileMenuOpen(false);
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      <header className="bg-slate-900/50 backdrop-blur-xl shadow-2xl border-b border-slate-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 md:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-y-2">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center border border-slate-700/50 shadow-lg">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-sm sm:rounded-md rotate-45 shadow-lg shadow-emerald-500/50"></div>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
              E-Bookstore
            </h1>
          </Link>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2 sm:gap-3 sm:ml-4">
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-800/40 text-slate-200 hover:border-emerald-500/40 hover:text-white transition-colors text-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2m0 0L7 13h10l2-8H5.4zM7 13l-1 5h12M9 20a1 1 0 100 2 1 1 0 000-2zm8 0a1 1 0 100 2 1 1 0 000-2z"
                />
              </svg>
              Cart
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2 text-left hover:border-emerald-500/40 transition-colors flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-900 font-bold text-sm flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  {profileInitial}
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-200 font-semibold line-clamp-1">
                    {profile.name}
                  </p>
                  <p className="text-[11px] sm:text-xs text-emerald-400">
                    Role: {profile.role}
                  </p>
                </div>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-full sm:w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 p-2">
                  <Link
                    to="/login"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="block w-full text-left text-sm text-slate-200 hover:bg-slate-800 rounded-md px-3 py-2 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="block w-full text-left text-sm text-slate-200 hover:bg-slate-800 rounded-md px-3 py-2 transition-colors"
                  >
                    Signup
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full text-left text-sm text-red-300 hover:bg-red-950/40 rounded-md px-3 py-2 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          ></div>
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">
              Confirm Logout
            </h3>
            <p className="text-sm text-slate-300 mb-5">
              Are you sure you want to logout from this account?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 transition-all text-sm font-medium"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StoreNavbar;

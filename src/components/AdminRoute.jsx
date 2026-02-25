import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clearAuthSession } from '../utils/auth';
import { apiFetch, parseJsonResponse } from '../utils/api';

function AdminRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let isCancelled = false;

    const checkAdminAccess = async () => {
      try {
        const response = await apiFetch('/api/auth/profile', { method: 'GET' });
        const payload = await parseJsonResponse(response);

        if (isCancelled) {
          return;
        }

        if (response.status === 401) {
          clearAuthSession();
          setStatus('unauthorized');
          return;
        }

        if (!response.ok) {
          setStatus('unauthorized');
          return;
        }

        const role = String(payload?.user?.role || '').toLowerCase();
        if (role !== 'admin') {
          setStatus('forbidden');
          return;
        }

        setStatus('allowed');
      } catch {
        if (!isCancelled) {
          setStatus('unauthorized');
        }
      }
    };

    checkAdminAccess();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-slate-600 border-t-emerald-400 animate-spin"></div>
          <p className="mt-4 text-sm text-slate-300">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (status === 'forbidden') {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default AdminRoute;

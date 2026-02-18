export function logoutAndRedirect(navigate) {
  try {
    localStorage.removeItem('auth_user');
  } catch {
    // Ignore storage errors.
  }

  if (typeof navigate === 'function') {
    navigate('/login', { replace: true });
    return;
  }

  window.location.assign('/login');
}


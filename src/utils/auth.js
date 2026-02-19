const TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const TOKEN_STORAGE_KEY = 'auth_token_storage';

function getStorage(type) {
  return type === 'local' ? localStorage : sessionStorage;
}

export function saveAuthToken(token, rememberMe = true) {
  if (!token) return;

  const storageType = rememberMe ? 'local' : 'session';
  const activeStorage = getStorage(storageType);
  const fallbackStorage = getStorage(rememberMe ? 'session' : 'local');

  activeStorage.setItem(TOKEN_KEY, token);
  fallbackStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(TOKEN_STORAGE_KEY, storageType);
}

export function getAuthToken() {
  const preferredStorage = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (preferredStorage === 'session') {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function logoutAndRedirect(navigate) {
  clearAuthSession();

  if (typeof navigate === 'function') {
    navigate('/login', { replace: true });
    return;
  }

  window.location.assign('/login');
}

import { getAuthToken } from './auth';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost/Ecommerce/public');

export function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(buildApiUrl(path), {
    credentials: 'include',
    ...options,
    headers,
  });
}

export async function parseJsonResponse(response) {
  const rawText = await response.text();
  return rawText ? JSON.parse(rawText) : {};
}

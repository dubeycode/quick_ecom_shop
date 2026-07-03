const STORAGE_KEY = 'orderflow_provider_token';
const INFO_KEY = 'orderflow_provider_info';

export function getProviderToken() {
  return sessionStorage.getItem(STORAGE_KEY) || '';
}

export function getProviderInfo() {
  try {
    return JSON.parse(sessionStorage.getItem(INFO_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setProviderSession(token, provider) {
  sessionStorage.setItem(STORAGE_KEY, token);
  sessionStorage.setItem(INFO_KEY, JSON.stringify(provider));
}

export function clearProviderSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(INFO_KEY);
}

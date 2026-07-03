const STORAGE_KEY = 'orderflow_admin_key';

export function getAdminKey() {
  return sessionStorage.getItem(STORAGE_KEY) || '';
}

export function setAdminKey(key) {
  sessionStorage.setItem(STORAGE_KEY, key);
}

export function clearAdminKey() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isAdminAuthenticated() {
  return Boolean(getAdminKey());
}

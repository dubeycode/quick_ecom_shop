const PHONE_KEY = 'orderflow_phone';

export function getSavedPhone() {
  return localStorage.getItem(PHONE_KEY) || '';
}

export function savePhone(phone) {
  localStorage.setItem(PHONE_KEY, phone);
}

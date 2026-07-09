const STORAGE_KEY = 'bumdes_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ session, savedAt: Date.now() }));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) -- session just won't persist
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { session, savedAt } = JSON.parse(raw);
    if (!session || !savedAt || Date.now() - savedAt > SESSION_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

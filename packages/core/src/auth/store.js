/**
 * Auth storage keys — konsisten dengan AuthContext existing.
 */
export const STORAGE_KEYS = {
  token: "sipaus_token",
  user: "sipaus_user",
  role: "sipaus_role",
  expiresAt: "sipaus_auth_expires_at",
};

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

/**
 * @typedef {Object} StorageAdapter
 * @property {(key: string) => string|null} getItem
 * @property {(key: string, value: string) => void} setItem
 * @property {(key: string) => void} removeItem
 */

/**
 * Default storage adapter — safe di browser & Electron renderer.
 * Menggunakan globalThis.localStorage jika tersedia, fallback ke memory.
 *
 * @returns {StorageAdapter}
 */
export function createDefaultStorage() {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      return {
        getItem: (key) => ls.getItem(key),
        setItem: (key, value) => ls.setItem(key, value),
        removeItem: (key) => ls.removeItem(key),
      };
    }
  } catch {
    // localStorage tidak tersedia (mis. private mode / node environment)
  }
  const memory = new Map();
  return {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, value),
    removeItem: (key) => memory.delete(key),
  };
}

/**
 * Parse JSON dari storage dengan fallback aman.
 *
 * @param {string|null} value
 * @param {*} fallback
 * @returns {*}
 */
export const parseJSON = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Failed to parse JSON from storage", error);
    return fallback;
  }
};

/**
 * @typedef {Object} AuthStore
 * @property {() => string|null} getToken
 * @property {() => *} getUser
 * @property {() => string|null} getRole
 * @property {() => number|null} getExpiresAt
 * @property {() => boolean} isExpired
 * @property {(payload: *, newToken?: string) => void} applyUser
 * @property {() => void} clearSession
 * @property {() => void} setCurrentRole
 * @property {() => Object} getStorage — expose storage (debug/test)
 */

/**
 * Buat auth store platform-agnostic (plain JS, tanpa React).
 * Semua state disimpan di sessionStorage via adapter (default: localStorage).
 *
 * @param {Object} [options]
 * @param {StorageAdapter} [options.storage]
 * @param {() => string} [options.defaultRoleResolver] — resolve role default dari payload user
 * @returns {AuthStore}
 */
export function createAuthStore(options = {}) {
  const storage = options.storage || createDefaultStorage();

  const readToken = () => storage.getItem(STORAGE_KEYS.token);
  const readUser = () => parseJSON(storage.getItem(STORAGE_KEYS.user));
  const readRole = () => storage.getItem(STORAGE_KEYS.role);
  const readExpiry = () => {
    const raw = storage.getItem(STORAGE_KEYS.expiresAt);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  /** Pastikan expiry valid; fallback ke sekarang + TTL bila belum ada */
  const ensureValidExpiry = () => {
    const storedToken = readToken();
    if (!storedToken) return null;

    const expiresAt = readExpiry();
    if (expiresAt && Date.now() < expiresAt) return expiresAt;

    if (expiresAt && Date.now() >= expiresAt) {
      clearSession();
      return null;
    }

    const fallbackExpiry = Date.now() + SESSION_TTL_MS;
    storage.setItem(STORAGE_KEYS.expiresAt, String(fallbackExpiry));
    return fallbackExpiry;
  };

  /** Inisialisasi: jika token ada tapi expiry invalid, hapus sesi */
  const init = () => {
    if (readToken() && !ensureValidExpiry()) {
      clearSession();
      return null;
    }
    return readToken();
  };

  const clearSession = () => {
    storage.removeItem(STORAGE_KEYS.token);
    storage.removeItem(STORAGE_KEYS.user);
    storage.removeItem(STORAGE_KEYS.role);
    storage.removeItem(STORAGE_KEYS.expiresAt);
  };

  const applyUser = (payload, newToken) => {
    if (newToken) {
      storage.setItem(STORAGE_KEYS.token, newToken);
      storage.setItem(STORAGE_KEYS.expiresAt, String(Date.now() + SESSION_TTL_MS));
    }

    const resolveDefaultRole = (userPayload, prevRole) => {
      const candidate =
        userPayload?.base_role ||
        userPayload?.default_role ||
        userPayload?.role ||
        prevRole;
      return candidate || null;
    };

    const resolvedRole = resolveDefaultRole(payload, readRole());
    storage.setItem(STORAGE_KEYS.role, resolvedRole ?? "");
    storage.setItem(STORAGE_KEYS.user, JSON.stringify(payload));
  };

  const setCurrentRole = (role) => {
    storage.setItem(STORAGE_KEYS.role, role ?? "");
  };

  const isExpired = () => {
    const token = readToken();
    const expiresAt = readExpiry();
    if (!token) return false;
    if (!expiresAt) return false;
    return Date.now() >= expiresAt;
  };

  const getRole = () => readRole() || null;

  return {
    getToken: readToken,
    getUser: readUser,
    getRole,
    getExpiresAt: readExpiry,
    isExpired,
    applyUser,
    clearSession,
    setCurrentRole,
    init,
    getStorage: () => storage,
  };
}

export default createAuthStore;

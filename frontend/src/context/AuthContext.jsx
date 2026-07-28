import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const TOKEN_KEY = "sipaus_token";
const USER_KEY = "sipaus_user";
const ROLE_KEY = "sipaus_role";
const AUTH_EXPIRES_AT_KEY = "sipaus_auth_expires_at";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const AuthContext = createContext(null);

const parseJSON = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Failed to parse JSON from storage", error);
    return fallback;
  }
};

const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
};

const readStoredExpiry = () => {
  const rawValue = localStorage.getItem(AUTH_EXPIRES_AT_KEY);
  if (!rawValue) return null;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const ensureValidSessionExpiry = () => {
  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (!storedToken) return null;

  const expiresAt = readStoredExpiry();
  if (expiresAt && Date.now() < expiresAt) {
    return expiresAt;
  }

  if (expiresAt && Date.now() >= expiresAt) {
    clearStoredSession();
    return null;
  }

  const fallbackExpiry = Date.now() + SESSION_TTL_MS;
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(fallbackExpiry));
  return fallbackExpiry;
};

const getInitialToken = () => {
  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (!storedToken) return null;
  const expiresAt = ensureValidSessionExpiry();
  return expiresAt ? storedToken : null;
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getInitialToken());
  const [authExpiresAt, setAuthExpiresAt] = useState(() =>
    ensureValidSessionExpiry(),
  );
  const [user, setUser] = useState(() =>
    parseJSON(localStorage.getItem(USER_KEY)),
  );
  const [currentRole, setCurrentRole] = useState(
    () => localStorage.getItem(ROLE_KEY) || null,
  );
  const [authLoading, setAuthLoading] = useState(false);

  const setSessionExpiry = useCallback((expiresAtMs) => {
    setAuthExpiresAt(expiresAtMs);
    if (!expiresAtMs) {
      localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
      return;
    }
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(expiresAtMs));
  }, []);

  const allowedRoles = useMemo(() => resolveAllowedRoles(user), [user]);

  const headers = useMemo(() => {
    const base = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (!token) {
      return base;
    }
    return { ...base, Authorization: `Bearer ${token}` };
  }, [token]);

  const applyUser = useCallback(
    (payload, newToken) => {
      if (newToken) {
        setToken(newToken);
        localStorage.setItem(TOKEN_KEY, newToken);
        setSessionExpiry(Date.now() + SESSION_TTL_MS);
      }
      
      // Saat login/applyUser baru, kita abaikan currentRole lama (localStorage) 
      // dan paksa gunakan base_role atau default dari payload baru
      const resolvedRole = resolveDefaultRole(payload, null); 
      setCurrentRole(resolvedRole);
      localStorage.setItem(ROLE_KEY, resolvedRole ?? "");

      setUser(payload);
      localStorage.setItem(USER_KEY, JSON.stringify(payload));
    },
    [setSessionExpiry],
  );

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setCurrentRole(null);
    setAuthExpiresAt(null);
    clearStoredSession();
  }, []);

  useEffect(() => {
    if (!token || !authExpiresAt) {
      return;
    }

    const timeLeft = authExpiresAt - Date.now();
    if (timeLeft <= 0) {
      clearSession();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearSession();
    }, timeLeft);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [token, authExpiresAt, clearSession]);

  const apiFetch = useCallback(
    async (input, options = {}) => {
      if (token && authExpiresAt && Date.now() >= authExpiresAt) {
        clearSession();
        return new Response(
          JSON.stringify({
            message: "Sesi login telah berakhir. Silakan login kembali.",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Use environment variable with hardcoded production fallback
      const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
      const baseUrl = baseUrlRaw.replace(/\/+$/, "");
      
      let endpoint = input;
      // If endpoint already starts with the baseUrl, don't prepend it again
      if (endpoint.startsWith(baseUrl)) {
        endpoint = endpoint.substring(baseUrl.length);
      }
      
      // Clean up the endpoint: ensure it starts with / and remove double /api
      let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      if (cleanEndpoint.startsWith("/api/")) {
        // If baseUrl already ends with /api, remove the duplicate /api from endpoint
        if (baseUrl.endsWith("/api")) {
          cleanEndpoint = cleanEndpoint.substring(4); // Remove "/api"
        }
      }
      
      const url = input.startsWith("http")
        ? input
        : `${baseUrl}${cleanEndpoint}`;
      const { timeoutMs: timeoutMsOverride, ...fetchOptions } = options;
      const config = {
        ...fetchOptions,
        headers: {
          ...headers,
          ...options.headers,
        },
      };

      // When sending FormData, remove Content-Type so browser sets multipart boundary
      if (config.body instanceof FormData) {
        delete config.headers["Content-Type"];
      }

      // Don't add auth headers to login endpoint
      if (
        input === "/login" ||
        input === "/forgot-password" ||
        input === "/reset-password"
      ) {
        delete config.headers.Authorization;
      }

      const timeoutMsRaw =
        timeoutMsOverride ?? import.meta.env.VITE_API_TIMEOUT_MS;
      const timeoutMs = Number.isFinite(Number(timeoutMsRaw))
        ? Number(timeoutMsRaw)
        : 30000;

      let timeoutId = null;
      let controller = null;
      if (timeoutMs > 0) {
        controller = new AbortController();
        if (config.signal) {
          try {
            config.signal.addEventListener("abort", () => controller.abort(), {
              once: true,
            });
          } catch {
            // ignore if signal does not support addEventListener
          }
        }
        config.signal = controller.signal;
        timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
      }

      try {
        let response = await fetch(url, config);

        // If unauthorized, clear session (except when error is password verification failure)
        if (response.status === 401) {
          try {
            const clone = response.clone();
            const errData = await clone.json();
            const msg = String(errData?.message || errData?.error || "").toLowerCase();
            if (msg.includes("password") || msg.includes("salah")) {
              return response;
            }
          } catch {
            // Ignore JSON parse error on 401
          }
          clearSession();
        }

        return response;
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new Error(
            "Permintaan melebihi batas waktu. Silakan coba lagi.",
          );
        }
        console.error("API fetch error:", error);
        throw error;
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      }
    },
    [headers, clearSession, token, authExpiresAt],
  );

  const login = useCallback(
    async (nip, password, recaptchaToken) => {
      setAuthLoading(true);
      try {
        const response = await apiFetch("/login", {
          method: "POST",
          body: JSON.stringify({ nip, password, recaptcha_token: recaptchaToken }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.message || "Login failed");
          error.errors = errorData.errors;
          throw error;
        }

        const data = await response.json();
        applyUser(data.user, data.token);
        return data.user;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [apiFetch, applyUser],
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiFetch("/logout", {
          method: "POST",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearSession();
    }
  }, [apiFetch, token, clearSession]);

  const refreshProfile = useCallback(async () => {
    if (!token) return null;

    try {
      const response = await apiFetch("/user");
      if (!response.ok) {
        throw new Error("Failed to refresh profile");
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("Refresh profile error:", error);
      return null;
    }
  }, [apiFetch, token, setUser]);

  const requestPasswordReset = useCallback(
    async (identifier) => {
      const response = await apiFetch("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal membuat token reset.");
      }

      return response.json();
    },
    [apiFetch],
  );

  const resetPassword = useCallback(
    async (payload) => {
      const response = await apiFetch("/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal memperbarui kata sandi.");
      }

      return response.json();
    },
    [apiFetch],
  );

  const updateProfile = useCallback(
    async (data) => {
      const response = await apiFetch("/user/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal memperbarui profil.");
      }

      const result = await response.json();
      setUser(result.user);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      return result;
    },
    [apiFetch],
  );

  const changePassword = useCallback(
    async (data) => {
      const response = await apiFetch("/user/password", {
        method: "PUT",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal memperbarui kata sandi.");
      }

      return response.json();
    },
    [apiFetch],
  );

  const switchRole = useCallback(
    (role) => {
      if (!user) return;
      if (!allowedRoles.includes(role)) {
        return;
      }
      setCurrentRole(role);
      localStorage.setItem(ROLE_KEY, role);
    },
    [user, allowedRoles],
  );

  useEffect(() => {
    if (user && !currentRole) {
      const resolved = resolveDefaultRole(user, currentRole);
      setCurrentRole(resolved);
      if (resolved) {
        localStorage.setItem(ROLE_KEY, resolved);
      }
    }
  }, [user, currentRole]);

  const roleModules = useMemo(() => {
    if (!user) return { admin: [], operator: [], validator: [] };
    return {
      admin: user.role_modules?.admin ?? [],
      operator: user.role_modules?.operator ?? [],
      validator: user.role_modules?.validator ?? [],
    };
  }, [user]);

  const accessibleModules = useMemo(() => {
    if (!user) return [];

    if (currentRole === "admin" || user.base_role === "admin") {
      return ["dashboard", ...(roleModules.admin ?? [])];
    }

    const permissions = Array.isArray(user.module_permissions)
      ? user.module_permissions
      : [];

    const isOperator = currentRole === "operator" || user.base_role === "operator";
    const isValidator = currentRole === "validator" || user.base_role === "validator";

    const baseModules = ["layanan-mandiri", "riwayat-layanan", "simba"];
    if (isOperator) baseModules.push("operator-dashboard");
    if (isValidator) baseModules.push("validator-dashboard");

    const roleKey =
      currentRole === "operator"
        ? "is_operator"
        : currentRole === "validator"
          ? "is_validator"
          : null;

    const slugs = [];
    permissions.forEach((perm) => {
      if (!perm) return;
      const slug = perm.module_slug ?? perm.module_id ?? perm.slug;
      if (!slug) return;

      const hasGrant = roleKey
        ? Boolean(perm[roleKey]) || Boolean(perm.is_operator) || Boolean(perm.is_validator)
        : Boolean(perm.is_operator) || Boolean(perm.is_validator) || Boolean(perm.is_admin);

      if (hasGrant) {
        slugs.push(slug);
      }
    });

    return Array.from(new Set([...baseModules, ...slugs]));
  }, [user, currentRole, roleModules]);

  // Fungsi untuk mengecek apakah user memiliki role tertentu pada modul tertentu
  const hasRole = useCallback(
    (role, moduleSlug) => {
      if (!user || !moduleSlug) return false;

      // Admin memiliki akses ke semua modul
      if (user.base_role === "admin") return true;

      // Cek permission berdasarkan role dan module
      if (user.module_permissions) {
        return user.module_permissions.some(
          (permission) =>
            (permission.module_slug ??
              permission.module_id ??
              permission.slug) === moduleSlug &&
            permission[`is_${role}`] === true,
        );
      }

      return false;
    },
    [user],
  );

  const value = useMemo(
    () => ({
      token,
      sessionExpiresAt: authExpiresAt,
      user,
      currentRole,
      allowedRoles,
      authLoading,
      login,
      logout,
      refreshProfile,
      switchRole,
      headers,
      apiFetch,
      accessibleModules,
      modulesTree: user?.modules ?? [],
      hasRole, // Menambahkan fungsi hasRole ke context
      requestPasswordReset,
      resetPassword,
      updateProfile,
      changePassword,
    }),
    [
      token,
      authExpiresAt,
      user,
      currentRole,
      allowedRoles,
      authLoading,
      login,
      logout,
      refreshProfile,
      switchRole,
      headers,
      accessibleModules,
      hasRole,
      apiFetch,
      requestPasswordReset,
      resetPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function resolveDefaultRole(user, currentRole) {
  if (!user) return null;
  const roles = new Set(resolveAllowedRoles(user));
  
  // Prioritas 1: Gunakan base_role jika valid
  if (user.base_role && roles.has(user.base_role)) {
    return user.base_role;
  }

  // Prioritas 2: Gunakan currentRole yang dikirim (dari localStorage) jika valid
  const normalized = currentRole && roles.has(currentRole) ? currentRole : null;
  if (normalized) return normalized;

  // Prioritas 3: Fallback ke urutan legacy jika base_role tidak ditemukan
  if (user.base_role === "admin") return "admin";
  if (roles.has("operator")) return "operator";
  if (roles.has("validator")) return "validator";
  
  return user.base_role ?? (Array.from(roles)[0] || null);
}

function resolveAllowedRoles(user) {
  if (!user) return [];
  const roles = new Set();

  if (user.base_role) {
    roles.add(user.base_role);
  }

  (user.available_roles ?? []).forEach((role) => {
    if (role) roles.add(role);
  });

  const roleModules = user.role_modules ?? {};
  if (Array.isArray(roleModules.admin) && roleModules.admin.length)
    roles.add("admin");
  if (Array.isArray(roleModules.operator) && roleModules.operator.length)
    roles.add("operator");
  if (Array.isArray(roleModules.validator) && roleModules.validator.length)
    roles.add("validator");

  const permissions = Array.isArray(user.module_permissions)
    ? user.module_permissions
    : [];
  if (permissions.some((perm) => perm?.is_operator)) roles.add("operator");
  if (permissions.some((perm) => perm?.is_validator)) roles.add("validator");

  return Array.from(roles);
}

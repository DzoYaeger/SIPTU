import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createApiClient,
  createAuthStore,
  STORAGE_KEYS,
  parseJSON,
} from "@siptu/core";

export const AuthContext = createContext(null);

/**
 * AuthProvider — React binding di atas @siptu/core (platform-agnostic).
 * Semua logic session & API client berada di packages/core.
 */
export function AuthProvider({ children }) {
  const [authStore] = useState(() => createAuthStore());
  const [token, setToken] = useState(() => authStore.init());
  const [authExpiresAt, setAuthExpiresAt] = useState(() =>
    authStore.getExpiresAt(),
  );
  const [user, setUser] = useState(() => authStore.getUser());
  const [currentRole, setCurrentRole] = useState(() => authStore.getRole());
  const [authLoading, setAuthLoading] = useState(false);

  // ── Core API Client (platform-agnostic, dari @siptu/core) ──
  const apiClient = useMemo(() => {
    return createApiClient({
      baseUrl:
        import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api",
      getToken: () => authStore.getToken(),
      isExpired: () => authStore.isExpired(),
      onUnauthorized: () => {
        authStore.clearSession();
        setToken(null);
        setAuthExpiresAt(null);
        setUser(null);
        setCurrentRole(null);
      },
      timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30000,
    });
  }, [authStore]);

  const apiFetch = apiClient.apiFetch;

  const setSessionExpiry = useCallback(
    (expiresAtMs) => {
      setAuthExpiresAt(expiresAtMs);
      if (!expiresAtMs) {
        authStore.getStorage().removeItem(STORAGE_KEYS.expiresAt);
        return;
      }
      authStore.getStorage().setItem(STORAGE_KEYS.expiresAt, String(expiresAtMs));
    },
    [authStore],
  );

  const allowedRoles = useMemo(() => resolveAllowedRoles(user), [user]);

  const headers = useMemo(() => {
    const base = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (!token) return base;
    return { ...base, Authorization: `Bearer ${token}` };
  }, [token]);

  const applyUser = useCallback(
    (payload, newToken) => {
      authStore.applyUser(payload, newToken);
      setToken(authStore.getToken());
      setAuthExpiresAt(authStore.getExpiresAt());
      setUser(payload);
      setCurrentRole(authStore.getRole());
    },
    [authStore],
  );

  const clearSession = useCallback(() => {
    authStore.clearSession();
    setToken(null);
    setAuthExpiresAt(null);
    setUser(null);
    setCurrentRole(null);
  }, [authStore]);

  // ── Auto logout saat sesi kedaluwarsa ─────────────────────
  useEffect(() => {
    if (!token || !authExpiresAt) return;

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
        if (data.requires_mfa) {
          return data; // Return { requires_mfa: true, mfa_token } without applying session yet
        }

        applyUser(data.user, data.token);
        return data;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [apiFetch, applyUser],
  );

  const verifyMfa = useCallback(
    async (mfaToken, totpCode) => {
      setAuthLoading(true);
      try {
        const response = await apiFetch("/mfa/verify", {
          method: "POST",
          body: JSON.stringify({ mfa_token: mfaToken, totp_code: totpCode }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.message || "Verifikasi MFA gagal.");
          error.errors = errorData.errors;
          throw error;
        }

        const data = await response.json();
        applyUser(data.user, data.token);
        return data.user;
      } catch (error) {
        console.error("MFA verification error:", error);
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
      authStore.getStorage().setItem(STORAGE_KEYS.user, JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("Refresh profile error:", error);
      return null;
    }
  }, [apiFetch, token, authStore]);

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
      authStore.getStorage().setItem(STORAGE_KEYS.user, JSON.stringify(result.user));
      return result;
    },
    [apiFetch, authStore],
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
      authStore.setCurrentRole(role);
      setCurrentRole(role);
    },
    [user, allowedRoles, authStore],
  );

  useEffect(() => {
    if (user && !currentRole) {
      const resolved = resolveDefaultRole(user, currentRole);
      authStore.setCurrentRole(resolved);
      setCurrentRole(resolved);
    }
  }, [user, currentRole, authStore]);

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

    // Hanya jika role aktif saat ini adalah admin, berikan akses admin
    if (currentRole === "admin") {
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
        ? Boolean(perm[roleKey])
        : Boolean(perm.is_operator) || Boolean(perm.is_validator) || Boolean(perm.is_admin);

      if (hasGrant) {
        slugs.push(slug);
      }
    });

    // Petakan sub-modul ke parent modulnya agar parent group otomatis aktif di navigation bar & routing
    const parentMap = {
      "kepegawaian-data-pegawai": "kepegawaian",
      "kepegawaian-kgb": "kepegawaian",
      "kepegawaian-kalender": "kepegawaian",
      "kepegawaian-surat-tugas": "kepegawaian",
      "kepegawaian-bangkom": "kepegawaian",
      "zoom-generator": "kepegawaian",

      "rispeg-ruh": "rispeg",
      "rispeg-dashboard": "rispeg",
      "rispeg-izin-keluar": "rispeg",
      "rispeg-pengaturan-izin-keluar": "rispeg",
      "rispeg-pengumuman": "rispeg",

      "kearsipan-peminjaman": "kearsipan",
      "kearsipan-pencatatan-surat": "kearsipan",
      "kearsipan-manajemen-up-uk": "kearsipan",
      "kearsipan-arsip-vital": "kearsipan",
      "kearsipan-laporan": "kearsipan",

      "bmn-data-aset-tetap": "bmn",
      "bmn-data-persediaan": "bmn",
      "bmn-permintaan-persediaan": "bmn",
      "bmn-peminjaman-aset": "bmn",
      "bmn-pemeliharaan-keluhan": "bmn",
      "bmn-laporan": "bmn",

      "keuangan-anggaran": "keuangan",
      "keuangan-realisasi-anggaran": "keuangan",
      "keuangan-revisi": "keuangan",
      "keuangan-invoice": "keuangan",
      "keuangan-lpj": "keuangan",
      "keuangan-pejabat": "keuangan",

      "perjadin-st": "perjadin",
      "perjadin-lpj": "perjadin",
      "perjadin-monitoring": "perjadin",

      "pengadaan-pdtt-katalog": "pengadaan-pdtt",
      "pengadaan-pdtt-rekapan": "pengadaan-pdtt",
      "pengadaan-pdtt-pengajuan-pdtt": "pengadaan-pdtt",
      "pengadaan-pbj": "pengadaan-pdtt",
      "pengelola-pegawai-pdtt": "pengadaan-pdtt",

      "it-helpdesk-pelaporan": "it-helpdesk",
      "it-helpdesk-rekapan": "it-helpdesk",

      "pengaturan-slider": "layanan-mandiri",
    };

    slugs.forEach((s) => {
      if (parentMap[s]) {
        slugs.push(parentMap[s]);
      }
    });

    return Array.from(new Set([...baseModules, ...slugs]));
  }, [user, currentRole, roleModules]);

  // Fungsi untuk mengecek apakah user memiliki role tertentu pada modul tertentu
  const hasRole = useCallback(
    (role, moduleSlug) => {
      if (!user) return false;

      if (role === "admin" && (currentRole === "admin" || user.base_role === "admin")) {
        return true;
      }

      if (!moduleSlug) {
        if (currentRole === role) return true;
        if (user.base_role === role) return true;
        return (user.available_roles ?? []).includes(role);
      }

      // Jika role aktif saat ini adalah admin, berikan akses penuh ke semua modul
      if (currentRole === "admin") return true;

      // Cek permission spesifik untuk module berdasarkan module_permissions
      if (Array.isArray(user.module_permissions)) {
        return user.module_permissions.some(
          (permission) =>
            (permission.module_slug ??
              permission.module_id ??
              permission.slug) === moduleSlug &&
            Boolean(permission[`is_${role}`]),
        );
      }

      return false;
    },
    [user, currentRole],
  );

  const markMfaSessionActive = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, mfa_session_active: true };
      authStore.getStorage().setItem(STORAGE_KEYS.user, JSON.stringify(updated));
      return updated;
    });
  }, [authStore]);

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
      verifyMfa,
      markMfaSessionActive,
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
      verifyMfa,
      markMfaSessionActive,
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

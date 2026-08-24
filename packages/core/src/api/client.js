/**
 * @typedef {Object} ApiClientConfig
 * @property {string} baseUrl - Base URL API (mis. https://siptu.bpompalopo.com/core_api/api)
 * @property {() => string|null} [getToken] - Function untuk mengambil JWT token saat ini
 * @property {() => boolean} [isExpired] - Function untuk cek apakah sesi sudah kedaluwarsa
 * @property {() => void} [onUnauthorized] - Callback saat menerima 401 (mis. clearSession)
 * @property {number} [timeoutMs] - Timeout default (ms), default 30000
 */

/**
 * Logical OR dan fallback untuk parameter yang kadang undefined/null.
 * Dipakai untuk normalisasi data dari API (mis. item.kode_barang ?? item.code).
 */
export const pickFirst = (...values) => {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

/**
 * Membersihkan trailing slash pada baseUrl.
 */
const stripTrailingSlash = (url) => String(url || "").replace(/\/+$/, "");

/**
 * Buat API client platform-agnostic menggunakan fetch.
 * Tidak bergantung pada window/import.meta — semua config di-inject.
 *
 * @param {ApiClientConfig} config
 * @returns {ApiClient}
 */
export function createApiClient(config) {
  const {
    baseUrl: baseUrlRaw,
    getToken = () => null,
    isExpired = () => false,
    onUnauthorized = () => {},
    timeoutMs: defaultTimeoutMs = 30000,
  } = config || {};

  const baseUrl = stripTrailingSlash(baseUrlRaw || "");
  if (!baseUrl) throw new Error("[@siptu/core] createApiClient: baseUrl wajib diisi");

  /**
   * @typedef {(input: string|URL|Request, options?: RequestInit & {timeoutMs?: number}) => Promise<Response>} ApiFetch
   */

  /**
   * Fetch wrapper dengan timeout, auth headers, dan penanganan 401.
   *
   * @type {ApiFetch}
   */
  const apiFetch = async (input, options = {}) => {
    const token = getToken();

    // Cek sesi kedaluwarsa sebelum request
    if (token && isExpired()) {
      onUnauthorized();
      return new Response(
        JSON.stringify({ message: "Sesi login telah berakhir. Silakan login kembali." }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    let endpoint = String(input);
    // Jika endpoint sudah absolute (mulai dengan baseUrl), potong prefix
    if (endpoint.startsWith(baseUrl)) {
      endpoint = endpoint.substring(baseUrl.length);
    }

    // Bersihkan endpoint: pastikan mulai dengan / dan hilangkan /api ganda
    let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    if (cleanEndpoint.startsWith("/api/") && baseUrl.endsWith("/api")) {
      cleanEndpoint = cleanEndpoint.substring(4); // Hapus "/api"
    }

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${baseUrl}${cleanEndpoint}`;

    const { timeoutMs: timeoutMsOverride, ...fetchOptions } = options;

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions.headers || {}),
    };

    // Saat FormData, hapus Content-Type agar browser set multipart boundary
    const config = { ...fetchOptions, headers };
    if (config.body instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // Jangan kirim auth headers ke endpoint publik
    const publicEndpoints = ["/login", "/forgot-password", "/reset-password"];
    if (publicEndpoints.some((p) => input === p)) {
      delete config.headers.Authorization;
    }

    const timeoutMs = Number.isFinite(Number(timeoutMsOverride))
      ? Number(timeoutMsOverride)
      : defaultTimeoutMs;

    let timeoutId = null;
    let controller = null;
    if (timeoutMs > 0) {
      controller = new AbortController();
      if (config.signal) {
        try {
          config.signal.addEventListener("abort", () => controller.abort(), { once: true });
        } catch {
          // ignore
        }
      }
      config.signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    try {
      const response = await fetch(url, config);

      // 401 → panggil onUnauthorized (kecuali error password/MFA login)
      if (response.status === 401) {
        try {
          const clone = response.clone();
          const errData = await clone.json();
          const msg = String(errData?.message || errData?.error || "").toLowerCase();
          const isAuthFailure = /password|salah|mfa|autentikasi|kode|totp|recovery/.test(msg);
          if (!isAuthFailure) onUnauthorized();
        } catch {
          onUnauthorized();
        }
      }

      return response;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Permintaan melebihi batas waktu. Silakan coba lagi.");
      }
      console.error("API fetch error:", error);
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  return {
    baseUrl,
    apiFetch,
    /** Buat service yang menerima apiFetch (pola bmnService.js existing) */
    createService: (serviceFactory) => serviceFactory(apiFetch),
  };
}

/**
 * @typedef {ReturnType<typeof createApiClient>} ApiClient
 */

import { describe, it, expect } from "vitest";
import { createAuthStore, createDefaultStorage } from "../src/auth/store.js";

/** Memory storage adapter untuk test */
const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _peek: () => map,
  };
};

describe("createAuthStore", () => {
  it("applyUser menyimpan token, user, dan role default", () => {
    const store = createAuthStore({ storage: memoryStorage() });
    store.applyUser(
      { id: 1, nip: "198501012010011001", name: "Budi", base_role: "pegawai" },
      "token-abc",
    );

    expect(store.getToken()).toBe("token-abc");
    expect(store.getUser().name).toBe("Budi");
    expect(store.getRole()).toBe("pegawai");
  });

  it("clearSession menghapus semua state", () => {
    const store = createAuthStore({ storage: memoryStorage() });
    store.applyUser({ name: "X" }, "t");
    store.clearSession();

    expect(store.getToken()).toBeNull();
    expect(store.getUser()).toBeNull();
    expect(store.getRole()).toBeNull();
  });

  it("isExpired true saat expiry sudah lewat", () => {
    const storage = memoryStorage();
    const store = createAuthStore({ storage });
    store.applyUser({ name: "X" }, "t");

    // Paksa expiry ke masa lalu
    storage.setItem("sipaus_auth_expires_at", String(Date.now() - 1000));
    expect(store.isExpired()).toBe(true);
  });

  it("isExpired false saat token valid", () => {
    const store = createAuthStore({ storage: memoryStorage() });
    store.applyUser({ name: "X" }, "t");
    expect(store.isExpired()).toBe(false);
  });

  it("init membersihkan sesi yang sudah expired", () => {
    const storage = memoryStorage();
    const store = createAuthStore({ storage });
    store.applyUser({ name: "X" }, "t");
    storage.setItem("sipaus_auth_expires_at", String(Date.now() - 1000));

    store.init();
    expect(store.getToken()).toBeNull();
  });

  it("setCurrentRole mengganti role", () => {
    const store = createAuthStore({ storage: memoryStorage() });
    store.setCurrentRole("admin");
    expect(store.getRole()).toBe("admin");
  });
});

describe("createDefaultStorage", () => {
  it("fallback ke memory saat localStorage tidak ada", () => {
    const storage = createDefaultStorage();
    storage.setItem("k", "v");
    expect(storage.getItem("k")).toBe("v");
    storage.removeItem("k");
    expect(storage.getItem("k")).toBeNull();
  });
});

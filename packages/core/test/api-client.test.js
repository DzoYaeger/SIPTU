import { describe, it, expect, vi } from "vitest";
import { createApiClient } from "../src/api/client.js";

describe("createApiClient", () => {
  it("menggabungkan baseUrl dengan endpoint relatif", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      baseUrl: "https://siptu.bpompalopo.com/core_api/api",
      getToken: () => "jwt-123",
    });

    await client.apiFetch("/employees?page=1");

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://siptu.bpompalopo.com/core_api/api/employees?page=1");
    expect(opts.headers.Authorization).toBe("Bearer jwt-123");
    vi.unstubAllGlobals();
  });

  it("menghapus /api duplikat saat endpoint mulai dengan /api/", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      baseUrl: "https://siptu.bpompalopo.com/core_api/api",
    });

    await client.apiFetch("/api/surat-tugas");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://siptu.bpompalopo.com/core_api/api/surat-tugas");
    vi.unstubAllGlobals();
  });

  it("tidak mengirim auth header ke endpoint login", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      baseUrl: "https://siptu.bpompalopo.com/core_api/api",
      getToken: () => "jwt-123",
    });

    await client.apiFetch("/login", { method: "POST" });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("menghapus Content-Type saat body FormData", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({ baseUrl: "https://x/api" });
    const formData = new FormData();
    formData.append("file", new Blob(["x"]), "file.txt");

    await client.apiFetch("/upload", { method: "POST", body: formData });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("memanggil onUnauthorized saat 401 non-login", async () => {
    const onUnauthorized = vi.fn();
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthenticated." }), { status: 401 }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      baseUrl: "https://x/api",
      onUnauthorized,
    });

    await client.apiFetch("/user");

    expect(onUnauthorized).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("TIDAK memanggil onUnauthorized saat 401 karena password salah", async () => {
    const onUnauthorized = vi.fn();
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "NIP atau password salah" }), { status: 401 }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({ baseUrl: "https://x/api", onUnauthorized });
    const res = await client.apiFetch("/login", { method: "POST" });

    expect(res.status).toBe(401);
    expect(onUnauthorized).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("melempar error timeout saat request aborted", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    const mockFetch = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({ baseUrl: "https://x/api", timeoutMs: 1 });

    await expect(client.apiFetch("/slow")).rejects.toThrow("Permintaan melebihi batas waktu");
    vi.unstubAllGlobals();
  });
});
